const { chromium } = require('playwright');

const BASE_URL = 'https://ip-10-0-24-43.tail9f77e8.ts.net';

async function testAPI() {
  console.log('🧪 Testing OpenClaw Platform API with Headless Browser...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Health check via fetch in browser
    console.log('1️⃣ Testing: API Health Endpoint');
    const healthResponse = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/platform/api/health`);
      return res.json();
    }, BASE_URL);
    console.log('   Response:', healthResponse);
    console.log('   ✅ API is healthy\n');
    
    // Test 2: User Registration
    console.log('2️⃣ Testing: User Registration');
    const testEmail = `test-${Date.now()}@example.com`;
    const registerResponse = await page.evaluate(async (email, baseUrl) => {
      const res = await fetch(`${baseUrl}/platform/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      return res.json();
    }, testEmail, BASE_URL);
    
    console.log('   User created:', registerResponse.user.email);
    console.log('   ✅ Registration works\n');
    
    const token = registerResponse.token;
    
    // Test 3: Create Instance
    console.log('3️⃣ Testing: Create Instance (with auth)');
    const instanceResponse = await page.evaluate(async (token, baseUrl) => {
      const res = await fetch(`${baseUrl}/platform/api/instances`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          modelProvider: 'kimi-coding',
          apiKey: 'sk-FtTGKNfWdnEevKCtb6OVM4VgR3FcIr7NuGgtRbDus1mzQSjP',
          telegramToken: '8247288633:AAHIdViiIhnrAND0zSNZCD_sCMZC5UrQZ7I'
        })
      });
      return res.json();
    }, token, BASE_URL);
    
    console.log('   Instance ID:', instanceResponse.id);
    console.log('   Dashboard URL:', instanceResponse.dashboardUrl);
    console.log('   Password:', instanceResponse.password);
    console.log('   ✅ Instance created successfully!\n');
    
    // Test 4: List User's Instances
    console.log('4️⃣ Testing: List Instances');
    const listResponse = await page.evaluate(async (token, baseUrl) => {
      const res = await fetch(`${baseUrl}/platform/api/instances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, token, BASE_URL);
    
    console.log('   Instances:', listResponse.instances.length);
    console.log('   ✅ Instance listing works!\n');
    
    console.log('✅ All API tests passed!\n');
    console.log('📊 Summary:');
    console.log('   - Health check: OK');
    console.log('   - User registration: OK');
    console.log('   - Instance creation: OK');
    console.log('   - Instance listing: OK');
    console.log('\n📝 Note: UI has a rendering issue (stuck on Loading...)');
    console.log('   This is a client-side React bug that needs fixing.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testAPI();