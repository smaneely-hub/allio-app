import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin, requireAuth } from '../_shared/security.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LLM_API_KEY') || ''
const JINA_API_KEY = Deno.env.get('JINA_API_KEY') || ''

const DIRECT_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const MANUAL_PASTE_MESSAGE = 'Could not extract recipe from this URL. Try pasting the recipe content manually.'
const UNIT_WORDS = new Set([
  'cup', 'cups', 'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'ml', 'l', 'liter', 'liters', 'litre', 'litres', 'clove', 'cloves', 'pinch',
  'pinches', 'can', 'cans', 'package', 'packages', 'slice', 'slices'
])

type RecipeIngredient = { amount: string, unit: string, item: string }
type NormalizedRecipe = {
  title: string,
  description: string,
  ingredients: RecipeIngredient[],
  instructions: string[],
  prep_time_minutes: number | null,
  cook_time_minutes: number | null,
  total_time_minutes: number | null,
  servings: number | null,
  image_url: string | null,
  source_url: string,
  source_domain: string,
}

function parseIsoDurationMinutes(iso: string | undefined | null): number | null {
  if (!iso || typeof iso !== 'string') return null
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!match) return null
  const hours = Number.parseInt(match[1] || '0', 10)
  const minutes = Number.parseInt(match[2] || '0', 10)
  const total = hours * 60 + minutes
  return Number.isFinite(total) && total > 0 ? total : null
}

function firstNumericValue(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) return input
  if (typeof input === 'string') {
    const match = input.match(/\d+(?:\.\d+)?/)
    if (!match) return null
    const parsed = Number.parseFloat(match[0])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const parsed = firstNumericValue(item)
      if (parsed !== null) return parsed
    }
  }
  return null
}

function firstImageUrl(input: unknown): string | null {
  if (typeof input === 'string' && input.trim()) return input.trim()
  if (Array.isArray(input)) {
    for (const item of input) {
      const parsed = firstImageUrl(item)
      if (parsed) return parsed
    }
    return null
  }
  if (input && typeof input === 'object') {
    const url = (input as Record<string, unknown>).url
    return typeof url === 'string' && url.trim() ? url.trim() : null
  }
  return null
}

function parseIngredient(raw: string): RecipeIngredient {
  const text = raw.trim()
  const match = text.match(/^((?:\d+\s+\d\/\d|\d+\/\d|\d+(?:\.\d+)?))\s+(.*)$/)
  if (!match) return { amount: '', unit: '', item: text }
  const amount = match[1].trim()
  const remainder = match[2].trim()
  const parts = remainder.split(/\s+/)
  const unitCandidate = parts[0]?.toLowerCase().replace(/[.,]$/, '') || ''
  if (UNIT_WORDS.has(unitCandidate)) {
    return {
      amount,
      unit: parts[0],
      item: parts.slice(1).join(' ').trim(),
    }
  }
  return { amount, unit: '', item: remainder }
}

function flattenInstructions(input: unknown): string[] {
  if (typeof input === 'string') {
    return input.split('\n').map((step) => step.trim()).filter(Boolean)
  }
  if (!Array.isArray(input)) return []

  const steps: string[] = []
  for (const entry of input) {
    if (typeof entry === 'string') {
      if (entry.trim()) steps.push(entry.trim())
      continue
    }
    if (!entry || typeof entry !== 'object') continue
    const node = entry as Record<string, unknown>
    const type = node['@type']
    if (type === 'HowToSection' || (Array.isArray(type) && type.includes('HowToSection'))) {
      steps.push(...flattenInstructions(node.itemListElement))
      continue
    }
    const text = typeof node.text === 'string' ? node.text.trim() : ''
    const name = typeof node.name === 'string' ? node.name.trim() : ''
    if (text) steps.push(text)
    else if (name) steps.push(name)
  }
  return steps.filter(Boolean)
}

