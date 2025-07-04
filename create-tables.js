const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function createTables() {
  try {
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'Password123'
    });

    if (!loginResponse.data.success) {
      
      const seedResponse = await axios.post(`${BASE_URL}/seed/run`, {
        clearData: false,
        userCount: 1,
        formCount: 0
      });
      
      console.log('Tablas creadas y admin generado:', seedResponse.data);
      return;
    }

    const token = loginResponse.data.data.accessToken;

    const createTablesResponse = await axios.post(
      `${BASE_URL}/seed/create-tables`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Resultado:', createTablesResponse.data);

  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️ Endpoint no encontrado, servidor probablemente no está ejecutándose');
      console.log('💡 Ejecuta: npm run dev');
    } else if (error.response?.status === 401) {
      console.log('⚠️ No se pudo autenticar. Ejecutando seed completo...');
      
      try {
        const seedResponse = await axios.post(`${BASE_URL}/seed/run`, {
          clearData: false,
          userCount: 1,
          formCount: 0
        });
        
        console.log('Tablas creadas y admin generado:', seedResponse.data);
      } catch (seedError) {
        console.error('Error creando tablas:', seedError.response?.data || seedError.message);
      }
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

if (require.main === module) {
  createTables();
}

module.exports = { createTables }; 