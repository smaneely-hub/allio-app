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
  ,{
    title: 'Creamy Chicken Bacon Ranch Pasta',
    slug: 'dinner-14-chicken-bacon-ranch-pasta',
    description: 'Tender chicken and pasta are tossed in a creamy ranch-inspired sauce with crispy bacon.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'penne pasta', quantity: '12', unit: 'oz' },
      { item: 'chicken breast', quantity: '1', unit: 'lb', notes: 'cut into bite-size pieces' },
      { item: 'bacon', quantity: '6', unit: 'slices', notes: 'chopped' },
      { item: 'heavy cream', quantity: '1', unit: 'cup' },
      { item: 'chicken broth', quantity: '1/2', unit: 'cup' },
      { item: 'parmesan cheese', quantity: '1/2', unit: 'cup', notes: 'grated' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'dried dill', quantity: '1', unit: 'tsp' },
      { item: 'onion powder', quantity: '1', unit: 'tsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Cook the penne in salted water until al dente, then drain and set aside.',
      'Meanwhile, cook the bacon in a large skillet over medium heat until crisp. Transfer to a paper towel-lined plate.',
      'Add the olive oil and chicken to the skillet, season with salt and pepper, and cook for 5 to 6 minutes until browned and cooked through.',
      'Stir in the garlic, dill, and onion powder, then pour in the cream and broth. Simmer for 2 minutes.',
      'Add the Parmesan, cooked pasta, and bacon, then toss until the sauce coats everything. Serve hot.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'kid-friendly', 'high-protein', 'pasta']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Sausage and Spinach Tortellini Skillet',
    slug: 'dinner-15-sausage-spinach-tortellini',
    description: 'Cheese tortellini cooks in a quick tomato sauce with browned sausage and fresh spinach.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'refrigerated cheese tortellini', quantity: '20', unit: 'oz' },
      { item: 'Italian sausage', quantity: '1', unit: 'lb' },
      { item: 'baby spinach', quantity: '4', unit: 'cups' },
      { item: 'marinara sauce', quantity: '2', unit: 'cups' },
      { item: 'chicken broth', quantity: '1/2', unit: 'cup' },
      { item: 'garlic', quantity: '2', unit: 'cloves', notes: 'minced' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'mozzarella cheese', quantity: '1', unit: 'cup', notes: 'shredded' },
      { item: 'Italian seasoning', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/4', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a large skillet over medium heat. Add the sausage and cook for 6 to 7 minutes, breaking it up as it browns.',
      'Stir in the garlic and Italian seasoning and cook for 30 seconds until fragrant.',
      'Add the marinara, broth, and tortellini, then cover and simmer for 5 to 6 minutes until the pasta is tender.',
      'Fold in the spinach and cook until wilted, about 1 minute.',
      'Sprinkle mozzarella over the top, cover for 1 minute to melt, then finish with black pepper and serve.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'one-pan', 'kid-friendly', 'pasta']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Lemon Broccoli Parmesan Orzo',
    slug: 'dinner-16-lemon-broccoli-parmesan-orzo',
    description: 'Bright lemony orzo with tender broccoli and Parmesan comes together in one pot.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 8,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'orzo', quantity: '1 1/2', unit: 'cups' },
      { item: 'broccoli florets', quantity: '4', unit: 'cups' },
      { item: 'vegetable broth', quantity: '3', unit: 'cups' },
      { item: 'parmesan cheese', quantity: '3/4', unit: 'cup', notes: 'grated' },
      { item: 'lemon', quantity: '1', unit: 'whole', notes: 'zested and juiced' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'baby spinach', quantity: '2', unit: 'cups' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a medium pot over medium heat. Add the garlic and cook for 30 seconds.',
      'Stir in the orzo, broth, salt, and pepper, then bring to a simmer.',
      'After 6 minutes, add the broccoli and continue cooking for 6 to 8 minutes, stirring often, until the orzo is tender.',
      'Fold in the spinach, lemon zest, lemon juice, and Parmesan until creamy and wilted.',
      'Taste, adjust seasoning, and serve warm.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'vegetarian', 'one-pot', 'pasta']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Turkey Meatball Marinara Spaghetti',
    slug: 'dinner-17-turkey-meatball-spaghetti',
    description: 'Quick turkey meatballs simmer in marinara and pile onto spaghetti for an easy family dinner.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 25,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'spaghetti', quantity: '12', unit: 'oz' },
      { item: 'ground turkey', quantity: '1', unit: 'lb' },
      { item: 'breadcrumbs', quantity: '1/3', unit: 'cup' },
      { item: 'egg', quantity: '1', unit: 'whole' },
      { item: 'parmesan cheese', quantity: '1/4', unit: 'cup', notes: 'grated' },
      { item: 'marinara sauce', quantity: '3', unit: 'cups' },
      { item: 'garlic', quantity: '2', unit: 'cloves', notes: 'minced' },
      { item: 'Italian seasoning', quantity: '1', unit: 'tsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Cook the spaghetti according to package directions, then drain.',
      'While the pasta cooks, mix the turkey, breadcrumbs, egg, Parmesan, half the garlic, Italian seasoning, and 1/2 teaspoon salt. Form into small meatballs.',
      'Heat the olive oil in a skillet over medium heat and brown the meatballs for 5 to 6 minutes, turning gently.',
      'Add the remaining garlic and marinara sauce, then simmer for 10 minutes until the meatballs are cooked through.',
      'Serve the meatballs and sauce over the spaghetti.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'kid-friendly', 'high-protein', 'pasta']),
    difficulty: 'medium',
    kid_friendly_score: 8,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Honey Garlic Chicken Stir-Fry',
    slug: 'dinner-18-honey-garlic-chicken-stir-fry',
    description: 'Sweet and savory chicken stir-fry with crisp vegetables lands on the table fast.',
    cuisine: 'Asian',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken breast', quantity: '1', unit: 'lb', notes: 'thinly sliced' },
      { item: 'broccoli florets', quantity: '3', unit: 'cups' },
      { item: 'carrots', quantity: '2', unit: 'medium', notes: 'thinly sliced' },
      { item: 'soy sauce', quantity: '1/4', unit: 'cup' },
      { item: 'honey', quantity: '2', unit: 'tbsp' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'fresh ginger', quantity: '1', unit: 'tbsp', notes: 'grated' },
      { item: 'cornstarch', quantity: '1', unit: 'tbsp' },
      { item: 'sesame oil', quantity: '1', unit: 'tbsp' },
      { item: 'cooked rice', quantity: '4', unit: 'cups' }
    ]),
    instructions_json: JSON.stringify([
      'Whisk together the soy sauce, honey, garlic, ginger, and cornstarch in a small bowl.',
      'Heat the sesame oil in a large skillet over medium-high heat. Add the chicken and cook for 4 to 5 minutes until browned.',
      'Add the broccoli and carrots and stir-fry for 4 minutes until crisp-tender.',
      'Pour in the sauce and cook for 2 to 3 minutes until glossy and slightly thickened.',
      'Serve the stir-fry over warm rice.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'high-protein', 'kid-friendly', 'asian-inspired']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Teriyaki Beef and Green Bean Skillet',
    slug: 'dinner-19-teriyaki-beef-green-beans',
    description: 'Ground beef and green beans cook in a sticky teriyaki-style sauce for an easy rice bowl dinner.',
    cuisine: 'Asian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'ground beef', quantity: '1', unit: 'lb' },
      { item: 'green beans', quantity: '12', unit: 'oz', notes: 'trimmed' },
      { item: 'soy sauce', quantity: '1/4', unit: 'cup' },
      { item: 'brown sugar', quantity: '2', unit: 'tbsp' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'fresh ginger', quantity: '2', unit: 'tsp', notes: 'grated' },
      { item: 'rice vinegar', quantity: '1', unit: 'tbsp' },
      { item: 'sesame oil', quantity: '1', unit: 'tbsp' },
      { item: 'green onions', quantity: '2', unit: 'whole', notes: 'sliced' },
      { item: 'cooked rice', quantity: '4', unit: 'cups' }
    ]),
    instructions_json: JSON.stringify([
      'Heat a large skillet over medium-high heat. Add the ground beef and cook for 5 to 6 minutes until browned.',
      'Stir in the green beans and cook for 4 minutes until they begin to soften.',
      'Whisk together the soy sauce, brown sugar, garlic, ginger, rice vinegar, and sesame oil.',
      'Pour the sauce into the skillet and simmer for 3 to 4 minutes until the beans are tender and the sauce thickens.',
      'Top with green onions and serve over rice.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'high-protein', 'one-pan', 'asian-inspired']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Sesame Tofu Noodle Stir-Fry',
    slug: 'dinner-20-sesame-tofu-noodle-stir-fry',
    description: 'Crisp tofu, noodles, and colorful vegetables are coated in a savory sesame sauce.',
    cuisine: 'Asian',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'rice noodles', quantity: '8', unit: 'oz' },
      { item: 'firm tofu', quantity: '14', unit: 'oz', notes: 'pressed and cubed' },
      { item: 'bell pepper', quantity: '1', unit: 'large', notes: 'sliced' },
      { item: 'shredded carrots', quantity: '1', unit: 'cup' },
      { item: 'snap peas', quantity: '1 1/2', unit: 'cups' },
      { item: 'soy sauce', quantity: '3', unit: 'tbsp' },
      { item: 'sesame oil', quantity: '2', unit: 'tbsp' },
      { item: 'maple syrup', quantity: '1', unit: 'tbsp' },
      { item: 'garlic', quantity: '2', unit: 'cloves', notes: 'minced' },
      { item: 'sesame seeds', quantity: '1', unit: 'tbsp' }
    ]),
    instructions_json: JSON.stringify([
      'Cook the rice noodles according to package directions, then drain and rinse with cool water.',
      'Heat 1 tablespoon sesame oil in a large skillet over medium-high heat. Add the tofu and cook for 6 to 8 minutes, turning until golden.',
      'Add the bell pepper, carrots, and snap peas and cook for 3 minutes.',
      'Stir together the soy sauce, remaining sesame oil, maple syrup, and garlic, then pour it into the skillet.',
      'Add the noodles and toss until everything is coated and heated through. Finish with sesame seeds before serving.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'vegetarian', 'dairy-free', 'asian-inspired']),
    difficulty: 'medium',
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Sheet Pan BBQ Chicken and Sweet Potatoes',
    slug: 'dinner-21-bbq-chicken-sweet-potatoes',
    description: 'Barbecue-glazed chicken roasts alongside sweet potatoes and broccoli on one easy pan.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 28,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken thighs', quantity: '1 1/2', unit: 'lb', notes: 'boneless, skinless' },
      { item: 'sweet potatoes', quantity: '2', unit: 'medium', notes: 'peeled and cubed' },
      { item: 'broccoli florets', quantity: '4', unit: 'cups' },
      { item: 'barbecue sauce', quantity: '1/2', unit: 'cup' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'smoked paprika', quantity: '1', unit: 'tsp' },
      { item: 'garlic powder', quantity: '1', unit: 'tsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Preheat the oven to 425°F and line a sheet pan with parchment.',
      'Toss the sweet potatoes with 1 tablespoon olive oil, half the paprika, half the garlic powder, and half the salt. Spread them on the pan and roast for 10 minutes.',
      'Meanwhile, toss the chicken with the remaining oil, seasonings, and half the barbecue sauce.',
      'Add the chicken and broccoli to the pan, then roast for 15 to 18 minutes until the chicken is cooked through and the vegetables are tender.',
      'Brush the chicken with the remaining barbecue sauce and serve.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'sheet-pan', 'high-protein', 'gluten-free']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Sheet Pan Sausage, Peppers, and Potatoes',
    slug: 'dinner-22-sausage-peppers-potatoes',
    description: 'Roasted sausage, peppers, and potatoes make a hearty dinner with barely any cleanup.',
    cuisine: 'Italian',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 28,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'Italian chicken sausage', quantity: '1', unit: 'lb', notes: 'sliced into rounds' },
      { item: 'baby potatoes', quantity: '1 1/2', unit: 'lb', notes: 'halved' },
      { item: 'bell peppers', quantity: '2', unit: 'medium', notes: 'sliced' },
      { item: 'red onion', quantity: '1', unit: 'medium', notes: 'cut into wedges' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'Italian seasoning', quantity: '2', unit: 'tsp' },
      { item: 'garlic powder', quantity: '1', unit: 'tsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Preheat the oven to 425°F and line a sheet pan with parchment.',
      'Toss the potatoes with olive oil, Italian seasoning, garlic powder, salt, and pepper, then spread them on the pan and roast for 10 minutes.',
      'Add the sausage, bell peppers, and onion to the pan and toss everything together.',
      'Roast for 15 to 18 minutes more, stirring once, until the sausage is browned and the potatoes are tender.',
      'Serve straight from the pan while hot.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'sheet-pan', 'kid-friendly', 'high-protein']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Sheet Pan Garlic Butter Salmon and Green Beans',
    slug: 'dinner-23-garlic-butter-salmon-green-beans',
    description: 'Salmon fillets roast quickly with green beans under a simple garlic butter glaze.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'salmon fillets', quantity: '4', unit: 'pieces', notes: 'about 6 oz each' },
      { item: 'green beans', quantity: '1', unit: 'lb', notes: 'trimmed' },
      { item: 'butter', quantity: '3', unit: 'tbsp', notes: 'melted' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'lemon', quantity: '1', unit: 'whole', notes: 'sliced' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Preheat the oven to 425°F and line a sheet pan with parchment.',
      'Toss the green beans with olive oil, half the salt, and half the pepper, then spread them on the pan.',
      'Place the salmon on the pan and brush with melted butter mixed with garlic, the remaining salt, and pepper.',
      'Lay lemon slices over the salmon and roast for 12 to 15 minutes until the fish flakes easily and the beans are tender.',
      'Serve immediately with the pan juices spooned over the top.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'sheet-pan', 'seafood', 'gluten-free']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Chicken Fajita Wraps',
    slug: 'dinner-24-chicken-fajita-wraps',
    description: 'Seasoned chicken, peppers, and melty cheese roll into warm tortillas for a fast dinner.',
    cuisine: 'Mexican',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken breast', quantity: '1', unit: 'lb', notes: 'thinly sliced' },
      { item: 'flour tortillas', quantity: '8', unit: 'pieces' },
      { item: 'bell peppers', quantity: '2', unit: 'medium', notes: 'sliced' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'sliced' },
      { item: 'shredded cheddar cheese', quantity: '1', unit: 'cup' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'chili powder', quantity: '2', unit: 'tsp' },
      { item: 'ground cumin', quantity: '1', unit: 'tsp' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'sour cream', quantity: '1/2', unit: 'cup' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a large skillet over medium-high heat. Add the chicken, chili powder, cumin, and half the salt and cook for 5 minutes.',
      'Add the peppers, onion, and remaining salt, then cook for 5 to 6 minutes until the vegetables are tender and the chicken is cooked through.',
      'Warm the tortillas in the microwave or a dry skillet.',
      'Fill each tortilla with the chicken mixture and cheddar cheese, then roll into wraps.',
      'Serve with sour cream on the side.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'kid-friendly', 'high-protein', 'wraps']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Black Bean Burrito Bowls with Avocado',
    slug: 'dinner-25-black-bean-burrito-bowls',
    description: 'These colorful burrito bowls pile rice, black beans, corn, and avocado into an easy meatless meal.',
    cuisine: 'Mexican',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'cooked brown rice', quantity: '4', unit: 'cups' },
      { item: 'black beans', quantity: '2', unit: 'cans', notes: 'drained and rinsed' },
      { item: 'frozen corn', quantity: '1 1/2', unit: 'cups' },
      { item: 'avocado', quantity: '2', unit: 'large', notes: 'sliced' },
      { item: 'cherry tomatoes', quantity: '1', unit: 'cup', notes: 'halved' },
      { item: 'lime', quantity: '1', unit: 'whole' },
      { item: 'ground cumin', quantity: '1', unit: 'tsp' },
      { item: 'chili powder', quantity: '1', unit: 'tsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'fresh cilantro', quantity: '1/4', unit: 'cup', notes: 'chopped' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a skillet over medium heat. Add the black beans, corn, cumin, and chili powder and cook for 4 to 5 minutes.',
      'Stir the lime juice into the warm rice and season lightly with salt.',
      'Divide the rice among bowls and top with the black bean mixture, tomatoes, and avocado slices.',
      'Finish with cilantro and serve right away.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'vegetarian', 'grain-bowl', 'gluten-free']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Turkey Taco Soup',
    slug: 'dinner-26-turkey-taco-soup',
    description: 'Lean turkey, beans, and tomatoes simmer into a cozy taco-inspired soup in one pot.',
    cuisine: 'Tex-Mex',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 25,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'ground turkey', quantity: '1', unit: 'lb' },
      { item: 'black beans', quantity: '1', unit: 'can', notes: 'drained and rinsed' },
      { item: 'corn', quantity: '1', unit: 'cup' },
      { item: 'diced tomatoes', quantity: '14', unit: 'oz' },
      { item: 'chicken broth', quantity: '3', unit: 'cups' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'diced' },
      { item: 'taco seasoning', quantity: '2', unit: 'tbsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'lime', quantity: '1', unit: 'whole' },
      { item: 'shredded cheddar cheese', quantity: '1/2', unit: 'cup' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a pot over medium heat. Add the onion and cook for 3 minutes until softened.',
      'Add the turkey and taco seasoning and cook for 5 to 6 minutes, breaking up the meat until browned.',
      'Stir in the tomatoes, broth, black beans, and corn, then bring to a simmer.',
      'Simmer for 15 minutes so the flavors blend.',
      'Finish with lime juice and serve with cheddar sprinkled on top.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'soup', 'high-protein', 'one-pot']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Creamy Tomato White Bean Soup',
    slug: 'dinner-27-creamy-tomato-white-bean-soup',
    description: 'White beans make this tomato soup creamy and satisfying without much effort.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 25,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'cannellini beans', quantity: '2', unit: 'cans', notes: 'drained and rinsed' },
      { item: 'crushed tomatoes', quantity: '28', unit: 'oz' },
      { item: 'vegetable broth', quantity: '3', unit: 'cups' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'diced' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'Italian seasoning', quantity: '1', unit: 'tsp' },
      { item: 'heavy cream', quantity: '1/4', unit: 'cup' },
      { item: 'baby spinach', quantity: '2', unit: 'cups' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a pot over medium heat. Add the onion and cook for 4 minutes until softened.',
      'Stir in the garlic and Italian seasoning and cook for 30 seconds.',
      'Add the beans, crushed tomatoes, broth, and salt, then bring to a simmer and cook for 15 minutes.',
      'Blend about half the soup with an immersion blender, then stir in the cream and spinach.',
      'Cook for 2 more minutes until the spinach wilts, then serve.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'vegetarian', 'soup', 'one-pot']),
    difficulty: 'easy',
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Greek Chicken Grain Bowls',
    slug: 'dinner-28-greek-chicken-grain-bowls',
    description: 'Lemony chicken, rice, cucumbers, and feta build a fresh grain bowl dinner.',
    cuisine: 'Mediterranean',
    meal_type: 'dinner',
    prep_time_minutes: 15,
    cook_time_minutes: 20,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken breast', quantity: '1', unit: 'lb', notes: 'cut into strips' },
      { item: 'cooked brown rice', quantity: '4', unit: 'cups' },
      { item: 'cucumber', quantity: '1', unit: 'large', notes: 'diced' },
      { item: 'cherry tomatoes', quantity: '1', unit: 'cup', notes: 'halved' },
      { item: 'feta cheese', quantity: '1/2', unit: 'cup', notes: 'crumbled' },
      { item: 'olive oil', quantity: '2', unit: 'tbsp' },
      { item: 'lemon', quantity: '1', unit: 'whole', notes: 'juiced' },
      { item: 'dried oregano', quantity: '1', unit: 'tsp' },
      { item: 'garlic powder', quantity: '1', unit: 'tsp' },
      { item: 'plain Greek yogurt', quantity: '1/2', unit: 'cup' }
    ]),
    instructions_json: JSON.stringify([
      'Toss the chicken with 1 tablespoon olive oil, oregano, garlic powder, half the lemon juice, and a pinch of salt.',
      'Cook the chicken in a skillet over medium-high heat for 6 to 8 minutes until browned and cooked through.',
      'Stir the remaining olive oil and lemon juice into the rice.',
      'Divide the rice among bowls and top with chicken, cucumber, tomatoes, and feta.',
      'Add a spoonful of Greek yogurt to each bowl before serving.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'grain-bowl', 'high-protein', 'kid-friendly']),
    difficulty: 'easy',
    kid_friendly_score: 7,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Southwest Turkey Rice Bowls',
    slug: 'dinner-29-southwest-turkey-rice-bowls',
    description: 'Seasoned turkey, rice, corn, and avocado make a filling bowl with Southwest flavor.',
    cuisine: 'Tex-Mex',
    meal_type: 'dinner',
    prep_time_minutes: 12,
    cook_time_minutes: 18,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'ground turkey', quantity: '1', unit: 'lb' },
      { item: 'cooked white rice', quantity: '4', unit: 'cups' },
      { item: 'black beans', quantity: '1', unit: 'can', notes: 'drained and rinsed' },
      { item: 'corn', quantity: '1', unit: 'cup' },
      { item: 'avocado', quantity: '1', unit: 'large', notes: 'sliced' },
      { item: 'lime', quantity: '1', unit: 'whole' },
      { item: 'chili powder', quantity: '2', unit: 'tsp' },
      { item: 'ground cumin', quantity: '1', unit: 'tsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'shredded Monterey Jack cheese', quantity: '1/2', unit: 'cup' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a skillet over medium heat. Add the turkey, chili powder, and cumin and cook for 6 to 7 minutes until browned.',
      'Stir in the black beans and corn and cook for 2 to 3 minutes until warmed through.',
      'Toss the rice with lime juice and a pinch of salt.',
      'Divide the rice into bowls and top with the turkey mixture, avocado, and Monterey Jack cheese.',
      'Serve warm.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'grain-bowl', 'high-protein', 'gluten-free']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Skillet Honey Mustard Chicken',
    slug: 'dinner-30-honey-mustard-chicken',
    description: 'Pan-seared chicken simmers in a sweet and tangy honey mustard sauce for a simple dinner.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chicken thighs', quantity: '1 1/2', unit: 'lb', notes: 'boneless, skinless' },
      { item: 'Dijon mustard', quantity: '3', unit: 'tbsp' },
      { item: 'honey', quantity: '2', unit: 'tbsp' },
      { item: 'chicken broth', quantity: '1/2', unit: 'cup' },
      { item: 'garlic', quantity: '2', unit: 'cloves', notes: 'minced' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'broccoli florets', quantity: '4', unit: 'cups' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' },
      { item: 'black pepper', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Season the chicken with salt and pepper.',
      'Heat the olive oil in a large skillet over medium-high heat. Add the chicken and cook for 4 to 5 minutes per side until browned.',
      'Whisk together the Dijon, honey, broth, and garlic, then pour it into the skillet.',
      'Add the broccoli around the chicken, cover, and simmer for 6 to 8 minutes until the chicken is cooked through and the broccoli is tender.',
      'Spoon the sauce over the chicken and serve.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'chicken', 'high-protein', 'gluten-free']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 9,
    active: true
  },
  {
    title: 'Vegetarian Chili Mac',
    slug: 'dinner-31-vegetarian-chili-mac',
    description: 'Pasta, beans, and tomatoes cook together into a cozy vegetarian skillet dinner.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 25,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'elbow macaroni', quantity: '8', unit: 'oz' },
      { item: 'black beans', quantity: '1', unit: 'can', notes: 'drained and rinsed' },
      { item: 'kidney beans', quantity: '1', unit: 'can', notes: 'drained and rinsed' },
      { item: 'diced tomatoes', quantity: '14', unit: 'oz' },
      { item: 'vegetable broth', quantity: '2 1/2', unit: 'cups' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'diced' },
      { item: 'chili powder', quantity: '2', unit: 'tsp' },
      { item: 'ground cumin', quantity: '1', unit: 'tsp' },
      { item: 'shredded cheddar cheese', quantity: '1', unit: 'cup' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a large skillet or pot over medium heat. Add the onion and cook for 4 minutes until softened.',
      'Stir in the chili powder and cumin, then add the tomatoes, broth, macaroni, and both beans.',
      'Bring to a simmer and cook uncovered for 10 to 12 minutes, stirring often, until the pasta is tender.',
      'Stir in half the cheddar until melted.',
      'Top with the remaining cheddar and serve.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'vegetarian', 'one-pot', 'kid-friendly']),
    difficulty: 'easy',
    kid_friendly_score: 8,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Chickpea Coconut Curry',
    slug: 'dinner-32-chickpea-coconut-curry',
    description: 'Chickpeas simmer in a creamy coconut curry sauce with spinach for a fast meatless dinner.',
    cuisine: 'Indian',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'chickpeas', quantity: '2', unit: 'cans', notes: 'drained and rinsed' },
      { item: 'coconut milk', quantity: '1', unit: 'can' },
      { item: 'diced tomatoes', quantity: '14', unit: 'oz' },
      { item: 'baby spinach', quantity: '4', unit: 'cups' },
      { item: 'yellow onion', quantity: '1', unit: 'medium', notes: 'diced' },
      { item: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced' },
      { item: 'curry powder', quantity: '2', unit: 'tbsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'cooked basmati rice', quantity: '4', unit: 'cups' },
      { item: 'kosher salt', quantity: '1', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat the olive oil in a pot over medium heat. Add the onion and cook for 4 minutes until softened.',
      'Stir in the garlic and curry powder and cook for 30 seconds until fragrant.',
      'Add the chickpeas, coconut milk, diced tomatoes, and salt, then simmer for 12 minutes.',
      'Fold in the spinach and cook for 2 minutes until wilted.',
      'Serve the curry over warm basmati rice.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'vegetarian', 'dairy-free', 'gluten-free']),
    difficulty: 'easy',
    kid_friendly_score: 6,
    weeknight_score: 8,
    active: true
  },
  {
    title: 'Cheeseburger Quesadillas',
    slug: 'dinner-33-cheeseburger-quesadillas',
    description: 'These crispy quesadillas are packed with seasoned beef and melty cheese for a kid-friendly win.',
    cuisine: 'American',
    meal_type: 'dinner',
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 4,
    ingredients_json: JSON.stringify([
      { item: 'ground beef', quantity: '1', unit: 'lb' },
      { item: 'flour tortillas', quantity: '8', unit: 'pieces' },
      { item: 'shredded cheddar cheese', quantity: '2', unit: 'cups' },
      { item: 'yellow onion', quantity: '1/2', unit: 'medium', notes: 'diced' },
      { item: 'ketchup', quantity: '2', unit: 'tbsp' },
      { item: 'yellow mustard', quantity: '1', unit: 'tbsp' },
      { item: 'olive oil', quantity: '1', unit: 'tbsp' },
      { item: 'garlic powder', quantity: '1/2', unit: 'tsp' },
      { item: 'kosher salt', quantity: '1/2', unit: 'tsp' }
    ]),
    instructions_json: JSON.stringify([
      'Heat a skillet over medium heat. Add the beef and onion and cook for 6 to 7 minutes until browned.',
      'Stir in the ketchup, mustard, garlic powder, and salt.',
      'Lay out the tortillas and spread the beef mixture over half of them, then top with cheddar and fold closed.',
      'Wipe out the skillet, add the olive oil, and cook the quesadillas for 2 to 3 minutes per side until golden and melted.',
      'Slice and serve hot.'
    ]),
    tags_json: JSON.stringify(['weeknight', 'kid-friendly', 'high-protein', 'wraps']),
    difficulty: 'easy',
    kid_friendly_score: 9,
    weeknight_score: 10,
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
