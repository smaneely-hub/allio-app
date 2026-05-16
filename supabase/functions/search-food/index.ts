import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function toNumber(value: unknown) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

function normalizeUsdaFood(row: any) {
  const nutrients = Array.isArray(row?.foodNutrients) ? row.foodNutrients : []
  const nutrientValue = (names: string[]) => {
    const found = nutrients.find((n) => names.includes(String(n?.nutrientName || n?.name || '')))
    return toNumber(found?.value)
  }

  return {
    slug: `usda-${row?.fdcId || slugify(row?.description || 'food')}`,
    name: String(row?.description || 'Food'),
    brand: row?.brandOwner || null,
    category: row?.foodCategory || 'general',
    source: 'usda',
    serving_label: row?.servingSize ? `${row.servingSize} ${row.servingSizeUnit || ''}`.trim() : '100 g',
    serving_amount: toNumber(row?.servingSize) || 1,
    calories: Math.round(nutrientValue(['Energy']) || 0),
    protein_g: nutrientValue(['Protein']),
    carbs_g: nutrientValue(['Carbohydrate, by difference']),
    fat_g: nutrientValue(['Total lipid (fat)']),
    verified: true,
    search_terms: [String(row?.description || '').toLowerCase()].filter(Boolean),
  }
}

function normalizeOpenFoodFacts(row: any) {
  const nutriments = row?.nutriments || {}
  const name = row?.product_name || row?.product_name_en || row?.generic_name || 'Food'
  const brand = row?.brands || null
  const code = row?.code || slugify(name)
  const serving = row?.serving_quantity && row?.serving_quantity_unit ? `${row.serving_quantity} ${row.serving_quantity_unit}` : (row?.serving_size || '1 serving')

  return {
    slug: `off-${slugify(String(code))}`,
    name: String(name),
    brand: brand ? String(brand).split(',')[0].trim() : null,
    category: 'packaged',
    source: 'open_food_facts',
    serving_label: serving,
    serving_amount: toNumber(row?.serving_quantity) || 1,
    calories: Math.round(toNumber(nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g'])),
    protein_g: toNumber(nutriments.proteins_serving ?? nutriments.proteins_100g),
    carbs_g: toNumber(nutriments.carbohydrates_serving ?? nutriments.carbohydrates_100g),
    fat_g: toNumber(nutriments.fat_serving ?? nutriments.fat_100g),
    verified: false,
    search_terms: [String(name).toLowerCase(), String(brand || '').toLowerCase()].filter(Boolean),
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const query = String(body?.query || '').trim()
    if (!query) return json({ error: 'Missing query' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase service role not configured' }, 500)

    const usdaKey = Deno.env.get('USDA_API_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: localRows } = await supabase
      .from('food_items')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .order('verified', { ascending: false })
      .limit(12)

    let local = Array.isArray(localRows) ? localRows : []
    if (local.length >= 8) return json({ items: local, sources: ['local_cache'] })

    const collected: any[] = [...local]
    const seen = new Set(collected.map((item) => item.slug))
    const sources = ['local_cache']

    if (usdaKey) {
      const usdaRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(usdaKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, pageSize: 8, dataType: ['Foundation', 'Survey (FNDDS)', 'Branded'] }),
      })
      if (usdaRes.ok) {
        const usdaData = await usdaRes.json()
        const normalized = (usdaData?.foods || []).map(normalizeUsdaFood).filter((item: any) => item.name)
        if (normalized.length) {
          sources.push('usda')
          const upserts = normalized.filter((item: any) => !seen.has(item.slug))
          if (upserts.length) {
            await supabase.from('food_items').upsert(upserts, { onConflict: 'slug' })
            upserts.forEach((item: any) => {
              seen.add(item.slug)
              collected.push(item)
            })
          }
        }
      }
    }

    const offRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`)
    if (offRes.ok) {
      const offData = await offRes.json()
      const normalized = (offData?.products || []).map(normalizeOpenFoodFacts).filter((item: any) => item.name && item.calories >= 0)
      if (normalized.length) {
        sources.push('open_food_facts')
        const upserts = normalized.filter((item: any) => !seen.has(item.slug))
        if (upserts.length) {
          await supabase.from('food_items').upsert(upserts, { onConflict: 'slug' })
          upserts.forEach((item: any) => {
            seen.add(item.slug)
            collected.push(item)
          })
        }
      }
    }

    return json({ items: collected.slice(0, 20), sources })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
