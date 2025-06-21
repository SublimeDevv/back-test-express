const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  user: 'sa',
  password: '',
  database: 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS formularios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombreCompleto VARCHAR(255) NOT NULL,
      correo VARCHAR(255) NOT NULL,
      telefono VARCHAR(50) NOT NULL,
      mensaje TEXT NOT NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = {
  pool,
  initDB
}; 