const fs = require('fs');
const path = require('path');
const db = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const aliases = new Map([
  ['czech republic', 'czechia'],
  ['turkey', 'turkiye'],
  ['south korea', 'korea republic'],
  ['ivory coast', 'cote d ivoire'],
  ['united states', 'usa'],
  ['dr congo', 'congo dr'],
  ['cape verde', 'cabo verde'],
  ['ir iran', 'iran']
]);

function normalizeName(value) {
  const clean = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return aliases.get(clean) || clean;
}

function selectLineupPlayers(teamPlayers) {
  const gks = teamPlayers.filter((p) => p.posicion === 'Portero');
  const defs = teamPlayers.filter((p) => p.posicion === 'Defensa');
  const mids = teamPlayers.filter((p) => p.posicion === 'Mediocampista');
  const fwds = teamPlayers.filter((p) => p.posicion === 'Delantero');

  const starters = [];
  const starterIds = new Set();

  if (gks.length > 0) { starters.push({ id_jugador: gks[0].id_jugador, posicion_cancha: 'Portero' }); starterIds.add(gks[0].id_jugador); }
  for (const p of defs.slice(0, 4)) { starters.push({ id_jugador: p.id_jugador, posicion_cancha: 'Defensa' }); starterIds.add(p.id_jugador); }
  for (const p of mids.slice(0, 3)) { starters.push({ id_jugador: p.id_jugador, posicion_cancha: 'Mediocampista' }); starterIds.add(p.id_jugador); }
  for (const p of fwds.slice(0, 3)) { starters.push({ id_jugador: p.id_jugador, posicion_cancha: 'Delantero' }); starterIds.add(p.id_jugador); }

  if (starters.length < 11) {
    for (const p of teamPlayers) {
      if (!starterIds.has(p.id_jugador)) {
        starters.push({ id_jugador: p.id_jugador, posicion_cancha: p.posicion });
        starterIds.add(p.id_jugador);
        if (starters.length === 11) break;
      }
    }
  }

  const result = [];
  for (const p of teamPlayers) {
    const isStarter = starterIds.has(p.id_jugador);
    const starterInfo = starters.find((s) => s.id_jugador === p.id_jugador);
    result.push({
      id_jugador: p.id_jugador,
      rol: isStarter ? 'Titular' : 'Suplente',
      posicion_cancha: isStarter ? starterInfo.posicion_cancha : p.posicion
    });
  }
  return result;
}

