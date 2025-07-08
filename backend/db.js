const { Pool } = require('pg');

const pool = new Pool({
  user: 'keycloak', // PostgreSQL user
  host: 'postgres-db', // Имя контейнера PostgreSQL
  database: 'keycloak',
  password: 'password', // Пароль
  port: 5438,
});

// Устанавливаем схему по умолчанию для всех подключений
pool.on('connect', (client) => {
  client.query('SET search_path TO notification_service, public');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
