// Allio E2E Test Script
// Run with: npx playwright test e2e.spec.ts
// Or manually in browser

const BASE_URL = 'https://allio.life'

async function testFlow() {
  console.log('Starting E2E tests...\n')
  
  // Test 1: Landing page loads
  console.log('1. Testing landing page...')
  const landing = await fetch(BASE_URL)
  console.log(`   Status: ${landing.status} ${landing.status === 200 ? '✅' : '❌'}`)
  
  // Test 2: Login page accessible
  console.log('2. Testing login page...')
  const login = await fetch(`${BASE_URL}/login`)
  console.log(`   Status: ${login.status} ${login.status === 200 ? '✅' : '❌'}`)
  
  // Test 3: Edge function works
  console.log('3. Testing edge function...')
  const edgeFn = await fetch('https://rvgtmletsbycrbeycwus.supabase.co/functions/v1/generate-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'
    },
    body: JSON.stringify({
      household: { total_people: 2 },
      members: [],
      slots: []
    })
  })
  const fnResult = await edgeFn.json()
  const mealsCount = fnResult?.plan?.meals?.length || 0
  console.log(`   Status: ${edgeFn.status === 200 ? '✅' : '❌'} - Returned ${mealsCount} meals`)
  
  // Test 4: Database accessible
  console.log('4. Testing database connection...')
  const db = await fetch('https://rvgtmletsbycrbeycwus.supabase.co/rest/v1/households?limit=1', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'
    }
  })
  console.log(`   Status: ${db.status === 200 ? '✅' : '❌'} - DB accessible`)
  
  console.log('\n--- Manual Tests Needed ---')
  console.log('1. Sign up / Log in with real credentials')
  console.log('2. Complete onboarding (add household + members)')
  console.log('3. Go to Schedule, add meal slots')
  console.log('4. Click Generate, verify meal plan appears')
  console.log('5. Go to Profile, verify members listed')
}

// Run tests
testFlow().catch(console.error)