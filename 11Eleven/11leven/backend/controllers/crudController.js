const db = require('../config/db');

const definitions = {
  selecciones: {
    id: 'id_seleccion',
    outField: 'p_id_seleccion',
    required: ['id_torneo', 'nombre', 'grupo_fifa'],
    spList: (q) => ({ sql: 'SELECT * FROM sp_listar_selecciones($1, $2)', params: [q.id_torneo || null, q.anio || null] }),
    spGet: (id) => ({ sql: 'SELECT * FROM sp_obtener_seleccion($1)', params: [id] }),
    spCreate: (b) => ({ sql: 'CALL sp_crear_seleccion($1, $2, $3, $4, NULL)', params: [b.id_torneo, b.nombre, b.bandera || null, b.grupo_fifa] }),
    spUpdate: (id, b) => ({ sql: 'CALL sp_actualizar_seleccion($1, $2, $3, $4, $5)', params: [id, b.id_torneo, b.nombre, b.bandera || null, b.grupo_fifa] }),
    spDelete: (id) => ({ sql: 'CALL sp_eliminar_seleccion($1)', params: [id] })
  },
  jugadores: {
    id: 'id_jugador',
    outField: 'p_id_jugador',
    required: ['nombre', 'dorsal', 'posicion', 'id_seleccion'],
    spList: (q) => ({ sql: 'SELECT * FROM sp_listar_jugadores($1)', params: [q.id_seleccion || null] }),
    spGet: (id) => ({ sql: 'SELECT * FROM sp_obtener_jugador($1)', params: [id] }),
    spCreate: (b) => ({ sql: 'CALL sp_crear_jugador($1, $2, $3, $4, NULL)', params: [b.nombre, b.dorsal, b.posicion, b.id_seleccion] }),
    spUpdate: (id, b) => ({ sql: 'CALL sp_actualizar_jugador($1, $2, $3, $4, $5)', params: [id, b.nombre, b.dorsal, b.posicion, b.id_seleccion] }),
    spDelete: (id) => ({ sql: 'CALL sp_eliminar_jugador($1)', params: [id] })
  },
  partidos: {
    id: 'id_partido',
    outField: 'p_id_partido',
    required: ['id_torneo', 'fecha', 'hora', 'estadio', 'fase_torneo', 'estado_partido'],
    spList: (q) => ({ sql: 'SELECT * FROM sp_listar_partidos($1, $2)', params: [q.id_torneo || null, q.anio || null] }),
    spGet: (id) => ({ sql: 'SELECT * FROM sp_obtener_partido($1)', params: [id] }),
    spCreate: (b) => ({ sql: 'CALL sp_crear_partido($1, $2, $3, $4, $5, $6, NULL)', params: [b.id_torneo, b.fecha, b.hora, b.estadio, b.fase_torneo, b.estado_partido] }),
    spUpdate: (id, b) => ({ sql: 'CALL sp_actualizar_partido($1, $2, $3, $4, $5, $6, $7)', params: [id, b.id_torneo, b.fecha, b.hora, b.estadio, b.fase_torneo, b.estado_partido] }),
    spDelete: (id) => ({ sql: 'CALL sp_eliminar_partido($1)', params: [id] })
  },
  usuarios: {
    id: 'id_usuario',
    outField: 'p_id_usuario',
    required: ['nombre', 'correo', 'idioma', 'notificaciones'],
    spList: () => ({ sql: 'SELECT * FROM sp_listar_usuarios()', params: [] }),
    spGet: (id) => ({ sql: 'SELECT * FROM sp_obtener_usuario($1)', params: [id] }),
    spCreate: (b) => ({
      sql: 'CALL sp_crear_usuario($1, $2, $3, $4, NULL)',
      params: [b.nombre, b.correo, b.idioma, Boolean(Number(b.notificaciones ?? 1))]
    }),
    spUpdate: (id, b) => ({
      sql: 'CALL sp_actualizar_usuario($1, $2, $3, $4, $5)',
      params: [id, b.nombre, b.correo, b.idioma, Boolean(Number(b.notificaciones ?? 1))]
    }),
    spDelete: (id) => ({ sql: 'CALL sp_eliminar_usuario($1)', params: [id] })
  }
};

function missingFields(body, required) {
  return required.filter((field) => body[field] === undefined || body[field] === '');
}

function validationProblem(resource, body) {
  if (resource === 'jugadores' && !['Portero', 'Defensa', 'Mediocampista', 'Delantero'].includes(body.posicion)) {
    return 'Selecciona una posición válida para el jugador: Portero, Defensa, Mediocampista o Delantero.';
  }
  return null;
}

function controller(resource) {
  const def = definitions[resource];
  return {
    async list(req, res, next) {
      try {
        const query = def.spList(req.query);
        const [rows] = await db.query(query.sql, query.params);
        res.json(rows || []);
      } catch (error) {
        next(error);
      }
    },

    async get(req, res, next) {
      try {
        const query = def.spGet(req.params.id);
        const [rows] = await db.query(query.sql, query.params);
        if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado.' });
        res.json(rows[0]);
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const missing = missingFields(req.body, def.required);
        if (missing.length) return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
        const problem = validationProblem(resource, req.body);
        if (problem) return res.status(400).json({ error: problem });

        const query = def.spCreate(req.body);
        const [rows] = await db.query(query.sql, query.params);
        const insertId = rows[0]?.[def.outField] || rows[0]?.[def.id];
        res.status(201).json({ [def.id]: insertId, ...req.body });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const missing = missingFields(req.body, def.required);
        if (missing.length) return res.status(400).json({ error: `Faltan campos: ${missing.join(', ')}` });
        const problem = validationProblem(resource, req.body);
        if (problem) return res.status(400).json({ error: problem });

        const query = def.spUpdate(req.params.id, req.body);
        await db.query(query.sql, query.params);
        res.json({ [def.id]: Number(req.params.id), ...req.body });
      } catch (error) {
        next(error);
      }
    },

    async remove(req, res, next) {
      try {
        const query = def.spDelete(req.params.id);
        await db.query(query.sql, query.params);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = controller;
