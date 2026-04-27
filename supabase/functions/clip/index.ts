import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin, requireAuth } from '../_shared/security.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'google/gemini-2.5-flash'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

// Parse ISO 8601 duration like PT30M, PT1H, PT1H30M → minutes
function parseDuration(iso: string | undefined | null): number | null {
  if (!iso) return null
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return null
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const total = hours * 60 + minutes
  return total > 0 ? total : null
}

// Find a Recipe schema.org object in the HTML JSON-LD blocks
function extractJsonLdRecipe(html: string): Record<string, unknown> | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const raw: unknown = JSON.parse(match[1].trim())
      const items: unknown[] = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && '@graph' in (raw as Record<string, unknown>))
          ? ((raw as Record<string, unknown>)['@graph'] as unknown[])
          : [raw]
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const typed = item as Record<string, unknown>
        const t = typed['@type']
        if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) {
          return typed
        }
      }
    } catch {
      // malformed JSON-LD — continue
    }
  }
  return null
}

function normalizeJsonLd(ld: Record<string, unknown>, sourceUrl: string): Record<string, unknown> {
  const ingredients: string[] = Array.isArray(ld.recipeIngredient)
    ? (ld.recipeIngredient as unknown[]).map(String)
    : []

  const steps: string[] = []
  const rawInstructions = ld.recipeInstructions
  if (Array.isArray(rawInstructions)) {
    for (const step of rawInstructions as unknown[]) {
      if (typeof step === 'string') {
        steps.push(step)
      } else if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>
        if (typeof s.text === 'string' && s.text.trim()) steps.push(s.text.trim())
        else if (typeof s.name === 'string' && s.name.trim()) steps.push(s.name.trim())
      }
    }
  } else if (typeof rawInstructions === 'string') {
    steps.push(...rawInstructions.split('\n').map((s) => s.trim()).filter(Boolean))
  }

  let image: string | null = null
  if (typeof ld.image === 'string') {
    image = ld.image
  } else if (Array.isArray(ld.image) && ld.image.length > 0) {
    const first = ld.image[0]
    image = typeof first === 'string' ? first : String((first as Record<string, unknown>)?.url || '')
  } else if (ld.image && typeof ld.image === 'object') {
    const img = ld.image as Record<string, unknown>
    image = typeof img.url === 'string' ? img.url : null
  }

  const servingsRaw = ld.recipeYield
  let servings: number | null = null
  if (servingsRaw) {
    const candidate = Array.isArray(servingsRaw) ? String(servingsRaw[0]) : String(servingsRaw)
    const parsed = parseInt(candidate, 10)
    if (!isNaN(parsed) && parsed > 0) servings = parsed
  }

  const parsedUrl = new URL(sourceUrl)
  const domain = parsedUrl.hostname.replace(/^www\./, '')

  return {
    title: String(ld.name || '').trim(),
    description: String(ld.description || '').trim(),
    ingredients,
    steps,
    cook_time_minutes: parseDuration(ld.cookTime as string | undefined),
    prep_time_minutes: parseDuration(ld.prepTime as string | undefined),
    servings,
    image_url: image || null,
    source_url: sourceUrl,
    source_domain: domain,
  }
}

