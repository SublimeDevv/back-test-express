require('dotenv').config();

console.log('Variables de entorno después de dotenv:', {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME
});

const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const formularioRoutes = require('./routes/formulario');
const authRoutes = require('./routes/auth');
const seedRoutes = require('./routes/seed');
const { initDB } = require('./db');
const { generalLimiter } = require('./middlewares/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', generalLimiter);

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API DE FORMULARIO CON AUTENTICACIÓN JWT',
            version: '1.0.0',
            description: 'API para recibir datos de formularios con sistema de autenticación JWT',
            contact: {
                name: 'Desarrollador',
                email: 'dev@example.com'
            }
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./src/routes/*.js', './src/server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.json({
        message: 'API de Formulario con Autenticación funcionando correctamente',
        documentation: `/api-docs`,
        endpoints: {
            // Autenticación
            registro: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            renovarToken: 'POST /api/auth/refresh',
            cerrarSesion: 'POST /api/auth/logout',
            perfil: 'GET /api/auth/profile',
            
            // Formularios
            obtenerFormularios: 'GET /api/formulario',
            enviarFormulario: 'POST /api/formulario',
            
            // Seed (solo admin)
            generarDatos: 'POST /api/seed/run',
            limpiarDatos: 'DELETE /api/seed/clear',
            estadisticas: 'GET /api/seed/status'
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api', formularioRoutes);

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});


initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
        console.log(`Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
    });
}).catch((err) => {
    console.error('Error al inicializar la base de datos:', err);
    process.exit(1);
});

module.exports = app; 