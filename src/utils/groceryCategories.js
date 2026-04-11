export const CATEGORY_ORDER = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Other',
]

export const CATEGORY_KEYWORDS = {
  Produce: ['lettuce', 'tomato', 'tomatoes', 'onion', 'onions', 'garlic', 'pepper', 'peppers', 'bell pepper', 'jalapeño', 'cucumber', 'carrot', 'carrots', 'celery', 'broccoli', 'spinach', 'kale', 'arugula', 'cabbage', 'zucchini', 'squash', 'mushroom', 'mushrooms', 'potato', 'potatoes', 'sweet potato', 'corn', 'green beans', 'asparagus', 'avocado', 'lemon', 'lemons', 'lime', 'limes', 'orange', 'oranges', 'apple', 'apples', 'banana', 'bananas', 'berries', 'strawberries', 'blueberries', 'grapes', 'mango', 'pineapple', 'cilantro', 'parsley', 'basil', 'mint', 'rosemary', 'thyme', 'ginger', 'scallion', 'scallions', 'green onion', 'green onions', 'shallot', 'shallots', 'fresh herbs'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'ground beef', 'ground turkey', 'ground chicken', 'steak', 'salmon', 'shrimp', 'fish', 'tilapia', 'cod', 'tuna', 'sausage', 'bacon', 'ham', 'turkey', 'lamb', 'ribs', 'roast', 'tenderloin', 'thigh', 'thighs', 'breast', 'drumstick', 'wing'],
  'Dairy & Eggs': ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'sour cream', 'cream cheese', 'egg', 'eggs', 'parmesan', 'mozzarella', 'cheddar', 'feta', 'ricotta', 'heavy cream', 'half and half', 'whipped cream', 'cottage cheese'],
  Bakery: ['bread', 'tortilla', 'tortillas', 'pita', 'naan', 'baguette', 'rolls', 'buns', 'croissant', 'english muffin', 'flatbread', 'wrap', 'wraps'],
  Pantry: ['rice', 'pasta', 'noodles', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'olive oil', 'vegetable oil', 'coconut oil', 'vinegar', 'soy sauce', 'hot sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'honey', 'maple syrup', 'broth', 'stock', 'chicken broth', 'beef broth', 'canned tomatoes', 'tomato paste', 'tomato sauce', 'coconut milk', 'beans', 'black beans', 'chickpeas', 'lentils', 'oats', 'cereal', 'peanut butter', 'almonds', 'walnuts', 'pecans', 'cashews', 'dried', 'spice', 'cumin', 'paprika', 'chili powder', 'oregano', 'cinnamon', 'nutmeg', 'bay leaf', 'cornstarch', 'baking soda', 'baking powder', 'vanilla', 'sesame oil', 'fish sauce', 'worcestershire', 'breadcrumbs', 'panko'],
  Frozen: ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit', 'frozen pizza'],
  Beverages: ['juice', 'coffee', 'tea', 'water', 'soda', 'wine', 'beer'],
}

const SORTED_CATEGORY_KEYWORDS = Object.fromEntries(
  Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => [
    category,
    [...keywords].sort((a, b) => b.length - a.length),
  ]),
)

export function categorizeItem(itemName = '') {
  const value = String(itemName).toLowerCase().trim()
  if (!value) return 'Other'

  for (const category of CATEGORY_ORDER) {
    if (category === 'Other') continue
    const keywords = SORTED_CATEGORY_KEYWORDS[category] || []
    if (keywords.some((keyword) => value.includes(keyword.toLowerCase()))) {
      return category
    }
  }

  return 'Other'
}

export function groupByCategory(items = []) {
  const grouped = new Map()

  items.forEach((item) => {
    const category = categorizeItem(item?.name)
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category).push(item)
  })

  return CATEGORY_ORDER
    .filter((category) => grouped.has(category) && grouped.get(category).length > 0)
    .map((category) => ({ category, items: grouped.get(category) }))
}
