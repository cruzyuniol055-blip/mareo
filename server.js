const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB   = path.join(__dirname, 'data.json');

// ── Inicializar data.json si no existe ──
if (!fs.existsSync(DB)) {
  fs.writeFileSync(DB, JSON.stringify({ videos: [], pagos: [] }, null, 2));
}

function readDB()        { return JSON.parse(fs.readFileSync(DB, 'utf8')); }
function writeDB(data)   { fs.writeFileSync(DB, JSON.stringify(data, null, 2)); }

app.use(express.json());
app.use(express.static(__dirname));

// ── Middleware auth admin ──
const ADMIN_KEY = process.env.ADMIN_KEY || 'liveamo2024';
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
}

// ── GET /api/videos ── Todos los usuarios
app.get('/api/videos', (req, res) => {
  const { videos } = readDB();
  const activos = videos.filter(v => v.active !== false && v.src);
  res.json(activos);
});

// ── PUT /api/videos ── Solo admin
app.put('/api/videos', adminAuth, (req, res) => {
  const db = readDB();
  db.videos = req.body;
  writeDB(db);
  res.json({ ok: true, count: db.videos.length });
});

// ── GET /api/pagos ── Solo admin
app.get('/api/pagos', adminAuth, (req, res) => {
  const { pagos } = readDB();
  res.json(pagos);
});

// ── POST /api/pagos ── Registrar pago
app.post('/api/pagos', (req, res) => {
  const db = readDB();
  db.pagos.unshift({ ...req.body, fecha: new Date().toLocaleString('es') });
  writeDB(db);
  res.json({ ok: true });
});

// ── Todas las rutas → index.html ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('LiveAmo corriendo en puerto ' + PORT));