async function extractWithLlm(html: string, sourceUrl: string): Promise<Record<string, unknown>> {
  // Strip script/style tags and trim to ~12k chars to stay within token budget
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 12000)

  const prompt = `You are a recipe extractor. Extract the recipe from this webpage text and return a JSON object.

Return ONLY valid JSON with these fields (no extra text, no markdown):
{
  "title": "string — recipe name",
  "description": "string — 1-2 sentence description of the dish",
  "ingredients": ["string", ...],
  "steps": ["string", ...],
  "cook_time_minutes": number or null,
  "prep_time_minutes": number or null,
  "servings": number or null,
  "image_url": null
}

If the page does not contain a recipe, return: {"error": "no recipe found"}

PAGE TEXT:
${stripped}`

  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(20000),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error?.message || `LLM request failed: ${response.status}`)
  }

  const content: string = json.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)

  if (parsed.error) {
    throw new Error(parsed.error)
  }

  const parsedUrl = new URL(sourceUrl)
  const domain = parsedUrl.hostname.replace(/^www\./, '')

  return {
    title: String(parsed.title || '').trim(),
    description: String(parsed.description || '').trim(),
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(String) : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    cook_time_minutes: typeof parsed.cook_time_minutes === 'number' ? parsed.cook_time_minutes : null,
    prep_time_minutes: typeof parsed.prep_time_minutes === 'number' ? parsed.prep_time_minutes : null,
    servings: typeof parsed.servings === 'number' ? parsed.servings : null,
    image_url: typeof parsed.image_url === 'string' ? parsed.image_url : null,
    source_url: sourceUrl,
    source_domain: domain,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req)

  const blockedOrigin = rejectDisallowedOrigin(req)
  if (blockedOrigin) return blockedOrigin

  const origin = req.headers.get('origin')
  const corsHeaders = { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' }

  try {
    const auth = await requireAuth(req, SUPABASE_URL, SUPABASE_ANON_KEY)
    if (auth.response) return auth.response

    const body = await req.json()
    const url: string = (typeof body?.url === 'string' ? body.url.trim() : '')

    if (!url) {
      return new Response(JSON.stringify({ error: 'url is required' }), { status: 400, headers: corsHeaders })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL — must be a full URL including https://' }), { status: 400, headers: corsHeaders })
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return new Response(JSON.stringify({ error: 'Only http and https URLs are supported' }), { status: 400, headers: corsHeaders })
    }

    console.log('[clip] Fetching URL:', url)

    let html: string
    try {
      const fetchAttempts = [
        {
          label: 'browser',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
          },
        },
        {
          label: 'browser-with-referer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Referer': parsedUrl.origin + '/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Upgrade-Insecure-Requests': '1',
          },
        },
        {
          label: 'googlebot',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        },
      ]

      let lastStatus: number | null = null
      let lastContentType = ''
      let lastBodySnippet = ''

      for (const attempt of fetchAttempts) {
        console.log(`[clip] Fetch attempt (${attempt.label}) for URL:`, url)
        const pageRes = await fetch(url, {
          headers: attempt.headers,
          redirect: 'follow',
          signal: AbortSignal.timeout(12000),
        })

        lastStatus = pageRes.status
        lastContentType = pageRes.headers.get('content-type') || ''

        if (!pageRes.ok) {
          lastBodySnippet = (await pageRes.text()).slice(0, 200)
          console.warn(`[clip] Fetch attempt (${attempt.label}) failed with status ${pageRes.status}`)
          continue
        }

        if (!lastContentType.includes('text/html') && !lastContentType.includes('application/xhtml')) {
          lastBodySnippet = (await pageRes.text()).slice(0, 200)
          console.warn(`[clip] Fetch attempt (${attempt.label}) returned non-HTML content-type: ${lastContentType}`)
          continue
        }

        html = await pageRes.text()
        break
      }

      if (!html) {
        const reason = lastStatus
          ? `Failed to fetch page (HTTP ${lastStatus}). The site may block automated requests.`
          : 'Could not fetch page content.'
        const details = lastBodySnippet ? ` Snippet: ${lastBodySnippet}` : ''
        return new Response(JSON.stringify({ error: `${reason}${details}` }), { status: 422, headers: corsHeaders })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return new Response(
        JSON.stringify({ error: `Could not reach the page: ${msg}` }),
        { status: 422, headers: corsHeaders }
      )
    }

    // Try JSON-LD first — fastest and most accurate
    const ld = extractJsonLdRecipe(html)
    if (ld && ld.name && Array.isArray(ld.recipeIngredient) && ld.recipeIngredient.length > 0) {
      console.log('[clip] Extracted via JSON-LD:', ld.name)
      const recipe = normalizeJsonLd(ld, url)
      return new Response(JSON.stringify({ recipe }), { status: 200, headers: corsHeaders })
    }

    // Fall back to LLM extraction
    console.log('[clip] No JSON-LD found, using LLM extraction')
    const recipe = await extractWithLlm(html, url)
    console.log('[clip] LLM extracted recipe:', recipe.title)
    return new Response(JSON.stringify({ recipe }), { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('[clip] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Extraction failed' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