function listRecipeNodesFromHtml(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const raw: unknown = JSON.parse(match[1].trim())
      const candidates: unknown[] = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)['@graph']))
          ? ((raw as Record<string, unknown>)['@graph'] as unknown[])
          : [raw]

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue
        const node = candidate as Record<string, unknown>
        const type = node['@type']
        if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
          nodes.push(node)
        }
      }
    } catch {
      continue
    }
  }

  return nodes
}

function mapJsonLdToRecipe(node: Record<string, unknown>, sourceUrl: string): NormalizedRecipe | null {
  const title = typeof node.name === 'string' ? node.name.trim() : ''
  if (!title) return null

  const rawIngredients = Array.isArray(node.recipeIngredient)
    ? (node.recipeIngredient as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : []
  if (rawIngredients.length === 0) return null

  const instructions = flattenInstructions(node.recipeInstructions)
  if (instructions.length === 0) return null

  const parsedUrl = new URL(sourceUrl)
  const sourceDomain = parsedUrl.hostname.replace(/^www\./, '')
  const totalTime = parseIsoDurationMinutes(node.totalTime as string | undefined)
  const cookTime = parseIsoDurationMinutes(node.cookTime as string | undefined)
  const prepTime = parseIsoDurationMinutes(node.prepTime as string | undefined)

  return {
    title,
    description: typeof node.description === 'string' ? node.description.trim() : '',
    ingredients: rawIngredients.map(parseIngredient),
    instructions,
    prep_time_minutes: prepTime,
    cook_time_minutes: cookTime,
    total_time_minutes: totalTime ?? ((prepTime || 0) + (cookTime || 0) || null),
    servings: firstNumericValue(node.recipeYield),
    image_url: firstImageUrl(node.image),
    source_url: sourceUrl,
    source_domain: sourceDomain,
  }
}

function mapLlmRecipeToNormalized(parsed: Record<string, unknown>, sourceUrl: string): NormalizedRecipe | null {
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
  if (!title || parsed.error === 'no_recipe') return null

  const instructions = Array.isArray(parsed.instructions)
    ? parsed.instructions.map((step) => String(step).trim()).filter(Boolean)
    : []
  if (instructions.length === 0) return null

  const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : []
  const ingredients = rawIngredients
    .map((ingredient) => {
      if (!ingredient || typeof ingredient !== 'object') return null
      const node = ingredient as Record<string, unknown>
      return {
        amount: typeof node.amount === 'string' ? node.amount.trim() : '',
        unit: typeof node.unit === 'string' ? node.unit.trim() : '',
        item: typeof node.item === 'string' ? node.item.trim() : '',
      }
    })
    .filter((ingredient): ingredient is RecipeIngredient => Boolean(ingredient && ingredient.item))
  if (ingredients.length === 0) return null

  const parsedUrl = new URL(sourceUrl)
  const sourceDomain = parsedUrl.hostname.replace(/^www\./, '')
  const totalTime = typeof parsed.total_time_minutes === 'number' && Number.isFinite(parsed.total_time_minutes)
    ? parsed.total_time_minutes
    : null
  const servings = typeof parsed.servings === 'number' && Number.isFinite(parsed.servings)
    ? parsed.servings
    : null

  return {
    title,
    description: '',
    ingredients,
    instructions,
    prep_time_minutes: null,
    cook_time_minutes: null,
    total_time_minutes: totalTime,
    servings,
    image_url: null,
    source_url: sourceUrl,
    source_domain: sourceDomain,
  }
}

function buildSuccessRecipe(recipe: NormalizedRecipe) {
  return {
    title: recipe.title,
    description: recipe.description,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    total_time_minutes: recipe.total_time_minutes,
    servings: recipe.servings,
    image_url: recipe.image_url,
    source_url: recipe.source_url,
    source_domain: recipe.source_domain,
    ingredients: recipe.ingredients.map((ingredient) => [ingredient.amount, ingredient.unit, ingredient.item].filter(Boolean).join(' ').trim()),
    steps: recipe.instructions,
  }
}

async function tryJsonLdFromHtml(html: string, sourceUrl: string): Promise<NormalizedRecipe | null> {
  for (const node of listRecipeNodesFromHtml(html)) {
    const recipe = mapJsonLdToRecipe(node, sourceUrl)
    if (recipe) return recipe
  }
  return null
}

async function fetchDirectHtml(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: DIRECT_FETCH_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return null
  return await response.text()
}

async function fetchJina(url: string, asHtml: boolean): Promise<string | null> {
  const endpoint = `https://r.jina.ai/http://${url}`
  const headers: Record<string, string> = {
    'Accept': asHtml ? 'text/html' : 'text/plain',
  }
  if (asHtml) headers['X-Return-Format'] = 'html'
  if (JINA_API_KEY) headers['Authorization'] = `Bearer ${JINA_API_KEY}`

  const response = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) return null

  const text = await response.text()
  if (!text.trim()) return null
  if (/Warning: Target URL returned error/i.test(text)) return null
  return text
}

