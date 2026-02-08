const { chromium } = require('playwright');

async function takeScreenshot() {
  console.log('📸 Taking screenshot of OpenClaw Platform...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Load the platform
    await page.goto('https://ip-10-0-24-43.tail9f77e8.ts.net/platform/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/platform-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved to /tmp/platform-screenshot.png\n');
    
    // Get page title
    const title = await page.title();
    console.log('📄 Page Title:', title);
    
    // Get page content
    const content = await page.content();
    const hasLoading = content.includes('Loading...');
    const hasPlatform = content.includes('OpenClaw Platform');
    
    console.log('🔍 Page Analysis:');
    console.log('   - Shows "Loading...":', hasLoading ? 'Yes (React not rendering)' : 'No');
    console.log('   - Contains "OpenClaw Platform":', hasPlatform ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshot();