const BASE_URL = 'http://localhost:3000/api';

let accessToken = '';
let refreshToken = '';
let userId = '';

const testUser = {
  nombre: 'Usuario Test',
  email: 'test@example.com',
  password: 'Test123',
  confirmPassword: 'Test123'
};

const adminUser = {
  nombre: 'Admin Test',
  email: 'admin@example.com',
  password: 'Admin123',
  confirmPassword: 'Admin123',
  role: 'admin'
};

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

async function testRegisterUser() {
  console.log('\nPRUEBA 1: Registrar usuario normal');
  
  const { response, result } = await makeRequest('/auth/register', 'POST', testUser);
  
  if (response.status === 201 && result.success) {
    accessToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    userId = result.data.user.id;
    console.log('Usuario registrado exitosamente');
    console.log(`Access Token: ${accessToken.substring(0, 50)}...`);
    console.log(`Refresh Token: ${refreshToken.substring(0, 50)}...`);
  } else {
    console.log('Error al registrar usuario');
  }
}

async function testRegisterDuplicate() {
  console.log('\nPRUEBA 2: Intentar registrar email duplicado');
  
  const { response, result } = await makeRequest('/auth/register', 'POST', testUser);
  
  if (response.status === 400) {
    console.log('Correctamente rechazó email duplicado');
  } else {
    console.log('No rechazó email duplicado');
  }
}

async function testLogin() {
  console.log('\nPRUEBA 3: Login con credenciales correctas');
  
  const loginData = {
    email: testUser.email,
    password: testUser.password
  };
  
  const { response, result } = await makeRequest('/auth/login', 'POST', loginData);
  
  if (response.status === 200 && result.success) {
    console.log('Login exitoso');
    accessToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
  } else {
    console.log('Error en login');
  }
}

async function testLoginWrong() {
  console.log('\nPRUEBA 4: Login con credenciales incorrectas');
  
  const wrongLoginData = {
    email: testUser.email,
    password: 'wrongpassword'
  };
  
  const { response, result } = await makeRequest('/auth/login', 'POST', wrongLoginData);
  
  if (response.status === 401) {
    console.log('Correctamente rechazó credenciales incorrectas');
  } else {
    console.log('No rechazó credenciales incorrectas');
  }
}

async function testGetProfile() {
  console.log('\nPRUEBA 5: Obtener perfil con token válido');
  
  const { response, result } = await makeRequest('/auth/profile', 'GET', null, accessToken);
  
  if (response.status === 200 && result.success) {
    console.log('Perfil obtenido exitosamente');
  } else {
    console.log('Error al obtener perfil');
  }
}

async function testGetProfileNoToken() {
  console.log('\nPRUEBA 6: Intentar obtener perfil sin token');
  
  const { response, result } = await makeRequest('/auth/profile', 'GET');
  
  if (response.status === 401) {
    console.log('Correctamente rechazó acceso sin token');
  } else {
    console.log('No rechazó acceso sin token');
  }
}

async function testRefreshToken() {
  console.log('\nPRUEBA 7: Renovar token con refresh token válido');
  
  const refreshData = {
    refreshToken: refreshToken
  };
  
  const { response, result } = await makeRequest('/auth/refresh', 'POST', refreshData);
  
  if (response.status === 200 && result.success) {
    console.log('Token renovado exitosamente');
    accessToken = result.data.accessToken;
  } else {
    console.log('Error al renovar token');
  }
}

async function testUpdateProfile() {
  console.log('\nPRUEBA 8: Actualizar perfil');
  
  const updateData = {
    nombre: 'Usuario Test Actualizado'
  };
  
  const { response, result } = await makeRequest('/auth/profile', 'PUT', updateData, accessToken);
  
  if (response.status === 200 && result.success) {
    console.log('Perfil actualizado exitosamente');
  } else {
    console.log('Error al actualizar perfil');
  }
}

