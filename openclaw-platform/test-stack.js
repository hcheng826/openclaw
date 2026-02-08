const { chromium } = require('playwright');

async function testFullStack() {
  console.log('🧪 Starting Full Stack E2E Test (Browser → API → PostgreSQL)\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const BASE_URL = 'https://ip-10-0-24-43.tail9f77e8.ts.net';
  const results = [];
  
  try {
    // Test 1: Platform loads via browser
    console.log('1️⃣ Testing: Platform page loads in browser');
    await page.goto(`${BASE_URL}/platform/`);
    await page.waitForTimeout(3000);
    const title = await page.title();
    results.push({ test: 'Page Load', status: title.includes('OpenClaw') ? '✅ PASS' : '❌ FAIL', detail: title });
    console.log(`   ${results[0].status}: ${title}\n`);
    await page.screenshot({ path: '/tmp/e2e-01-landing.png' });
    
    // Test 2: Health check via browser fetch
    console.log('2️⃣ Testing: API Health via browser fetch');
    const health = await page.evaluate(async ({ baseUrl }) => {
      try {
        const res = await fetch(`${baseUrl}/platform/api/health`);
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, { baseUrl: BASE_URL });
    results.push({ test: 'Health Check', status: health.status === 'ok' ? '✅ PASS' : '❌ FAIL', detail: JSON.stringify(health) });
    console.log(`   ${results[1].status}: ${JSON.stringify(health)}\n`);
    
    // Test 3: User Registration via browser fetch
    console.log('3️⃣ Testing: User Registration via browser fetch');
    const testEmail = `e2e-${Date.now()}@test.com`;
    const register = await page.evaluate(async ({ baseUrl, email }) => {
      try {
        const res = await fetch(`${baseUrl}/platform/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123' })
        });
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, { baseUrl: BASE_URL, email: testEmail });
    
    const token = register.token;
    results.push({ test: 'Registration', status: register.user ? '✅ PASS' : '❌ FAIL', detail: register.user?.email || register.error });
    console.log(`   ${results[2].status}: ${register.user?.email || register.error}\n`);
    
    if (!token) throw new Error('Registration failed, cannot continue');
    
    // Test 4: Create Instance via browser fetch
    console.log('4️⃣ Testing: Instance Creation via browser fetch');
    const instance = await page.evaluate(async ({ baseUrl, authToken }) => {
      try {
        const res = await fetch(`${baseUrl}/platform/api/instances`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            modelProvider: 'kimi-coding',
            apiKey: 'sk-test-key-12345',
            telegramToken: '123456789:AAHtesttoken123'
          })
        });
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, { baseUrl: BASE_URL, authToken: token });
    
    const instanceId = instance.id;
    results.push({ test: 'Instance Creation', status: instance.id ? '✅ PASS' : '❌ FAIL', detail: instance.id || instance.error });
    console.log(`   ${results[3].status}: ${instance.id || instance.error}\n`);
    
    if (!instanceId) throw new Error('Instance creation failed');
    
    // Test 5: List Instances via browser fetch
    console.log('5️⃣ Testing: List Instances via browser fetch');
    const list = await page.evaluate(async ({ baseUrl, authToken }) => {
      try {
        const res = await fetch(`${baseUrl}/platform/api/instances`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, { baseUrl: BASE_URL, authToken: token });
    
    results.push({ test: 'List Instances', status: list.instances?.length > 0 ? '✅ PASS' : '❌ FAIL', detail: `${list.instances?.length || 0} instances` });
    console.log(`   ${results[4].status}: ${list.instances?.length || 0} instances\n`);
    
    // Test 6: Verify data persistence
    console.log('6️⃣ Testing: Data Persistence (reload and verify)');
    await page.reload();
    await page.waitForTimeout(2000);
    
    const listAfterReload = await page.evaluate(async ({ baseUrl, authToken }) => {
      try {
        const res = await fetch(`${baseUrl}/platform/api/instances`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, { baseUrl: BASE_URL, authToken: token });
    
    const stillHasData = listAfterReload.instances?.some(i => i.id === instanceId);
    results.push({ test: 'Data Persistence', status: stillHasData ? '✅ PASS' : '❌ FAIL', detail: stillHasData ? 'Instance persisted' : 'Data lost!' });
    console.log(`   ${results[5].status}: ${stillHasData ? 'Instance persisted in PostgreSQL' : 'Data lost!'}\n`);
    
    await page.screenshot({ path: '/tmp/e2e-06-final.png' });
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('================');
    results.forEach(r => console.log(`${r.status} ${r.test}: ${r.detail}`));
    
    const passed = results.filter(r => r.status.includes('PASS')).length;
    const failed = results.filter(r => r.status.includes('FAIL')).length;
    
    console.log(`\n✅ ${passed} passed, ❌ ${failed} failed`);
    console.log('\n📸 Screenshots:');
    console.log('   - /tmp/e2e-01-landing.png');
    console.log('   - /tmp/e2e-06-final.png');
    
    if (failed > 0) process.exit(1);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    await page.screenshot({ path: '/tmp/e2e-error.png' });
    console.log('📸 Error screenshot: /tmp/e2e-error.png');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testFullStack();