const db = require('../config/db');

const fields = ['id_partido', 'id_seleccion', 'formacion_tactica', 'tipo', 'fuente', 'fecha_publicacion', 'estado'];
const allowedFormations = new Set(['4-3-3','4-4-2','4-2-3-1','4-2-1-3','4-1-2-3','4-1-3-2','4-1-4-1','4-3-1-2','4-2-2-2','3-5-2','3-4-3','3-4-2-1','3-4-1-2','5-3-2','5-2-3','5-4-1']);
const allowedPositions = new Set(['Portero', 'Defensa', 'Mediocampista', 'Delantero']);

function formationCounts(formation) {
  const lines = String(formation).split('-').map(Number);
  return { 
    Portero: 1, 
    Defensa: lines[0], 
    Mediocampista: lines.slice(1, -1).reduce((sum, value) => sum + value, 0), 
    Delantero: lines.at(-1) 
  };
}

function validate(body) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) return `Faltan campos: ${missing.join(', ')}`;
  if (!['Probable', 'Confirmada'].includes(body.estado)) return 'El estado debe ser Probable o Confirmada.';
  if (!['Titular', 'Alternativa'].includes(body.tipo)) return 'El tipo debe ser Titular o Alternativa.';
  if (!allowedFormations.has(body.formacion_tactica)) return 'Selecciona una formación táctica válida, por ejemplo 4-3-3 o 4-2-3-1.';

  for (const jugador of body.jugadores || []) {
    if (!allowedPositions.has(jugador.posicion_cancha)) return 'Cada jugador convocado debe tener una posición válida: Portero, Defensa, Mediocampista o Delantero.';
    if (jugador.rol === 'Titular' && jugador.minuto_cambio) return 'Un titular no puede tener minuto de ingreso.';
    if (jugador.minuto_cambio && (Number(jugador.minuto_cambio) < 1 || Number(jugador.minuto_cambio) > 120)) return 'El minuto de ingreso debe estar entre 1 y 120.';
  }

  if (body.estado === 'Confirmada' && body.jugadores?.length) {
    const starters = (body.jugadores || []).filter((jugador) => jugador.rol === 'Titular');
    if (starters.length === 11) {
      const expected = formationCounts(body.formacion_tactica);
      const actual = starters.reduce((counts, jugador) => {
        counts[jugador.posicion_cancha] = (counts[jugador.posicion_cancha] || 0) + 1;
        return counts;
      }, {});
      for (const position of allowedPositions) {
        if ((actual[position] || 0) !== expected[position]) {
          return `La formación ${body.formacion_tactica} necesita ${expected[position]} jugador(es) en ${position}; seleccionaste ${actual[position] || 0}.`;
        }
      }
    }
  }
  return null;
}

exports.list = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM sp_listar_alineaciones($1, $2, $3)',
      [req.query.id_partido || null, req.query.id_torneo || null, req.query.anio || null]
    );
    res.json(rows || []);
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const [headerRows] = await db.query('SELECT * FROM sp_obtener_alineacion($1)', [req.params.id]);
    if (!headerRows.length) return res.status(404).json({ error: 'Alineación no encontrada.' });

    const [jugadores] = await db.query('SELECT * FROM sp_obtener_jugadores_alineacion($1)', [req.params.id]);

    res.json({ ...headerRows[0], jugadores: jugadores || [] });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const fechaPublicacion = req.body.fecha_publicacion
      ? String(req.body.fecha_publicacion).replace('T', ' ').replace('Z', '')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Procedimiento almacenado para crear la cabecera de la alineación
    // NOTA: El TRIGGER 'trg_alineacion_before_insert' validará que el partido no tenga ya 2 alineaciones.
    // El TRIGGER 'trg_alineacion_confirmada_after_insert' generará las notificaciones automáticas si estado = 'Confirmada'.
    const [createRows] = await connection.query(
      'CALL sp_crear_alineacion($1, $2, $3, $4, $5, $6, $7, NULL)',
      [
        req.body.id_partido,
        req.body.id_seleccion,
        req.body.formacion_tactica,
        req.body.tipo,
        req.body.fuente,
        fechaPublicacion,
        req.body.estado
      ]
    );

    const idAlineacion = createRows[0]?.p_id_alineacion;

    // 2. Procedimiento almacenado para asignar cada jugador convocado
    // NOTA: El TRIGGER 'trg_aj_before_insert' validará que cada jugador pertenezca a la selección y las reglas de rol/minuto.
    for (const jugador of req.body.jugadores || []) {
      await connection.query(
        'CALL sp_asignar_jugador_alineacion($1, $2, $3, $4, $5)',
        [
          idAlineacion,
          jugador.id_jugador,
          jugador.rol,
          jugador.posicion_cancha || null,
          jugador.minuto_cambio || null
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ id_alineacion: idAlineacion });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

exports.update = async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const fechaPublicacion = req.body.fecha_publicacion
      ? String(req.body.fecha_publicacion).replace('T', ' ').replace('Z', '')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Procedimiento almacenado para actualizar alineación
    // NOTA: El TRIGGER 'trg_alineacion_confirmada_after_update' generará notificaciones automáticas si cambia a Confirmada.
    // El TRIGGER 'trg_alineacion_historial_after_update' registrará en 'historial_alineacion' los cambios tácticos.
    await connection.query(
      'CALL sp_actualizar_alineacion($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        req.params.id,
        req.body.id_partido,
        req.body.id_seleccion,
        req.body.formacion_tactica,
        req.body.tipo,
        req.body.fuente,
        fechaPublicacion,
        req.body.estado
      ]
    );

    // 2. Limpiar y reasignar jugadores convocados con procedimiento almacenado
    await connection.query('CALL sp_limpiar_jugadores_alineacion($1)', [req.params.id]);

    for (const jugador of req.body.jugadores || []) {
      await connection.query(
        'CALL sp_asignar_jugador_alineacion($1, $2, $3, $4, $5)',
        [
          req.params.id,
          jugador.id_jugador,
          jugador.rol,
          jugador.posicion_cancha || null,
          jugador.minuto_cambio || null
        ]
      );
    }

    await connection.commit();
    res.json({ id_alineacion: Number(req.params.id) });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

exports.remove = async (req, res, next) => {
  try {
    await db.query('CALL sp_eliminar_alineacion($1)', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
