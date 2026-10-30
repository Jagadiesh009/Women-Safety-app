const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../frontend/mobile/node_modules/playwright'));

const OUT_DIR_ADMIN = path.resolve('docs/safeher-showcase/screenshots/web-admin');

async function captureAdmin() {
  console.log('Launching browser for admin portal capture...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('Navigating to admin portal...');
  await page.goto('https://safeherwebadmin.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  
  // 11. Admin Login Portal
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '11_admin_login_portal.png'), fullPage: false });
  console.log('✓ 11_admin_login_portal.png');

  // Fill credentials and login
  await page.fill('#adminIdInput', 'admin');
  await page.fill('#passwordInput', 'admin123');
  await page.click('#loginBtn');
  console.log('Clicked login button, waiting for dashboard data...');
  await page.waitForTimeout(3000);

  // 12. Admin Command Overview
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '12_admin_command_overview.png'), fullPage: false });
  console.log('✓ 12_admin_command_overview.png');

  // 13. Tab: Incidents & Live Map
  await page.evaluate(() => switchTab('incidents'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '13_admin_incidents_dispatch.png'), fullPage: false });
  console.log('✓ 13_admin_incidents_dispatch.png');

  // 14. Tab: Police Force Management
  await page.evaluate(() => switchTab('police'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '14_admin_police_force.png'), fullPage: false });
  console.log('✓ 14_admin_police_force.png');

  // 15. Tab: Crime Intelligence & Verification
  await page.evaluate(() => switchTab('crime'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '15_admin_crime_verification.png'), fullPage: false });
  console.log('✓ 15_admin_crime_verification.png');

  // 16. Tab: Safety Advisories & AI Patrol Recommendations
  await page.evaluate(() => switchTab('safety'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '16_admin_patrol_advisories.png'), fullPage: false });
  console.log('✓ 16_admin_patrol_advisories.png');

  // 17. Tab: Citizen Directory
  await page.evaluate(() => switchTab('users'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '17_admin_citizen_directory.png'), fullPage: false });
  console.log('✓ 17_admin_citizen_directory.png');

  await browser.close();
  console.log('Admin screenshots capture complete!');
}

captureAdmin().catch(console.error);
