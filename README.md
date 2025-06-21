# API de Formulario con Express.js y Swagger

Una API RESTful construida con Express.js que incluye documentación automática con Swagger para recibir datos de formularios.

## 🚀 Características

- **Express.js**: Framework web para Node.js
- **Swagger/OpenAPI**: Documentación automática de la API
- **Validación de datos**: Validación de campos requeridos y formato de email
- **Middleware de seguridad**: Helmet, CORS, Morgan para logging
- **Estructura modular**: Rutas separadas para mejor organización

## 📋 Requisitos

- Node.js (versión 14 o superior)
- npm

## 🛠️ Instalación

1. Clona o descarga el proyecto
2. Instala las dependencias:

```bash
npm install
```

## 🏃‍♂️ Ejecución

Para iniciar el servidor en modo desarrollo:

```bash
npm start
```

O directamente con Node.js:

```bash
node src/server.js
```

El servidor se ejecutará en `http://localhost:3000`

## 📚 Documentación

La documentación interactiva de Swagger está disponible en:
- **URL**: `http://localhost:3000/api-docs`
- **Formato**: OpenAPI 3.0.0

## 🔌 Endpoints

### POST /api/formulario

Recibe datos de un formulario con los siguientes campos:

#### Campos requeridos:
- `nombreCompleto` (string): Nombre completo de la persona
- `correo` (string, formato email): Correo electrónico
- `telefono` (string): Número de teléfono
- `mensaje` (string): Mensaje del formulario

#### Ejemplo de request:

```json
{
  "nombreCompleto": "Juan Pérez García",
  "correo": "juan.perez@example.com",
  "telefono": "+34 123 456 789",
  "mensaje": "Hola, me gustaría obtener más información sobre sus servicios."
}
```

#### Respuesta exitosa (200):

```json
{
  "success": true,
  "message": "Datos del formulario recibidos correctamente",
  "data": {
    "nombreCompleto": "Juan Pérez García",
    "correo": "juan.perez@example.com",
    "telefono": "+34 123 456 789",
    "mensaje": "Hola, me gustaría obtener más información sobre sus servicios."
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Respuesta de error (400):

```json
{
  "success": false,
  "message": "Datos inválidos o faltantes",
  "errors": [
    "El campo nombreCompleto es requerido",
    "El formato del correo electrónico no es válido"
  ]
}
```

## 🧪 Pruebas

### Usando curl:

```bash
curl -X POST http://localhost:3000/api/formulario \
  -H "Content-Type: application/json" \
  -d '{
    "nombreCompleto": "María García López",
    "correo": "maria.garcia@example.com",
    "telefono": "+34 987 654 321",
    "mensaje": "Me interesa conocer más sobre sus productos."
  }'
```

### Usando JavaScript (fetch):

```javascript
const response = await fetch('http://localhost:3000/api/formulario', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    nombreCompleto: 'Juan Pérez García',
    correo: 'juan.perez@example.com',
    telefono: '+34 123 456 789',
    mensaje: 'Hola, me gustaría obtener más información sobre sus servicios.'
  })
});

const data = await response.json();
console.log(data);
```

## 📁 Estructura del proyecto

```
form-web/
├── src/
│   ├── server.js          # Archivo principal del servidor
│   └── routes/
│       └── formulario.js  # Rutas del formulario
├── package.json
├── package-lock.json
└── README.md
```

## 🔧 Configuración

### Variables de entorno

Puedes configurar el puerto del servidor usando la variable de entorno `PORT`:

```bash
PORT=8080 npm start
```

### Middleware incluidos

- **Helmet**: Seguridad HTTP
- **CORS**: Cross-Origin Resource Sharing
- **Morgan**: Logging de requests
- **Express JSON**: Parsing de JSON
- **Express URL Encoded**: Parsing de formularios

## 🚀 Próximos pasos

Para expandir esta API, podrías:

1. **Base de datos**: Integrar MongoDB, PostgreSQL o MySQL
2. **Autenticación**: JWT, OAuth, etc.
3. **Email**: Enviar confirmaciones por email
4. **Validación avanzada**: Usar Joi o Yup
5. **Tests**: Jest, Mocha, etc.
6. **Docker**: Containerización
7. **CI/CD**: GitHub Actions, etc.

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o un pull request. # back-test-express
