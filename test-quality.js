const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  console.log('Logging in...');
  await page.goto('https://allio. life/login'.replace(' ',''), { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'test@allio.life');
  await page.fill('input[type="password"]', 'SmokeTest2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(tonight|onboarding)/, { timeout: 30000 });
  
  console.log('Generating meal...');
  await page.goto('https://allio.life/tonight', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /generate tonight's meal/i }).click();
  await page.waitForSelector('text=Meal generated!', { timeout: 90000 });
  const meal1 = await page.locator('h2').first().textContent();
  console.log('Generated:', meal1);
  
  console.log('Swapping...');
  await page.getByRole('button', { name: /^Swap$/ }).click();
  await page.waitForSelector('text=Meal swapped!', { timeout: 90000 });
  const meal2 = await page.locator('h2').first().textContent();
  console.log('Swapped:', meal2);
  
  await browser.close();
  console.log('Done');
})();
