"""
RULE-DRIVEN RECIPE GENERATOR - Fixed Validation
"""

import random
import json

METHODS = {
    "air_fryer": {
        "equipment": ["air fryer"],
        "verbs": ["air fry", "flip", "shake"],
        "heat": "400F",
        "prohibitions": ["skillet", "stovetop", "pan", "wok", "simmer", "sauté", "sear", "per side"],
        "step_structure": [
            "Preheat air fryer to {heat}",
            "Lightly spray basket",
            "Place {protein} in single layer",
            "Air fry for {time}",
            "Shake basket or flip halfway",
            "Continue until golden and cooked through"
        ],
        "done_check": "golden and cooked through",
        "time_formula": {"shrimp": "4-5 min", "chicken": "12-15 min", "tofu": "18-22 min", "fish": "10-12 min", "default": "10-15 min"}
    },
    "stir_fry": {
        "equipment": ["wok"],
        "verbs": ["toss", "stir", "sauté"],
        "heat": "high heat",
        "prohibitions": ["per side", "cook until done", "simmer", "braise", "slow cooker", "air fry"],
        "step_structure": [
            "Heat wok over high heat until smoking",
            "Add oil, swirl to coat",
            "Add aromatics, stir 10 seconds",
            "Add {protein}, toss continuously {time}",
            "Add vegetables, toss 2-3 min",
            "Add sauce, toss 30 seconds",
            "Serve immediately"
        ],
        "done_check": "no longer pink",
        "time_formula": {"shrimp": "2 min", "chicken": "4-5 min", "beef": "2-3 min", "tofu": "4-5 min", "default": "3-4 min"}
    },
    "skillet": {
        "equipment": ["skillet"],
        "verbs": ["sear", "sauté", "simmer"],
        "heat": "medium-high",
        "prohibitions": ["air fry", "wok", "slow cooker"],
        "step_structure": [
            "Heat skillet over medium-high heat",
            "Add oil and swirl to coat",
            "Season {protein} with salt and pepper",
            "Add to skillet, cook {time}",
            "Add vegetables",
            "Cook until done",
            "Rest before serving"
        ],
        "done_check": "cooked through",
        "time_formula": {"chicken_breast": "6-7 min/side", "chicken_thigh": "8 min/side", "steak": "3-4 min/side", "ground_beef": "5-7 min, crumbling", "pork_chop": "4-5 min/side", "default": "varies"}
    },
    "sheet_pan": {
        "equipment": ["sheet pan"],
        "verbs": ["roast", "bake"],
        "heat": "425F",
        "prohibitions": ["wok", "stir fry", "air fry", "skillet"],
        "step_structure": [
            "Preheat oven to {heat}",
            "Arrange {protein} and vegetables in single layer",
            "Drizzle with oil, season",
            "Roast for {time}",
            "Flip protein halfway",
            "Roast until golden"
        ],
        "done_check": "golden and cooked through",
        "time_formula": {"chicken": "20-25 min", "shrimp": "8-10 min", "salmon": "12-15 min", "tofu": "25-30 min", "default": "15-20 min"}
    },
    "slow_cooker": {
        "equipment": ["slow cooker"],
        "verbs": ["slow cook", "simmer"],
        "heat": "low",
        "prohibitions": ["air fry", "wok", "skillet", "sear", "high heat"],
        "step_structure": [
            "Season {protein} with rub",
            "Place in slow cooker",
            "Add vegetables and liquid",
            "Cover, cook on LOW {time}",
            "Shred or slice before serving"
        ],
        "done_check": "fork tender",
        "time_formula": {"chicken": "6-8 hours", "beef": "7-9 hours", "pork": "6-8 hours", "default": "6-8 hours"}
    },
    "braised": {
        "equipment": ["dutch oven"],
        "verbs": ["sear", "braise", "simmer"],
        "heat": "medium then low",
        "prohibitions": ["air fry", "wok"],
        "step_structure": [
            "Season {protein} with salt and pepper",
            "Sear in dutch oven until golden, remove",
            "Sauté aromatics until soft",
            "Add liquid",
            "Return protein to pot",
            "Cover, braise on low heat for {time}",
            "Until fork tender"
        ],
        "done_check": "fork tender",
        "time_formula": {"chicken": "1.5 hours", "beef": "2-3 hours", "pork": "1.5-2 hours", "default": "1.5-2 hours"}
    }
}

