import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rvgtmletsbycrbeycwus.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function legacyIngredients(ingredientGroups) {
  return ingredientGroups.flatMap((group) => group.ingredients)
}

function legacyInstructions(instructionGroups) {
  return instructionGroups.flatMap((group) => group.steps)
}

function buildRecipe(recipe, supportedColumns = null) {
  const full = {
    title: recipe.title,
    slug: slugify(recipe.title),
    description: recipe.description,
    cuisine: recipe.tags.cuisine,
    meal_type: recipe.tags.mealType,
    prep_time_minutes: recipe.prepTime,
    cook_time_minutes: recipe.cookTime,
    total_time_minutes: recipe.totalTime,
    servings: recipe.servings,
    yield_text: recipe.yield,
    difficulty: recipe.difficulty,
    ingredients_json: legacyIngredients(recipe.ingredientGroups),
    instructions_json: legacyInstructions(recipe.instructionGroups),
    ingredient_groups_json: recipe.ingredientGroups,
    instruction_groups_json: recipe.instructionGroups,
    nutrition_json: recipe.nutrition,
    dietary_flags_json: recipe.tags.dietary,
    tags_json: [recipe.tags.cuisine, recipe.tags.mealType, ...recipe.tags.dietary, ...(recipe.tags.cookingMethod || [])].filter(Boolean),
    tags_v2_json: recipe.tags,
    tips_json: recipe.tips,
    substitutions_json: recipe.substitutions,
    source_note: recipe.sourceNote,
    image_prompt: recipe.imagePrompt,
    source_type: 'seed',
    active: true,
    kid_friendly_score: recipe.kidFriendlyScore,
    weeknight_score: recipe.weeknightScore,
    leftovers_score: recipe.leftoversScore,
    cost_tier: recipe.costTier,
  }

  if (!supportedColumns) return full
  return Object.fromEntries(Object.entries(full).filter(([key]) => supportedColumns.has(key)))
}

async function detectSupportedColumns() {
  const probe = {
    title: '__probe__',
    slug: '__probe__',
    description: 'probe',
    cuisine: 'probe',
    meal_type: 'dinner',
    prep_time_minutes: 1,
    cook_time_minutes: 1,
    total_time_minutes: 2,
    servings: 1,
    yield_text: '1 serving',
    difficulty: 'easy',
    ingredients_json: [],
    instructions_json: [],
    ingredient_groups_json: [],
    instruction_groups_json: [],
    nutrition_json: {},
    dietary_flags_json: [],
    tags_json: [],
    tags_v2_json: {},
    tips_json: [],
    substitutions_json: [],
    source_note: 'probe',
    image_prompt: 'probe',
    source_type: 'seed',
    active: true,
    kid_friendly_score: 1,
    weeknight_score: 1,
    leftovers_score: 1,
    cost_tier: 'budget',
  }

  const supported = new Set(Object.keys(probe))

  while (true) {
    const { error } = await supabase.from('recipes').insert([Object.fromEntries(Object.entries(probe).filter(([key]) => supported.has(key)))]).select('slug')

    if (!error) {
      await supabase.from('recipes').delete().eq('slug', '__probe__')
      return supported
    }

    const match = String(error.message || '').match(/Could not find the '([^']+)' column/)
    if (match?.[1]) {
      supported.delete(match[1])
      continue
    }

    if (error.code === '23505') {
      await supabase.from('recipes').delete().eq('slug', '__probe__')
      return supported
    }

    throw error
  }
}

