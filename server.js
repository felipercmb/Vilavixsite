/**
 * VilaVix — Servidor local embutido
 * Serve a pasta dist/ na porta 5173 e abre o browser automaticamente.
 * Execute: node server.js
 */
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { exec } = require('child_process');

const PORT    = 5173;
const DIST    = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

const server = http.createServer((req, res) => {
  // Normaliza a URL (remove query string)
  let urlPath = req.url.split('?')[0];

  // Para SPA: qualquer rota que não seja um arquivo → serve index.html
  let filePath = path.join(DIST, urlPath);

  // Verifica se é um arquivo existente
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext     = path.extname(filePath).toLowerCase();
  const mime    = MIME[ext] || 'application/octet-stream';
  const content = fs.readFileSync(filePath);

  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  VilaVix Imóveis — Servidor rodando!`);
  console.log(`  Acesse: ${url}\n`);

  // Abre o browser automaticamente no Windows
  const cmd = process.platform === 'win32'
    ? `start ${url}`
    : process.platform === 'darwin'
      ? `open ${url}`
      : `xdg-open ${url}`;

  exec(cmd);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  Porta ${PORT} já em uso — abrindo o site...`);
    exec(process.platform === 'win32'
      ? `start http://localhost:${PORT}`
      : `open http://localhost:${PORT}`);
  } else {
    console.error(err);
  }
});