async function seed2026() {
  console.log('Sembrando Mundial 2026 (48 selecciones, 104 partidos)...');

  const connection = await db.getConnection();

  try {
    const [tRow] = await connection.query('SELECT id_torneo FROM torneo WHERE anio = 2026');
    if (!tRow.length) throw new Error('El torneo 2026 no existe en la base de datos.');
    const idTorneo2026 = tRow[0].id_torneo;

    const rawSql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'poblacion_mundial_2026.sql'), 'utf8');

    await connection.beginTransaction();

    // 1. Insertar Selecciones
    const teamMap = new Map();
    const teamRegex = /INSERT INTO seleccion \(nombre, bandera, grupo_fifa\) SELECT '([^']+)', NULL, '([A-L])'/g;
    let match;
    while ((match = teamRegex.exec(rawSql)) !== null) {
      const [, teamName, groupLetter] = match;
      const [sRow] = await connection.query(
        `INSERT INTO seleccion (id_torneo, nombre, bandera, grupo_fifa)
         VALUES ($1, $2, NULL, $3)
         ON CONFLICT (id_torneo, nombre) DO UPDATE SET grupo_fifa = EXCLUDED.grupo_fifa
         RETURNING id_seleccion`,
        [idTorneo2026, teamName, groupLetter]
      );
      teamMap.set(teamName, sRow[0].id_seleccion);
    }

    // 2. Insertar Jugadores
    const playerRegex = /INSERT INTO jugador \(nombre,dorsal,posicion,id_seleccion\) SELECT '([^']+)',(\d+),'([^']+)',s\.id_seleccion FROM seleccion s WHERE s\.nombre='([^']+)'/g;
    while ((match = playerRegex.exec(rawSql)) !== null) {
      const [, playerName, dorsal, position, teamName] = match;
      const idSeleccion = teamMap.get(teamName);
      if (idSeleccion) {
        await connection.query(
          `INSERT INTO jugador (id_seleccion, nombre, dorsal, posicion)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id_seleccion, dorsal) DO UPDATE
           SET nombre = EXCLUDED.nombre, posicion = EXCLUDED.posicion`,
          [idSeleccion, playerName, Number(dorsal), position]
        );
      }
    }

    // 3. Insertar Partidos
    const matchRegex = /INSERT INTO partido \(fecha,hora,estadio,fase_torneo,estado_partido\) SELECT '([^']+)','([^']+)','((?:[^']|'')+)','([^']+)','([^']+)'/g;
    const matchIds = [];
    while ((match = matchRegex.exec(rawSql)) !== null) {
      const [, fecha, hora, estadioRaw, fase, estado] = match;
      const estadio = estadioRaw.replace(/''/g, "'");
      const [pRes] = await connection.query(
        `INSERT INTO partido (id_torneo, fecha, hora, estadio, fase_torneo, estado_partido)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_partido`,
        [idTorneo2026, fecha, `${hora}:00`, estadio, fase, estado]
      );
      matchIds.push(pRes[0].id_partido);
    }

    // 4. Poblar alineaciones y banderas desde tournamentsResults.json
    const tournamentsPath = path.join(__dirname, '..', 'data', 'tournamentsResults.json');
    if (fs.existsSync(tournamentsPath)) {
      const allResults = JSON.parse(fs.readFileSync(tournamentsPath, 'utf8'));
      const results = allResults.filter(r => r.anio === 2026);
      const [teams] = await connection.query('SELECT * FROM seleccion WHERE id_torneo = $1', [idTorneo2026]);
      const [matches] = await connection.query('SELECT * FROM partido WHERE id_torneo = $1 ORDER BY id_partido', [idTorneo2026]);
      const [allPlayers] = await connection.query(
        'SELECT j.* FROM jugador j JOIN seleccion s ON s.id_seleccion = j.id_seleccion WHERE s.id_torneo = $1 ORDER BY j.id_seleccion, j.dorsal',
        [idTorneo2026]
      );

      const playersByTeam = new Map();
      for (const p of allPlayers) {
        if (!playersByTeam.has(p.id_seleccion)) playersByTeam.set(p.id_seleccion, []);
        playersByTeam.get(p.id_seleccion).push(p);
      }

      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        const currentMatch = matches[i] || matches.find((m) => m.id_partido === item.id_partido);
        if (!currentMatch) continue;

        const localTeam = teams.find((t) => normalizeName(t.nombre) === normalizeName(item.local));
        const awayTeam = teams.find((t) => normalizeName(t.nombre) === normalizeName(item.visitante));
        if (!localTeam || !awayTeam) continue;

        if (item.bandera_local) await connection.query('UPDATE seleccion SET bandera = $1 WHERE id_seleccion = $2', [item.bandera_local, localTeam.id_seleccion]);
        if (item.bandera_visitante) await connection.query('UPDATE seleccion SET bandera = $1 WHERE id_seleccion = $2', [item.bandera_visitante, awayTeam.id_seleccion]);

        const matchStamp = `${currentMatch.fecha} ${currentMatch.hora}`;
        const sides = [
          { team: localTeam, goals: item.goles_local || 0 },
          { team: awayTeam, goals: item.goles_visitante || 0 }
        ];

        for (const side of sides) {
          const { team, goals } = side;
          const [existing] = await connection.query(
            'SELECT id_alineacion FROM alineacion WHERE id_partido = $1 AND id_seleccion = $2',
            [currentMatch.id_partido, team.id_seleccion]
          );

          let lineupId;
          if (existing.length > 0) {
            lineupId = existing[0].id_alineacion;
            await connection.query('UPDATE alineacion SET goles = $1 WHERE id_alineacion = $2', [goals, lineupId]);
          } else {
            const [alRes] = await connection.query(
              `INSERT INTO alineacion (id_partido, id_seleccion, formacion_tactica, tipo, fuente, fecha_publicacion, estado, goles)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING id_alineacion`,
              [currentMatch.id_partido, team.id_seleccion, '4-3-3', 'Titular', 'FIFA Oficial 2026', matchStamp, 'Confirmada', goals]
            );
            lineupId = alRes[0].id_alineacion;
          }

          const [existingPlayers] = await connection.query('SELECT COUNT(*)::INT AS c FROM alineacion_jugador WHERE id_alineacion = $1', [lineupId]);
          if (existingPlayers[0].c === 0) {
            const squad = playersByTeam.get(team.id_seleccion) || [];
            if (squad.length > 0) {
              const roster = selectLineupPlayers(squad);
              let remainingGoals = goals;
              for (let j = 0; j < roster.length; j++) {
                const p = roster[j];
                let pGoals = 0;
                let pAssists = 0;
                let pDribbles = p.rol === 'Titular' ? Math.floor(Math.random() * 5) : 0;
                
                if (remainingGoals > 0 && p.rol === 'Titular' && p.posicion_cancha !== 'Portero' && Math.random() > 0.6) {
                   pGoals++;
                   remainingGoals--;
                }
                if (goals > 0 && p.rol === 'Titular' && Math.random() > 0.7) {
                   pAssists++;
                }

                await connection.query(
                  `INSERT INTO alineacion_jugador (id_alineacion, id_jugador, rol, posicion_cancha, goles, asistencias, regates)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [lineupId, p.id_jugador, p.rol, p.posicion_cancha, pGoals, pAssists, pDribbles]
                );
              }
              if (remainingGoals > 0 && roster[8]) {
                 await connection.query(
                    'UPDATE alineacion_jugador SET goles = goles + $1 WHERE id_alineacion = $2 AND id_jugador = $3',
                    [remainingGoals, lineupId, roster[8].id_jugador]
                 );
              }
            }
          }
        }
      }
    }

    await connection.commit();
    console.log('✓ Mundial 2026 sembrado y alineaciones vinculadas con éxito.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = seed2026;

if (require.main === module) {
  seed2026().catch((err) => {
    console.error('Error al sembrar 2026:', err);
    process.exitCode = 1;
  });
}
