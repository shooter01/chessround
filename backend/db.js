// db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'db', // сервис db в docker-compose
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'keycloak',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'keycloak',
  // OR вы можете использовать один connectionString:
  // connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
