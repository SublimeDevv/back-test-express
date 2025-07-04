const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const {
  generateRefreshToken,
  storeRefreshToken
} = require('../utils/jwt');

const router = express.Router();

/**
 * @swagger
 * /api/seed/run:
 *   post:
 *     tags: [Seed]
 *     summary: Generar datos de prueba (solo admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clearData:
 *                 type: boolean
 *                 default: false
 *                 description: Si eliminar datos existentes antes de seedear
 *               userCount:
 *                 type: integer
 *                 default: 10
 *                 description: Número de usuarios a crear
 *               formCount:
 *                 type: integer
 *                 default: 25
 *                 description: Número de formularios a crear
 *     responses:
 *       200:
 *         description: Datos de prueba generados exitosamente
 *       403:
 *         description: Solo administradores pueden ejecutar seed
 */
router.post('/run', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      clearData = false,
      userCount = 10,
      formCount = 25
    } = req.body;

    const results = {
      usersCreated: 0,
      formsCreated: 0,
      tokensCreated: 0,
      dataCleared: clearData,
      tablesCreated: false
    };

    await createTablesIfNotExist();
    results.tablesCreated = true;

    if (clearData) {
      await clearExistingData();
    }

    const createdUsers = await generateUsers(userCount);
    results.usersCreated = createdUsers.length;

    results.formsCreated = await generateForms(formCount);

    results.tokensCreated = await generateRefreshTokens(createdUsers);

    res.json({
      success: true,
      message: 'Datos de prueba generados exitosamente',
      data: results
    });

  } catch (error) {
    console.error('Error generando datos de seed:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/seed/clear:
 *   delete:
 *     tags: [Seed]
 *     summary: Limpiar todos los datos de prueba (solo admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos limpiados exitosamente
 *       403:
 *         description: Solo administradores pueden limpiar datos
 */
router.delete('/clear', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await createTablesIfNotExist();
    
    const results = await clearExistingData();

    res.json({
      success: true,
      message: 'Datos limpiados exitosamente',
      data: results
    });

  } catch (error) {
    console.error('Error limpiando datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/seed/status:
 *   get:
 *     tags: [Seed]
 *     summary: Obtener estadísticas de datos en la base de datos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await createTablesIfNotExist();
    
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM usuarios');
    const [formCount] = await pool.query('SELECT COUNT(*) as count FROM formularios');
    const [tokenCount] = await pool.query('SELECT COUNT(*) as count FROM refresh_tokens WHERE isRevoked = false');

    const [userRoles] = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM usuarios 
      GROUP BY role
    `);

    const [activeUsers] = await pool.query(`
      SELECT isActive, COUNT(*) as count 
      FROM usuarios 
      GROUP BY isActive
    `);

    res.json({
      success: true,
      data: {
        tables: {
          usuarios: userCount[0].count,
          formularios: formCount[0].count,
          refresh_tokens: tokenCount[0].count
        },
        usersByRole: userRoles.reduce((acc, role) => {
          acc[role.role] = role.count;
          return acc;
        }, {}),
        usersByStatus: {
          active: activeUsers.find(u => u.isActive)?.count || 0,
          inactive: activeUsers.find(u => !u.isActive)?.count || 0
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

async function createTablesIfNotExist() {
  console.log('Verificando y creando tablas si no existen...');
  
  try {
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

    console.log('✅ Tablas verificadas/creadas correctamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

async function clearExistingData() {
  const results = {
    refreshTokensDeleted: 0,
    formsDeleted: 0,
    usersDeleted: 0
  };

  const [tokenResult] = await pool.query('DELETE FROM refresh_tokens WHERE id > 0');
  results.refreshTokensDeleted = tokenResult.affectedRows;

  const [formResult] = await pool.query('DELETE FROM formularios WHERE id > 0');
  results.formsDeleted = formResult.affectedRows;

  const [userResult] = await pool.query('DELETE FROM usuarios WHERE id > 0');
  results.usersDeleted = userResult.affectedRows;

  await pool.query('ALTER TABLE refresh_tokens AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE formularios AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE usuarios AUTO_INCREMENT = 1');

  return results;
}

async function generateUsers(count) {
  const users = [];
  const hashedPassword = await bcrypt.hash('Password123', 12);

  const sampleUsers = [
    {
      nombre: 'Admin Principal',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin'
    },
    {
      nombre: 'Usuario Demo',
      email: 'user@test.com',
      password: hashedPassword,
      role: 'user'
    },
    {
      nombre: 'María García',
      email: 'maria.garcia@test.com',
      password: hashedPassword,
      role: 'user'
    },
    {
      nombre: 'Carlos López',
      email: 'carlos.lopez@test.com',
      password: hashedPassword,
      role: 'user'
    },
    {
      nombre: 'Ana Martínez',
      email: 'ana.martinez@test.com',
      password: hashedPassword,
      role: 'admin'
    }
  ];

  const nombres = [
    'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'Pedro', 'Laura',
    'Miguel', 'Isabel', 'José', 'Patricia', 'Francisco', 'Sofía', 'Antonio',
    'Elena', 'Manuel', 'Cristina', 'David', 'Mónica'
  ];

  const apellidos = [
    'García', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez',
    'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales',
    'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Herrera', 'Jiménez'
  ];

  for (let i = sampleUsers.length; i < count; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
    const nombreCompleto = `${nombre} ${apellido}`;
    const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}@test.com`;
    const role = Math.random() > 0.8 ? 'admin' : 'user'; 
    const isActive = Math.random() > 0.1; 

    sampleUsers.push({
      nombre: nombreCompleto,
      email,
      password: hashedPassword,
      role,
      isActive
    });
  }

  for (const user of sampleUsers) {
    try {
      const [result] = await pool.query(
        'INSERT INTO usuarios (nombre, email, password, role, isActive) VALUES (?, ?, ?, ?, ?)',
        [user.nombre, user.email, user.password, user.role, user.isActive !== false]
      );

      users.push({
        id: result.insertId,
        ...user,
        password: undefined 
      });
    } catch (error) {
      console.error(`Error creando usuario ${user.email}:`, error.message);
    }
  }

  return users;
}

async function generateForms(count) {
  const nombres = [
    'Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Luis González',
    'Carmen Sánchez', 'Pedro Ramírez', 'Laura Torres', 'Miguel Flores', 'Isabel Rivera',
    'José Gómez', 'Patricia Díaz', 'Francisco Cruz', 'Sofía Morales', 'Antonio Ortiz'
  ];

  const emails = [
    'juan.perez@email.com', 'maria.garcia@email.com', 'carlos.lopez@email.com',
    'ana.martinez@email.com', 'luis.gonzalez@email.com', 'carmen.sanchez@email.com',
    'pedro.ramirez@email.com', 'laura.torres@email.com', 'miguel.flores@email.com'
  ];

  const telefonos = [
    '+1234567890', '+9876543210', '+5555555555', '+1111111111', '+2222222222',
    '+3333333333', '+4444444444', '+6666666666', '+7777777777', '+8888888888'
  ];

  const mensajes = [
    'Estoy interesado en sus servicios. ¿Podrían contactarme?',
    'Quisiera más información sobre los productos disponibles.',
    'Tengo una consulta sobre precios y disponibilidad.',
    'Me gustaría agendar una reunión para discutir una propuesta.',
    'Necesito soporte técnico para un producto que adquirí.',
    'Quisiera información sobre garantías y políticas de devolución.',
    'Estoy buscando una solución personalizada para mi empresa.',
    'Me interesa conocer los planes de suscripción disponibles.',
    'Tengo dudas sobre el proceso de instalación.',
    'Quisiera recibir un presupuesto detallado.',
    '¿Ofrecen descuentos para compras en volumen?',
    'Necesito información sobre capacitación para el equipo.',
    'Me gustaría saber más sobre las integraciones disponibles.',
    'Tengo problemas con mi cuenta y necesito ayuda.',
    'Quisiera programar una demostración del producto.'
  ];

  let formsCreated = 0;

  for (let i = 0; i < count; i++) {
    try {
      const nombreCompleto = nombres[Math.floor(Math.random() * nombres.length)];
      const correo = emails[Math.floor(Math.random() * emails.length)];
      const telefono = telefonos[Math.floor(Math.random() * telefonos.length)];
      const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

      const fechaBase = new Date();
      fechaBase.setDate(fechaBase.getDate() - Math.floor(Math.random() * 30));

      await pool.query(
        'INSERT INTO formularios (nombreCompleto, correo, telefono, mensaje, fecha) VALUES (?, ?, ?, ?, ?)',
        [nombreCompleto, correo, telefono, mensaje, fechaBase]
      );

      formsCreated++;
    } catch (error) {
      console.error(`Error creando formulario ${i + 1}:`, error.message);
    }
  }

  return formsCreated;
}

async function generateRefreshTokens(users) {
  let tokensCreated = 0;

  const activeUsers = users.filter(user => user.isActive !== false);
  const usersWithTokens = activeUsers.slice(0, Math.ceil(activeUsers.length * 0.6)); 

  for (const user of usersWithTokens) {
    try {
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const refreshToken = generateRefreshToken(tokenPayload);
      await storeRefreshToken(refreshToken, user.id);
      tokensCreated++;
    } catch (error) {
      console.error(`Error creando refresh token para usuario ${user.id}:`, error.message);
    }
  }

  return tokensCreated;
}

/**
 * @swagger
 * /api/seed/create-tables:
 *   post:
 *     tags: [Seed]
 *     summary: Crear todas las tablas necesarias (solo admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tablas creadas exitosamente
 *       403:
 *         description: Solo administradores pueden crear tablas
 */
router.post('/create-tables', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await createTablesIfNotExist();
    
    res.json({
      success: true,
      message: 'Tablas verificadas/creadas exitosamente',
      data: {
        tables: ['formularios', 'usuarios', 'refresh_tokens'],
        note: 'Las tablas se crean solo si no existen previamente'
      }
    });
  } catch (error) {
    console.error('Error creando tablas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router; 