require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    const dbName = process.env.DB_NAME;
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Base de datos '${dbName}' creada/verificada`);

    await connection.execute(`USE \`${dbName}\``);

    await connection.end();
    console.log('Base de datos configurada correctamente');

  } catch (error) {
    console.error('Error al configurar la base de datos:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('MySQL no está ejecutándose. Verifica que el servicio MySQL esté activo.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Credenciales incorrectas. Verifica DB_USER y DB_PASSWORD en config.env');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

createDatabase(); 