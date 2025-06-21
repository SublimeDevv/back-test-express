const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/formulario', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM formularios ORDER BY fecha DESC');

        res.status(200).json({
            success: true,
            message: 'Formularios obtenidos correctamente',
            data: rows,
            total: rows.length
        });

    } catch (error) {
        console.error('Error al obtener formularios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

router.post('/formulario', async (req, res) => {
    try {
        const { nombreCompleto, correo, telefono, mensaje } = req.body;

        const errors = [];

        if (!nombreCompleto || nombreCompleto.trim() === '') {
            errors.push('El campo nombreCompleto es requerido');
        }

        if (!correo || correo.trim() === '') {
            errors.push('El campo correo es requerido');
        } else if (!isValidEmail(correo)) {
            errors.push('El formato del correo electrónico no es válido');
        }

        if (!telefono || telefono.trim() === '') {
            errors.push('El campo telefono es requerido');
        }

        if (!mensaje || mensaje.trim() === '') {
            errors.push('El campo mensaje es requerido');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos o faltantes',
                errors
            });
        }

        const [result] = await pool.query(
            `INSERT INTO formularios (nombreCompleto, correo, telefono, mensaje) VALUES (?, ?, ?, ?)`,
            [nombreCompleto.trim(), correo.trim(), telefono.trim(), mensaje.trim()]
        );

        const formData = {
            id: result.insertId,
            nombreCompleto: nombreCompleto.trim(),
            correo: correo.trim(),
            telefono: telefono.trim(),
            mensaje: mensaje.trim()
        };

        res.status(200).json({
            success: true,
            message: 'Datos del formulario recibidos y guardados correctamente',
            data: formData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error al procesar el formulario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = router; 