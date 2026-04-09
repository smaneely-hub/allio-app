/**
 * Demographic-based serving calculation utilities
 * V1: Simple sum of serving equivalents, rounded to practical count
 */

// Age bracket weights for serving equivalents
const DEMOGRAPHIC_WEIGHTS = {
  toddler: 0.4,      // 0-4 years
  child: 0.7,        // 5-9 years  
  preteen: 0.85,     // 10-12 years
  teen: 1.0,         // 13-17 years
  adult: 1.0,        // 18-64 years
  older_adult: 0.9,  // 65+ years
}

/**
 * Get demographic bucket from age
 * @param {number|null} age - Age in years
 * @returns {string} Demographic bucket name
 */
export function getDemographicBucket(age) {
  if (age === null || age === undefined || age === '') return 'adult'
  const n = Number(age)
  if (Number.isNaN(n)) return 'adult'
  if (n <= 4) return 'toddler'
  if (n <= 9) return 'child'
  if (n <= 12) return 'preteen'
  if (n <= 17) return 'teen'
  if (n >= 65) return 'older_adult'
  return 'adult'
}

/**
 * Get serving equivalent weight for an age
 * @param {number|null} age - Age in years
 * @returns {number} Serving weight (0.4 to 1.0)
 */
export function getServingEquivalent(age) {
  const bucket = getDemographicBucket(age)
  return DEMOGRAPHIC_WEIGHTS[bucket] ?? 1.0
}

/**
 * Calculate total servings based on selected household members
 * @param {Array} members - Array of member objects with optional 'age' property
 * @param {number} minServings - Minimum servings to return (default: 1)
 * @returns {number} Rounded serving count
 */
export function calculateServings(members, minServings = 1) {
  if (!members || members.length === 0) {
    return minServings
  }

  const totalEquivalent = members.reduce((sum, member) => {
    const age = member.age
    const equivalent = getServingEquivalent(age)
    return sum + equivalent
  }, 0)

  // Round to practical number (0.5 increments, then round to nearest integer)
  const roundedServings = Math.max(Math.round(totalEquivalent), minServings)

  return roundedServings
}

/**
 * Log serving calculation details (for debugging/verification)
 * @param {Array} members - Selected members
 * @param {number} finalServings - Final calculated servings
 */
export function logServingsCalculation(members, finalServings) {
  const memberDetails = members.map(m => ({
    id: m.id,
    age: m.age,
    bucket: getDemographicBucket(m.age),
    weight: getServingEquivalent(m.age)
  }))
  
  const totalWeight = memberDetails.reduce((sum, m) => sum + m.weight, 0)
  
  console.log('[Servings] Calculation details:', {
    members: memberDetails,
    totalWeight: totalWeight.toFixed(2),
    finalServings
  })
}
