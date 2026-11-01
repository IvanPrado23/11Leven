const db = require('../config/db');

const states = new Set(['Pendiente', 'Enviada', 'Fallida']);

function validate(body) {
  if (!body.fecha_envio || !body.estado || !body.id_usuario || !body.id_alineacion) {
    return 'Completa todos los campos de la notificación.';
  }
  if (!states.has(body.estado)) {
    return 'El estado debe ser Pendiente, Enviada o Fallida.';
  }
  return null;
}

exports.list = async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM sp_listar_notificaciones()');
    res.json(rows || []);
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM sp_obtener_notificacion($1)', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const fecha = String(req.body.fecha_envio).replace('T', ' ').replace('Z', '');
    const [rows] = await db.query(
      'CALL sp_crear_notificacion($1, $2, $3, $4, NULL)',
      [fecha, req.body.estado, req.body.id_usuario, req.body.id_alineacion]
    );
    const insertId = rows[0]?.p_id_notificacion;
    res.status(201).json({ id_notificacion: insertId });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const fecha = String(req.body.fecha_envio).replace('T', ' ').replace('Z', '');
    await db.query(
      'CALL sp_actualizar_notificacion($1, $2, $3, $4, $5)',
      [req.params.id, fecha, req.body.estado, req.body.id_usuario, req.body.id_alineacion]
    );
    res.json({ id_notificacion: Number(req.params.id) });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await db.query('CALL sp_eliminar_notificacion($1)', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
