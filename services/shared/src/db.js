const mysql = require('mysql2/promise');
require('dotenv').config();

if (!process.env.MYSQL_ROOT_PASSWORD) {
  console.error('FATAL: MYSQL_ROOT_PASSWORD is not set. Refusing to start.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'xueqi_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = pool;
