const BASE_URL = 'http://localhost:3000/api';

const adminCredentials = {
  email: 'admin@test.com',
  password: 'Password123'
};

let adminToken = '';

async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`\n--- ${method} ${endpoint} ---`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return { response, result };
  } catch (error) {
    console.error(`Error en ${method} ${endpoint}:`, error.message);
    return { error };
  }
}

async function createAdminUser() {
  console.log('\nCreando usuario admin si no existe...');
  
  const adminData = {
    nombre: 'Admin Principal',
    email: adminCredentials.email,
    password: adminCredentials.password,
    confirmPassword: adminCredentials.password,
    role: 'admin'
  };
  
  const { response, result } = await makeRequest('/auth/register', 'POST', adminData);
  
  if (response.status === 201) {
    console.log('Usuario admin creado exitosamente');
    return result.data.accessToken;
  } else if (result.message && result.message.includes('ya está registrado')) {
    console.log('ℹUsuario admin ya existe, intentando login...');
    return await loginAdmin();
  } else {
    console.log('Error creando usuario admin');
    return null;
  }
}

async function loginAdmin() {
  console.log('\nHaciendo login como admin...');
  
  const { response, result } = await makeRequest('/auth/login', 'POST', adminCredentials);
  
  if (response.status === 200) {
    console.log('Login admin exitoso');
    return result.data.accessToken;
  } else {
    console.log('Error en login admin');
    return null;
  }
}

async function testGetInitialStats() {
  console.log('\nPRUEBA 1: Obtener estadísticas iniciales');
  
  const { response, result } = await makeRequest('/seed/status', 'GET', null, adminToken);
  
  if (response.status === 200) {
    console.log('Estadísticas obtenidas exitosamente');
    console.log(`Usuarios: ${result.data.tables.usuarios}`);
    console.log(`Formularios: ${result.data.tables.formularios}`);
    console.log(`Tokens activos: ${result.data.tables.refresh_tokens}`);
  } else {
    console.log('Error obteniendo estadísticas');
  }
}

async function testGenerateSeedData() {
  console.log('\nPRUEBA 2: Generar datos de seed');
  
  const seedConfig = {
    clearData: false,
    userCount: 15,
    formCount: 30
  };
  
  const { response, result } = await makeRequest('/seed/run', 'POST', seedConfig, adminToken);
  
  if (response.status === 200) {
    console.log('Datos de seed generados exitosamente');
    console.log(`Usuarios creados: ${result.data.usersCreated}`);
    console.log(`Formularios creados: ${result.data.formsCreated}`);
    console.log(`Tokens creados: ${result.data.tokensCreated}`);
  } else {
    console.log('Error generando datos de seed');
  }
}

async function testGetStatsAfterSeed() {
  console.log('\nPRUEBA 3: Obtener estadísticas después del seed');
  
  const { response, result } = await makeRequest('/seed/status', 'GET', null, adminToken);
  
  if (response.status === 200) {
    console.log('Estadísticas actualizadas obtenidas');
    console.log(`Total usuarios: ${result.data.tables.usuarios}`);
    console.log(`Total formularios: ${result.data.tables.formularios}`);
    console.log(`Total tokens activos: ${result.data.tables.refresh_tokens}`);
    
    if (result.data.usersByRole) {
      console.log(`Usuarios normales: ${result.data.usersByRole.user || 0}`);
      console.log(`Administradores: ${result.data.usersByRole.admin || 0}`);
    }
    
    if (result.data.usersByStatus) {
      console.log(`Usuarios activos: ${result.data.usersByStatus.active}`);
      console.log(`Usuarios inactivos: ${result.data.usersByStatus.inactive}`);
    }
  } else {
    console.log('Error obteniendo estadísticas actualizadas');
  }
}

async function testUnauthorizedAccess() {
  console.log('\nPRUEBA 4: Probar acceso sin permisos de admin');
  
  const userData = {
    nombre: 'Usuario Normal Test',
    email: 'normaluser@test.com',
    password: 'Password123',
    confirmPassword: 'Password123'
  };
  
  const registerResponse = await makeRequest('/auth/register', 'POST', userData);
  
  if (registerResponse.response.status === 201) {
    const userToken = registerResponse.result.data.accessToken;
    
    const { response, result } = await makeRequest('/seed/status', 'GET', null, userToken);
    
    if (response.status === 403) {
      console.log('Correctamente rechazó acceso de usuario normal');
    } else {
      console.log('No rechazó acceso de usuario normal');
    }
  } else {
    console.log('Error creando usuario normal para prueba');
  }
}

