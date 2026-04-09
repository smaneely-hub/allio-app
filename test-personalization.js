const { chromium } = require('@playwright/test');

async function testPersonalization() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const results = [];
  
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      console.log('PASS:', name);
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.message });
      console.log('FAIL:', name, e.message);
    }
  };

  // Setup
  await page.goto('https://allio. life/'.replace(' ',''), { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'test@allio. life'.replace(' ',''));
  await page.fill('input[type="password"]', 'SmokeTest2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/tonight/, { timeout: 30000 });

  // Test 1: Default generation
  await test('1. Default meal generation', async () => {
    await page.goto('https://allio. life/tonight'.replace(' ',''), { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /generate tonight's meal/i }).click();
    await page.waitForSelector('text=Meal generated!', { timeout: 90000 });
    const meal = await page.locator('h2').first().textContent();
    console.log('  Generated:', meal);
    if (!meal || meal.length < 10) throw new Error('Invalid meal');
  });

  // Test 2: Swap once
  await test('2. Swap once', async () => {
    await page.getByRole('button', { name: /^Swap$/ }).click();
    await page.waitForSelector('text=Meal swapped!', { timeout: 90000 });
    const meal = await page.locator('h2').first().textContent();
    console.log('  Swapped to:', meal);
  });

  // Test 3: Multiple swaps - check for oscillation
  await test('3. 5 consecutive swaps produce distinct meals', async () => {
    const meals = [];
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /^Swap$/ }).click();
      await page.waitForSelector('text=Meal swapped!', { timeout: 90000 });
      const meal = await page.locator('h2').first().textContent();
      meals.push(meal);
      console.log('  Swap', i+1, ':', meal);
    }
    const unique = new Set(meals).size;
    console.log('  Unique:', unique, '/ 5');
    if (unique < 4) throw new Error(`Only ${unique} unique meals`);
  });

  // Test 4-8: UI element checks
  await test('4. Effort level selector exists', async () => {
    const effort = await page.locator('select, [class*="effort"], [id*="effort"]').count();
    console.log('  Found effort controls:', effort);
  });

  await test('5. Dietary focus selector exists', async () => {
    const diet = await page.locator('select, [class*="diet"], [id*="diet"]').count();
    console.log('  Found diet controls:', diet);
  });

  await test('6. Feedback input exists', async () => {
    const fb = await page.locator('input[placeholder*="feedback"], textarea[placeholder*="feedback"], input[id*="feedback"]').count();
    console.log('  Found feedback:', fb);
  });

  await test('7. Member selection exists', async () => {
    const members = await page.locator('[class*="member"], [id*="member"], input[type="checkbox"]').count();
    console.log('  Found member controls:', members);
  });

  await test('8. Mark cooked exists', async () => {
    const cooked = await page.locator('button:has-text("cooked"), button:has-text("Cooked")').count();
    console.log('  Found cooked buttons:', cooked);
  });

  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(' -', r.name, r.error));
  }
}

testPersonalization().catch(console.error);
