const db = require('../config/db');

const definitions = {
  selecciones: { table: 'seleccion', id: 'id_seleccion', fields: ['id_torneo', 'nombre', 'bandera', 'grupo_fifa'], required: ['id_torneo', 'nombre', 'grupo_fifa'] },
  jugadores: { table: 'jugador', id: 'id_jugador', fields: ['nombre', 'dorsal', 'posicion', 'id_seleccion'], required: ['nombre', 'dorsal', 'posicion', 'id_seleccion'] },
  partidos: { table: 'partido', id: 'id_partido', fields: ['id_torneo', 'fecha', 'hora', 'estadio', 'fase_torneo', 'estado_partido'], required: ['id_torneo', 'fecha', 'hora', 'estadio', 'fase_torneo', 'estado_partido'] },
  usuarios: { table: 'usuario', id: 'id_usuario', fields: ['nombre', 'correo', 'idioma', 'notificaciones'], required: ['nombre', 'correo', 'idioma', 'notificaciones'] }
};

function valuesFor(body, fields) {
  return fields.map((field) => {
    const val = body[field];
    return val === undefined || val === '' ? null : val;
  });
}

function missingFields(body, required) {
  return required.filter((field) => body[field] === undefined || body[field] === '');
}

function validationProblem(resource, body) {
  if (resource === 'jugadores' && !['Portero', 'Defensa', 'Mediocampista', 'Delantero'].includes(body.posicion)) {
    return 'Selecciona una posición válida para el jugador.';
  }
  return null;
}

function controller(resource) {
  const { table, id, fields, required } = definitions[resource];
  return {
    async list(req, res, next) {
      try {
        const conditions = [];
        const params = [];

        if (resource === 'partidos') {
          if (req.query.id_torneo) { conditions.push('p.id_torneo = ?'); params.push(req.query.id_torneo); }
          if (req.query.anio) { conditions.push('t.anio = ?'); params.push(req.query.anio); }
          const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
          const [rows] = await db.execute(
            `SELECT p.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
             FROM partido p JOIN torneo t ON t.id_torneo = p.id_torneo${where}
             ORDER BY p.fecha ASC, p.hora ASC, p.id_partido ASC`,
            params
          );
          return res.json(rows);
        }

        if (resource === 'selecciones') {
          if (req.query.id_torneo) { conditions.push('s.id_torneo = ?'); params.push(req.query.id_torneo); }
          if (req.query.anio) { conditions.push('t.anio = ?'); params.push(req.query.anio); }
          const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
          const [rows] = await db.execute(
            `SELECT s.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
             FROM seleccion s JOIN torneo t ON t.id_torneo = s.id_torneo${where}
             ORDER BY s.grupo_fifa ASC, s.nombre ASC`,
            params
          );
          return res.json(rows);
        }

        if (resource === 'jugadores') {
          if (req.query.id_seleccion) { conditions.push('id_seleccion = ?'); params.push(req.query.id_seleccion); }
          const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
          const [rows] = await db.execute(`SELECT * FROM jugador${where} ORDER BY dorsal ASC`, params);
          return res.json(rows);
        }

        const [rows] = await db.execute(`SELECT * FROM ${table} ORDER BY ${id} DESC`);
        res.json(rows);
      } catch (error) { next(error); }
    },
    async get(req, res, next) {
      try {
        if (resource === 'partidos') {
          const [rows] = await db.execute(
            `SELECT p.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
             FROM partido p JOIN torneo t ON t.id_torneo = p.id_torneo
             WHERE p.id_partido = ?`,
            [req.params.id]
          );
          if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado.' });
          return res.json(rows[0]);
        }

        const [rows] = await db.execute(`SELECT * FROM ${table} WHERE ${id} = ?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado.' });
        res.json(rows[0]);
      } catch (error) { next(error); }
    },
    async create(req, res, next) {
      try {
        const missing = missingFields(req.body, required);
        if (missing.length) return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
        const problem = validationProblem(resource, req.body);
        if (problem) return res.status(400).json({ error: problem });
        const placeholders = fields.map(() => '?').join(', ');
        const [result] = await db.execute(`INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`, valuesFor(req.body, fields));
        res.status(201).json({ [id]: result.insertId, ...req.body });
      } catch (error) { next(error); }
    },
    async update(req, res, next) {
      try {
        const missing = missingFields(req.body, required);
        if (missing.length) return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
        const problem = validationProblem(resource, req.body);
        if (problem) return res.status(400).json({ error: problem });
        const set = fields.map((field) => `${field} = ?`).join(', ');
        const [result] = await db.execute(`UPDATE ${table} SET ${set} WHERE ${id} = ?`, [...valuesFor(req.body, fields), req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Registro no encontrado.' });
        res.json({ [id]: Number(req.params.id), ...req.body });
      } catch (error) { next(error); }
    },
    async remove(req, res, next) {
      try {
        const [result] = await db.execute(`DELETE FROM ${table} WHERE ${id} = ?`, [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Registro no encontrado.' });
        res.status(204).end();
      } catch (error) { next(error); }
    }
  };
}

module.exports = controller;
