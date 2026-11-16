// Outil de développement : sert le projet et enregistre les icônes découpées dans img/.
// Lancer : node tools/serveur-decoupe.mjs  ->  http://localhost:8766/tools/decoupe.html
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'img');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/save') {
    const target = resolve(root, normalize(url.searchParams.get('path') || ''));
    if (!target.startsWith(imgDir + sep) || !target.endsWith('.png')) { res.writeHead(400); return res.end('chemin refusé'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const b64 = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(b64, 'base64'));
    res.writeHead(200); return res.end('ok');
  }
  const p = normalize(decodeURIComponent(url.pathname)).replace(/^([\\/])+/, '') || 'index.html';
  try { const d = await readFile(join(root, p)); res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' }); res.end(d); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(8766, () => console.log('http://localhost:8766/tools/decoupe.html'));
