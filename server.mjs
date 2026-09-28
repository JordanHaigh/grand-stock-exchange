import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 4173);
const API_ROOT = 'https://prices.runescape.wiki/api/v1/osrs';
const allowedRoutes = new Set(['mapping', 'latest', '5m']);
const development = !process.argv.includes('--prod');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const vite = development ? await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }) : null;
const root = resolve('dist');

async function serveStatic(pathname, response) {
  let requested = decodeURIComponent(pathname.split('?')[0]);
  let target = resolve(root, `.${requested}`);
  if (!target.startsWith(root + sep) && target !== root) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(target)] || 'application/octet-stream' }).end(body);
  } catch {
    const body = await readFile(resolve(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(body);
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/wiki/')) {
    const route = url.pathname.slice('/api/wiki/'.length);
    if (!allowedRoutes.has(route)) {
      response.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Unknown market data endpoint.' }));
      return;
    }
    const identifier = String(request.headers['x-wiki-user-agent'] || '').trim();
    if (identifier.length < 4 || identifier.length > 160 || /[\r\n\0]/.test(identifier)) {
      response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'A descriptive User-Agent identifier is required.' }));
      return;
    }
    try {
      const upstream = await fetch(`${API_ROOT}/${route}`, {
        headers: { 'User-Agent': identifier, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      response.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      }).end(body);
    } catch {
      response.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Could not reach the RuneScape Wiki price API.' }));
    }
    return;
  }
  if (development) vite.middlewares(request, response);
  else await serveStatic(url.pathname, response);
});

server.listen(PORT, () => console.log(`GE Ledger ${development ? 'dev server' : 'server'} running at http://localhost:${PORT}`));
