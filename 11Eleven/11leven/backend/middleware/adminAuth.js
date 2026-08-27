const crypto = require('crypto');
const sessions = new Map();
const attempts = new Map();
const SESSION_HOURS = 8;

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}
function safeEqual(left, right) {
  const a = Buffer.from(String(left)); const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function currentSession(req) {
  const token = cookies(req).admin_session; const expiresAt = token && sessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) { if (token) sessions.delete(token); return null; }
  return token;
}
function requireAdmin(req, res, next) {
  if (!currentSession(req)) return res.status(401).json({ error: 'Debes iniciar sesión como administrador.' });
  next();
}
function login(req, res) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return res.status(503).json({ error: 'La contraseña de administrador no está configurada.' });
  const key = req.ip; const state = attempts.get(key) || { count: 0, blockedUntil: 0 };
  if (state.blockedUntil > Date.now()) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
  if (!safeEqual(req.body.password || '', configured)) {
    state.count += 1;
    if (state.count >= 5) { state.count = 0; state.blockedUntil = Date.now() + 15 * 60_000; }
    attempts.set(key, state);
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }
  attempts.delete(key);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_HOURS * 60 * 60_000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secure}`);
  res.json({ authenticated: true });
}
function logout(req, res) {
  const token = currentSession(req); if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.status(204).end();
}
module.exports = { requireAdmin, login, logout, currentSession };
