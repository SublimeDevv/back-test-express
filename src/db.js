const mysql = require('mysql2/promise');

function getDbConfigWithoutDB() {
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

let pool;

async function initDB() {
  try {
    console.log('Configuración de DB:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    
    const tempPool = mysql.createPool(getDbConfigWithoutDB());
    
    console.log('Intentando crear base de datos:', process.env.DB_NAME);
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    
    await tempPool.end();
    
    pool = mysql.createPool(getDbConfig());

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(500) NOT NULL UNIQUE,
        userId INT NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        isRevoked BOOLEAN DEFAULT false,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    console.log('Tablas de base de datos inicializadas correctamente');
  } catch (error) {
    if (error.sql) console.error('- SQL:', error.sql);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

module.exports = {
  get pool() {
    return getPool();
  },
  initDB
}; 