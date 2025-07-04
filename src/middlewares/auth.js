const { verifyAccessToken } = require('../utils/jwt');
const { pool } = require('../db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = verifyAccessToken(token);
    
    const [users] = await pool.query(
      'SELECT id, nombre, email, role, isActive FROM usuarios WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};


const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Permisos insuficientes'
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      
      const [users] = await pool.query(
        'SELECT id, nombre, email, role, isActive FROM usuarios WHERE id = ?',
        [decoded.userId]
      );

      if (users.length > 0 && users[0].isActive) {
        req.user = {
          id: users[0].id,
          nombre: users[0].nombre,
          email: users[0].email,
          role: users[0].role
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth
}; 