const recipes = [
  {
    title: 'Classic Roast Chicken with Pan Gravy',
    description: 'A well-roasted chicken is one of the most generous things a cook can put on the table, and this version rewards a little patience with lacquered skin and deeply savory pan juices. The gravy is built right in the roasting pan, so nothing flavorful goes to waste and the finished dish feels far grander than the work suggests.',
    yield: '4 servings',
    prepTime: 20,
    cookTime: 70,
    totalTime: 90,
    servings: 4,
    difficulty: 'easy',
    ingredientGroups: [
      { label: 'Chicken', ingredients: [
        { amount: '1', unit: 'whole', item: 'chicken, about 4 1/2 pounds', optional: false },
        { amount: '1', unit: 'large', item: 'yellow onion, cut into thick wedges', optional: false },
        { amount: '2', unit: 'medium', item: 'carrots, cut into 2-inch pieces', optional: false },
        { amount: '2', unit: 'stalks', item: 'celery, cut into 2-inch pieces', optional: false },
        { amount: '6', unit: 'sprigs', item: 'fresh thyme', optional: false },
        { amount: '4', unit: 'tablespoons', item: 'unsalted butter, softened', optional: false },
      ]},
      { label: 'Pan gravy', ingredients: [
        { amount: '2', unit: 'tablespoons', item: 'all-purpose flour', optional: false },
        { amount: '2', unit: 'cups', item: 'low-sodium chicken broth, warm', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'Dijon mustard', optional: true, note: 'for depth' },
      ]},
    ],
    instructionGroups: [
      { label: 'Roast the chicken', steps: [
        { text: 'Heat the oven to 425°F. Pat the chicken very dry, then season it all over, inside and out, with kosher salt and black pepper so the skin roasts up crisp instead of steaming.', tip: 'Dry skin is the difference between pale and truly golden.' },
        { text: 'Scatter the onion, carrots, celery, and thyme in a large roasting pan. Rub the butter over the chicken, set it breast-side up on the vegetables, and roast for 20 minutes to jump-start browning.' },
        { text: 'Reduce the oven to 375°F and continue roasting until the thickest part of the thigh registers 165°F and the juices run clear, 45 to 50 minutes more. If the skin darkens too quickly, tent loosely with foil.' },
        { text: 'Transfer the chicken to a cutting board and let it rest for 15 minutes, which keeps the juices in the meat instead of on the board.' },
      ]},
      { label: 'Make the gravy', steps: [
        { text: 'Pour off all but about 2 tablespoons of fat from the roasting pan, then set the pan over medium heat. Sprinkle in the flour and cook, stirring constantly, until the paste smells nutty and turns pale golden, about 1 minute.' },
        { text: 'Slowly whisk in the warm broth, scraping up every browned bit from the pan, and simmer until the gravy thickens enough to lightly coat the back of a spoon, 4 to 6 minutes. Whisk in the mustard, if using, and season to taste.' },
        { text: 'Carve the chicken and serve with the vegetables and hot gravy spooned over or alongside.' },
      ]},
    ],
    tips: [
      'Salt the chicken up to a day ahead and leave it uncovered in the refrigerator for even deeper seasoning and crisper skin.',
      'Leftover chicken makes excellent sandwiches, salads, or soup for up to 4 days.',
      'Rewarm gravy gently with a splash of broth so it loosens without turning gluey.',
    ],
    substitutions: [
      { original: 'fresh thyme', substitute: 'fresh rosemary', note: 'Use a little less, since rosemary is stronger.' },
      { original: 'yellow onion', substitute: '2 shallots, halved', note: 'The gravy will be slightly sweeter.' },
    ],
    tags: { cuisine: 'American', mealType: 'dinner', dietary: ['gluten-free-option'], season: 'year-round', cookingMethod: ['roasting'] },
    nutrition: { calories: 640, protein: '49g', carbs: '10g', fat: '44g', fiber: '2g', sodium: '690mg' },
    sourceNote: 'Gold-standard roast chicken benchmark recipe.',
    imagePrompt: 'Whole golden roast chicken on a platter with pan gravy, carrots, onions, and thyme, editorial food photography, natural window light.',
    kidFriendlyScore: 8,
    weeknightScore: 5,
    leftoversScore: 9,
    costTier: 'moderate',
  },
  {
    title: 'Weeknight Pasta with Burst Cherry Tomatoes',
    description: 'This is the kind of fast pasta that tastes as if it came from a much slower kitchen, thanks to cherry tomatoes that blister, burst, and melt into their own glossy sauce. A shower of basil and Parmesan at the end gives it just enough finish to feel complete without slowing dinner down.',
    yield: '4 servings', prepTime: 10, cookTime: 15, totalTime: 25, servings: 4, difficulty: 'easy',
    ingredientGroups: [
      { label: null, ingredients: [
        { amount: '12', unit: 'ounces', item: 'spaghetti or linguine', optional: false },
        { amount: '2', unit: 'pints', item: 'cherry tomatoes', optional: false },
        { amount: '4', unit: 'cloves', item: 'garlic, thinly sliced', optional: false },
        { amount: '1/2', unit: 'teaspoon', item: 'red-pepper flakes', optional: true },
        { amount: '1/2', unit: 'cup', item: 'Parmesan, finely grated, plus more for serving', optional: false },
        { amount: '1/2', unit: 'cup', item: 'fresh basil leaves, torn', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Bring a large pot of well-salted water to a boil and cook the pasta until just shy of al dente. Reserve 1 cup pasta water before draining.', tip: 'That starchy water is what turns tomatoes and cheese into a real sauce.' },
        { text: 'Meanwhile, heat olive oil in a large skillet over medium-high heat. Add the tomatoes, garlic, and red-pepper flakes and cook, shaking the pan occasionally, until many of the tomatoes burst and the rest wrinkle and soften, 8 to 10 minutes.' },
        { text: 'Press lightly on some of the tomatoes with the back of a spoon to help them collapse into a chunky sauce, then season generously with kosher salt and black pepper.' },
        { text: 'Add the drained pasta to the skillet with a splash of pasta water and toss until the noodles are glossy and lightly coated. Add more water as needed until the sauce clings rather than pools.' },
        { text: 'Off the heat, toss in the Parmesan and basil. Serve immediately with more Parmesan and black pepper over the top.' },
      ]},
    ],
    tips: ['Use the ripest cherry tomatoes you can find for the sweetest sauce.', 'A little butter stirred in at the end makes the sauce extra silky.', 'Leftovers can be revived with a splash of water in a skillet over low heat.'],
    substitutions: [{ original: 'spaghetti', substitute: 'short pasta such as rigatoni', note: 'The sauce will collect nicely in the ridges.' }],
    tags: { cuisine: 'Italian', mealType: 'dinner', dietary: ['vegetarian'], season: 'summer', cookingMethod: ['boiling', 'sautéing'] },
    nutrition: { calories: 510, protein: '16g', carbs: '72g', fat: '18g', fiber: '5g', sodium: '510mg' },
    sourceNote: 'Gold-standard fast pasta benchmark recipe.',
    imagePrompt: 'Glossy pasta with burst cherry tomatoes, basil, and grated Parmesan in a shallow bowl, editorial food photography.',
    kidFriendlyScore: 8, weeknightScore: 10, leftoversScore: 6, costTier: 'budget',
  },
  {
    title: 'Crispy Black Bean Tacos with Pickled Onions',
    description: 'These tacos lean on pantry black beans, but they eat with far more drama than that suggests, thanks to a crisp skillet-seared filling and sharp pink onions piled on top. The contrast of creamy beans, crunchy tortillas, and bright acid makes the whole thing feel vivid and satisfying.',
    yield: '4 servings', prepTime: 15, cookTime: 15, totalTime: 30, servings: 4, difficulty: 'easy',
    ingredientGroups: [
      { label: 'Pickled onions', ingredients: [
        { amount: '1', unit: 'small', item: 'red onion, very thinly sliced', optional: false },
        { amount: '1/2', unit: 'cup', item: 'apple-cider vinegar', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'granulated sugar', optional: false },
      ]},
      { label: 'Tacos', ingredients: [
        { amount: '2', unit: '15-ounce cans', item: 'black beans, drained and rinsed', optional: false },
        { amount: '8', unit: 'small', item: 'corn tortillas', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'ground cumin', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'smoked paprika', optional: false },
        { amount: '1', unit: 'medium', item: 'lime, cut into wedges', optional: false },
        { amount: '1/2', unit: 'cup', item: 'cilantro leaves and tender stems', optional: false },
        { amount: '1', unit: 'small', item: 'ripe avocado, sliced', optional: true },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Combine the onion, vinegar, sugar, kosher salt, and 1/2 cup hot water in a bowl and let the onions sit while you make the tacos. They should soften and turn vivid pink by the time dinner is ready.' },
        { text: 'In a large skillet, heat olive oil over medium heat. Add the black beans, cumin, and smoked paprika and cook, stirring occasionally, until some beans split and the mixture dries slightly and turns crisp in spots, 8 to 10 minutes.', tip: 'Press on the beans just enough to create texture, not a puree.' },
        { text: 'Warm the tortillas in a dry skillet or directly over a gas flame until pliable and lightly charred at the edges.' },
        { text: 'Pile the black beans into the tortillas, then top with drained pickled onions, cilantro, avocado if using, and a squeeze of lime.' },
      ]},
    ],
    tips: ['The pickled onions keep for a week in the refrigerator and brighten sandwiches and grain bowls too.', 'If you want more richness, crumble feta or queso fresco over the tacos.', 'For even crispier beans, let them sit undisturbed in the skillet for a minute or two between stirs.'],
    substitutions: [{ original: 'black beans', substitute: 'pinto beans', note: 'Mash them a touch more so the filling holds together.' }],
    tags: { cuisine: 'Mexican', mealType: 'dinner', dietary: ['vegetarian'], season: 'year-round', cookingMethod: ['pickling', 'pan-frying'] },
    nutrition: { calories: 430, protein: '15g', carbs: '58g', fat: '16g', fiber: '14g', sodium: '540mg' },
    sourceNote: 'Gold-standard vegetarian taco benchmark recipe.',
    imagePrompt: 'Corn tacos filled with crispy black beans, bright pickled onions, cilantro, and avocado, editorial food styling.',
    kidFriendlyScore: 7, weeknightScore: 9, leftoversScore: 6, costTier: 'budget',
  },
  {
    title: 'Sheet Pan Salmon with Miso Glaze',
    description: 'A salty-sweet miso glaze gives salmon the kind of depth that usually tastes restaurant-only, but here it happens in one pan and under half an hour. The fish emerges glossy and tender, with edges that caramelize just enough to make the whole dinner feel deliberate.',
    yield: '4 servings', prepTime: 10, cookTime: 15, totalTime: 25, servings: 4, difficulty: 'easy',
    ingredientGroups: [
      { label: 'Miso glaze', ingredients: [
        { amount: '3', unit: 'tablespoons', item: 'white miso', optional: false },
        { amount: '2', unit: 'tablespoons', item: 'mirin', optional: false },
        { amount: '1', unit: 'tablespoon', item: 'soy sauce', optional: false },
        { amount: '1', unit: 'tablespoon', item: 'maple syrup', optional: false },
      ]},
      { label: 'Salmon and vegetables', ingredients: [
        { amount: '4', unit: '6-ounce', item: 'salmon fillets', optional: false },
        { amount: '1', unit: 'pound', item: 'broccolini, trimmed', optional: false },
        { amount: '1', unit: 'medium', item: 'lime, cut into wedges', optional: false },
        { amount: '2', unit: 'teaspoons', item: 'toasted sesame seeds', optional: true },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Heat the oven to 425°F and line a sheet pan with parchment. Whisk together the miso, mirin, soy sauce, maple syrup, and 1 tablespoon water until smooth.' },
        { text: 'Arrange the salmon on one side of the pan and the broccolini on the other. Toss the broccolini with olive oil, kosher salt, and black pepper, then brush the salmon generously with the miso glaze.' },
        { text: 'Roast until the salmon is just opaque in the center and flakes with gentle pressure, and the broccolini is tender with charred tips, 12 to 15 minutes.' },
        { text: 'Squeeze lime over the broccolini, scatter sesame seeds over the whole pan if using, and serve immediately.' },
      ]},
    ],
    tips: ['If your fillets are especially thick, give them an extra minute or two but pull them before they start weeping white protein.', 'The glaze is also excellent on cod or tofu.', 'Serve with rice if you want to stretch the meal.'],
    substitutions: [{ original: 'broccolini', substitute: 'asparagus', note: 'Roast until tender and lightly blistered.' }],
    tags: { cuisine: 'Japanese-inspired', mealType: 'dinner', dietary: ['gluten-free-option'], season: 'year-round', cookingMethod: ['roasting'] },
    nutrition: { calories: 470, protein: '37g', carbs: '13g', fat: '28g', fiber: '4g', sodium: '760mg' },
    sourceNote: 'Gold-standard sheet-pan fish benchmark recipe.',
    imagePrompt: 'Miso glazed salmon fillets and charred broccolini on a sheet pan, glossy and caramelized, editorial food photography.',
    kidFriendlyScore: 7, weeknightScore: 10, leftoversScore: 6, costTier: 'moderate',
  },
  {
    title: 'Slow-Braised Beef Short Ribs',
    description: 'This is the sort of cold-weather cooking that perfumes the house for hours and pays you back at the table with spoon-tender meat and a glossy, reduced sauce. The method is classic and unhurried, but the result feels luxurious in a way that never goes out of style.',
    yield: '6 servings', prepTime: 25, cookTime: 185, totalTime: 210, servings: 6, difficulty: 'advanced',
    ingredientGroups: [
      { label: null, ingredients: [
        { amount: '5', unit: 'pounds', item: 'bone-in beef short ribs', optional: false },
        { amount: '2', unit: 'medium', item: 'yellow onions, chopped', optional: false },
        { amount: '3', unit: 'medium', item: 'carrots, chopped', optional: false },
        { amount: '3', unit: 'stalks', item: 'celery, chopped', optional: false },
        { amount: '4', unit: 'cloves', item: 'garlic, smashed', optional: false },
        { amount: '2', unit: 'tablespoons', item: 'tomato paste', optional: false },
        { amount: '2', unit: 'cups', item: 'dry red wine', optional: false },
        { amount: '3', unit: 'cups', item: 'beef stock', optional: false },
        { amount: '2', unit: 'sprigs', item: 'fresh rosemary', optional: false },
        { amount: '6', unit: 'sprigs', item: 'fresh thyme', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: 'Braise', steps: [
        { text: 'Heat the oven to 325°F. Pat the short ribs very dry and season them well with kosher salt and black pepper.', tip: 'Thorough drying helps them sear instead of steam.' },
        { text: 'In a large Dutch oven, heat a thin film of oil over medium-high heat and sear the short ribs in batches until deeply browned on all sides, 10 to 12 minutes per batch. Transfer them to a tray as they finish.' },
        { text: 'Lower the heat to medium and cook the onions, carrots, and celery in the rendered fat until softened and beginning to color, about 8 minutes. Add the garlic and tomato paste and cook until the paste darkens slightly and smells sweet, about 2 minutes.' },
        { text: 'Pour in the wine and simmer, scraping the pot, until reduced by about half. Return the ribs to the pot, add the stock and herbs, and bring just to a simmer.' },
        { text: 'Cover and braise in the oven until the meat is deeply tender and nearly slips from the bone, 2 1/2 to 3 hours.' },
        { text: 'Transfer the ribs to a platter. Strain the braising liquid if you like a refined sauce, then simmer it on the stove until glossy enough to coat a spoon. Skim the fat and season to taste before serving over the ribs.' },
      ]},
    ],
    tips: ['Short ribs are even better the next day, after the fat has firmed and can be lifted off easily.', 'Serve over mashed potatoes, polenta, or buttered noodles to catch the sauce.', 'Do not rush the browning step, since it builds much of the finished flavor.'],
    substitutions: [{ original: 'red wine', substitute: 'additional beef stock', note: 'Add 1 tablespoon red-wine vinegar at the end for some brightness.' }],
    tags: { cuisine: 'French-inspired', mealType: 'dinner', dietary: ['gluten-free'], season: 'winter', cookingMethod: ['braising'] },
    nutrition: { calories: 820, protein: '54g', carbs: '15g', fat: '54g', fiber: '3g', sodium: '710mg' },
    sourceNote: 'Gold-standard braise benchmark recipe.',
    imagePrompt: 'Braised beef short ribs in a glossy dark sauce with carrots and herbs in a Dutch oven, editorial food photography.',
    kidFriendlyScore: 5, weeknightScore: 2, leftoversScore: 10, costTier: 'premium',
  },
  {
    title: 'Thai Green Curry with Chicken',
    description: 'A good green curry should taste vivid, aromatic, and layered rather than merely hot, and this version gets there by blooming the curry paste before the liquid ever goes in. Chicken stays tender, vegetables soften without collapsing, and the broth lands somewhere between silken and lively.',
    yield: '4 servings', prepTime: 15, cookTime: 25, totalTime: 40, servings: 4, difficulty: 'medium',
    ingredientGroups: [
      { label: null, ingredients: [
        { amount: '1 1/2', unit: 'pounds', item: 'boneless, skinless chicken thighs, cut into bite-size pieces', optional: false },
        { amount: '2', unit: 'tablespoons', item: 'green curry paste', optional: false },
        { amount: '1', unit: '13.5-ounce can', item: 'full-fat coconut milk', optional: false },
        { amount: '1', unit: 'cup', item: 'chicken broth', optional: false },
        { amount: '1', unit: 'medium', item: 'red bell pepper, sliced', optional: false },
        { amount: '1', unit: 'small', item: 'zucchini, halved and sliced', optional: false },
        { amount: '1', unit: 'cup', item: 'snow peas', optional: false },
        { amount: '2', unit: 'teaspoons', item: 'fish sauce', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'brown sugar', optional: false },
        { amount: '1/2', unit: 'cup', item: 'Thai basil leaves', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Scoop the thick coconut cream from the top of the can into a large skillet or Dutch oven and set over medium heat. Add the curry paste and cook, stirring, until fragrant and slightly darker, about 2 minutes.' },
        { text: 'Add the chicken and stir to coat it in the curry paste, then cook until it loses its raw sheen, 3 to 4 minutes.' },
        { text: 'Pour in the remaining coconut milk and the broth, then add the bell pepper and zucchini. Bring to a gentle simmer and cook until the chicken is cooked through and the vegetables are tender but not mushy, 10 to 12 minutes.' },
        { text: 'Stir in the snow peas, fish sauce, and brown sugar, then simmer for 2 minutes more until the peas turn bright green and just tender.' },
        { text: 'Off the heat, stir in the Thai basil and let it wilt into the curry. Taste and adjust with more fish sauce or a pinch of sugar if needed before serving.' },
      ]},
    ],
    tips: ['Serve with jasmine rice to balance the sauce.', 'If your curry paste is especially spicy, start with less and add more after the broth goes in.', 'Leftovers reheat gently over low heat without boiling, which can split the coconut milk.'],
    substitutions: [{ original: 'chicken thighs', substitute: 'firm tofu', note: 'Pan-sear it first so it keeps its shape in the curry.' }],
    tags: { cuisine: 'Thai', mealType: 'dinner', dietary: ['dairy-free', 'gluten-free-option'], season: 'year-round', cookingMethod: ['simmering'] },
    nutrition: { calories: 560, protein: '34g', carbs: '16g', fat: '40g', fiber: '4g', sodium: '780mg' },
    sourceNote: 'Gold-standard curry benchmark recipe.',
    imagePrompt: 'Thai green curry with chicken, basil, peppers, and creamy coconut broth in a shallow bowl, editorial food photography.',
    kidFriendlyScore: 6, weeknightScore: 7, leftoversScore: 7, costTier: 'moderate',
  },
  {
    title: 'Shakshuka with Feta and Herbs',
    description: 'Shakshuka succeeds when the tomato base tastes like a sauce you would happily eat on its own, not merely a place to poach eggs, and this one does exactly that. The eggs stay soft, the feta adds salinity and cream, and the herbs make the whole skillet feel bright at the table.',
    yield: '4 servings', prepTime: 10, cookTime: 20, totalTime: 30, servings: 4, difficulty: 'easy',
    ingredientGroups: [
      { label: null, ingredients: [
        { amount: '1', unit: 'medium', item: 'yellow onion, finely chopped', optional: false },
        { amount: '1', unit: 'medium', item: 'red bell pepper, finely chopped', optional: false },
        { amount: '3', unit: 'cloves', item: 'garlic, minced', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'ground cumin', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'sweet paprika', optional: false },
        { amount: '1', unit: '28-ounce can', item: 'whole peeled tomatoes, crushed by hand', optional: false },
        { amount: '6', unit: 'large', item: 'eggs', optional: false },
        { amount: '3', unit: 'ounces', item: 'feta, crumbled', optional: false },
        { amount: '1/4', unit: 'cup', item: 'flat-leaf parsley and cilantro, chopped', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Heat olive oil in a large skillet over medium heat. Add the onion and bell pepper and cook until soft and sweet, 8 to 10 minutes, stirring occasionally.' },
        { text: 'Add the garlic, cumin, and paprika and cook for 30 seconds, until fragrant. Stir in the tomatoes, season with kosher salt and black pepper, and simmer until thickened and jammy enough to hold a spoon trail, about 10 minutes.' },
        { text: 'Use the back of a spoon to make six little wells in the sauce and crack an egg into each one. Cover the skillet and cook until the whites are set but the yolks still wobble gently, 5 to 7 minutes.', tip: 'Start checking early, since overcooked yolks go chalky fast.' },
        { text: 'Scatter the feta and herbs over the top and serve right away with warm bread if you like.' },
      ]},
    ],
    tips: ['If you prefer firmer yolks, leave the skillet covered a minute or two longer.', 'This also works as a brunch-for-dinner dish with a green salad on the side.', 'The tomato base can be made ahead and reheated before adding the eggs.'],
    substitutions: [{ original: 'feta', substitute: 'goat cheese', note: 'Add it in small dollops so it softens into the sauce.' }],
    tags: { cuisine: 'Middle Eastern-inspired', mealType: 'breakfast', dietary: ['vegetarian', 'gluten-free'], season: 'year-round', cookingMethod: ['simmering', 'poaching'] },
    nutrition: { calories: 320, protein: '17g', carbs: '14g', fat: '22g', fiber: '3g', sodium: '610mg' },
    sourceNote: 'Gold-standard shakshuka benchmark recipe.',
    imagePrompt: 'Skillet shakshuka with softly poached eggs, crumbled feta, and herbs, editorial overhead food photography.',
    kidFriendlyScore: 6, weeknightScore: 8, leftoversScore: 4, costTier: 'budget',
  },
  {
    title: 'Korean Bibimbap Bowl',
    description: 'Bibimbap is satisfying precisely because every part keeps its own character, from the savory beef to the cool vegetables to the lacquered fried egg on top. This version is streamlined for home cooking, but it still preserves the layered textures and contrasts that make the dish feel generous.',
    yield: '4 servings', prepTime: 20, cookTime: 25, totalTime: 45, servings: 4, difficulty: 'medium',
    ingredientGroups: [
      { label: 'Beef', ingredients: [
        { amount: '12', unit: 'ounces', item: 'ground beef', optional: false },
        { amount: '2', unit: 'tablespoons', item: 'soy sauce', optional: false },
        { amount: '2', unit: 'teaspoons', item: 'brown sugar', optional: false },
        { amount: '2', unit: 'cloves', item: 'garlic, minced', optional: false },
      ]},
      { label: 'Bowls', ingredients: [
        { amount: '4', unit: 'cups', item: 'cooked short-grain rice', optional: false },
        { amount: '4', unit: 'large', item: 'eggs', optional: false },
        { amount: '2', unit: 'medium', item: 'carrots, julienned', optional: false },
        { amount: '1', unit: 'medium', item: 'zucchini, julienned', optional: false },
        { amount: '5', unit: 'ounces', item: 'baby spinach', optional: false },
        { amount: '8', unit: 'ounces', item: 'shiitake mushrooms, sliced', optional: false },
        { amount: '2', unit: 'teaspoons', item: 'toasted sesame seeds', optional: false },
      ]},
      { label: 'Sauce', ingredients: [
        { amount: '2', unit: 'tablespoons', item: 'gochujang', optional: false },
        { amount: '1', unit: 'tablespoon', item: 'rice vinegar', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'sesame oil', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Whisk together the soy sauce, brown sugar, and garlic. Cook the beef in a skillet over medium-high heat until browned, then stir in the sauce and cook until glossy and mostly absorbed, about 2 minutes.' },
        { text: 'Cook the carrots, zucchini, spinach, and mushrooms separately in a little oil, seasoning each lightly with salt, so every vegetable keeps its own texture and color.' },
        { text: 'Whisk together the gochujang, rice vinegar, sesame oil, and 1 tablespoon water to make a spoonable sauce.' },
        { text: 'Fry the eggs until the whites are set and the yolks are still runny, with crisp browned edges if you like.' },
        { text: 'Divide the rice among bowls and arrange the beef and vegetables in separate sections on top. Finish each bowl with a fried egg, sesame seeds, and some of the sauce.' },
      ]},
    ],
    tips: ['Have all of the vegetables prepped before you start cooking, since bibimbap comes together quickly at the stove.', 'If you want more crunch, add kimchi or sliced cucumbers.', 'Leftover components store well separately and can be assembled into lunch bowls.'],
    substitutions: [{ original: 'ground beef', substitute: 'ground turkey', note: 'Add an extra drizzle of sesame oil for richness.' }],
    tags: { cuisine: 'Korean', mealType: 'dinner', dietary: ['dairy-free'], season: 'year-round', cookingMethod: ['stir-frying', 'frying'] },
    nutrition: { calories: 610, protein: '29g', carbs: '63g', fat: '25g', fiber: '5g', sodium: '870mg' },
    sourceNote: 'Gold-standard bibimbap benchmark recipe.',
    imagePrompt: 'Korean bibimbap bowl with rice, vegetables, beef, fried egg, and gochujang sauce, editorial food photography.',
    kidFriendlyScore: 6, weeknightScore: 6, leftoversScore: 8, costTier: 'moderate',
  },
  {
    title: 'One-Pot Creamy Tuscan White Beans',
    description: 'A pot of beans can feel every bit as luxurious as cream and cheese-heavy comfort food when the broth is built carefully and reduced just enough. Here the beans become silky with stock and olive oil alone, while sun-dried tomatoes and greens give the whole thing depth and color.',
    yield: '4 servings', prepTime: 10, cookTime: 25, totalTime: 35, servings: 4, difficulty: 'easy',
    ingredientGroups: [
      { label: null, ingredients: [
        { amount: '2', unit: '15-ounce cans', item: 'cannellini beans, drained and rinsed', optional: false },
        { amount: '1', unit: 'small', item: 'yellow onion, finely chopped', optional: false },
        { amount: '3', unit: 'cloves', item: 'garlic, sliced', optional: false },
        { amount: '1/3', unit: 'cup', item: 'oil-packed sun-dried tomatoes, chopped', optional: false },
        { amount: '2', unit: 'cups', item: 'vegetable stock', optional: false },
        { amount: '4', unit: 'cups', item: 'baby spinach or chopped kale', optional: false },
        { amount: '1', unit: 'small', item: 'lemon', optional: false },
        { amount: '1/2', unit: 'teaspoon', item: 'dried oregano', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'Heat olive oil in a medium pot over medium heat. Add the onion and cook until soft and translucent, about 5 minutes.' },
        { text: 'Add the garlic, sun-dried tomatoes, and oregano and cook for 1 minute, until the garlic smells sweet and the tomatoes begin to bloom in the oil.' },
        { text: 'Stir in the beans and stock and simmer briskly for 10 to 12 minutes, mashing some of the beans against the side of the pot so the broth turns creamy.' },
        { text: 'Add the spinach and cook until wilted and tender, 2 to 3 minutes. Finish with lemon zest and a squeeze of juice, then season with kosher salt and black pepper.' },
      ]},
    ],
    tips: ['A spoonful of the sun-dried tomato oil gives the broth extra richness.', 'Serve with toast rubbed with garlic for a fuller meal.', 'The beans thicken as they sit, so loosen leftovers with a splash of water or stock when reheating.'],
    substitutions: [{ original: 'cannellini beans', substitute: 'butter beans', note: 'They give the pot an even creamier texture.' }],
    tags: { cuisine: 'Italian-inspired', mealType: 'dinner', dietary: ['vegan', 'gluten-free'], season: 'year-round', cookingMethod: ['simmering'] },
    nutrition: { calories: 390, protein: '15g', carbs: '42g', fat: '19g', fiber: '12g', sodium: '590mg' },
    sourceNote: 'Gold-standard vegan bean benchmark recipe.',
    imagePrompt: 'Creamy Tuscan white beans with spinach and sun-dried tomatoes in a rustic pot, editorial food photography.',
    kidFriendlyScore: 6, weeknightScore: 9, leftoversScore: 8, costTier: 'budget',
  },
  {
    title: 'Buttermilk Pancakes with Maple Butter',
    description: 'A good pancake should be tender, lofty, and lightly crisp around the edges, and these hit all three marks without fuss. The maple butter melts into every crevice, making the stack feel just indulgent enough for a weekend breakfast that still stays classic.',
    yield: '4 servings', prepTime: 10, cookTime: 10, totalTime: 20, servings: 4, difficulty: 'easy',
    ingredientGroups: [
      { label: 'Maple butter', ingredients: [
        { amount: '4', unit: 'tablespoons', item: 'unsalted butter, softened', optional: false },
        { amount: '2', unit: 'tablespoons', item: 'maple syrup', optional: false },
      ]},
      { label: 'Pancakes', ingredients: [
        { amount: '2', unit: 'cups', item: 'all-purpose flour', optional: false },
        { amount: '2', unit: 'tablespoons', item: 'granulated sugar', optional: false },
        { amount: '2', unit: 'teaspoons', item: 'baking powder', optional: false },
        { amount: '1', unit: 'teaspoon', item: 'baking soda', optional: false },
        { amount: '2', unit: 'cups', item: 'buttermilk', optional: false },
        { amount: '2', unit: 'large', item: 'eggs', optional: false },
        { amount: '4', unit: 'tablespoons', item: 'unsalted butter, melted', optional: false },
      ]},
    ],
    instructionGroups: [
      { label: null, steps: [
        { text: 'In a small bowl, mash together the softened butter and maple syrup until smooth and fluffy. Set aside.' },
        { text: 'Whisk the flour, sugar, baking powder, baking soda, and kosher salt in a large bowl. In another bowl, whisk the buttermilk, eggs, and melted butter together.' },
        { text: 'Pour the wet ingredients into the dry ingredients and stir just until no pockets of flour remain. The batter should be lumpy, not smooth, which keeps the pancakes tender.' },
        { text: 'Heat a griddle or nonstick skillet over medium and lightly butter it. Scoop the batter onto the surface and cook until bubbles rise and the edges look set, 2 to 3 minutes.' },
        { text: 'Flip and cook until the second side is golden and the center springs back lightly when pressed, 1 to 2 minutes more. Serve hot with the maple butter.' },
      ]},
    ],
    tips: ['Do not overmix the batter or the pancakes will lose their lift.', 'If making a big batch, keep cooked pancakes warm on a sheet pan in a 200°F oven.', 'The maple butter also works beautifully on waffles or toast.'],
    substitutions: [{ original: 'buttermilk', substitute: '2 cups milk mixed with 2 tablespoons lemon juice', note: 'Let it stand 5 minutes before using.' }],
    tags: { cuisine: 'American', mealType: 'breakfast', dietary: ['vegetarian'], season: 'year-round', cookingMethod: ['griddling'] },
    nutrition: { calories: 520, protein: '11g', carbs: '63g', fat: '24g', fiber: '2g', sodium: '620mg' },
    sourceNote: 'Gold-standard pancake benchmark recipe.',
    imagePrompt: 'Tall stack of buttermilk pancakes with melting maple butter, editorial breakfast photography with warm natural light.',
    kidFriendlyScore: 10, weeknightScore: 9, leftoversScore: 5, costTier: 'budget',
  },
]

async function run() {
  const supportedColumns = await detectSupportedColumns()
  console.log('Supported columns:', Array.from(supportedColumns).sort().join(', '))

  const payload = recipes.map((recipe) => buildRecipe(recipe, supportedColumns))

  const { data: existing, error: existingError } = await supabase
    .from('recipes')
    .select('slug')
    .in('slug', payload.map((recipe) => recipe.slug))

  if (existingError) throw existingError

  const existingSlugs = new Set((existing || []).map((row) => row.slug))
  const toInsert = payload.filter((recipe) => !existingSlugs.has(recipe.slug))

  if (!toInsert.length) {
    console.log('Gold-standard recipes already present, nothing to insert.')
    return
  }

  const { data, error } = await supabase.from('recipes').insert(toInsert).select('id, title, slug')
  if (error) throw error

  console.log(`Inserted ${data.length} gold-standard recipes:`)
  for (const row of data) console.log(`- ${row.title} (${row.slug})`)
}

run().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
