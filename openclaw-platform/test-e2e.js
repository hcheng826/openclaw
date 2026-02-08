const { chromium } = require('playwright');

async function testPlatform() {
  console.log('🧪 Starting OpenClaw Platform E2E Test...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Load the platform
    console.log('1️⃣ Testing: Platform loads');
    await page.goto('https://ip-10-0-24-43.tail9f77e8.ts.net/platform/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait for React to hydrate
    console.log('   ✅ Platform loaded successfully\n');
    
    // Screenshot 1: Landing page
    await page.screenshot({ path: '/tmp/test-01-landing.png' });
    
    // Test 2: Register a new user
    console.log('2️⃣ Testing: User Registration');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'password123';
    
    // Click "Register" link
    await page.click('text=Register');
    await page.waitForSelector('text=Create account', { timeout: 5000 });
    
    // Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Register")');
    
    // Wait for dashboard
    await page.waitForSelector('text=Your Instances', { timeout: 10000 });
    console.log(`   ✅ User registered: ${testEmail}\n`);
    
    // Screenshot 2: Dashboard
    await page.screenshot({ path: '/tmp/test-02-dashboard.png' });
    
    // Test 3: Create instance - Step 1
    console.log('3️⃣ Testing: Create Instance - Step 1 (Model)');
    await page.click('button:has-text("Create New Instance")');
    await page.waitForSelector('text=Step 1: AI Model', { timeout: 5000 });
    
    // Fill API key
    await page.fill('input[type="password"]', 'sk-FtTGKNfWdnEevKCtb6OVM4VgR3FcIr7NuGgtRbDus1mzQSjP');
    await page.click('button:has-text("Continue")');
    console.log('   ✅ Step 1 completed\n');
    
    // Screenshot 3: Step 1
    await page.screenshot({ path: '/tmp/test-03-step1.png' });
    
    // Test 4: Create instance - Step 2
    console.log('4️⃣ Testing: Create Instance - Step 2 (Telegram)');
    await page.waitForSelector('text=Step 2: Telegram Bot', { timeout: 5000 });
    
    // Fill Telegram token
    await page.fill('input[type="text"]', '8247288633:AAHIdViiIhnrAND0zSNZCD_sCMZC5UrQZ7I');
    await page.click('button:has-text("Continue")');
    console.log('   ✅ Step 2 completed\n');
    
    // Screenshot 4: Step 2
    await page.screenshot({ path: '/tmp/test-04-step2.png' });
    
    // Test 5: Create instance - Step 3 (Deploy)
    console.log('5️⃣ Testing: Create Instance - Step 3 (Deploy)');
    await page.waitForSelector('text=Step 3: Deploy', { timeout: 5000 });
    
    // Click deploy
    await page.click('button:has-text("🚀 Deploy Instance")');
    console.log('   🚀 Deploying...\n');
    
    // Wait for success
    await page.waitForSelector('text=🎉 Instance Created!', { timeout: 60000 });
    console.log('   ✅ Instance created successfully!\n');
    
    // Screenshot 5: Success
    await page.screenshot({ path: '/tmp/test-05-success.png' });
    
    // Get instance details
    const dashboardUrl = await page.locator('a[href*="tail9f77e8.ts.net"]').getAttribute('href');
    const passwordElement = await page.locator('code').first();
    const password = await passwordElement.textContent();
    
    console.log('📊 Test Results:');
    console.log('   Dashboard URL:', dashboardUrl);
    console.log('   Password:', password);
    console.log('   Telegram Bot: @bot_8247288633\n');
    
    console.log('✅ All tests passed!\n');
    console.log('📸 Screenshots saved:');
    console.log('   - /tmp/test-01-landing.png');
    console.log('   - /tmp/test-02-dashboard.png');
    console.log('   - /tmp/test-03-step1.png');
    console.log('   - /tmp/test-04-step2.png');
    console.log('   - /tmp/test-05-success.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-error.png' });
    console.log('📸 Error screenshot: /tmp/test-error.png');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testPlatform();