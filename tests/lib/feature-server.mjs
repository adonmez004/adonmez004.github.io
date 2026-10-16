import http from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function featureServer(inspector = fileURLToPath(new URL('../../inspector.js', import.meta.url))) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname === '/inspector.js' ? inspector : resolve(root, '.' + pathname);
    if (pathname !== '/inspector.js' && !file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(404); res.end(); return; }
    try { res.setHeader('content-type', types[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((done, reject) => { server.close(error => error ? reject(error) : done()); server.closeIdleConnections(); }) };
}
