// Simple helper server to update .dev.vars file
// This runs alongside the main app to handle file system operations
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/update-api-key') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { apiKey } = JSON.parse(body);
        
        if (!apiKey || !apiKey.startsWith('sk-')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid API key' }));
          return;
        }
        
        // Write to .dev.vars
        const devVarsPath = path.join(__dirname, '.dev.vars');
        fs.writeFileSync(devVarsPath, `OPENAI_API_KEY=${apiKey}\n`, 'utf-8');
        
        console.log('✅ API key updated in .dev.vars');
        
        // Restart the main server
        exec('bash /home/user/webapp/restart_server.sh', (error) => {
          if (error) {
            console.error('Restart error:', error);
          } else {
            console.log('🔄 Server restarting...');
          }
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          message: 'API key updated and server restarting'
        }));
        
      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔧 API Key Helper Server running on port ${PORT}`);
  console.log(`   Listening for API key updates...`);
});
