# Google reCAPTCHA Setup Guide

## Configuración de Google reCAPTCHA v2

### 1. Obtener las claves de reCAPTCHA

1. Ve a [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Haz clic en "Create" para crear un nuevo sitio
3. Selecciona "reCAPTCHA v2"
4. Elige "I'm not a robot" Checkbox
5. Agrega tu dominio (ej: `localhost` para desarrollo, `tudominio.com` para producción)
6. Acepta los términos y haz clic en "Submit"
7. Copia las claves generadas:
   - **Site Key** (clave pública)
   - **Secret Key** (clave privada)

### 2. Configurar las claves en el proyecto

#### Frontend (Vue.js)
Edita el archivo `app-form/index.html`:
```html
<script src="https://www.google.com/recaptcha/api.js" async defer></script>
```

Edita el archivo `app-form/src/views/ContactoView.vue`:
```javascript
const recaptchaSiteKey = 'TU_SITE_KEY_AQUI' // Reemplaza con tu clave real
```

#### Backend (Node.js)
Crea un archivo `.env` en la raíz del proyecto backend:
```env
RECAPTCHA_SECRET_KEY=tu_secret_key_aqui
```

### 3. Verificar la instalación

1. **Frontend**: Ejecuta `npm run dev` en el directorio `app-form`
2. **Backend**: Ejecuta `npm run dev` en el directorio raíz
3. Navega a `http://localhost:5173/contact`
4. Intenta enviar el formulario
5. Verifica que aparezca el checkbox de reCAPTCHA

### 4. Características implementadas

- ✅ reCAPTCHA v2 Checkbox
- ✅ Verificación manual por el usuario
- ✅ Validación en el backend
- ✅ Manejo de errores y expiración
- ✅ Integración con formulario existente
- ✅ Reset automático después del envío

### 5. Notas importantes

- reCAPTCHA v2 requiere que el usuario haga clic en el checkbox "I'm not a robot"
- El token expira después de un tiempo, por lo que se resetea automáticamente
- Para desarrollo local, usa `localhost` en la configuración de reCAPTCHA
- Para producción, asegúrate de agregar tu dominio real

### 6. Solución de problemas

**Error: "reCAPTCHA no está cargado"**
- Verifica que la clave del sitio sea correcta
- Asegúrate de que el dominio esté configurado en Google reCAPTCHA

**Error: "Verificación de reCAPTCHA falló"**
- Verifica que la clave secreta sea correcta
- Asegúrate de que el archivo `.env` esté configurado correctamente

**Error de CORS**
- Verifica que el backend esté configurado para aceptar peticiones del frontend
- Asegúrate de que las URLs de la API sean correctas

**El checkbox no aparece**
- Verifica que el script de reCAPTCHA se esté cargando correctamente
- Asegúrate de que la clave del sitio sea válida 