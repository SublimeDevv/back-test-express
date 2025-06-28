require('dotenv').config();

const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const formularioRoutes = require('./routes/formulario');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Formulario',
            version: '1.0.0',
            description: 'API para recibir datos de formularios',
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
        ]
    },
    apis: ['./src/routes/*.js', './src/server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.json({
        message: 'API de Formulario funcionando correctamente',
        documentation: `/api-docs`,
        endpoints: {
            obtenerFormularios: 'GET /api/formulario',
            enviarFormulario: 'POST /api/formulario'
        }
    });
});

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