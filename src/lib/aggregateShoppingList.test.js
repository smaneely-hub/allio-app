import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateShoppingList, filterMealsForShoppingWindow } from './aggregateShoppingList.js'
import { SHOPPING_EVENT_TYPE } from './planner.js'
import { normalizeIngredientName } from './shoppingListUtils.js'

const samplePlan = {
  meals: [
    {
      name: 'Meal A',
      is_leftover: false,
      ingredients: [
        { item: 'Fresh chicken breast', quantity: 2, unit: 'lb', category: 'protein' },
        { item: 'Rice', quantity: 1, unit: 'bag', category: 'grains/pantry' },
      ],
    },
    {
      name: 'Meal B',
      is_leftover: false,
      ingredients: [
        { item: 'chicken breasts', quantity: 1, unit: 'lb', category: 'protein' },
        { item: 'Broccoli', quantity: 2, unit: 'head', category: 'produce' },
      ],
    },
  ],
}

test('basic aggregation across two meals', () => {
  const items = aggregateShoppingList(samplePlan, '')
  assert.equal(items.length, 3)
})

test('deduplication of same ingredient across meals', () => {
  const items = aggregateShoppingList(samplePlan, '')
  const chicken = items.find((item) => item.normalizedName === 'chicken breasts')
  assert.equal(chicken.quantity, 3)
  assert.equal(chicken.unit, 'lb')
})

test('staple removal', () => {
  const items = aggregateShoppingList(samplePlan, 'rice')
  assert.equal(items.some((item) => item.name === 'rice'), false)
})

test('leftover meals excluded', () => {
  const plan = {
    meals: [
      { name: 'Meal C', is_leftover: true, ingredients: [{ item: 'Milk', quantity: 1, unit: 'carton' }] },
    ],
  }
  const items = aggregateShoppingList(plan, '')
  assert.equal(items.length, 0)
})

test('category assignment', () => {
  const items = aggregateShoppingList({ meals: [{ name: 'Meal D', is_leftover: false, ingredients: [{ item: 'Yogurt', quantity: 1, unit: 'tub' }] }] }, '')
  assert.equal(items[0].category, 'dairy')
})

test('normalize ingredient removes adjectives and applies synonyms', () => {
  assert.equal(normalizeIngredientName('Fresh chicken breast'), 'chicken breasts')
})

test('shopping window includes meals through the next scheduled shopping day', () => {
  const meals = [
    { name: 'Near Meal', date: '2026-05-16', ingredients: [{ item: 'Milk', quantity: 1, unit: 'carton' }] },
    { name: 'Far Meal', date: '2026-05-20', ingredients: [{ item: 'Bread', quantity: 1, unit: 'loaf' }] },
  ]
  const filtered = filterMealsForShoppingWindow(meals, {
    shoppingDay: 'Friday',
    referenceDate: new Date('2026-05-16T12:00:00Z'),
  })
  assert.equal(filtered.length, 2)
  assert.deepEqual(filtered.map((meal) => meal.name), ['Near Meal', 'Far Meal'])
})

test('aggregate shopping list respects shopping window option', () => {
  const items = aggregateShoppingList({
    meals: [
      { name: 'Meal A', date: '2026-05-16', ingredients: [{ item: 'Eggs', quantity: 1, unit: 'dozen' }] },
      { name: 'Meal B', date: '2026-05-19', ingredients: [{ item: 'Pasta', quantity: 1, unit: 'box' }] },
    ],
  }, '', { shoppingDay: 'Friday', referenceDate: new Date('2026-05-16T12:00:00Z') })
  assert.equal(items.length, 2)
  assert.deepEqual(items.map((item) => item.normalizedName), ['eggs', 'pasta'])
})

test('explicit next shopping date overrides weekly shopping day window', () => {
  const filtered = filterMealsForShoppingWindow([
    { name: 'Today Meal', date: '2026-05-17', ingredients: [{ item: 'Apples', quantity: 2, unit: 'count' }] },
    { name: 'Before Override Date', date: '2026-05-19', ingredients: [{ item: 'Bread', quantity: 1, unit: 'loaf' }] },
    { name: 'After Override Date', date: '2026-05-21', ingredients: [{ item: 'Milk', quantity: 1, unit: 'carton' }] },
  ], {
    shoppingDay: 'Sunday',
    nextShoppingDate: '2026-05-20',
    referenceDate: new Date('2026-05-17T12:00:00Z'),
  })
  assert.equal(filtered.length, 2)
  assert.deepEqual(filtered.map((meal) => meal.name), ['Today Meal', 'Before Override Date'])
})

test('shopping events determine shopping window before weekly fallback', () => {
  const filtered = filterMealsForShoppingWindow([
    { name: 'Keep Me', date: '2026-05-17', ingredients: [{ item: 'Eggs', quantity: 1, unit: 'dozen' }] },
    { name: 'Keep Me Too', date: '2026-05-19', ingredients: [{ item: 'Bread', quantity: 1, unit: 'loaf' }] },
    { name: 'Skip Me', date: '2026-05-21', ingredients: [{ item: 'Milk', quantity: 1, unit: 'carton' }] },
    { event_type: SHOPPING_EVENT_TYPE, name: 'Shopping day', date: '2026-05-20', recurrence: { frequency: 'none', interval: 1, byWeekday: [], endType: 'never', endDate: null, endCount: null, exdates: [] } },
  ], {
    referenceDate: new Date('2026-05-17T12:00:00Z'),
    shoppingEvents: [{ event_type: SHOPPING_EVENT_TYPE, name: 'Shopping day', date: '2026-05-20', recurrence: { frequency: 'none', interval: 1, byWeekday: [], endType: 'never', endDate: null, endCount: null, exdates: [] } }],
  })
  assert.deepEqual(filtered.map((meal) => meal.name), ['Keep Me', 'Keep Me Too'])
})

test('aggregate shopping list removes planned items after the meal date passes', () => {
  const items = aggregateShoppingList({
    meals: [
      { name: 'Expired Meal', date: '2026-05-15', ingredients: [{ item: 'Milk', quantity: 1, unit: 'carton' }] },
      { name: 'Upcoming Meal', date: '2026-05-17', ingredients: [{ item: 'Bread', quantity: 1, unit: 'loaf' }] },
    ],
  }, '', { referenceDate: new Date('2026-05-16T12:00:00Z') })
  assert.equal(items.length, 1)
  assert.equal(items[0].normalizedName, 'bread')
})
