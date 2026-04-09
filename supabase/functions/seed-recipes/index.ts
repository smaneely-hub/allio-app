import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

const seedRecipes = [
  {
    title: 'Mediterranean Lamb Bowl With Salsa And Pickled Onions',
    slug: 'dinner-1-lamb-mediterranean-roasted',
    description: 'A mediterranean dinner with lamb roasted. A family-friendly weeknight meal.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 20,
    cook_time_minutes: 22,
    servings: 4,
    ingredients_json: JSON.stringify([
      {item: 'lamb', quantity: '1', unit: 'lb'},
      {item: 'spinach', quantity: '2', unit: 'cups'},
      {item: 'olive oil', quantity: '2', unit: 'tbsp'},
      {item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced'},
      {item: 'salt', quantity: '1', unit: 'tsp'},
      {item: 'pepper', quantity: '1/2', unit: 'tsp'},
      {item: 'orzo', quantity: '2', unit: 'cups', notes: 'cooked'}
    ]),
    instructions_json: JSON.stringify([
      'Season lamb with salt, pepper, and any spices',
      'Heat oil in a large skillet over medium-high heat',
      'Cook lamb for 7 minutes per side until done',
      'Add spinach and cook until tender, about 4 minutes',
      'Season to taste and serve warm'
    ]),
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Grilled Salmon With Asparagus And Lemon Butter',
    slug: 'dinner-4-salmon-american-grilled',
    description: 'An american dinner with salmon grilled. A family-friendly weeknight meal.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      {item: 'salmon fillets', quantity: '4', unit: 'pieces'},
      {item: 'asparagus', quantity: '1', unit: 'bunch'},
      {item: 'butter', quantity: '4', unit: 'tbsp'},
      {item: 'lemon', quantity: '1', unit: 'whole'},
      {item: 'garlic', quantity: '2', unit: 'cloves', notes: 'minced'},
      {item: 'dill', quantity: '1', unit: 'tbsp', notes: 'fresh'}
    ]),
    instructions_json: JSON.stringify([
      'Preheat grill to medium-high',
      'Season salmon with salt and pepper',
      'Grill salmon 4 minutes per side',
      'Grill asparagus 5 minutes',
      'Melt butter with garlic and lemon',
      'Drizzle over salmon and serve'
    ]),
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Chicken Tikka Masala With Basmati Rice',
    slug: 'dinner-5-chicken-indian-tikka',
    description: 'An indian dinner with chicken tikka masala. A family-friendly weeknight meal.',
    cuisine: 'Indian',
    meal_type: 'dinner',
    prep_time_minutes: 25,
    cook_time_minutes: 35,
    servings: 6,
    ingredients_json: JSON.stringify([
      {item: 'chicken breast', quantity: '1.5', unit: 'lb', notes: 'cubed'},
      {item: 'yogurt', quantity: '1', unit: 'cup'},
      {item: 'tomato puree', quantity: '14', unit: 'oz'},
      {item: 'garam masala', quantity: '2', unit: 'tbsp'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'ginger', quantity: '1', unit: 'inch', notes: 'grated'},
      {item: 'heavy cream', quantity: '1/2', unit: 'cup'},
      {item: 'basmati rice', quantity: '2', unit: 'cups'}
    ]),
    instructions_json: JSON.stringify([
      'Marinate chicken in yogurt and spices for 30 min',
      'Grill or pan-fry chicken until charred',
      'Sauté garlic and ginger',
      'Add tomato puree and garam masala',
      'Simmer 15 minutes',
      'Stir in cream',
      'Serve over basmati rice'
    ]),
    kid_friendly_score: 5,
    weeknight_score: 6,
    active: true
  },
  {
    title: 'Beef Tacos With Fresh Salsa And Guacamole',
    slug: 'dinner-6-beef-mexican-tacos',
    description: 'A mexican dinner with beef tacos. A family-friendly weeknight meal.',
    cuisine: 'Mexican',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    servings: 8,
    ingredients_json: JSON.stringify([
      {item: 'ground beef', quantity: '1.5', unit: 'lb'},
      {item: 'taco shells', quantity: '12', unit: 'pieces'},
      {item: 'onion', quantity: '1', unit: 'medium', notes: 'diced'},
      {item: 'tomatoes', quantity: '2', unit: 'medium', notes: 'diced'},
      {item: 'avocado', quantity: '2', unit: 'ripe'},
      {item: 'lime', quantity: '1', unit: 'whole'},
      {item: 'cilantro', quantity: '1/4', unit: 'cup', notes: 'fresh, chopped'},
      {item: 'cumin', quantity: '1', unit: 'tsp'}
    ]),
    instructions_json: JSON.stringify([
      'Brown beef with onion and cumin',
      'Warm taco shells',
      'Make salsa: mix tomatoes, onion, cilantro, lime',
      'Make guacamole: mash avocado with lime and salt',
      'Fill shells with beef, top with salsa and guacamole'
    ]),
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Pasta Primavera With Garlic Bread',
    slug: 'dinner-7-pasta-italian-primavera',
    description: 'An italian dinner with pasta primavera. A family-friendly weeknight meal.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 25,
    servings: 6,
    ingredients_json: JSON.stringify([
      {item: 'penne pasta', quantity: '1', unit: 'lb'},
      {item: 'zucchini', quantity: '2', unit: 'medium', notes: 'sliced'},
      {item: 'bell peppers', quantity: '2', unit: 'medium', notes: 'sliced'},
      {item: 'cherry tomatoes', quantity: '1', unit: 'cup', notes: 'halved'},
      {item: 'parmesan', quantity: '1/2', unit: 'cup', notes: 'grated'},
      {item: 'olive oil', quantity: '3', unit: 'tbsp'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'italian herbs', quantity: '1', unit: 'tbsp'}
    ]),
    instructions_json: JSON.stringify([
      'Cook pasta according to package',
      'Sauté zucchini and peppers in olive oil',
      'Add tomatoes and garlic, cook 5 min',
      'Toss with pasta and herbs',
      'Top with parmesan',
      'Serve with garlic bread'
    ]),
    kid_friendly_score: 7,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Thai Basil Chicken With Jasmine Rice',
    slug: 'dinner-8-chicken-thai-basil',
    description: 'A thai dinner with chicken basil. A family-friendly weeknight meal.',
    cuisine: 'Thai',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      {item: 'chicken breast', quantity: '1', unit: 'lb', notes: 'sliced'},
      {item: 'thai basil', quantity: '1', unit: 'cup', notes: 'fresh'},
      {item: 'fish sauce', quantity: '2', unit: 'tbsp'},
      {item: 'soy sauce', quantity: '1', unit: 'tbsp'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'thai chili', quantity: '2', unit: 'pieces', notes: 'sliced'},
      {item: 'jasmine rice', quantity: '2', unit: 'cups'}
    ]),
    instructions_json: JSON.stringify([
      'Cook jasmine rice',
      'Heat oil in wok over high heat',
      'Stir-fry chicken 3 minutes',
      'Add garlic and chili, cook 1 min',
      'Add sauces and basil, toss',
      'Serve immediately over rice'
    ]),
    kid_friendly_score: 6,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Korean Beef Bulgogi With Sesame Broccoli',
    slug: 'dinner-10-beef-korean-bulgogi',
    description: 'A korean dinner with beef bulgogi. A family-friendly weeknight meal.',
    cuisine: 'Korean',
    meal_type: 'dinner',
    prep_time_minutes: 20,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      {item: 'beef sirloin', quantity: '1', unit: 'lb', notes: 'thinly sliced'},
      {item: 'soy sauce', quantity: '1/4', unit: 'cup'},
      {item: 'sesame oil', quantity: '2', unit: 'tbsp'},
      {item: 'brown sugar', quantity: '2', unit: 'tbsp'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'ginger', quantity: '1', unit: 'inch', notes: 'grated'},
      {item: 'broccoli', quantity: '2', unit: 'cups', notes: 'florets'},
      {item: 'sesame seeds', quantity: '1', unit: 'tbsp'}
    ]),
    instructions_json: JSON.stringify([
      'Marinate beef in soy sauce, sesame oil, sugar, garlic, ginger for 30 min',
      'Heat skillet over high heat',
      'Cook beef in batches 2 min per side',
      'Steam broccoli until tender-crisp',
      'Toss broccoli with sesame oil and seeds',
      'Serve beef over broccoli'
    ]),
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'One-Pan Lemon Herb Chicken with Roasted Vegetables',
    slug: 'dinner-11-chicken-lemon-herb-roasted',
    description: 'A quick weeknight dinner with juicy chicken and caramelized vegetables.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 35,
    servings: 4,
    ingredients_json: JSON.stringify([
      {item: 'chicken breast', quantity: '4', unit: 'pieces', notes: 'boneless'},
      {item: 'olive oil', quantity: '3', unit: 'tbsp'},
      {item: 'lemon', quantity: '1', unit: 'whole', notes: 'sliced'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'rosemary', quantity: '2', unit: 'tbsp', notes: 'fresh, chopped'},
      {item: 'thyme', quantity: '1', unit: 'tbsp', notes: 'fresh'},
      {item: 'baby potatoes', quantity: '1', unit: 'lb', notes: 'halved'},
      {item: 'carrots', quantity: '2', unit: 'medium', notes: 'chunked'},
      {item: 'salt', quantity: '1', unit: 'tsp'},
      {item: 'pepper', quantity: '1/2', unit: 'tsp'}
    ]),
    instructions_json: JSON.stringify([
      'Preheat oven to 425°F (220°C). Pat chicken dry and season with salt, pepper, and herbs.',
      'Heat oil in a large oven-safe skillet over medium-high heat. Sear chicken 3-4 minutes per side until golden.',
      'Add potatoes and carrots to the pan, season with more herbs and lemon slices.',
      'Transfer skillet to oven and roast 25-30 minutes until chicken reaches 165°F and vegetables are tender.',
      'Rest chicken 5 minutes before serving. Garnish with fresh lemon wedges.'
    ]),
    kid_friendly_score: 7,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Garlic Shrimp Stir-Fry with Bell Peppers',
    slug: 'dinner-12-shrimp-asian-stir-fry',
    description: 'Quick Asian-inspired shrimp with crisp vegetables in savory sauce.',
    cuisine: 'Asian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      {item: 'large shrimp', quantity: '1', unit: 'lb', notes: 'peeled, deveined'},
      {item: 'bell peppers', quantity: '2', unit: 'medium', notes: 'sliced'},
      {item: 'snap peas', quantity: '1', unit: 'cup'},
      {item: 'sesame oil', quantity: '2', unit: 'tbsp'},
      {item: 'soy sauce', quantity: '3', unit: 'tbsp'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'ginger', quantity: '1', unit: 'inch', notes: 'grated'},
      {item: 'rice vinegar', quantity: '1', unit: 'tbsp'},
      {item: 'brown sugar', quantity: '1', unit: 'tbsp'},
      {item: 'cornstarch', quantity: '1', unit: 'tsp'}
    ]),
    instructions_json: JSON.stringify([
      'Mix soy sauce, rice vinegar, brown sugar, and cornstarch in a small bowl. Set aside.',
      'Heat sesame oil in a wok or large skillet over high heat until smoking.',
      'Add shrimp and stir-fry 2-3 minutes until pink. Remove and set aside.',
      'Add bell peppers and snap peas, stir-fry 3-4 minutes until crisp-tender.',
      'Add garlic and ginger, cook 30 seconds until fragrant.',
      'Return shrimp to pan, add sauce, and toss until everything is coated and sauce thickens.',
      'Serve immediately over steamed rice.'
    ]),
    kid_friendly_score: 6,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Italian Sausage and White Bean Stew',
    slug: 'dinner-13-sausage-italian-stew',
    description: 'Hearty rustic stew with spicy sausage and creamy beans.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 40,
    servings: 6,
    ingredients_json: JSON.stringify([
      {item: 'Italian sausage', quantity: '1', unit: 'lb', notes: 'sweet or spicy'},
      {item: 'cannellini beans', quantity: '2', unit: 'cans', notes: 'drained, rinsed'},
      {item: 'diced tomatoes', quantity: '1', unit: 'can (14oz)'},
      {item: 'chicken broth', quantity: '2', unit: 'cups'},
      {item: 'onion', quantity: '1', unit: 'large', notes: 'diced'},
      {item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced'},
      {item: 'Italian herbs', quantity: '2', unit: 'tsp', notes: 'oregano, basil, thyme'},
      {item: 'kale', quantity: '3', unit: 'cups', notes: 'stems removed'},
      {item: 'olive oil', quantity: '2', unit: 'tbsp'},
      {item: 'salt and pepper', quantity: 'to taste'}
    ]),
    instructions_json: JSON.stringify([
      'Heat olive oil in a large pot over medium heat. Add sausage and break into chunks.',
      'Cook sausage 5-6 minutes until browned. Add onion and cook 3 minutes until soft.',
      'Add garlic and Italian herbs, cook 1 minute until fragrant.',
      'Pour in tomatoes and broth. Add beans. Bring to a simmer.',
      'Simmer 25-30 minutes, stirring occasionally, until stew thickens slightly.',
      'Stir in kale and cook 5 minutes until wilted but still bright green.',
      'Season with salt and pepper. Serve with crusty bread.'
    ]),
    kid_friendly_score: 7,
    weeknight_score: 6,
    active: true
  }
]

Deno.serve(async (req) => {
  try {
    // First delete all recipes
    await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Insert new recipes
    const { error } = await supabase.from('recipes').upsert(seedRecipes, { onConflict: 'slug' })
    
    if (error) throw error
    
    return new Response(JSON.stringify({ success: true, count: seedRecipes.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})