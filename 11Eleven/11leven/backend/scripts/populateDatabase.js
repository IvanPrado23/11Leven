const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');
const { seedAllTournaments } = require('./multiTournamentSeed');
const seed2026 = require('./seed2026');

async function populateAll() {
  console.log('=== POBLACIÓN COMPLETA DE MUNDIALES (2000 - 2026) EN POSTGRESQL ===');
  await seedAllTournaments();
  await seed2026();

  try {
    const [[tournaments]] = await db.query('SELECT COUNT(*)::INT AS total FROM torneo');
    const [[teams]] = await db.query('SELECT COUNT(*)::INT AS total FROM seleccion');
    const [[players]] = await db.query('SELECT COUNT(*)::INT AS total FROM jugador');
    const [[matches]] = await db.query('SELECT COUNT(*)::INT AS total FROM partido');
    const [[lineups]] = await db.query('SELECT COUNT(*)::INT AS total FROM alineacion');

    console.log('\n================ RESUMEN DE POBLACIÓN ================');
    console.log(`🏆 Torneos (Mundiales): ${tournaments.total} (2002 a 2026)`);
    console.log(`🌍 Selecciones totales: ${teams.total}`);
    console.log(`⚽ Jugadores registrados: ${players.total}`);
    console.log(`📅 Partidos oficiales: ${matches.total}`);
    console.log(`📋 Alineaciones tácticas: ${lineups.total}`);
    console.log('=======================================================\n');
  } finally {
    await db.pool.end();
  }
}

module.exports = populateAll;

if (require.main === module) {
  populateAll().catch((err) => {
    console.error('Error durante la población general:', err);
    process.exitCode = 1;
  });
}
