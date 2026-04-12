import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

const seedRecipes = [
  {
    title: 'Mediterranean Lamb Bowls with Herbed Orzo and Quick Pickled Onions',
    slug: 'dinner-1-lamb-mediterranean-roasted',
    description: 'Savory lamb served over lemony orzo with spinach and tangy quick-pickled onions.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 20,
    cook_time_minutes: 22,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'ground lamb', quantity: '1', unit: 'lb' },
      { item: 'baby spinach', quantity: '4', unit: 'cups' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' },
      { item: 'dry orzo', quantity: '1', unit: 'cup' },
      { item: 'water', quantity: '2', unit: 'cups' },
      { item: 'red onion', quantity: '1/2', unit: 'medium', notes: 'thinly sliced' },
      { item: 'red wine vinegar', quantity: '2', unit: 'tbsp' },
      { item: 'dried oregano', quantity: '1', unit: 'tsp' },
      { item: 'cherry tomatoes', quantity: '1', unit: 'cup', notes: 'halved' }
    ]),
    instructions_json: JSON.stringify([
      'Bring the water and a pinch of salt to a boil in a small saucepan. Stir in the orzo and cook until tender, about 8 to 10 minutes, then drain if needed.',
      'While the orzo cooks, toss the red onion with red wine vinegar and let it sit to quick-pickle.',
      'Heat 1 tablespoon olive oil in a large skillet over medium-high heat. Add the lamb, oregano, salt, and pepper, then cook for 6 to 8 minutes, breaking it up until browned.',
      'Stir in the garlic and tomatoes, then cook for 1 minute. Add the spinach and cook until wilted, about 2 minutes.',
      'Toss the cooked orzo with the remaining 1 tablespoon olive oil, then divide among bowls. Top with the lamb mixture and pickled onions before serving.'
    ]),
    tags_json: JSON.stringify(['quick', 'high-protein', 'weeknight', 'under-45-min']),
    difficulty: 'easy',
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Grilled Salmon with Asparagus and Lemon Garlic Butter',
    slug: 'dinner-4-salmon-american-grilled',
    description: 'Flaky salmon and crisp asparagus finished with a bright lemon garlic butter sauce.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'salmon fillets', quantity: '4', unit: 'pieces', notes: 'about 6 oz each' },
      { item: 'asparagus', quantity: '1', unit: 'lb', notes: 'trimmed' },
      { item: 'unsalted butter', quantity: '4', unit: 'tbsp' },
      { item: 'lemon', quantity: '1', unit: 'whole', notes: 'zested and juiced' },
      { item: 'garlic', quantity: '2', unit: 'cloves', notes: 'minced' },
      { item: 'fresh dill', quantity: '1', unit: 'tbsp', notes: 'chopped' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Preheat a grill or grill pan to medium-high heat. Brush the salmon and asparagus with olive oil, then season with salt and pepper.',
      'Grill the salmon for 4 to 5 minutes per side until it flakes easily. Grill the asparagus for 5 to 6 minutes, turning once, until tender-crisp.',
      'While the salmon cooks, melt the butter in a small saucepan over low heat. Stir in the garlic, lemon zest, lemon juice, and dill, then cook for 1 minute.',
      'Transfer the salmon and asparagus to plates and spoon the lemon garlic butter over the top before serving.'
    ]),
    tags_json: JSON.stringify(['quick', 'seafood', 'high-protein', 'under-30-min']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Chicken Tikka Masala with Basmati Rice',
    slug: 'dinner-5-chicken-indian-tikka',
    description: 'Tender chicken in a creamy tomato curry served with fluffy basmati rice.',
    cuisine: 'Indian',
    meal_type: 'dinner',
    prep_time_minutes: 25,
    cook_time_minutes: 35,
    servings: 6,
    ingredients_json: JSON.stringify([
      { item: 'chicken breast', quantity: '1 1/2', unit: 'lb', notes: 'cut into bite-size pieces' },
      { item: 'plain yogurt', quantity: '1', unit: 'cup' },
      { item: 'tomato puree', quantity: '14', unit: 'oz' },
      { item: 'garam masala', quantity: '2', unit: 'tbsp' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'fresh ginger', quantity: '1', unit: 'tbsp', notes: 'grated' },
      { item: 'heavy cream', quantity: '1/2', unit: 'cup' },
      { item: 'basmati rice', quantity: '2', unit: 'cups' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'diced' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'kosher salt', quantity: '1 1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Cook the basmati rice according to package directions and keep warm.',
      'In a bowl, mix the chicken with the yogurt, 1 tablespoon garam masala, and 1/2 teaspoon salt. Let it sit while you prep the sauce.',
      'Heat 1 tablespoon oil in a large skillet over medium-high heat. Cook the chicken for 6 to 8 minutes until lightly charred and mostly cooked through, then transfer to a plate.',
      'Add the remaining oil and onion to the skillet. Cook for 4 minutes, then stir in the garlic, ginger, remaining garam masala, and remaining salt.',
      'Pour in the tomato puree and simmer for 10 minutes. Stir in the cream and return the chicken to the pan.',
      'Simmer for 8 to 10 minutes until the chicken is fully cooked and the sauce thickens. Serve over basmati rice.'
    ]),
    tags_json: JSON.stringify(['family-friendly', 'high-protein', 'comfort-food', 'meal-prep']),
    difficulty: 'medium',
    kid_friendly_score: 5,
    weeknight_score: 6,
    active: true
  },
  {
    title: 'Beef Tacos with Fresh Salsa and Guacamole',
    slug: 'dinner-6-beef-mexican-tacos',
    description: 'Crispy tacos loaded with seasoned beef, chopped salsa, and creamy guacamole.',
    cuisine: 'Mexican',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'ground beef', quantity: '1 1/2', unit: 'lb' },
      { item: 'taco shells', quantity: '12', unit: 'pieces' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'divided, half diced and half minced' },
      { item: 'roma tomatoes', quantity: '2', unit: 'medium', notes: 'diced' },
      { item: 'avocado', quantity: '2', unit: 'large' },
      { item: 'lime', quantity: '1', unit: 'whole' },
      { item: 'fresh cilantro', quantity: '1/4', unit: 'cup', notes: 'chopped' },
      { item: 'ground cumin', quantity: '1', unit: 'tsp' },
      { item: 'chili powder', quantity: '2', unit: 'tsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat a large skillet over medium heat. Add the beef, diced onion, cumin, chili powder, and 1/2 teaspoon salt, then cook for 8 to 10 minutes until browned.',
      'While the beef cooks, combine the tomatoes, minced onion, cilantro, juice from half the lime, and a pinch of salt to make a quick salsa.',
      'Mash the avocados with the remaining lime juice and 1/2 teaspoon salt until mostly smooth to make the guacamole.',
      'Warm the taco shells according to package directions.',
      'Fill each shell with beef, then top with salsa and guacamole before serving.'
    ]),
    tags_json: JSON.stringify(['quick', 'family-friendly', 'kid-friendly', 'under-30-min']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Pasta Primavera with Garlic Parmesan Bread',
    slug: 'dinner-7-pasta-italian-primavera',
    description: 'Colorful vegetables and pasta tossed in garlic oil with plenty of Parmesan.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 25,
    servings: 6,
    ingredients_json: JSON.stringify([
      { item: 'penne pasta', quantity: '1', unit: 'lb' },
      { item: 'zucchini', quantity: '2', unit: 'medium', notes: 'sliced into half-moons' },
      { item: 'bell peppers', quantity: '2', unit: 'medium', notes: 'sliced' },
      { item: 'cherry tomatoes', quantity: '1', unit: 'cup', notes: 'halved' },
      { item: 'parmesan cheese', quantity: '1/2', unit: 'cup', notes: 'grated, plus more for serving' },
      { item: 'olive oil', quantity: '3', unit: 'tbsp' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'Italian seasoning', quantity: '1', unit: 'tbsp' },
      { item: 'Italian bread', quantity: '1', unit: 'loaf' },
      { item: 'butter', quantity: '2', unit: 'tbsp', notes: 'softened' },
      { item: 'kosher salt', quantity: '1 1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Cook the penne in salted water according to package directions until al dente. Reserve 1/2 cup pasta water, then drain.',
      'While the pasta cooks, mix the softened butter with 1 minced garlic clove and spread it over sliced bread. Toast until golden.',
      'Heat the olive oil in a large skillet over medium heat. Add the zucchini and bell peppers and cook for 5 minutes until they begin to soften.',
      'Stir in the remaining garlic, cherry tomatoes, Italian seasoning, and salt, then cook for 2 minutes more.',
      'Add the drained pasta, Parmesan, and a splash of reserved pasta water. Toss until glossy and evenly coated.',
      'Serve the pasta warm with the garlic bread on the side.'
    ]),
    tags_json: JSON.stringify(['vegetarian', 'family-friendly', 'weeknight', 'meatless']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Thai Basil Chicken with Jasmine Rice',
    slug: 'dinner-8-chicken-thai-basil',
    description: 'Savory-sweet chicken stir-fry with basil, garlic, and just enough heat.',
    cuisine: 'Thai',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken breast', quantity: '1', unit: 'lb', notes: 'thinly sliced' },
      { item: 'Thai basil', quantity: '1', unit: 'cup', notes: 'loosely packed' },
      { item: 'fish sauce', quantity: '2', unit: 'tbsp' },
      { item: 'soy sauce', quantity: '1', unit: 'tbsp' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'Thai chili', quantity: '2', unit: 'pieces', notes: 'thinly sliced' },
      { item: 'jasmine rice', quantity: '2', unit: 'cups' },
      { item: 'vegetable oil', quantity: '1', unit: 'tbsp' },
      { item: 'brown sugar', quantity: '1', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Cook the jasmine rice according to package directions and keep warm.',
      'Whisk together the fish sauce, soy sauce, and brown sugar in a small bowl.',
      'Heat the oil in a wok or large skillet over high heat. Add the chicken and stir-fry for 3 to 4 minutes until nearly cooked through.',
      'Add the garlic and Thai chili, then cook for 30 seconds until fragrant.',
      'Pour in the sauce and toss for 1 minute. Stir in the basil and cook just until wilted.',
      'Serve the chicken over bowls of jasmine rice.'
    ]),
    tags_json: JSON.stringify(['quick', 'high-protein', 'under-30-min', 'weeknight']),
    difficulty: 'easy',
    kid_friendly_score: 6,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Korean Beef Bulgogi with Sesame Broccoli',
    slug: 'dinner-10-beef-korean-bulgogi',
    description: 'Sweet-savory bulgogi beef served with tender broccoli and sesame flavor.',
    cuisine: 'Korean',
    meal_type: 'dinner',
    prep_time_minutes: 20,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'beef sirloin', quantity: '1', unit: 'lb', notes: 'thinly sliced' },
      { item: 'soy sauce', quantity: '1/4', unit: 'cup' },
      { item: 'sesame oil', quantity: '2', unit: 'tbsp', notes: 'divided' },
      { item: 'brown sugar', quantity: '2', unit: 'tbsp' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'fresh ginger', quantity: '1', unit: 'tbsp', notes: 'grated' },
      { item: 'broccoli florets', quantity: '4', unit: 'cups' },
      { item: 'sesame seeds', quantity: '1', unit: 'tbsp' },
      { item: 'green onions', quantity: '2', unit: 'whole', notes: 'sliced' }
    ]),
    instructions_json: JSON.stringify([
      'In a bowl, combine the beef with soy sauce, 1 tablespoon sesame oil, brown sugar, garlic, and ginger. Let it marinate for 15 minutes while you prep the broccoli.',
      'Steam or microwave the broccoli until tender-crisp, about 4 to 5 minutes. Toss with the remaining sesame oil and the sesame seeds.',
      'Heat a large skillet over high heat. Cook the beef in two batches for 2 to 3 minutes per batch until browned at the edges.',
      'Return all of the beef to the pan and toss with any remaining marinade for 30 seconds.',
      'Serve the bulgogi with the sesame broccoli and top with sliced green onions.'
    ]),
    tags_json: JSON.stringify(['high-protein', 'weeknight', 'under-30-min', 'family-friendly']),
    difficulty: 'easy',
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'One-Pan Lemon Herb Chicken with Roasted Vegetables',
    slug: 'dinner-11-chicken-lemon-herb-roasted',
    description: 'Juicy chicken roasted with potatoes, carrots, and bright lemon herb flavor.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 35,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken breast', quantity: '4', unit: 'pieces', notes: 'boneless, skinless' },
      { item: 'olive oil', quantity: '3', unit: 'tbsp' },
      { item: 'lemon', quantity: '1', unit: 'whole', notes: 'half juiced, half sliced' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'fresh rosemary', quantity: '2', unit: 'tsp', notes: 'chopped' },
      { item: 'fresh thyme', quantity: '1', unit: 'tsp', notes: 'chopped' },
      { item: 'baby potatoes', quantity: '1', unit: 'lb', notes: 'halved' },
      { item: 'carrots', quantity: '2', unit: 'medium', notes: 'cut into chunks' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Preheat the oven to 425°F. Pat the chicken dry, then rub it with 1 tablespoon olive oil, the lemon juice, garlic, rosemary, thyme, salt, and pepper.',
      'Toss the potatoes and carrots with the remaining olive oil and a pinch of salt on a large sheet pan.',
      'Nestle the chicken among the vegetables and scatter the lemon slices over the pan.',
      'Roast for 25 to 30 minutes, stirring the vegetables once, until the chicken reaches 165°F and the vegetables are tender.',
      'Let the chicken rest for 5 minutes before serving with the roasted vegetables.'
    ]),
    tags_json: JSON.stringify(['sheet-pan', 'family-friendly', 'high-protein', 'weeknight']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Garlic Shrimp Stir-Fry with Bell Peppers',
    slug: 'dinner-12-shrimp-asian-stir-fry',
    description: 'Fast shrimp stir-fry with crisp peppers and a glossy garlic sauce.',
    cuisine: 'Asian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'large shrimp', quantity: '1', unit: 'lb', notes: 'peeled and deveined' },
      { item: 'bell peppers', quantity: '2', unit: 'medium', notes: 'sliced' },
      { item: 'snap peas', quantity: '1', unit: 'cup' },
      { item: 'sesame oil', quantity: '2', unit: 'tbsp' },
      { item: 'soy sauce', quantity: '3', unit: 'tbsp' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'fresh ginger', quantity: '1', unit: 'tbsp', notes: 'grated' },
      { item: 'rice vinegar', quantity: '1', unit: 'tbsp' },
      { item: 'brown sugar', quantity: '1', unit: 'tbsp' },
      { item: 'cornstarch', quantity: '1', unit: 'tsp' },
      { item: 'cooked rice', quantity: '4', unit: 'cups', notes: 'for serving' }
    ]),
    instructions_json: JSON.stringify([
      'Whisk together the soy sauce, rice vinegar, brown sugar, and cornstarch in a small bowl until smooth.',
      'Heat 1 tablespoon sesame oil in a wok or large skillet over high heat. Cook the shrimp for 2 to 3 minutes until pink, then transfer to a plate.',
      'Add the remaining sesame oil, bell peppers, and snap peas to the pan. Stir-fry for 3 to 4 minutes until crisp-tender.',
      'Stir in the garlic and ginger and cook for 30 seconds until fragrant.',
      'Return the shrimp to the pan, pour in the sauce, and toss for 1 to 2 minutes until the sauce thickens and coats everything.',
      'Serve the stir-fry hot over cooked rice.'
    ]),
    tags_json: JSON.stringify(['quick', 'seafood', 'under-30-min', 'weeknight']),
    difficulty: 'easy',
    kid_friendly_score: 6,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Italian Sausage and White Bean Stew',
    slug: 'dinner-13-sausage-italian-stew',
    description: 'A hearty tomato-broth stew with sausage, beans, and tender kale.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 40,
    servings: 6,
    ingredients_json: JSON.stringify([
      { item: 'Italian sausage', quantity: '1', unit: 'lb', notes: 'casings removed if needed' },
      { item: 'cannellini beans', quantity: '2', unit: 'cans', notes: '15 oz each, drained and rinsed' },
      { item: 'diced tomatoes', quantity: '14', unit: 'oz' },
      { item: 'chicken broth', quantity: '2', unit: 'cups' },
      { item: 'yellow onion', quantity: '1', unit: 'large', notes: 'diced' },
      { item: 'garlic', quantity: '4', unit: 'cloves', notes: 'minced' },
      { item: 'Italian seasoning', quantity: '2', unit: 'tsp' },
      { item: 'kale', quantity: '3', unit: 'cups', notes: 'stems removed, chopped' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'kosher salt', quantity: '1/2', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/4', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a large pot over medium heat. Add the sausage and cook for 5 to 6 minutes, breaking it into bite-size pieces as it browns.',
      'Add the onion and cook for 3 to 4 minutes until softened. Stir in the garlic and Italian seasoning and cook for 1 minute.',
      'Pour in the diced tomatoes and chicken broth, then stir in the beans, salt, and pepper.',
      'Bring the stew to a simmer and cook uncovered for 25 minutes, stirring occasionally, until the broth thickens slightly.',
      'Stir in the kale and cook for 5 minutes until wilted. Taste and adjust seasoning before serving.'
    ]),
    tags_json: JSON.stringify(['comfort-food', 'meal-prep', 'high-protein', 'one-pot']),
    difficulty: 'easy',
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
