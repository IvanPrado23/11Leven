const db = require('../config/db');

const states = new Set(['Pendiente', 'Enviada', 'Fallida']);
function validate(body) {
  if (!body.fecha_envio || !body.estado || !body.id_usuario || !body.id_alineacion) return 'Completa todos los campos de la notificación.';
  if (!states.has(body.estado)) return 'El estado debe ser Pendiente, Enviada o Fallida.';
  return null;
}

exports.list = async (_req, res, next) => {
  try {
    const [rows] = await db.execute(`SELECT n.*,u.nombre AS usuario_nombre,u.correo,a.formacion_tactica,s.nombre AS seleccion_nombre,p.fecha,p.estadio
      FROM notificacion n JOIN usuario u ON u.id_usuario=n.id_usuario
      JOIN alineacion a ON a.id_alineacion=n.id_alineacion JOIN seleccion s ON s.id_seleccion=a.id_seleccion
      JOIN partido p ON p.id_partido=a.id_partido ORDER BY n.id_notificacion DESC`);
    res.json(rows);
  } catch (error) { next(error); }
};

exports.get = async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM notificacion WHERE id_notificacion=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json(rows[0]);
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  const problem = validate(req.body); if (problem) return res.status(400).json({ error: problem });
  try {
    const fecha = String(req.body.fecha_envio).replace('T', ' ').replace('Z', '');
    const [result] = await db.execute('INSERT INTO notificacion (fecha_envio,estado,id_usuario,id_alineacion) VALUES (?,?,?,?)', [fecha, req.body.estado, req.body.id_usuario, req.body.id_alineacion]);
    res.status(201).json({ id_notificacion: result.insertId });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  const problem = validate(req.body); if (problem) return res.status(400).json({ error: problem });
  try {
    const fecha = String(req.body.fecha_envio).replace('T', ' ').replace('Z', '');
    const [result] = await db.execute('UPDATE notificacion SET fecha_envio=?,estado=?,id_usuario=?,id_alineacion=? WHERE id_notificacion=?', [fecha, req.body.estado, req.body.id_usuario, req.body.id_alineacion, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json({ id_notificacion: Number(req.params.id) });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const [result] = await db.execute('DELETE FROM notificacion WHERE id_notificacion=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.status(204).end();
  } catch (error) { next(error); }
};
