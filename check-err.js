const { exec } = require('child_process');
const http = require('http');

console.log('Starting vite server...');
const viteProcess = exec('cmd /c "npm run dev -- --port 5174"', { cwd: process.cwd() });

setTimeout(async () => {
    console.log('Fetching HTML...');
    try {
        const response = await fetch('http://localhost:5174');
        const text = await response.text();
        console.log('HTML loaded, size:', text.length);
        
        // We will just read the dist package to see if there is an easy syntax error
        // Or better, let's just use playwright to open it
    } catch(e) {
        console.log('Server not ready yet', e);
    }
    viteProcess.kill();
}, 6000);
