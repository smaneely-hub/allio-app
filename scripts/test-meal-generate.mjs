import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rvgtmletsbycrbeycwus.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'
)

// Sign in
const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'autotest1775707558@test.allio.life',
  password: 'TestPass123!'
})

if (error) {
  console.error('Login error:', error)
  process.exit(1)
}

console.log('Signed in as:', session.user.email)

// Test meal-generate function
console.log('\nTesting meal-generate...')
const result = await supabase.functions.invoke('meal-generate', {
  body: { prompt: 'Generate a quick dinner', servings: 2 }
})

console.log('Result:', JSON.stringify(result, null, 2))
