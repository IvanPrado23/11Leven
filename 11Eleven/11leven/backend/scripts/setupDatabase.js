const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function setup() {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', '11leven_mysql.sql'), 'utf8');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  try {
    await connection.query(sql);
    console.log('Base de datos 11leven creada y datos iniciales importados.');
  } finally {
    await connection.end();
  }
}

setup().catch((error) => {
  console.error('No fue posible preparar la base de datos:', error.message);
  process.exitCode = 1;
});
