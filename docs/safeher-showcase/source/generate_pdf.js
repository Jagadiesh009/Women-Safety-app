const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../../frontend/mobile/node_modules/playwright'));

(async () => {
  console.log("Launching headless browser for PDF generation...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const htmlPath = path.resolve(__dirname, 'showcase.html');
  console.log("Loading HTML from:", htmlPath);
  
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Small delay to ensure all images & SVGs render completely
  await page.waitForTimeout(2000);

  const outputPath = path.resolve(__dirname, '../../../docs/SafeHer_Complete_Project_Showcase.pdf');
  console.log("Compiling PDF to:", outputPath);

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '10mm',
      right: '10mm'
    }
  });

  console.log("PDF generation successful!");
  await browser.close();

  const stats = fs.statSync(outputPath);
  console.log(`PDF File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
})();