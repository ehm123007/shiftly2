// Zero-dependency local server for Shiftly Workforce Platform
// Universal CommonJS - runs smoothly on ANY Node.js version on Windows, Mac, Linux

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const INITIAL_PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.zip': 'application/zip'
};

function getSearchRoots() {
  const roots = [
    path.join(__dirname, 'dist'),
    __dirname,
    path.join(process.cwd(), 'dist'),
    process.cwd()
  ];

  try {
    const entries = fs.readdirSync(__dirname, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        const subDist = path.join(__dirname, e.name, 'dist');
        if (fs.existsSync(subDist)) roots.push(subDist);
        const subRoot = path.join(__dirname, e.name);
        if (fs.existsSync(path.join(subRoot, 'index.html'))) roots.push(subRoot);
      }
    }
  } catch (err) {}

  return roots;
}

function resolveFile(urlPath) {
  let cleanPath = urlPath.split('?')[0].split('#')[0];
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch (e) {}

  // Remove leading slashes for safe path.join on Windows
  cleanPath = cleanPath.replace(/^[/\\]+/, '');

  if (!cleanPath) {
    cleanPath = 'index.html';
  }

  // Handle direct zip downloads
  if (cleanPath.endsWith('.zip')) {
    const zipCandidates = [
      path.join(__dirname, path.basename(cleanPath)),
      path.join(__dirname, 'public', path.basename(cleanPath)),
      path.join(__dirname, 'dist', path.basename(cleanPath)),
      path.join(process.cwd(), path.basename(cleanPath))
    ];
    for (const z of zipCandidates) {
      if (fs.existsSync(z) && fs.statSync(z).isFile()) return z;
    }
  }

  const roots = getSearchRoots();

  // 1. Direct file check in roots
  for (const r of roots) {
    const target = path.join(r, cleanPath);
    try {
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target;
      }
    } catch (e) {}
  }

  // 2. Asset files resolution (e.g. assets/xyz.js)
  if (cleanPath.includes('assets')) {
    const assetFileName = path.basename(cleanPath);
    for (const r of roots) {
      const assetTarget = path.join(r, 'assets', assetFileName);
      try {
        if (fs.existsSync(assetTarget) && fs.statSync(assetTarget).isFile()) {
          return assetTarget;
        }
      } catch (e) {}
    }
  }

  // 3. Fallback to dist/index.html, app.html, or root index.html
  for (const r of roots) {
    const candidates = ['index.html', 'app.html'];
    for (const cand of candidates) {
      const p = path.join(r, cand);
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return p;
        }
      } catch (e) {}
    }
  }

  return null;
}

const server = http.createServer((req, res) => {
  try {
    const targetFile = resolveFile(req.url || '/');

    if (!targetFile) {
      // Safe fallback: never send 500 error
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Shiftly Workforce Platform</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h2>Shiftly Local Server Running</h2>
          <p>Please make sure you have extracted all files from the ZIP archive.</p>
          <p><a href="/" style="color: #38bdf8; text-decoration: underline;">Click here to refresh</a></p>
        </body>
        </html>
      `);
    }

    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(targetFile, (err, data) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('Shiftly is loading. Please refresh in a moment.');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  } catch (err) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Shiftly server is active. Please refresh.');
  }
});

function launchBrowser(url) {
  const startCmd = process.platform === 'win32' ? `start ${url}` :
                   process.platform === 'darwin' ? `open ${url}` :
                   `xdg-open ${url}`;
  exec(startCmd, () => {});
}

function listenOnPort(port) {
  server.listen(port, '0.0.0.0', () => {
    const url = `http://localhost:${port}`;
    console.log('====================================================');
    console.log('       SHIFTLY WORKFORCE PLATFORM - LOCAL SERVER    ');
    console.log('====================================================');
    console.log(`Server successfully started at: ${url}`);
    console.log('Opening your browser now...');
    console.log('Keep this terminal open while using the app.');
    console.log('Press Ctrl+C to stop the server.\n');

    launchBrowser(url);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPorts = [3000, 3001, 8080, 8000, 5000];
    const currentPort = server.address() ? server.address().port : INITIAL_PORT;
    const nextPort = fallbackPorts.find(p => p > currentPort) || (currentPort + 1);
    console.log(`Port ${currentPort} is in use. Retrying on port ${nextPort}...`);
    listenOnPort(nextPort);
  } else {
    console.error('Server error:', err);
  }
});

listenOnPort(INITIAL_PORT);
