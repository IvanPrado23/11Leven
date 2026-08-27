const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
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

function formatDateTime(fecha, hora) {
  let d;
  if (fecha instanceof Date) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    d = `${y}-${m}-${day}`;
  } else {
    d = String(fecha || '').slice(0, 10);
  }
  const h = String(hora || '12:00:00').slice(0, 8);
  return `${d} ${h}`;
}

function selectLineupPlayers(teamPlayers) {
  const gks = teamPlayers.filter((p) => p.posicion === 'Portero');
  const defs = teamPlayers.filter((p) => p.posicion === 'Defensa');
  const mids = teamPlayers.filter((p) => p.posicion === 'Mediocampista');
  const fwds = teamPlayers.filter((p) => p.posicion === 'Delantero');

  const starters = [];
  const starterIds = new Set();

  // 1 Portero
  if (gks.length > 0) {
    starters.push({ id_jugador: gks[0].id_jugador, posicion_cancha: 'Portero' });
    starterIds.add(gks[0].id_jugador);
  }

  // 4 Defensas
  for (const p of defs.slice(0, 4)) {
    starters.push({ id_jugador: p.id_jugador, posicion_cancha: 'Defensa' });
    starterIds.add(p.id_jugador);
  }

  // 3 Mediocampistas
  for (const p of mids.slice(0, 3)) {
    starters.push({ id_jugador: p.id_jugador, posicion_cancha: 'Mediocampista' });
    starterIds.add(p.id_jugador);
  }

  // 3 Delanteros
  for (const p of fwds.slice(0, 3)) {
    starters.push({ id_jugador: p.id_jugador, posicion_cancha: 'Delantero' });
    starterIds.add(p.id_jugador);
  }

  // Fallback si alguna posición no tiene suficientes jugadores
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

async function populateFromFifaResults() {
  const jsonPath = path.join(__dirname, '..', 'data', 'fifaResults.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`No se encontró el archivo ${jsonPath}`);
  }

  const results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Cargando ${results.length} partidos desde fifaResults.json...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '11leven',
    dateStrings: true
  });

  try {
    const [teams] = await connection.query('SELECT * FROM seleccion');
    const [matches] = await connection.query('SELECT * FROM partido');
    const [allPlayers] = await connection.query('SELECT * FROM jugador ORDER BY id_seleccion, dorsal');

    const playersByTeam = new Map();
    for (const p of allPlayers) {
      if (!playersByTeam.has(p.id_seleccion)) playersByTeam.set(p.id_seleccion, []);
      playersByTeam.get(p.id_seleccion).push(p);
    }

    let matchesUpdated = 0;
    let lineupsCreated = 0;
    let flagsUpdated = 0;

    await connection.beginTransaction();

    for (const item of results) {
      const match = matches.find((m) => m.id_partido === item.id_partido) || matches[item.numero_partido - 1];
      if (!match) continue;

      const localTeam = teams.find((t) => normalizeName(t.nombre) === normalizeName(item.local));
      const awayTeam = teams.find((t) => normalizeName(t.nombre) === normalizeName(item.visitante));

      if (!localTeam || !awayTeam) {
        console.warn(`No se encontraron equipos para el partido ${item.numero_partido}: ${item.local} vs ${item.visitante}`);
        continue;
      }

      // Actualizar banderas
      if (item.bandera_local && localTeam.bandera !== item.bandera_local) {
        await connection.execute('UPDATE seleccion SET bandera=? WHERE id_seleccion=?', [item.bandera_local, localTeam.id_seleccion]);
        localTeam.bandera = item.bandera_local;
        flagsUpdated++;
      }
      if (item.bandera_visitante && awayTeam.bandera !== item.bandera_visitante) {
        await connection.execute('UPDATE seleccion SET bandera=? WHERE id_seleccion=?', [item.bandera_visitante, awayTeam.id_seleccion]);
        awayTeam.bandera = item.bandera_visitante;
        flagsUpdated++;
      }

      // Actualizar estado del partido
      const state = item.finalizado ? 'Finalizado' : 'Programado';
      await connection.execute('UPDATE partido SET estado_partido=? WHERE id_partido=?', [state, match.id_partido]);
      matchesUpdated++;

      // Procesar alineaciones para ambos equipos
      const sides = [
        { team: localTeam, role: 'local' },
        { team: awayTeam, role: 'visitante' }
      ];

      const matchStamp = formatDateTime(match.fecha, match.hora);

      for (const { team } of sides) {
        const [existing] = await connection.execute(
          'SELECT id_alineacion FROM alineacion WHERE id_partido=? AND id_seleccion=?',
          [match.id_partido, team.id_seleccion]
        );

        let lineupId;
        if (existing.length > 0) {
          lineupId = existing[0].id_alineacion;
          await connection.execute(
            'UPDATE alineacion SET formacion_tactica=?, tipo=?, fuente=?, fecha_publicacion=?, estado=? WHERE id_alineacion=?',
            ['4-3-3', 'Titular', 'FIFA Oficial (fifaResults.json)', matchStamp, 'Confirmada', lineupId]
          );
        } else {
          const [insertRes] = await connection.execute(
            'INSERT INTO alineacion (id_partido, id_seleccion, formacion_tactica, tipo, fuente, fecha_publicacion, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [match.id_partido, team.id_seleccion, '4-3-3', 'Titular', 'FIFA Oficial (fifaResults.json)', matchStamp, 'Confirmada']
          );
          lineupId = insertRes.insertId;
          lineupsCreated++;
        }

        // Verificar jugadores en la alineación
        const [existingPlayers] = await connection.execute(
          'SELECT COUNT(*) as total FROM alineacion_jugador WHERE id_alineacion=?',
          [lineupId]
        );

        if (existingPlayers[0].total === 0) {
          const teamPlayers = playersByTeam.get(team.id_seleccion) || [];
          if (teamPlayers.length > 0) {
            const lineupRoster = selectLineupPlayers(teamPlayers);
            for (const p of lineupRoster) {
              await connection.execute(
                'INSERT INTO alineacion_jugador (id_alineacion, id_jugador, rol, posicion_cancha, minuto_cambio) VALUES (?, ?, ?, ?, NULL)',
                [lineupId, p.id_jugador, p.rol, p.posicion_cancha]
              );
            }
          }
        }
      }
    }

    await connection.commit();
    console.log(`✓ Importación completada con éxito:`);
    console.log(`  - Partidos procesados: ${matchesUpdated}`);
    console.log(`  - Alineaciones creadas/confirmadas: ${lineupsCreated}`);
    console.log(`  - Banderas actualizadas: ${flagsUpdated}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

module.exports = populateFromFifaResults;

if (require.main === module) {
  populateFromFifaResults().catch((err) => {
    console.error('Error al poblar desde fifaResults.json:', err.message);
    process.exitCode = 1;
  });
}
