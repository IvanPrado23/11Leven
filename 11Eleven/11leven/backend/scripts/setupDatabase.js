const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function setup() {
  const dbName = process.env.DB_NAME || '11leven';
  const sqlPath = path.join(__dirname, '..', '..', 'database', '11leven_postgres.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const baseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  };

  // 1. Conectar a 'postgres' para crear la base de datos '11leven' si no existe
  const adminClient = new Client({
    ...baseConfig,
    database: 'postgres'
  });

  await adminClient.connect();
  try {
    const res = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      console.log(`Creando base de datos PostgreSQL "${dbName}"...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
    } else {
      console.log(`Base de datos PostgreSQL "${dbName}" ya existe.`);
    }
  } finally {
    await adminClient.end();
  }

  // 2. Conectar a '11leven' y ejecutar el esquema, funciones, procedimientos y triggers
  const dbClient = new Client({
    ...baseConfig,
    database: dbName
  });

  await dbClient.connect();
  try {
    console.log('Ejecutando esquema, vistas, funciones, procedimientos almacenados y triggers en PostgreSQL...');
    await dbClient.query(sql);
    console.log('✓ Base de datos 11leven (PostgreSQL), tablas, procedimientos y triggers configurados exitosamente.');
  } finally {
    await dbClient.end();
  }
}

module.exports = { setup };

if (require.main === module) {
  setup().catch((error) => {
    console.error('No fue posible preparar la base de datos PostgreSQL:', error.message);
    process.exitCode = 1;
  });
}
