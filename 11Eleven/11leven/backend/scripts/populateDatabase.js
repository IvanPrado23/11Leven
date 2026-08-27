const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const { seedAllTournaments } = require('./multiTournamentSeed');
const seed2026 = require('./seed2026');

async function populateAll() {
  console.log('=== POBLACIÓN COMPLETA DE MUNDIALES (2000 - 2026) ===');
  await seedAllTournaments();
  await seed2026();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '11leven'
  });

  try {
    const [[tournaments]] = await connection.query('SELECT COUNT(*) total FROM torneo');
    const [[teams]] = await connection.query('SELECT COUNT(*) total FROM seleccion');
    const [[players]] = await connection.query('SELECT COUNT(*) total FROM jugador');
    const [[matches]] = await connection.query('SELECT COUNT(*) total FROM partido');
    const [[lineups]] = await connection.query('SELECT COUNT(*) total FROM alineacion');

    console.log('\n================ RESUMEN DE POBLACIÓN ================');
    console.log(`🏆 Torneos (Mundiales): ${tournaments.total} (2002 a 2026)`);
    console.log(`🌍 Selecciones totales: ${teams.total}`);
    console.log(`⚽ Jugadores registrados: ${players.total}`);
    console.log(`📅 Partidos oficiales: ${matches.total}`);
    console.log(`📋 Alineaciones tácticas: ${lineups.total}`);
    console.log('=======================================================\n');
  } finally {
    await connection.end();
  }
}

module.exports = populateAll;

if (require.main === module) {
  populateAll().catch((err) => {
    console.error('Error durante la población general:', err);
    process.exitCode = 1;
  });
}
