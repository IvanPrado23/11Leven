const db = require('../config/db');

exports.list = async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM sp_listar_torneos()');
    res.json(rows || []);
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM sp_obtener_torneo($1)', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Mundial no encontrado.' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.anio || !b.nombre || !b.pais_sede) {
      return res.status(400).json({ error: 'Año, nombre y país sede son obligatorios.' });
    }
    const [rows] = await db.query(
      'CALL sp_crear_torneo($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)',
      [
        b.anio,
        b.nombre,
        b.pais_sede,
        b.logo_url || null,
        b.campeon || null,
        b.subcampeon || null,
        b.cantidad_equipos || 32,
        b.cantidad_partidos || 64,
        b.descripcion || null
      ]
    );
    const insertId = rows[0]?.p_id_torneo;
    res.status(201).json({ id_torneo: insertId, ...b });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const b = req.body;
    await db.query(
      'CALL sp_actualizar_torneo($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [
        req.params.id,
        b.anio,
        b.nombre,
        b.pais_sede,
        b.logo_url || null,
        b.campeon || null,
        b.subcampeon || null,
        b.cantidad_equipos || 32,
        b.cantidad_partidos || 64,
        b.descripcion || null
      ]
    );
    res.json({ id_torneo: Number(req.params.id), ...b });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await db.query('CALL sp_eliminar_torneo($1)', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