PROTEIN_MODIFIERS = {
    "chicken_breast": {"prep": "pound to even thickness", "done_temp": "165F", "special": ""},
    "chicken_thighs": {"prep": "remove excess skin", "done_temp": "175F", "special": ""},
    "ground_beef": {"prep": "none", "done_temp": "160F", "special": "break apart with spatula as it cooks"},
    "shrimp": {"prep": "peel, devein", "done_temp": "145F", "special": "do not overcook"},
    "salmon": {"prep": "check for bones, pat dry", "done_temp": "145F", "special": ""},
    "tofu": {"prep": "press 15 min, cube", "done_temp": "165F", "special": "toss in cornstarch for crispiness"},
    "beef": {"prep": "pat dry", "done_temp": "145F", "special": ""},
    "pork_chop": {"prep": "bring to room temp", "done_temp": "145F", "special": ""}
}

def validate_recipe(recipe):
    errors = []
    method = recipe.get("method", "")
    instructions = " ".join(json.loads(recipe.get("instructions_json", "[]"))).lower()
    title = recipe.get("title", "")
    
    method_rules = METHODS.get(method, {})
    prohibitions = method_rules.get("prohibitions", [])
    
    for prob in prohibitions:
        if prob.lower() in instructions:
            errors.append(f"PROHIBITED: '{prob}' in instructions")
    
    if "per side" in instructions:
        if "ground" in title.lower() or "shrimp" in title.lower() or "beans" in title.lower():
            errors.append("PHYSICS_ERROR: 'per side' for inappropriate protein")
    
    return errors

def generate_recipe(idx, method, protein, cuisine):
    method_rules = METHODS[method]
    protein_mod = PROTEIN_MODIFIERS.get(protein, {"prep": "", "done_temp": "", "special": ""})
    
    title = f"{cuisine} {protein.replace('_', ' ').title()} {method.replace('_', ' ')}"
    slug = f"dinner-{idx+1}-{protein}-{cuisine.lower()}-{method}"
    
    time_key = protein if protein in method_rules["time_formula"] else "default"
    time_str = method_rules["time_formula"][time_key]
    
    instructions = []
    for step in method_rules["step_structure"]:
        step = step.replace("{protein}", protein.replace("_", " "))
        step = step.replace("{heat}", method_rules["heat"])
        step = step.replace("{time}", time_str)
        instructions.append(step)
    
    if protein_mod["prep"]:
        instructions.insert(0, f"Prep: {protein_mod['prep']}")
    if protein_mod["special"]:
        instructions.append(protein_mod["special"])
    
    if method == "slow_cooker":
        prep, cook = 15, random.randint(360, 480)
    elif method == "air_fryer":
        prep, cook = random.randint(5, 10), random.randint(10, 20)
    elif method == "stir_fry":
        prep, cook = random.randint(10, 15), random.randint(8, 12)
    else:
        prep, cook = random.randint(5, 15), random.randint(15, 30)
    
    difficulty = "easy" if method in ["slow_cooker", "sheet_pan"] else "medium"
    kid_score = random.randint(7, 10) if cook <= 30 else random.randint(5, 8)
    weeknight_score = random.randint(8, 10) if cook <= 30 else random.randint(4, 7)
    
    recipe = {
        "title": title, "slug": slug,
        "description": f"A {cuisine.lower()} {method.replace('_', ' ')} dish with {protein.replace('_', ' ')}.",
        "cuisine": cuisine, "meal_type": "dinner",
        "prep_time_minutes": prep, "cook_time_minutes": cook, "servings": 4,
        "ingredients_json": json.dumps([
            {"item": protein.replace("_", " "), "quantity": "1", "unit": "lb"},
            {"item": "vegetables", "quantity": "2", "unit": "cups"},
            {"item": "oil", "quantity": "2", "unit": "tbsp"},
            {"item": "garlic", "quantity": "2-3", "unit": "cloves"},
            {"item": "salt", "quantity": "1", "unit": "tsp"},
            {"item": "pepper", "quantity": "1/2", "unit": "tsp"}
        ]),
        "instructions_json": json.dumps(instructions),
        "nutrition_json": json.dumps({"calories": random.randint(350, 550), "protein": random.randint(25, 50), "carbs": random.randint(15, 45), "fat": random.randint(10, 28)}),
        "dietary_flags_json": "[]", "allergen_flags_json": "[]",
        "equipment_json": json.dumps(method_rules["equipment"]),
        "tags_json": json.dumps([method.replace("_", "-"), difficulty] + (["quick"] if cook <= 20 else [])),
        "kid_friendly_score": kid_score, "weeknight_score": weeknight_score, "leftovers_score": random.randint(5, 9),
        "cost_tier": random.choice(["budget", "moderate", "premium"]), "difficulty": difficulty,
        "source_type": "seed", "source_name": "rule_driven_v3",
        "method": method
    }
    
    errors = validate_recipe(recipe)
    recipe.pop("method", None)
    return recipe, errors