async function testGenerateWithClearData() {
  console.log('\nPRUEBA 5: Generar datos limpiando los existentes');
  
  const seedConfig = {
    clearData: true,
    userCount: 8,
    formCount: 20
  };
  
  const { response, result } = await makeRequest('/seed/run', 'POST', seedConfig, adminToken);
  
  if (response.status === 200) {
    console.log('Datos regenerados con limpieza exitosa');
    console.log(`Usuarios creados: ${result.data.usersCreated}`);
    console.log(`Formularios creados: ${result.data.formsCreated}`);
    console.log(`Tokens creados: ${result.data.tokensCreated}`);
    console.log(`Datos limpiados: ${result.data.dataCleared}`);
  } else {
    console.log('Error regenerando datos con limpieza');
  }
}

async function testClearAllData() {
  console.log('\nPRUEBA 6: Limpiar todos los datos');
  
  const { response, result } = await makeRequest('/seed/clear', 'DELETE', null, adminToken);
  
  if (response.status === 200) {
    console.log('Todos los datos limpiados exitosamente');
    if (result.data) {
      console.log(`Tokens eliminados: ${result.data.refreshTokensDeleted}`);
      console.log(`Formularios eliminados: ${result.data.formsDeleted}`);
      console.log(`Usuarios eliminados: ${result.data.usersDeleted}`);
    }
  } else {
    console.log('Error limpiando datos');
  }
}

async function testVerifyDataCleared() {
  console.log('\nPRUEBA 7: Verificar que los datos fueron limpiados');
  
  const { response, result } = await makeRequest('/seed/status', 'GET', null, adminToken);
  
  if (response.status === 200) {
    console.log('Verificación de limpieza completada');
    console.log(`Usuarios restantes: ${result.data.tables.usuarios}`);
    console.log(`Formularios restantes: ${result.data.tables.formularios}`);
    console.log(`Tokens restantes: ${result.data.tables.refresh_tokens}`);
  } else {
    console.log('Error verificando limpieza');
  }
}

async function runAllTests() {
  console.log('INICIANDO PRUEBAS DE API DE SEED');
  console.log('===================================');
  
  try {
    if (typeof fetch === 'undefined') {
      const { default: fetch } = await import('node-fetch');
      global.fetch = fetch;
    }
    
    adminToken = await createAdminUser();
    
    if (!adminToken) {
      console.log('No se pudo obtener token de admin. Abortando pruebas.');
      return;
    }
    
    console.log(`Token de admin obtenido: ${adminToken.substring(0, 50)}...`);
    
    await testGetInitialStats();
    await testGenerateSeedData();
    await testGetStatsAfterSeed();
    await testUnauthorizedAccess();
    await testGenerateWithClearData();
    await testClearAllData();
    await testVerifyDataCleared();
    
    console.log('\nTODAS LAS PRUEBAS DE SEED COMPLETADAS');
    console.log('==========================================');
    
  } catch (error) {
    console.error('\nERROR EN LAS PRUEBAS DE SEED:', error.message);
  }
}

async function checkServer() {
  try {
    if (typeof fetch === 'undefined') {
      const { default: fetch } = await import('node-fetch');
      global.fetch = fetch;
    }
    
    const response = await fetch(`${BASE_URL.replace('/api', '')}/`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('Servidor corriendo correctamente');
      console.log(`URL: ${BASE_URL.replace('/api', '')}`);
      return true;
    } else {
      console.log('Servidor no responde correctamente');
      return false;
    }
  } catch (error) {
    console.log('No se puede conectar al servidor. ¿Está corriendo en el puerto 3000?');
    console.log('Ejecuta: npm run dev');
    return false;
  }
}

async function quickSeed() {
  console.log('Ejecutando seed rápido...');
  
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  
  adminToken = await createAdminUser();
  
  if (adminToken) {
    await testGenerateSeedData();
    await testGetStatsAfterSeed();
  }
}

async function clearAll() {
  console.log('🧹 Limpiando todos los datos...');
  
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  
  adminToken = await loginAdmin();
  
  if (adminToken) {
    await testClearAllData();
    await testVerifyDataCleared();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    checkServer().then(serverOk => {
      if (serverOk) {
        quickSeed();
      } else {
        process.exit(1);
      }
    });
  } else if (args.includes('--clear')) {
    checkServer().then(serverOk => {
      if (serverOk) {
        clearAll();
      } else {
        process.exit(1);
      }
    });
  } else {
    checkServer().then(serverOk => {
      if (serverOk) {
        runAllTests();
      } else {
        process.exit(1);
      }
    });
  }
}

module.exports = {
  makeRequest,
  runAllTests,
  checkServer,
  quickSeed,
  clearAll
}; 