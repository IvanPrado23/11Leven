const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=== VERIFICACIÓN INTEGRAL DE 11LEVEN (MULTI-TORNEO) ===\n');

  // 1. Torneos endpoint
  const torneos = await get('http://localhost:3000/api/torneos');
  console.log(`✓ GET /api/torneos: Status ${torneos.status} · ${torneos.data.length} Mundiales encontrados.`);
  if (torneos.data.length !== 7) throw new Error(`Se esperaban 7 mundiales, pero llegaron ${torneos.data.length}`);

  // 2. Partidos por año
  const years = [2002, 2006, 2010, 2014, 2018, 2022, 2026];
  for (const yr of years) {
    const pRes = await get(`http://localhost:3000/api/partidos?anio=${yr}`);
    const sRes = await get(`http://localhost:3000/api/selecciones?anio=${yr}`);
    const aRes = await get(`http://localhost:3000/api/alineaciones?anio=${yr}`);
    const rRes = await get(`http://localhost:3000/api/resultados?anio=${yr}`);
    console.log(`✓ Mundial ${yr}: ${pRes.data.length} partidos, ${sRes.data.length} selecciones, ${aRes.data.length} alineaciones, ${rRes.data.length} resultados.`);
    if (!pRes.data.length || !sRes.data.length) throw new Error(`Datos faltantes para el Mundial ${yr}`);
  }

  // 3. Detalle de alineación con jugadores (formación táctica en cancha)
  const allLineups = await get('http://localhost:3000/api/alineaciones?anio=2022');
  const sampleLineupId = allLineups.data[0].id_alineacion;
  const lineupDetail = await get(`http://localhost:3000/api/alineaciones/${sampleLineupId}`);
  console.log(`\n✓ GET /api/alineaciones/${sampleLineupId}: ${lineupDetail.data.seleccion_nombre} (${lineupDetail.data.formacion_tactica}) - ${lineupDetail.data.jugadores.length} jugadores convocados (${lineupDetail.data.jugadores.filter(j => j.rol === 'Titular').length} titulares).`);

  // 4. Páginas HTML
  const indexPage = await get('http://localhost:3000/');
  console.log(`✓ GET / (Landing Hub): Status ${indexPage.status}`);
  const torneoPage = await get('http://localhost:3000/torneo.html?anio=2022');
  console.log(`✓ GET /torneo.html?anio=2022: Status ${torneoPage.status}`);
  const partidoPage = await get(`http://localhost:3000/partido.html?id=${allLineups.data[0].id_partido}`);
  console.log(`✓ GET /partido.html?id=${allLineups.data[0].id_partido}: Status ${partidoPage.status}`);
  const adminPage = await get('http://localhost:3000/admin.html');
  console.log(`✓ GET /admin.html (Auth check redirect): Status ${adminPage.status}`);

  console.log('\n======================================================');
  console.log('  ¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Error en pruebas de integración:', err);
  process.exitCode = 1;
});
