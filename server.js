/* PALMA server: zero dependencies, Node 18+.  Run:  node server.js  */
'use strict';
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const https = require('https');
const Core = require('./public/js/core.js');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, 'public');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const DB_FILE = path.join(DATA, 'db.json');
fs.mkdirSync(UPLOADS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg']);

/* ---------- storage (in memory, written through to one JSON file) ---------- */
let cache = null;
let writing = Promise.resolve();
async function load() {
  if (cache) return cache;
  try { cache = JSON.parse(await fsp.readFile(DB_FILE, 'utf8')); } catch (e) { cache = null; }
  if (cache && process.env.ADMIN_PASSWORD && !cache.admin) await presetAdmin(cache);
  return cache;
}
async function presetAdmin(db) {
  const salt = crypto.randomBytes(16).toString('hex');
  db.admin = { salt, hash: await hash(process.env.ADMIN_PASSWORD, salt) };
}
function save(db) {
  cache = db;
  const json = JSON.stringify(db);
  writing = writing.then(async () => {
    const tmp = DB_FILE + '.tmp';
    await fsp.writeFile(tmp, json);
    await fsp.rename(tmp, DB_FILE);
  }).catch((e) => console.error('save failed', e));
  return writing;
}
function hash(pw, salt) {
  return new Promise((res, rej) => crypto.scrypt(pw, salt, 32, (e, k) => (e ? rej(e) : res(k.toString('hex')))));
}
async function saveImage(dataUrl) {
  const m = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) throw new Error('too large');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const name = crypto.randomBytes(9).toString('hex') + '.' + ext;
  await fsp.writeFile(path.join(UPLOADS, name), buf);
  return '/uploads/' + name;
}
function telegram(token, chatId, text) {
  return new Promise((resolve) => {
    if (!token || !chatId) return resolve({ ok: false, detail: 'Token veya chat id boş' });
    const data = JSON.stringify({ chat_id: chatId, text });
    const req = https.request({ hostname: 'api.telegram.org', path: '/bot' + token + '/sendMessage', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, timeout: 8000 }, (r) => {
      let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => resolve({ ok: r.statusCode === 200, detail: b.slice(0, 200) }));
    });
    req.on('error', (e) => resolve({ ok: false, detail: String(e.message) }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, detail: 'timeout' }); });
    req.write(data); req.end();
  });
}
const env = {
  load, save, hash, saveImage,
  random: async (n) => crypto.randomBytes(n).toString('hex'),
  notify: (order, db) => {
    const o = db.settings.orders;
    const text = '🌸 ' + Core.orderText(order, db.settings, 'ru', { plain: true });
    return telegram(o.telegramToken, o.telegramChatId, text);
  },
  testTelegram: (db) => telegram(db.settings.orders.telegramToken, db.settings.orders.telegramChatId, 'PALMA: Telegram bildirimi çalışıyor ✅')
};
const api = Core.createApi(env);

/* ---------- tiny rate limiter ---------- */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

/* ---------- http helpers ---------- */
function send(res, status, body, headers) {
  const h = Object.assign({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }, headers);
  res.writeHead(status, h); res.end(body);
}
function json(res, status, obj) { send(res, status, JSON.stringify(obj), { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }); }
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function serveFile(req, res, file, opts) {
  let st;
  try { st = await fsp.stat(file); } catch (e) { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = '"' + st.size + '-' + Math.round(st.mtimeMs) + '"';
  const headers = { 'Content-Type': type, ETag: etag, 'Cache-Control': opts.cache, 'Accept-Ranges': 'bytes', Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === etag) { send(res, 304, '', headers); return true; }
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && ext === '.mp4') {
    let start = range[1] ? parseInt(range[1], 10) : 0;
    let end = range[2] ? parseInt(range[2], 10) : st.size - 1;
    if (!range[1] && range[2]) { start = Math.max(0, st.size - parseInt(range[2], 10)); end = st.size - 1; }
    end = Math.min(end, st.size - 1);
    if (start > end || start >= st.size) { send(res, 416, '', { 'Content-Range': 'bytes */' + st.size }); return true; }
    res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 }));
    if (req.method === 'HEAD') return res.end(), true;
    fs.createReadStream(file, { start, end }).pipe(res); return true;
  }
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && st.size > 800) {
    const buf = await fsp.readFile(file);
    const gz = zlib.gzipSync(buf, { level: 6 });
    headers['Content-Encoding'] = 'gzip'; headers['Content-Length'] = gz.length;
    res.writeHead(200, headers); res.end(req.method === 'HEAD' ? undefined : gz); return true;
  }
  headers['Content-Length'] = st.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res); return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    if (p.startsWith('/api/')) {
      if (req.method === 'POST' && p === '/api/orders' && limited('o:' + ip, 12, 10 * 60e3)) return json(res, 429, { ok: false, error: 'rate' });
      if (req.method === 'POST' && (p === '/api/admin/login' || p === '/api/admin/setup') && limited('l:' + ip, 10, 10 * 60e3)) return json(res, 429, { ok: false, error: 'rate' });
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        const raw = await readBody(req, p === '/api/admin/upload' || p === '/api/admin/import' ? 12e6 : 256e3);
        if (raw) { try { body = JSON.parse(raw); } catch (e) { return json(res, 400, { ok: false, error: 'json' }); } }
      }
      const auth = req.headers.authorization || '';
      const r = await api.handle({ method: req.method, path: p, body, token: auth.startsWith('Bearer ') ? auth.slice(7) : '' });
      return json(res, r.status, r.body);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');

    if (p.startsWith('/uploads/')) {
      const f = path.join(UPLOADS, path.basename(p));
      if (await serveFile(req, res, f, { cache: 'public, max-age=31536000, immutable' })) return;
      return send(res, 404, 'Not found');
    }

    let rel = p === '/' ? '/index.html' : p;
    if (rel === '/admin' || rel === '/admin/') rel = '/admin/index.html';
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
    const isMedia = /\.(webp|jpg|jpeg|png|mp4|svg)$/i.test(file);
    if (await serveFile(req, res, file, { cache: isMedia ? 'public, max-age=604800' : 'no-cache' })) return;
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { ok: false, error: 'server' });
  }
});

load().then(() => {
  server.listen(PORT, () => {
    console.log('PALMA is running:  http://localhost:' + PORT);
    console.log('Admin panel:       http://localhost:' + PORT + '/admin/');
  });
});
