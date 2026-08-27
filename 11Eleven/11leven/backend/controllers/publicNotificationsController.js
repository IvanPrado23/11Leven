const db = require('../config/db');

exports.users = async (_req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id_usuario,nombre,idioma FROM usuario WHERE notificaciones=1 ORDER BY nombre');
    res.json(rows);
  } catch (error) { next(error); }
};

exports.forUser = async (req, res, next) => {
  try {
    const [rows] = await db.execute(`SELECT n.id_notificacion,n.fecha_envio,n.estado,a.formacion_tactica,a.estado AS estado_alineacion,
      s.nombre AS seleccion_nombre,s.bandera,p.id_partido,p.fecha,p.hora,p.estadio,p.fase_torneo
      FROM notificacion n JOIN alineacion a ON a.id_alineacion=n.id_alineacion
      JOIN seleccion s ON s.id_seleccion=a.id_seleccion JOIN partido p ON p.id_partido=a.id_partido
      WHERE n.id_usuario=? ORDER BY n.fecha_envio DESC,n.id_notificacion DESC LIMIT 20`, [req.params.id]);
    res.json(rows);
  } catch (error) { next(error); }
};
