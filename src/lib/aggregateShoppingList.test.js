import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateShoppingList, normalizeIngredient } from './aggregateShoppingList.js'

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
  const chicken = items.find((item) => item.name === 'chicken breasts')
  assert.equal(chicken.quantity, 3)
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
  assert.equal(normalizeIngredient(' Fresh chicken breast '), 'chicken breasts')
})
