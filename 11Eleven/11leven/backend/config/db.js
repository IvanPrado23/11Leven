const path = require('path');
const { Pool, types } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configurar parsers de tipos de PostgreSQL para compatibilidad exacta con el frontend:
// OID 1082 = DATE -> 'YYYY-MM-DD'
types.setTypeParser(1082, (val) => val);
// OID 1083 = TIME -> 'HH:MM:SS'
types.setTypeParser(1083, (val) => (val ? String(val).slice(0, 8) : val));
// OID 1114 = TIMESTAMP WITHOUT TIME ZONE -> 'YYYY-MM-DD HH:MM:SS'
types.setTypeParser(1114, (val) => (val ? String(val).slice(0, 19) : val));
// OID 1184 = TIMESTAMP WITH TIME ZONE -> 'YYYY-MM-DD HH:MM:SS'
types.setTypeParser(1184, (val) => (val ? String(val).slice(0, 19) : val));
// OID 20 = INT8 / BIGINT (ej. COUNT, SUM) -> Number
types.setTypeParser(20, (val) => (val === null ? null : Number(val)));
// OID 1700 = NUMERIC / DECIMAL -> Number
types.setTypeParser(1700, (val) => (val === null ? null : Number(val)));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || '11leven',
  max: 10
});

const db = {
  pool,

  async query(sql, params = []) {
    const res = await pool.query(sql, params);
    return [res.rows, res];
  },

  async execute(sql, params = []) {
    const res = await pool.query(sql, params);
    return [res.rows, res];
  },

  async getConnection() {
    const client = await pool.connect();
    return {
      client,
      async query(sql, params = []) {
        const res = await client.query(sql, params);
        return [res.rows, res];
      },
      async execute(sql, params = []) {
        const res = await client.query(sql, params);
        return [res.rows, res];
      },
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      }
    };
  }
};

module.exports = db;
