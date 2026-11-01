const db = require('../config/db');

// Consulta 3 oficial del documento: Usuarios con notificaciones activadas
exports.users = async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM sp_consultar_usuarios_notificaciones()');
    res.json(rows || []);
  } catch (error) {
    next(error);
  }
};

// Historial de notificaciones emitidas para un usuario
exports.forUser = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM sp_obtener_notificaciones_usuario($1)', [req.params.id]);
    res.json(rows || []);
  } catch (error) {
    next(error);
  }
};
