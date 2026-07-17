const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/google-chrome' // Let's hope it's installed, but wait, puppeteer downloaded it to .cache. 
    });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log("Page loaded successfully.");
    await browser.close();
  } catch (err) {
    console.error("Script error:", err);
  }
})();
