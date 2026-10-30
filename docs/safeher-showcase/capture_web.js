const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../frontend/mobile/node_modules/playwright'));

const OUT_DIR_PUBLIC = path.resolve('docs/safeher-showcase/screenshots/web-public');
const OUT_DIR_ADMIN = path.resolve('docs/safeher-showcase/screenshots/web-admin');

async function captureWeb() {
  console.log('Launching browser for web screenshot capture...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-res retina capture
  });

  const page = await context.newPage();

  console.log('\n--- CAPTURING PUBLIC WEB ---');
  try {
    // 1. Homepage / Welcome
    await page.goto('https://safeherweb.vercel.app/#welcome', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '01_web_homepage_welcome.png'), fullPage: false });
    console.log('✓ 01_web_homepage_welcome.png');

    // 2. Civilian Login Mode
    const civBtn = await page.$('button:has-text("Civilian"), button:has-text("User Login")');
    if (civBtn) {
      await civBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '02_web_civilian_login.png'), fullPage: false });
    console.log('✓ 02_web_civilian_login.png');

    // 3. Police Login Mode
    const policeBtn = await page.$('button:has-text("Police Officer"), button:has-text("Officer Login")');
    if (policeBtn) {
      await policeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '03_web_police_login.png'), fullPage: false });
      console.log('✓ 03_web_police_login.png');
    }

    // 4. User Dashboard
    await page.goto('https://safeherweb.vercel.app/#dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '04_web_user_dashboard.png'), fullPage: false });
    console.log('✓ 04_web_user_dashboard.png');

    // 5. Emergency SOS View
    await page.goto('https://safeherweb.vercel.app/#emergency', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '05_web_emergency_sos.png'), fullPage: false });
    console.log('✓ 05_web_emergency_sos.png');

    // 6. Contacts Management
    await page.goto('https://safeherweb.vercel.app/#contacts', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '06_web_contacts_management.png'), fullPage: false });
    console.log('✓ 06_web_contacts_management.png');

    // 7. Crime Map Radar
    await page.goto('https://safeherweb.vercel.app/#crime-map', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500); // Allow leaflet tiles to render
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '07_web_crime_map_radar.png'), fullPage: false });
    console.log('✓ 07_web_crime_map_radar.png');

    // 8. Community Safety
    await page.goto('https://safeherweb.vercel.app/#community-safety', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '08_web_community_safety.png'), fullPage: false });
    console.log('✓ 08_web_community_safety.png');

    // 9. Police Web Dashboard
    await page.goto('https://safeherweb.vercel.app/#police-dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '09_web_police_dashboard.png'), fullPage: false });
    console.log('✓ 09_web_police_dashboard.png');

    // 10. Recipient Live Tracking Page
    await page.goto('https://safeherweb.vercel.app/#track', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR_PUBLIC, '10_web_recipient_tracking.png'), fullPage: false });
    console.log('✓ 10_web_recipient_tracking.png');

  } catch (err) {
    console.error('Error during public web capture:', err);
  }

  console.log('\n--- CAPTURING ADMIN WEB ---');
  try {
    // 11. Admin Login Gate
    await page.goto('https://safeherwebadmin.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '11_admin_login_portal.png'), fullPage: false });
    console.log('✓ 11_admin_login_portal.png');

    // Perform Login
    const usernameInput = await page.$('#admin-username, input[type="text"]');
    const passwordInput = await page.$('#admin-password, input[type="password"]');
    const submitBtn = await page.$('#login-btn, button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

    if (usernameInput && passwordInput && submitBtn) {
      await usernameInput.fill('admin');
      await passwordInput.fill('admin123');
      await submitBtn.click();
      await page.waitForTimeout(2500);
      console.log('Logged into Admin Portal');
    }

    // 12. Admin Command Overview
    await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '12_admin_command_overview.png'), fullPage: false });
    console.log('✓ 12_admin_command_overview.png');

    // 13. Tab: Incidents & Live Dispatch
    const tabIncidents = await page.$('button:has-text("Incidents"), button[onclick*="incidents"]');
    if (tabIncidents) {
      await tabIncidents.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '13_admin_incidents_dispatch.png'), fullPage: false });
      console.log('✓ 13_admin_incidents_dispatch.png');
    }

    // 14. Tab: Police Force Management
    const tabPolice = await page.$('button:has-text("Police Force"), button[onclick*="police"]');
    if (tabPolice) {
      await tabPolice.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '14_admin_police_force.png'), fullPage: false });
      console.log('✓ 14_admin_police_force.png');
    }

    // 15. Tab: Crime Intelligence & Verification
    const tabCrime = await page.$('button:has-text("Crime Intelligence"), button[onclick*="crime"]');
    if (tabCrime) {
      await tabCrime.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '15_admin_crime_verification.png'), fullPage: false });
      console.log('✓ 15_admin_crime_verification.png');
    }

    // 16. Tab: Safety Advisories & AI Patrol Recommendations
    const tabPatrol = await page.$('button:has-text("Safety Advisories"), button:has-text("Patrol"), button[onclick*="patrols"]');
    if (tabPatrol) {
      await tabPatrol.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '16_admin_patrol_advisories.png'), fullPage: false });
      console.log('✓ 16_admin_patrol_advisories.png');
    }

    // 17. Tab: Citizen Directory
    const tabCitizens = await page.$('button:has-text("Citizen Directory"), button:has-text("Citizens"), button[onclick*="citizens"]');
    if (tabCitizens) {
      await tabCitizens.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR_ADMIN, '17_admin_citizen_directory.png'), fullPage: false });
      console.log('✓ 17_admin_citizen_directory.png');
    }

  } catch (err) {
    console.error('Error during admin web capture:', err);
  }

  await browser.close();
  console.log('\nAll web screenshots captured successfully!');
}

captureWeb();