# Generate 10 test recipes
test_cases = [
    ("air_fryer", "shrimp", "Thai"),
    ("stir_fry", "chicken_breast", "Chinese"),
    ("skillet", "ground_beef", "Mexican"),
    ("sheet_pan", "salmon", "Mediterranean"),
    ("slow_cooker", "chicken_thighs", "American"),
    ("air_fryer", "tofu", "Japanese"),
    ("stir_fry", "beef", "Korean"),
    ("skillet", "pork_chop", "German"),
    ("braised", "beef", "French"),
    ("sheet_pan", "chicken_breast", "Greek"),
]

print("=" * 60)
print("RULE-DRIVEN RECIPE GENERATOR - VALIDATION TEST")
print("=" * 60)

recipes = []
for idx, (method, protein, cuisine) in enumerate(test_cases):
    recipe, errors = generate_recipe(idx, method, protein, cuisine)
    recipes.append((recipe, errors))
    
    status = "✅ PASS" if not errors else f"❌ FAIL ({len(errors)})"
    print(f"\n[{idx+1}] {cuisine} {protein} {method} → {status}")
    
    instr = json.loads(recipe["instructions_json"])
    print(f"    Step 1: {instr[0][:60]}...")
    print(f"    Step 2: {instr[1][:60]}...")
    if errors:
        for e in errors[:2]:
            print(f"    ERROR: {e}")

passed = sum(1 for _, e in recipes if not e)
print(f"\n{'='*60}")
print(f"RESULT: {passed}/10 PASSED")
print(f"{'='*60}")

# Output SQL
print("\nINSERT INTO recipes (title, slug, description, cuisine, meal_type, prep_time_minutes, cook_time_minutes, servings, ingredients_json, instructions_json, nutrition_json, dietary_flags_json, allergen_flags_json, equipment_json, tags_json, kid_friendly_score, weeknight_score, leftovers_score, cost_tier, difficulty, source_type, source_name) VALUES")

rows = []
for recipe, _ in recipes:
    row = f"({json.dumps(recipe['title'])}, {json.dumps(recipe['slug'])}, {json.dumps(recipe['description'])}, {json.dumps(recipe['cuisine'])}, {json.dumps(recipe['meal_type'])}, {recipe['prep_time_minutes']}, {recipe['cook_time_minutes']}, {recipe['servings']}, {recipe['ingredients_json']}, {recipe['instructions_json']}, {recipe['nutrition_json']}, {recipe['dietary_flags_json']}, {recipe['allergen_flags_json']}, {recipe['equipment_json']}, {recipe['tags_json']}, {recipe['kid_friendly_score']}, {recipe['weeknight_score']}, {recipe['leftovers_score']}, {json.dumps(recipe['cost_tier'])}, {json.dumps(recipe['difficulty'])}, {json.dumps(recipe['source_type'])}, {json.dumps(recipe['source_name'])})"
    rows.append(row)

print(",\n".join(rows) + ";")
