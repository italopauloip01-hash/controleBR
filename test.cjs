const { chromium } = require('playwright');

async function run() {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log('Navigating to http://localhost:5174...');
    try {
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 15000 });
        console.log('Page loaded completely.');
    } catch(e) {
        console.log('Timeout or error loading page:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if the page is completely blank
    const content = await page.evaluate(() => document.body.innerHTML);
    if (content.length < 50) {
        console.log('BODY IS BLANK! Length:', content.length);
    }

    await browser.close();
}

run().catch(console.error);