async function testChangePassword() {
  console.log('\nPRUEBA 9: Cambiar contraseña');
  
  const passwordData = {
    currentPassword: testUser.password,
    newPassword: 'NewPassword123',
    confirmNewPassword: 'NewPassword123'
  };
  
  const { response, result } = await makeRequest('/auth/change-password', 'PUT', passwordData, accessToken);
  
  if (response.status === 200 && result.success) {
    console.log('Contraseña cambiada exitosamente');
    testUser.password = 'NewPassword123';
  } else {
    console.log('Error al cambiar contraseña');
  }
}

async function testRegisterAdmin() {
  console.log('\nPRUEBA 10: Registrar usuario admin');
  
  const { response, result } = await makeRequest('/auth/register', 'POST', adminUser);
  
  if (response.status === 201 && result.success) {
    console.log('Usuario admin registrado exitosamente');
    return {
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken
    };
  } else {
    console.log('Error al registrar usuario admin');
    return null;
  }
}

async function testListUsers(adminToken) {
  console.log('\nPRUEBA 11: Listar usuarios como admin');
  
  const { response, result } = await makeRequest('/auth/users', 'GET', null, adminToken);
  
  if (response.status === 200 && result.success) {
    console.log('Lista de usuarios obtenida exitosamente');
    console.log(`Total de usuarios: ${result.data.users.length}`);
  } else {
    console.log('Error al obtener lista de usuarios');
  }
}

async function testListUsersAsUser() {
  console.log('\nPRUEBA 12: Intentar listar usuarios como usuario normal');
  
  const { response, result } = await makeRequest('/auth/users', 'GET', null, accessToken);
  
  if (response.status === 403) {
    console.log('Correctamente rechazó acceso de usuario normal a endpoint admin');
  } else {
    console.log('No rechazó acceso de usuario normal a endpoint admin');
  }
}

async function testLogout() {
  console.log('\nPRUEBA 13: Cerrar sesión');
  
  const logoutData = {
    refreshToken: refreshToken
  };
  
  const { response, result } = await makeRequest('/auth/logout', 'POST', logoutData, accessToken);
  
  if (response.status === 200 && result.success) {
    console.log('Sesión cerrada exitosamente');
  } else {
    console.log('Error al cerrar sesión');
  }
}

async function testRevokedRefreshToken() {
  console.log('\nPRUEBA 14: Intentar usar refresh token revocado');
  
  const refreshData = {
    refreshToken: refreshToken
  };
  
  const { response, result } = await makeRequest('/auth/refresh', 'POST', refreshData);
  
  if (response.status === 401) {
    console.log('Correctamente rechazó refresh token revocado');
  } else {
    console.log('No rechazó refresh token revocado');
  }
}

async function runAllTests() {
  console.log('INICIANDO PRUEBAS DE API DE AUTENTICACIÓN');
  console.log('===============================================');
  
  try {
    if (typeof fetch === 'undefined') {
      const { default: fetch } = await import('node-fetch');
      global.fetch = fetch;
    }
    
    await testRegisterUser();
    await testRegisterDuplicate();
    await testLogin();
    await testLoginWrong();
    await testGetProfile();
    await testGetProfileNoToken();
    await testRefreshToken();
    await testUpdateProfile();
    await testChangePassword();
    
    const adminTokens = await testRegisterAdmin();
    if (adminTokens) {
      await testListUsers(adminTokens.accessToken);
    }
    
    await testListUsersAsUser();
    await testLogout();
    await testRevokedRefreshToken();
    
    console.log('\nTODAS LAS PRUEBAS COMPLETADAS');
    console.log('================================');
    
  } catch (error) {
    console.error('\nERROR EN LAS PRUEBAS:', error.message);
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

if (require.main === module) {
  checkServer().then(serverOk => {
    if (serverOk) {
      runAllTests();
    } else {
      process.exit(1);
    }
  });
}

module.exports = {
  makeRequest,
  runAllTests,
  checkServer
}; 