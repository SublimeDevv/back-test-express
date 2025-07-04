const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  isRefreshTokenValid,
  cleanupExpiredTokens
} = require('../utils/jwt');
const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
  validate
} = require('../utils/validations');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  passwordLimiter
} = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             accessToken:
 *               type: string
 *             refreshToken:
 *               type: string
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 255
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *               confirmPassword:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos inválidos o email ya existe
 *       429:
 *         description: Demasiados intentos
 */
router.post('/register', registerLimiter, validate(registerValidation), async (req, res) => {
  try {
    const { nombre, email, password, role = 'user' } = req.body;

    const [existingUser] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, role]
    );

    const userId = result.insertId;

    const tokenPayload = { userId, email, role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await storeRefreshToken(refreshToken, userId);

    const [newUser] = await pool.query(
      'SELECT id, nombre, email, role, isActive, createdAt FROM usuarios WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: newUser[0],
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos
 */
router.post('/login', loginLimiter, validate(loginValidation), async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      'SELECT id, nombre, email, password, role, isActive FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await storeRefreshToken(refreshToken, user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar token de acceso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *       401:
 *         description: Refresh token inválido
 */
router.post('/refresh', refreshLimiter, validate(refreshTokenValidation), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const decoded = verifyRefreshToken(refreshToken);
    
    const isValid = await isRefreshTokenValid(refreshToken);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado'
      });
    }

    const [users] = await pool.query(
      'SELECT id, nombre, email, role, isActive FROM usuarios WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    const user = users[0];

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);

    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        accessToken,
        user
      }
    });
  } catch (error) {
    console.error('Error en refresh:', error);
    res.status(401).json({
      success: false,
      message: 'Refresh token inválido'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 */
router.post('/logout', authenticateToken, validate(refreshTokenValidation), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    await revokeRefreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar todas las sesiones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las sesiones cerradas exitosamente
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    await revokeAllUserRefreshTokens(req.user.id);

    res.json({
      success: true,
      message: 'Todas las sesiones cerradas exitosamente'
    });
  } catch (error) {
    console.error('Error en logout-all:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nombre, email, role, isActive, createdAt, updatedAt FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Actualizar perfil del usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 */
router.put('/profile', authenticateToken, validate(updateProfileValidation), async (req, res) => {
  try {
    const { nombre, email } = req.body;
    const updates = {};
    const values = [];

    if (nombre) {
      updates.nombre = nombre;
      values.push(nombre);
    }

    if (email) {
      const [existingUser] = await pool.query(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email, req.user.id]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso'
        });
      }

      updates.email = email;
      values.push(email);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos para actualizar'
      });
    }

    values.push(req.user.id);

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    await pool.query(
      `UPDATE usuarios SET ${setClause} WHERE id = ?`,
      values
    );

    const [updatedUser] = await pool.query(
      'SELECT id, nombre, email, role, isActive, createdAt, updatedAt FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: updatedUser[0]
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Cambiar contraseña
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 */
router.put('/change-password', passwordLimiter, authenticateToken, validate(changePasswordValidation), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [users] = await pool.query(
      'SELECT password FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const validPassword = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    await revokeAllUserRefreshTokens(req.user.id);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     tags: [Admin]
 *     summary: Obtener lista de usuarios (solo admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 */
router.get('/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nombre, email, role, isActive, createdAt, updatedAt FROM usuarios ORDER BY createdAt DESC'
    );

    res.json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/auth/users/{id}/toggle-status:
 *   put:
 *     tags: [Admin]
 *     summary: Activar/desactivar usuario (solo admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado del usuario actualizado
 */
router.put('/users/:id/toggle-status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propio usuario'
      });
    }

    const [result] = await pool.query(
      'UPDATE usuarios SET isActive = NOT isActive WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const [users] = await pool.query(
      'SELECT id, nombre, email, role, isActive FROM usuarios WHERE id = ?',
      [userId]
    );

    if (!users[0].isActive) {
      await revokeAllUserRefreshTokens(userId);
    }

    res.json({
      success: true,
      message: `Usuario ${users[0].isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


router.post('/cleanup-tokens', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await cleanupExpiredTokens();
    
    res.json({
      success: true,
      message: 'Tokens expirados limpiados exitosamente'
    });
  } catch (error) {
    console.error('Error al limpiar tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router; 