
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api/formulario';

const formData = {
    nombreCompleto: "María García López",
    correo: "maria.garcia@example.com",
    telefono: "+34 987 654 321",
    mensaje: "Me interesa conocer más sobre sus productos y servicios."
};

async function testFormularioAPI() {
    try {
        console.log('Probando API de formulario...');
        console.log('Enviando datos:', JSON.stringify(formData, null, 2));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        console.log('Respuesta recibida:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('Prueba exitosa!');
        } else {
            console.log('Prueba fallida!');
        }

    } catch (error) {
        console.error('Error al probar la API:', error.message);
        console.log('Asegúrate de que el servidor esté ejecutándose en http://localhost:3000');
    }
}

async function testValidationErrors() {
    try {
        console.log('\nProbando validación de errores...');

        const invalidData = {
            nombreCompleto: "Juan Pérez",
            correo: "email-invalido",
            telefono: "123456789",
            mensaje: "Mensaje de prueba"
        };

        console.log('Enviando datos inválidos:', JSON.stringify(invalidData, null, 2));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invalidData)
        });

        const data = await response.json();

        console.log('Respuesta recibida:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));

        if (response.status === 400) {
            console.log('Validación de errores funcionando correctamente!');
        } else {
            console.log('Validación de errores no funcionó como esperado!');
        }

    } catch (error) {
        console.error('Error al probar validación:', error.message);
    }
}

async function testMissingFields() {
    try {
        console.log('\nProbando campos faltantes...');

        const incompleteData = {
            nombreCompleto: "Ana López",
            telefono: "987654321"
        };

        console.log('Enviando datos incompletos:', JSON.stringify(incompleteData, null, 2));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(incompleteData)
        });

        const data = await response.json();

        console.log('Respuesta recibida:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));

        if (response.status === 400 && data.errors) {
            console.log('Validación de campos faltantes funcionando correctamente!');
        } else {
            console.log('Validación de campos faltantes no funcionó como esperado!');
        }

    } catch (error) {
        console.error('Error al probar campos faltantes:', error.message);
    }
}

async function runAllTests() {
    console.log('Iniciando pruebas de la API de formulario...\n');

    await testFormularioAPI();
    await testValidationErrors();
    await testMissingFields();

    console.log('\nPruebas completadas!');
}

if (require.main === module) {
    runAllTests();
}

module.exports = {
    testFormularioAPI,
    testValidationErrors,
    testMissingFields,
    runAllTests
}; 