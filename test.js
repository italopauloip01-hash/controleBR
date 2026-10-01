const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function run() {
    console.log('Starting vite server...');
    const server = spawn('cmd', ['/c', 'npx vite --port 5174'], { shell: true });
    
    // Wait a couple of seconds for server to start
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        } else {
            console.log('BROWSER LOG:', msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('PAGE ERROR (uncaught exception):', err.message);
    });

    console.log('Navigating to http://localhost:5174 ...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    
    // Wait for the simulated loading to finish
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Checking if black screen (body content empty or error overlay exists)...');
    const content = await page.content();
    if (content.includes('vite-error-overlay')) {
        console.log('Vite error overlay detected!');
    }
    
    await browser.close();
    server.kill();
    process.exit(0);
}

run().catch(console.error);
