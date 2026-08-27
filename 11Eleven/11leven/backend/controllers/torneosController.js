const db = require('../config/db');

const fields = ['anio', 'nombre', 'pais_sede', 'logo_url', 'campeon', 'subcampeon', 'cantidad_equipos', 'cantidad_partidos', 'descripcion'];

exports.list = async (_req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM torneo ORDER BY anio ASC');
    res.json(rows);
  } catch (error) { next(error); }
};

exports.get = async (req, res, next) => {
  try {
    const param = req.params.id;
    const [rows] = await db.execute('SELECT * FROM torneo WHERE id_torneo=? OR anio=?', [param, param]);
    if (!rows.length) return res.status(404).json({ error: 'Mundial no encontrado.' });
    res.json(rows[0]);
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    if (!req.body.anio || !req.body.nombre || !req.body.pais_sede) {
      return res.status(400).json({ error: 'Año, nombre y país sede son obligatorios.' });
    }
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map((f) => req.body[f] ?? null);
    const [result] = await db.execute(`INSERT INTO torneo (${fields.join(', ')}) VALUES (${placeholders})`, values);
    res.status(201).json({ id_torneo: result.insertId, ...req.body });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const set = fields.map((f) => `${f}=?`).join(', ');
    const values = [...fields.map((f) => req.body[f] ?? null), req.params.id];
    const [result] = await db.execute(`UPDATE torneo SET ${set} WHERE id_torneo=?`, values);
    if (!result.affectedRows) return res.status(404).json({ error: 'Mundial no encontrado.' });
    res.json({ id_torneo: Number(req.params.id), ...req.body });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const [result] = await db.execute('DELETE FROM torneo WHERE id_torneo=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Mundial no encontrado.' });
    res.status(204).end();
  } catch (error) { next(error); }
};