async function extractWithLlm(markdownText: string, sourceUrl: string): Promise<NormalizedRecipe | null> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Extract the recipe from the user's markdown. Return ONLY valid JSON matching this exact schema, no other text:\n{\n \"title\": string,\n \"servings\": number or null,\n \"total_time_minutes\": number or null,\n \"ingredients\": [{ \"amount\": string, \"unit\": string, \"item\": string }],\n \"instructions\": [string]\n}\nIf no recipe is present in the markdown, return: {\"error\": \"no_recipe\"}`,
        },
        {
          role: 'user',
          content: markdownText,
        },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error?.message || `OpenRouter request failed: ${response.status}`)
  }

  const content = json.choices?.[0]?.message?.content || '{}'
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenRouter returned invalid JSON')
  }
  return mapLlmRecipeToNormalized(parsed, sourceUrl)
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

    try {
      try {
        const directHtml = await fetchDirectHtml(url)
        if (directHtml) {
          const recipe = await tryJsonLdFromHtml(directHtml, url)
          if (recipe) {
            console.log('[clip] Step 1 succeeded: direct fetch JSON-LD')
            return new Response(JSON.stringify({ recipe: buildSuccessRecipe(recipe) }), { status: 200, headers: corsHeaders })
          }
          console.log('[clip] Step 1 found no Recipe JSON-LD')
        } else {
          console.warn('[clip] Step 1 direct fetch failed or returned non-200')
        }
      } catch (error) {
        console.warn('[clip] Step 1 failed:', error)
      }

      try {
        const jinaHtml = await fetchJina(url, true)
        if (jinaHtml) {
          const recipe = await tryJsonLdFromHtml(jinaHtml, url)
          if (recipe) {
            console.log('[clip] Step 2 succeeded: Jina HTML JSON-LD')
            return new Response(JSON.stringify({ recipe: buildSuccessRecipe(recipe) }), { status: 200, headers: corsHeaders })
          }
          console.log('[clip] Step 2 found no Recipe JSON-LD')
        } else {
          console.warn('[clip] Step 2 Jina HTML fetch failed or returned non-200')
        }
      } catch (error) {
        console.warn('[clip] Step 2 failed:', error)
      }

      try {
        const jinaMarkdown = await fetchJina(url, false)
        if (jinaMarkdown) {
          const recipe = await extractWithLlm(jinaMarkdown, url)
          if (recipe) {
            console.log('[clip] Step 3 succeeded: Jina markdown + LLM extraction')
            return new Response(JSON.stringify({ recipe: buildSuccessRecipe(recipe) }), { status: 200, headers: corsHeaders })
          }
          console.warn('[clip] Step 3 returned no recipe')
        } else {
          console.warn('[clip] Step 3 Jina markdown fetch failed or returned non-200')
        }
      } catch (error) {
        console.warn('[clip] Step 3 failed:', error)
      }

      return new Response(
        JSON.stringify({ error: MANUAL_PASTE_MESSAGE }),
        { status: 422, headers: corsHeaders }
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return new Response(
        JSON.stringify({ error: msg || MANUAL_PASTE_MESSAGE }),
        { status: 422, headers: corsHeaders }
      )
    }
  } catch (error) {
    console.error('[clip] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Extraction failed' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
