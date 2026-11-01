const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const express = require('express');
const torneosRoutes = require('./routes/torneosRoutes');
const crudRoutes = require('./routes/crudRoutes');
const alineacionesRoutes = require('./routes/alineacionesRoutes');
const estadisticasRoutes = require('./routes/estadisticasRoutes');
const notificacionesRoutes = require('./routes/notificacionesRoutes');
const publicNotifications = require('./controllers/publicNotificationsController');
const adminAuth = require('./middleware/adminAuth');

const app = express();
const frontend = path.join(__dirname, '..', 'frontend');
app.use(express.json());

app.post('/api/admin/login', adminAuth.login);
app.post('/api/admin/logout', adminAuth.logout);
app.get('/api/admin/session', (req, res) => res.json({ authenticated: Boolean(adminAuth.currentSession(req)) }));

app.use('/api/torneos', protectWrites, torneosRoutes);
app.use('/api/selecciones', protectWrites, crudRoutes('selecciones'));
app.use('/api/jugadores', protectWrites, crudRoutes('jugadores'));
app.use('/api/partidos', protectWrites, crudRoutes('partidos'));
app.use('/api/estadisticas', estadisticasRoutes);
app.get('/api/usuarios-publicos', publicNotifications.users);
app.get('/api/notificaciones-usuario/:id', publicNotifications.forUser);
app.use('/api/alineaciones', protectWrites, alineacionesRoutes);
app.use('/api/usuarios', protectWrites, crudRoutes('usuarios'));
app.use('/api/notificaciones', protectWrites, notificacionesRoutes);

app.get('/api/resultados', (req, res) => {
  const tournamentsPath = path.join(__dirname, 'data', 'tournamentsResults.json');
  let results = [];

  try {
    if (fs.existsSync(tournamentsPath)) {
      results = JSON.parse(fs.readFileSync(tournamentsPath, 'utf8'));
    }

    if (req.query.anio) {
      const anio = Number(req.query.anio);
      results = results.filter((item) => Number(item.anio || (item.numero_partido && 2026)) === anio);
    } else if (req.query.id_torneo) {
      const idTorneo = Number(req.query.id_torneo);
      results = results.filter((item) => Number(item.id_torneo) === idTorneo);
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin.html', (req, res) => {
  if (!adminAuth.currentSession(req)) return res.redirect('/login.html');
  res.sendFile(path.join(frontend, 'admin.html'));
});

app.use(express.static(frontend));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  // PostgreSQL (P0001 = RAISE EXCEPTION de Triggers/Procedimientos, 23514 = check_violation) + compatibilidad MySQL
  if (error.code === 'P0001' || error.code === '23514' || error.sqlState === '45000' || error.code === 'ER_SIGNAL_EXCEPTION') {
    return res.status(400).json({ error: error.message });
  }
  // PostgreSQL 23505 = unique_violation
  if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe o viola una restricción única.' });
  }
  // PostgreSQL 23503 = foreign_key_violation
  if (error.code === '23503' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar o vincular: existen restricciones de clave foránea o registros asociados.' });
  }
  if (error.code === 'ECONNREFUSED' || error.code === '3D000' || error.code === '28P01' || error.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ error: 'No fue posible conectar con PostgreSQL. Revisa la configuración de backend/.env.' });
  }
  res.status(error.status || 500).json({ error: error.message || 'Error interno.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`11Leven disponible en http://localhost:${port}`));

function protectWrites(req, res, next) {
  if (req.method === 'GET') return next();
  adminAuth.requireAdmin(req, res, next);
}
