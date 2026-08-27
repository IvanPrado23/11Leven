const db = require('../config/db');

const fields = ['id_partido', 'id_seleccion', 'formacion_tactica', 'tipo', 'fuente', 'fecha_publicacion', 'estado'];
const allowedFormations = new Set(['4-3-3','4-4-2','4-2-3-1','4-2-1-3','4-1-2-3','4-1-3-2','4-1-4-1','4-3-1-2','4-2-2-2','3-5-2','3-4-3','3-4-2-1','3-4-1-2','3-4-1-2','5-3-2','5-2-3','5-4-1']);
const allowedPositions = new Set(['Portero', 'Defensa', 'Mediocampista', 'Delantero']);

function formationCounts(formation) {
  const lines = String(formation).split('-').map(Number);
  return { Portero: 1, Defensa: lines[0], Mediocampista: lines.slice(1, -1).reduce((sum, value) => sum + value, 0), Delantero: lines.at(-1) };
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
      const actual = starters.reduce((counts, jugador) => { counts[jugador.posicion_cancha] = (counts[jugador.posicion_cancha] || 0) + 1; return counts; }, {});
      for (const position of allowedPositions) {
        if ((actual[position] || 0) !== expected[position]) return `La formación ${body.formacion_tactica} necesita ${expected[position]} jugador(es) en ${position}; seleccionaste ${actual[position] || 0}.`;
      }
    }
  }
  return null;
}

async function validatePlayers(connection, idSeleccion, jugadores = []) {
  if (!jugadores.length) return;
  const ids = jugadores.map((j) => Number(j.id_jugador));
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.execute(`SELECT id_jugador FROM jugador WHERE id_seleccion=? AND id_jugador IN (${placeholders})`, [idSeleccion, ...ids]);
  if (rows.length !== new Set(ids).size) throw Object.assign(new Error('Todos los jugadores deben pertenecer a la selección elegida.'), { status: 400 });
}

async function replacePlayers(connection, id, jugadores = []) {
  await connection.execute('DELETE FROM alineacion_jugador WHERE id_alineacion = ?', [id]);
  for (const jugador of jugadores) {
    if (!['Titular', 'Suplente'].includes(jugador.rol)) throw Object.assign(new Error('El rol debe ser Titular o Suplente.'), { status: 400 });
    await connection.execute(
      'INSERT INTO alineacion_jugador (id_alineacion, id_jugador, rol, posicion_cancha, minuto_cambio) VALUES (?, ?, ?, ?, ?)',
      [id, jugador.id_jugador, jugador.rol, jugador.posicion_cancha || null, jugador.minuto_cambio || null]
    );
  }
}

async function createPendingNotifications(connection, lineupId, state) {
  if (state !== 'Confirmada') return;
  await connection.execute(`INSERT INTO notificacion (fecha_envio,estado,id_usuario,id_alineacion)
    SELECT NOW(),'Pendiente',u.id_usuario,? FROM usuario u
    WHERE u.notificaciones=1 AND NOT EXISTS (
      SELECT 1 FROM notificacion n WHERE n.id_usuario=u.id_usuario AND n.id_alineacion=?
    )`, [lineupId, lineupId]);
}

exports.list = async (req, res, next) => {
  try {
    const params = [];
    const conditions = [];
    if (req.query.id_partido) {
      conditions.push('a.id_partido = ?');
      params.push(req.query.id_partido);
    }
    if (req.query.id_torneo) {
      conditions.push('p.id_torneo = ?');
      params.push(req.query.id_torneo);
    }
    if (req.query.anio) {
      conditions.push('t.anio = ?');
      params.push(req.query.anio);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.execute(
      `SELECT a.*, s.nombre AS seleccion_nombre, s.bandera, p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido, t.anio AS anio_torneo, t.nombre AS nombre_torneo
       FROM alineacion a
       JOIN seleccion s ON s.id_seleccion = a.id_seleccion
       JOIN partido p ON p.id_partido = a.id_partido
       JOIN torneo t ON t.id_torneo = p.id_torneo${where}
       ORDER BY p.fecha ASC, p.hora ASC, a.id_alineacion ASC`,
      params
    );
    res.json(rows);
  } catch (error) { next(error); }
};

exports.get = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.*, s.nombre AS seleccion_nombre, s.bandera, p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido, p.id_torneo, t.anio AS anio_torneo, t.nombre AS nombre_torneo
       FROM alineacion a
       JOIN seleccion s ON s.id_seleccion=a.id_seleccion
       JOIN partido p ON p.id_partido=a.id_partido
       JOIN torneo t ON t.id_torneo=p.id_torneo
       WHERE a.id_alineacion=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alineación no encontrada.' });
    const [jugadores] = await db.execute(
      'SELECT aj.*, j.nombre, j.dorsal, j.posicion FROM alineacion_jugador aj JOIN jugador j ON j.id_jugador=aj.id_jugador WHERE aj.id_alineacion=? ORDER BY aj.rol, j.dorsal',
      [req.params.id]
    );
    res.json({ ...rows[0], jugadores });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT COUNT(*) AS total FROM alineacion WHERE id_partido=?', [req.body.id_partido]);
    if (existing[0].total >= 2) throw Object.assign(new Error('El partido ya tiene sus dos alineaciones.'), { status: 409 });
    await validatePlayers(connection, req.body.id_seleccion, req.body.jugadores);
    const payload = { ...req.body, fecha_publicacion: req.body.fecha_publicacion ? String(req.body.fecha_publicacion).replace('T', ' ').replace('Z', '') : req.body.fecha_publicacion };
    const [result] = await connection.execute(`INSERT INTO alineacion (${fields.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?)`, fields.map((f) => payload[f]));
    await replacePlayers(connection, result.insertId, req.body.jugadores);
    await createPendingNotifications(connection, result.insertId, req.body.estado);
    await connection.commit();
    res.status(201).json({ id_alineacion: result.insertId });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

exports.update = async (req, res, next) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validatePlayers(connection, req.body.id_seleccion, req.body.jugadores);
    const payload = { ...req.body, fecha_publicacion: req.body.fecha_publicacion ? String(req.body.fecha_publicacion).replace('T', ' ').replace('Z', '') : req.body.fecha_publicacion };
    const set = fields.map((f) => `${f}=?`).join(', ');
    const [result] = await connection.execute(`UPDATE alineacion SET ${set} WHERE id_alineacion=?`, [...fields.map((f) => payload[f]), req.params.id]);
    if (!result.affectedRows) { await connection.rollback(); return res.status(404).json({ error: 'Alineación no encontrada.' }); }
    await replacePlayers(connection, req.params.id, req.body.jugadores);
    await createPendingNotifications(connection, req.params.id, req.body.estado);
    await connection.commit();
    res.json({ id_alineacion: Number(req.params.id) });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

exports.remove = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM alineacion_jugador WHERE id_alineacion=?', [req.params.id]);
    const [result] = await connection.execute('DELETE FROM alineacion WHERE id_alineacion=?', [req.params.id]);
    if (!result.affectedRows) { await connection.rollback(); return res.status(404).json({ error: 'Alineación no encontrada.' }); }
    await connection.commit(); res.status(204).end();
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};
