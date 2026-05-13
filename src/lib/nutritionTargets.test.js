import assert from 'node:assert/strict'
import { applyActivityMultiplier, applyGoalDelta, computeBMR, splitMacros } from './nutritionTargets.js'

const sedentaryLoseBmr = computeBMR({ sex: 'female', age_years: 35, height_cm: 165, weight_kg: 75 })
assert.equal(sedentaryLoseBmr, 1445)
assert.equal(applyGoalDelta(applyActivityMultiplier(sedentaryLoseBmr, 'sedentary'), 'lose'), 1234)

const activeGainBmr = computeBMR({ sex: 'male', age_years: 30, height_cm: 183, weight_kg: 82 })
assert.equal(activeGainBmr, 1819)
assert.equal(applyGoalDelta(applyActivityMultiplier(activeGainBmr, 'active'), 'gain'), 3438)

assert.equal(computeBMR({ sex: null, age_years: 30, height_cm: 170, weight_kg: 70 }), null)

assert.deepEqual(splitMacros(2000), { protein_g: 150, carbs_g: 200, fat_g: 67 })

console.log('nutritionTargets tests passed')
