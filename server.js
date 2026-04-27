const express = require('express');
const https   = require('https');
const path    = require('path');

const app       = express();
const PORT      = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'liveamo2024';
const BIN_ID    = process.env.BIN_ID    || '69eed0c936566621a8f5f9b3';
const BIN_KEY   = process.env.BIN_KEY   || '$2a$10$CLq7dpciQj46GhxuRiF/AOnossbyUcFeuZU.rCvDH4L9SpAlns5dW';

app.use(express.json());

// Sin caché para HTML — siempre servir la versión más reciente
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

app.use(express.static(__dirname));

// ── Helper: llamar a JSONbin desde el servidor (sin CORS) ──
function jsonbin(method, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: 'api.jsonbin.io',
      path:     `/v3/b/${BIN_ID}` + (method === 'GET' ? '/latest' : ''),
      method,
      headers: {
        'X-Master-Key':   BIN_KEY,
        'Content-Type':   'application/json',
        'Content-Length': body ? Buffer.byteLength(body) : 0
      }
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Middleware auth admin ──
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
}

// ── GET /api/videos ── Todos los usuarios
app.get('/api/videos', async (req, res) => {
  try {
    const data    = await jsonbin('GET');
    const record  = data.record || {};
    const videos  = Array.isArray(record.videos) ? record.videos : Array.isArray(record) ? record : [];
    const activos = videos.filter(v => v.src && v.active !== false);
    res.json(activos);
  } catch(e) {
    res.json([]);
  }
});

// ── PUT /api/videos ── Solo admin
app.put('/api/videos', adminAuth, async (req, res) => {
  try {
    const data   = await jsonbin('GET');
    const record = data.record || {};
    const db     = typeof record === 'object' && !Array.isArray(record) ? record : {};
    db.videos    = req.body;
    await jsonbin('PUT', db);
    res.json({ ok: true, count: db.videos.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/pagos ── Solo admin
app.get('/api/pagos', adminAuth, async (req, res) => {
  try {
    const data   = await jsonbin('GET');
    const record = data.record || {};
    res.json(record.pagos || []);
  } catch(e) { res.json([]); }
});

// ── POST /api/pagos ── Registrar pago
app.post('/api/pagos', async (req, res) => {
  try {
    const data   = await jsonbin('GET');
    const record = data.record || {};
    const db     = typeof record === 'object' && !Array.isArray(record) ? record : { videos: [] };
    if (!db.pagos) db.pagos = [];
    db.pagos.unshift({ ...req.body, fecha: new Date().toLocaleString('es') });
    await jsonbin('PUT', db);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Servir páginas HTML ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('LiveAmo en puerto ' + PORT));
