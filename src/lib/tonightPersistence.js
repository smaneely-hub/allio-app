import { supabase } from './supabase'

const UNIT_WORDS = new Set([
  'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 'g', 'kg', 'cup', 'cups',
  'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'clove', 'cloves',
  'can', 'cans', 'package', 'packages', 'block', 'blocks', 'bunch', 'bunches', 'piece', 'pieces',
  'head', 'heads', 'bag', 'bags', 'loaf', 'loaves', 'jar', 'jars', 'sprig', 'sprigs',
])

function fractionToNumber(value = '') {
  const text = String(value).trim()
  if (!text) return 1
  if (text.includes(' ')) {
    return text.split(/\s+/).reduce((sum, part) => sum + fractionToNumber(part), 0)
  }
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number)
    if (!Number.isNaN(num) && !Number.isNaN(den) && den) return num / den
  }
  const parsed = Number(text)
  return Number.isNaN(parsed) ? 1 : parsed
}

function categorizeIngredient(name = '') {
  const value = name.toLowerCase()
  if (/(chicken|beef|pork|fish|salmon|shrimp|tofu|turkey|lamb|egg|sausage|bacon|steak)/.test(value)) return 'protein'
  if (/(milk|cheese|yogurt|butter|cream|parmesan|mozzarella|cheddar|feta)/.test(value)) return 'dairy'
  if (/(bread|bagel|bun|roll|tortilla)/.test(value)) return 'bakery'
  if (/(frozen)/.test(value)) return 'frozen'
  if (/(lemon|lime|tomato|onion|garlic|potato|carrot|broccoli|spinach|lettuce|cucumber|pepper|mushroom|avocado|cilantro|parsley|basil|ginger|kale|zucchini|bean|peas|corn|fruit|apple|banana)/.test(value)) return 'produce'
  if (/(pasta|rice|noodle|flour|sugar|oil|vinegar|sauce|stock|broth|beans|lentils|chickpeas|oats|spice|seasoning)/.test(value)) return 'pantry'
  return 'other'
}

export function buildShoppingItemsFromMeal(meal) {
  const usageKey = `${meal?.day || 'tonight'}_${meal?.meal || 'dinner'}`
  const bucket = new Map()

  for (const rawIngredient of meal?.ingredients || []) {
    const source = typeof rawIngredient === 'string'
      ? rawIngredient.trim()
      : String(rawIngredient?.item || rawIngredient?.name || '').trim()

    if (!source) continue

    let quantity = 1
    let unit = 'piece'
    let name = source

    if (typeof rawIngredient === 'object' && rawIngredient !== null && (rawIngredient.item || rawIngredient.name)) {
      quantity = Number(rawIngredient.quantity) || 1
      unit = rawIngredient.unit || 'piece'
      name = String(rawIngredient.item || rawIngredient.name).trim()
    } else {
      const match = source.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+([A-Za-z]+)?\s+(.+)$/)
      if (match) {
        quantity = fractionToNumber(match[1])
        const maybeUnit = (match[2] || '').toLowerCase()
        if (maybeUnit && UNIT_WORDS.has(maybeUnit)) {
          unit = match[2]
          name = match[3].trim()
        } else {
          unit = 'piece'
          name = `${match[2] ? `${match[2]} ` : ''}${match[3]}`.trim()
        }
      }
    }

    const key = `${name.toLowerCase()}::${unit.toLowerCase()}`
    const existing = bucket.get(key)
    if (existing) {
      existing.quantity += quantity
    } else {
      bucket.set(key, {
        name,
        quantity,
        unit,
        category: categorizeIngredient(name),
        checked: false,
        used_in: [usageKey],
      })
    }
  }

  return Array.from(bucket.values())
}

export async function upsertShoppingListForDate({ userId, householdId, weekOf, items }) {
  const { data: existingList, error: loadError } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('week_of', weekOf)
    .maybeSingle()

  if (loadError) throw loadError

  if (existingList?.id) {
    const { error } = await supabase
      .from('shopping_lists')
      .update({ household_id: householdId, items })
      .eq('id', existingList.id)

    if (error) throw error
    return existingList.id
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      user_id: userId,
      household_id: householdId,
      week_of: weekOf,
      items,
    })
    .select('id')
    .single()

  if (error) throw error
  return data?.id || null
}
