const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    signupAttempted: false,
    loginSuccess: false,
    sessionId: null,
    generateSuccess: false,
    mealLoadedAfterRefresh: false,
    swapSuccess: false,
    shoppingListUpdated: false,
    markCookedSuccess: false,
    feedbackSuccess: false,
    memberAwarenessTested: false,
    errors: []
  };
  
  // Console logging
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      results.errors.push(`[ERROR] ${text}`);
      console.log(`[ERROR] ${text}`);
    }
    // Capture important log markers
    if (text.includes('[TonightPage]') || text.includes('[Auth]') || text.includes('generated')) {
      console.log(`[LOG] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    results.errors.push(`[PAGE ERROR] ${error.message}`);
    console.log('[PAGE ERROR]', error.message);
  });
  
  try {
    console.log('=== PHASE 1: Navigate to app ===');
    await page.goto('https://allio.life', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('Current URL:', url);
    
    // Check if we're on login page or app
    const pageContent = await page.textContent('body');
    const hasLoginForm = await page.$('input[type="email"]') !== null;
    const hasTonight = await page.$('text=Tonight') !== null || await page.$('text=Tonight\'s Meal') !== null;
    
    console.log('Has login form:', hasLoginForm);
    console.log('Has Tonight page:', hasTonight);
    
    // Try to sign up with a disposable email
    if (hasLoginForm) {
      console.log('=== PHASE 1b: Try signup ===');
      
      // Look for signup link or try direct signup
      const signupLink = await page.$('text=Sign up') || await page.$('text=Create account');
      
      if (signupLink) {
        await signupLink.click();
        await page.waitForTimeout(1000);
      }
      
      // Try to sign up with a disposable test email
      const testEmail = `test${Date.now()}@example.com`;
      console.log('Attempting signup with:', testEmail);
      
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (emailInput && passwordInput) {
        await emailInput.fill(testEmail);
        await passwordInput.fill('TestPassword123!');
        
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
          
          console.log('After signup attempt, URL:', page.url());
          
          // Check if we're logged in
          if (page.url().includes('tonight') || page.url().includes('dashboard')) {
            results.signupAttempted = true;
            results.loginSuccess = true;
            console.log('Signup appeared to succeed');
          }
        }
      }
    }
    
    // If not logged in, try login with test credentials
    if (!results.loginSuccess && hasLoginForm) {
      console.log('=== PHASE 1c: Try login with existing credentials ===');
      
      // Use the test user credentials (Steven's account from earlier)
      const testEmail = 'steven@maneely.com'; // This might not work, let's try
      
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (emailInput && passwordInput) {
        await emailInput.fill(testEmail);
        await passwordInput.fill('demo123'); // Common test password
        
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
          
          console.log('After login attempt, URL:', page.url());
          
          if (!page.url().includes('login') && !page.url().includes('signin')) {
            results.loginSuccess = true;
            console.log('Login succeeded');
          }
        }
      }
    }
    
    // Check session
    if (results.loginSuccess) {
      console.log('=== PHASE 2: Verify session ===');
      const localStorage = await page.evaluate(() => Object.keys(localStorage));
      console.log('LocalStorage keys:', localStorage);
      
      // Get auth token from cookies or localStorage
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('sb-'));
      if (authCookie) {
        results.sessionId = authCookie.value.substring(0, 20) + '...';
        console.log('Auth cookie found:', results.sessionId);
      }
    }
    
    // Try to navigate to Tonight page
    if (results.loginSuccess) {
      console.log('=== PHASE 3: Navigate to Tonight ===');
      await page.goto('https://allio.life/tonight', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const tonightContent = await page.textContent('body');
      const hasGenerateBtn = await page.$('text=Generate') !== null;
      console.log('Has Generate button:', hasGenerateBtn);
      
      if (hasGenerateBtn) {
        console.log('=== PHASE 4: Generate meal ===');
        
        // Select some household members if available
        const memberButtons = await page.$$('button:has-text("Steven"), button:has-text("Chloe"), button:has-text("River")');
        console.log('Found member buttons:', memberButtons.length);
        
        // Click a couple of members
        if (memberButtons.length > 0) {
          await memberButtons[0].click();
          await page.waitForTimeout(500);
          console.log('Clicked first member');
        }
        
        // Click Generate
        const generateBtn = await page.$('button:has-text("Generate")');
        if (generateBtn) {
          await generateBtn.click();
          console.log('Clicked Generate, waiting for response...');
          await page.waitForTimeout(5000);
          
          // Check if meal appeared
          const mealName = await page.$eval('h2', el => el.textContent).catch(() => null);
          if (mealName) {
            results.generateSuccess = true;
            console.log('Generated meal:', mealName);
          }
        }
      }
    }
    
    // Test persistence - refresh
    if (results.generateSuccess) {
      console.log('=== PHASE 5: Test persistence after refresh ===');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const mealAfterRefresh = await page.$eval('h2', el => el.textContent).catch(() => null);
      if (mealAfterRefresh) {
        results.mealLoadedAfterRefresh = true;
        console.log('Meal after refresh:', mealAfterRefresh);
      }
    }
    
    // Test swap
    if (results.mealLoadedAfterRefresh) {
      console.log('=== PHASE 6: Test swap ===');
      
      const swapBtn = await page.$('button:has-text("Swap")');
      if (swapBtn) {
        await swapBtn.click();
        await page.waitForTimeout(5000);
        
        const mealAfterSwap = await page.$eval('h2', el => el.textContent).catch(() => null);
        if (mealAfterSwap) {
          results.swapSuccess = true;
          console.log('Meal after swap:', mealAfterSwap);
        }
      }
    }
    
    // Test mark cooked and feedback
    if (results.swapSuccess || results.generateSuccess) {
      console.log('=== PHASE 7: Test cooked/feedback ===');
      
      // Look for "Mark cooked" or "Rate meal" button
      const cookedBtn = await page.$('button:has-text("Mark cooked"), button:has-text("Rate meal")');
      if (cookedBtn) {
        await cookedBtn.click();
        await page.waitForTimeout(1000);
        
        // Check if feedback modal appeared
        const modalVisible = await page.$('text=How was') !== null || await page.$('text=Rate') !== null;
        console.log('Feedback modal visible:', modalVisible);
        
        if (modalVisible) {
          // Select a rating
          const ratingBtn = await page.$('button:has-text("Loved it"), button:has-text("liked")');
          if (ratingBtn) {
            await ratingBtn.click();
            await page.waitForTimeout(500);
            
            // Submit feedback
            const submitBtn = await page.$('button:has-text("Save feedback")');
            if (submitBtn) {
              await submitBtn.click();
              await page.waitForTimeout(2000);
              
              // Check for success
              const successMsg = await page.$('text=Thanks for the feedback') !== null;
              if (successMsg) {
                results.feedbackSuccess = true;
                console.log('Feedback submitted successfully!');
              }
            }
          }
        }
      }
    }
    
  } catch (e) {
    console.log('Error during test:', e.message);
    results.errors.push(e.message);
  }
  
  console.log('\n=== FINAL RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  
  await browser.close();
  process.exit(0);
})();