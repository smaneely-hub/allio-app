import { createClient } from '@supabase/supabase-js'

const url = 'https://rvgtmletsbycrbeycwus.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'

const supabase = createClient(url, key)

// Delete all old recipes
console.log('Deleting old recipes...')
const { error: deleteError } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
if (deleteError) console.log('Delete error:', deleteError.message)
else console.log('Deleted')

// Read and parse the good seed file
import { readFileSync } from 'fs'
const seedContent = readFileSync('./supabase/seed/dinners_seed_500_final.sql', 'utf8')

// Extract INSERT statements - simplified parser
const insertMatch = seedContent.match(/INSERT INTO recipes.*VALUES (.*);/s)
if (!insertMatch) {
  console.log('No INSERT found')
  process.exit(1)
}

console.log('Parsing seed data...')
