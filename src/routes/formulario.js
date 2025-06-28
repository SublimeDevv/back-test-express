const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const https = require('https');
const querystring = require('querystring');
const Joi = require('joi');

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY

const formularioSchema = Joi.object({
    nombreCompleto: Joi.string()
        .required()
        .messages({
            'string.empty': 'El nombre completo es requerido',
            'any.required': 'El nombre completo es requerido'
        }),
    correo: Joi.string()
        .email()
        .required()
        .messages({
            'string.empty': 'El correo electrónico es requerido',
        }),
    telefono: Joi.string()
        .required()
        .messages({
            'string.empty': 'El teléfono es requerido',
        }),
    mensaje: Joi.string()
        .required()
        .messages({
            'string.empty': 'El mensaje es requerido',
            'string.min': 'El mensaje debe tener al menos 10 caracteres',
            'any.required': 'El mensaje es requerido'
        }),
    recaptchaToken: Joi.string()
        .required()
        .messages({
            'string.empty': 'Token de reCAPTCHA es requerido',
            'any.required': 'Token de reCAPTCHA es requerido'
        })
});

async function verifyRecaptcha(token) {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            secret: RECAPTCHA_SECRET_KEY,
            response: token
        });

        const options = {
            hostname: 'www.google.com',
            port: 443,
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result.success);
                } catch (error) {
                    console.error('Error parsing reCAPTCHA response:', error);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Error verifying reCAPTCHA:', error);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

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
        const { nombreCompleto, correo, telefono, mensaje, recaptchaToken } = req.body;

        const { error, value } = formularioSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => detail.message);
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos o faltantes (Schema)',
                errors
            });
        }

        const isRecaptchaValid = await verifyRecaptcha(value.recaptchaToken);
        if (!isRecaptchaValid) {
            return res.status(400).json({
                success: false,
                message: 'Verificación de reCAPTCHA falló. Por favor, intenta nuevamente.',
                errors: ['Verificación de reCAPTCHA falló']
            });
        }

        const [result] = await pool.query(
            `INSERT INTO formularios (nombreCompleto, correo, telefono, mensaje) VALUES (?, ?, ?, ?)`,
            [value.nombreCompleto, value.correo, value.telefono, value.mensaje]
        );

        const formData = {
            id: result.insertId,
            nombreCompleto: value.nombreCompleto,
            correo: value.correo,
            telefono: value.telefono,
            mensaje: value.mensaje
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

module.exports = router; 