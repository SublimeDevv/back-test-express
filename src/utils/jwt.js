const jwt = require('jsonwebtoken');
const { pool } = require('../db');

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

async function storeRefreshToken(token, userId) {
  const decoded = verifyRefreshToken(token);
  const expiresAt = new Date(decoded.exp * 1000);
  
  await pool.query(
    'INSERT INTO refresh_tokens (token, userId, expiresAt) VALUES (?, ?, ?)',
    [token, userId, expiresAt]
  );
}

async function revokeRefreshToken(token) {
  const [result] = await pool.query(
    'UPDATE refresh_tokens SET isRevoked = true WHERE token = ?',
    [token]
  );
  
  return result.affectedRows > 0;
}

async function revokeAllUserRefreshTokens(userId) {
  await pool.query(
    'UPDATE refresh_tokens SET isRevoked = true WHERE userId = ?',
    [userId]
  );
}

async function isRefreshTokenValid(token) {
  const [rows] = await pool.query(
    'SELECT id FROM refresh_tokens WHERE token = ? AND isRevoked = false AND expiresAt > NOW()',
    [token]
  );
  
  return rows.length > 0;
}


async function cleanupExpiredTokens() {
  await pool.query(
    'DELETE FROM refresh_tokens WHERE expiresAt < NOW() OR isRevoked = true'
  );
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  isRefreshTokenValid,
  cleanupExpiredTokens
}; 