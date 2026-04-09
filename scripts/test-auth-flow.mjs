// Test script with proper headers
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rvgtmletsbycrbeycwus.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'

const TEST_EMAIL = 'autotest1775707558@test.allio.life'
const TEST_PASSWORD = 'TestPass123!'

async function test() {
  console.log('=== Step 1: Sign in ===')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })
  
  if (authError) {
    console.error('Sign in failed:', authError)
    return
  }
  
  console.log('✓ Signed in')
  
  console.log('\n=== Step 2: Test generate-plan ===')
  
  const { data: { session } } = await supabase.auth.getSession()
  
  const payload = {
    household: {
      total_people: 2,
      servings: 2,
      diet_focus: '',
      cooking_comfort: 'medium'
    },
    members: [
      { id: 'd92318b5-37dd-4af0-b2ab-353ffd9dba95', label: 'Adult1', age: 35, role: 'adult', dietary_restrictions: ['vegetarian'], food_preferences: [] }
    ],
    slots: [
      { day: 'thu', meal: 'dinner', effort: 'medium', planning_notes: '' }
    ],
    recent_meal_names: []
  }
  
  // Use Supabase client's invoke which handles auth correctly
  const { data, error } = await supabase.functions.invoke('generate-plan', {
    body: payload
  })
  
  if (error) {
    console.log('Error:', error.message)
    console.log('Status:', error.status)
    return
  }
  
  console.log('✓ generate-plan succeeded!')
  console.log('Meal name:', data?.plan?.meals?.[0]?.name)
  
  if (data?.plan?.meals?.[0]) {
    console.log('\n=== Step 3: Save meal to database ===')
    
    // Save to meal_plans
    const today = new Date().toISOString().split('T')[0]
    
    const { error: planError } = await supabase.from('meal_plans').upsert({
      user_id: session.user.id,
      household_id: 'c2b94a97-6976-4b3e-88a9-1ab6cc3a3b20',
      week_of: today,
      status: 'active',
      plan: { meals: [data.plan.meals[0]] },
      draft_plan: { meals: [data.plan.meals[0]] },
      updated_at: new Date().toISOString()
    })
    
    if (planError) {
      console.log('meal_plans save:', planError.message)
    } else {
      console.log('✓ Saved to meal_plans')
    }
    
    // Create meal_instance
    const { error: instanceError } = await supabase.from('meal_instances').insert({
      household_id: 'c2b94a97-6976-4b3e-88a9-1ab6cc3a3b20',
      user_id: session.user.id,
      recipe_name: data.plan.meals[0].name,
      selected_member_ids: ['d92318b5-37dd-4af0-b2ab-353ffd9dba95'],
      status: 'generated'
    })
    
    if (instanceError) {
      console.log('meal_instances save:', instanceError.message)
    } else {
      console.log('✓ Created meal_instance')
    }
    
    // Test persistence - reload
    console.log('\n=== Step 4: Test persistence ===')
    
    const { data: loadedPlan } = await supabase
      .from('meal_plans')
      .select('plan')
      .eq('user_id', session.user.id)
      .eq('week_of', today)
      .eq('status', 'active')
      .maybeSingle()
      
    console.log('Loaded meal:', loadedPlan?.plan?.meals?.[0]?.name || 'none')
    
    // Test swap
    console.log('\n=== Step 5: Test swap ===')
    
    const swapPayload = {
      ...payload,
      replace_slot: {
        day: 'thu',
        meal: 'dinner',
        suggestion: 'something different',
        current_meal_name: data.plan.meals[0].name
      },
      recent_meal_names: [data.plan.meals[0].name]
    }
    
    const { data: swapData, error: swapError } = await supabase.functions.invoke('generate-plan', {
      body: swapPayload
    })
    
    if (swapError) {
      console.log('Swap error:', swapError.message)
    } else {
      console.log('✓ Swap succeeded!')
      console.log('New meal:', swapData?.plan?.meals?.[0]?.name)
      console.log('Same as before:', swapData?.plan?.meals?.[0]?.name === data.plan.meals[0].name ? 'NO (good)' : 'YES')
    }
  }
  
  console.log('\n=== ALL TESTS COMPLETE ===')
}

test().catch(console.error)