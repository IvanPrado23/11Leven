const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');

async function runTests() {
  console.log('============================================================================');
  console.log('  VERIFICACIÓN DE TRIGGERS Y PROCEDIMIENTOS ALMACENADOS (11LEVEN POSTGRESQL)');
  console.log('============================================================================\n');

  try {
    // 1. Verificar existencia de Procedimientos y Funciones en el catálogo de PostgreSQL
    console.log('1. Verificando Procedimientos y Funciones en information_schema.routines...');
    const [routines] = await db.query(
      `SELECT routine_name, routine_type
       FROM information_schema.routines 
       WHERE routine_schema = 'public'`
    );
    const routineNames = routines.map((p) => p.routine_name);
    console.log(`✓ ${routineNames.length} rutinas PL/pgSQL (PROCEDURES + FUNCTIONS) registradas.`);

    const requiredRoutines = [
      'sp_listar_torneos', 'sp_crear_torneo', 'sp_actualizar_torneo', 'sp_eliminar_torneo',
      'sp_listar_selecciones', 'sp_crear_seleccion', 'sp_actualizar_seleccion', 'sp_eliminar_seleccion',
      'sp_listar_jugadores', 'sp_crear_jugador', 'sp_actualizar_jugador', 'sp_eliminar_jugador',
      'sp_listar_partidos', 'sp_crear_partido', 'sp_actualizar_partido', 'sp_eliminar_partido',
      'sp_listar_usuarios', 'sp_crear_usuario', 'sp_actualizar_usuario', 'sp_eliminar_usuario',
      'sp_listar_alineaciones', 'sp_crear_alineacion', 'sp_actualizar_alineacion', 'sp_eliminar_alineacion',
      'sp_asignar_jugador_alineacion', 'sp_limpiar_jugadores_alineacion',
      'sp_listar_notificaciones', 'sp_crear_notificacion', 'sp_actualizar_notificacion', 'sp_eliminar_notificacion',
      'sp_obtener_notificaciones_usuario',
      'sp_consultar_alineaciones_confirmadas', 'sp_consultar_titulares_alineacion',
      'sp_consultar_usuarios_notificaciones', 'sp_consultar_alineaciones_para_notificar',
      'sp_historial_alineaciones'
    ];

    for (const r of requiredRoutines) {
      if (!routineNames.includes(r)) {
        throw new Error(`Rutina almacenada requerida no encontrada: ${r}`);
      }
    }
    console.log('✓ Todos los procedimientos y funciones requeridos están presentes.');

    // 2. Verificar existencia de Triggers en el catálogo de PostgreSQL
    console.log('\n2. Verificando Triggers en information_schema.triggers...');
    const [triggers] = await db.query(
      `SELECT DISTINCT trigger_name, event_manipulation, event_object_table, action_timing 
       FROM information_schema.triggers 
       WHERE trigger_schema = 'public'`
    );
    const trigNames = triggers.map((t) => t.trigger_name);
    console.log(`✓ ${trigNames.length} triggers registrados.`);

    const requiredTriggers = [
      'trg_alineacion_before_insert',
      'trg_alineacion_confirmada_after_insert',
      'trg_alineacion_confirmada_after_update',
      'trg_alineacion_historial_after_update',
      'trg_aj_before_insert',
      'trg_aj_before_update',
      'trg_jugador_before_insert',
      'trg_jugador_before_update'
    ];

    for (const trig of requiredTriggers) {
      if (!trigNames.includes(trig)) {
        throw new Error(`Trigger requerido no encontrado: ${trig}`);
      }
    }
    console.log('✓ Todos los triggers de reglas de negocio y automatización están presentes.');

    // 3. Probar llamadas de lectura de procedimientos oficiales del documento
    console.log('\n3. Probando funciones de consultas oficiales (Documento pág. 37-39)...');
    const [r1] = await db.query('SELECT * FROM sp_consultar_alineaciones_confirmadas()');
    console.log(`✓ sp_consultar_alineaciones_confirmadas: ${r1.length} registros.`);

    const [r3] = await db.query('SELECT * FROM sp_consultar_usuarios_notificaciones()');
    console.log(`✓ sp_consultar_usuarios_notificaciones: ${r3.length} registros.`);

    const [r4] = await db.query('SELECT * FROM sp_consultar_alineaciones_para_notificar()');
    console.log(`✓ sp_consultar_alineaciones_para_notificar: ${r4.length} registros.`);

    console.log('\n============================================================================');
    console.log('  ¡VALIDACIÓN DE TRIGGERS Y PROCEDIMIENTOS EN POSTGRESQL EXITOSA!');
    console.log('============================================================================\n');
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Error durante la validación:', err.message);
    process.exitCode = 1;
  });
}

module.exports = runTests;
