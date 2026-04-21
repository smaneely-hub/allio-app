import { parseTimers } from '../src/utils/parseTimers.js'

const cases = [
  {
    input: 'Bake for 10 minutes until golden.',
    expected: [600],
  },
  {
    input: 'Simmer for 8-10 minutes',
    expected: [600],
    expectedRange: { minSeconds: 480, maxSeconds: 600 },
  },
  {
    input: 'Rest for 1 1/2 hours',
    expected: [5400],
  },
  {
    input: 'Cook 5 min, then flip and cook another 3 mins.',
    expected: [300, 180],
  },
  {
    input: 'Preheat oven to 350. Bake 25 minutes.',
    expected: [1500],
  },
]

for (const testCase of cases) {
  const timers = parseTimers(testCase.input).filter((segment) => segment.type === 'timer')
  console.log(testCase.input)
  console.log('seconds:', timers.map((timer) => timer.seconds).join(', '))
  if (testCase.expectedRange) {
    console.log('range:', JSON.stringify(timers[0]?.range || null))
  }
  const ok = JSON.stringify(timers.map((timer) => timer.seconds)) === JSON.stringify(testCase.expected)
  const rangeOk = !testCase.expectedRange || JSON.stringify(timers[0]?.range || null) === JSON.stringify(testCase.expectedRange)
  console.log(ok && rangeOk ? 'PASS' : 'FAIL')
  if (!(ok && rangeOk)) process.exitCode = 1
  console.log('---')
}
