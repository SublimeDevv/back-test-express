const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const https = require('https');
const querystring = require('querystring');
const Joi = require('joi');

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

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

async function sendDiscordNotification(formData) {
    if (!DISCORD_WEBHOOK_URL) {
        return false;
    }

    try {
        const embed = {
            title: "📋 Nuevo Formulario Enviado",
            description: "Se ha recibido un nuevo formulario de contacto",
            color: 0x00ff00,
            fields: [
                {
                    name: "👤 Nombre Completo",
                    value: formData.nombreCompleto,
                    inline: true
                },
                {
                    name: "📧 Correo Electrónico", 
                    value: formData.correo,
                    inline: true
                },
                {
                    name: "📞 Teléfono",
                    value: formData.telefono,
                    inline: true
                },
                {
                    name: "💬 Mensaje",
                    value: formData.mensaje.length > 1024 ? formData.mensaje.substring(0, 1021) + "..." : formData.mensaje,
                    inline: false
                }
            ],
            footer: {
                text: `ID: ${formData.id}`
            },
            timestamp: new Date().toISOString()
        };

        const payload = JSON.stringify({
            embeds: [embed]
        });

        const url = new URL(DISCORD_WEBHOOK_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(true);
                    } else {
                        console.error('Failed to send Discord notification:', res.statusCode, data);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Error sending Discord notification:', error);
                resolve(false);
            });

            req.write(payload);
            req.end();
        });

    } catch (error) {
        console.error('Error preparing Discord notification:', error);
        return false;
    }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Formulario:
 *       type: object
 *       required:
 *         - nombreCompleto
 *         - correo
 *         - telefono
 *         - mensaje
 *         - recaptchaToken
 *       properties:
 *         nombreCompleto:
 *           type: string
 *           description: Nombre completo del usuario
 *           example: "Juan Pérez"
 *         correo:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario
 *           example: "juan.perez@ejemplo.com"
 *         telefono:
 *           type: string
 *           description: Número de teléfono del usuario
 *           example: "+1234567890"
 *         mensaje:
 *           type: string
 *           description: Mensaje del formulario
 *           example: "Este es un mensaje de ejemplo"
 *         recaptchaToken:
 *           type: string
 *           description: Token de verificación reCAPTCHA
 *           example: "03AGdBq25..."
 *     FormularioRespuesta:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del formulario
 *         nombreCompleto:
 *           type: string
 *           description: Nombre completo del usuario
 *         correo:
 *           type: string
 *           description: Correo electrónico del usuario
 *         telefono:
 *           type: string
 *           description: Número de teléfono del usuario
 *         mensaje:
 *           type: string
 *           description: Mensaje del formulario
 *         fecha:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del formulario
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indica si la operación fue exitosa
 *         message:
 *           type: string
 *           description: Mensaje descriptivo de la respuesta
 *         data:
 *           type: object
 *           description: Datos de respuesta (opcional)
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           description: Lista de errores (opcional)
 */

/**
 * @swagger
 * /api/formulario:
 *   get:
 *     summary: Obtener todos los formularios
 *     description: Retorna una lista de todos los formularios enviados, ordenados por fecha de más reciente a más antiguo
 *     tags:
 *       - Formularios
 *     responses:
 *       200:
 *         description: Lista de formularios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Formularios obtenidos correctamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FormularioRespuesta'
 *                 total:
 *                   type: integer
 *                   description: Número total de formularios
 *                   example: 5
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
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

/**
 * @swagger
 * /api/formulario:
 *   post:
 *     summary: Enviar un nuevo formulario
 *     description: Crea un nuevo formulario con validación de datos y verificación reCAPTCHA
 *     tags:
 *       - Formularios
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Formulario'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/Formulario'
 *     responses:
 *       200:
 *         description: Formulario enviado y guardado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Datos del formulario recibidos y guardados correctamente"
 *                 data:
 *                   $ref: '#/components/schemas/FormularioRespuesta'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Datos inválidos o fallo en la verificación reCAPTCHA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Datos inválidos o faltantes (Schema)"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["El nombre completo es requerido", "El correo electrónico es requerido"]
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
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

        sendDiscordNotification(formData).catch(error => {
            console.error('Error enviando notificación a Discord:', error);
        });

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