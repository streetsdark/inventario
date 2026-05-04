# 🔒 GUÍA COMPLETA DE SEGURIDAD - My Inventory

## ⚠️ INFORMACIÓN CRÍTICA

### 🚨 Variables de Entorno (API Keys)

**NUNCA hagas esto:**
- ❌ Subas el `.env` a GitHub/GitLab/control de versiones
- ❌ Compartas las claves de Firebase públicamente
- ❌ Uses las mismas keys en desarrollo y producción
- ❌ Confíes en secretos en el frontend para seguridad

**SIEMPRE haz esto:**
- ✅ Agrega `.env` y `.env.local` a `.gitignore`
- ✅ Usa diferentes proyectos Firebase para desarrollo/producción
- ✅ Rota keys regularmente
- ✅ Usa Firebase Authentication Rules para proteger datos

```env
# ✅ CORRECTO: .gitignore
.env
.env.local
.env.*.local
```

---

## 🛡️ Capas de Seguridad Implementadas

### 1️⃣ Rate Limiting
**Protege contra:** Ataques de fuerza bruta, DDoS, abuso

**Archivos:** `src/utils/rateLimiter.js`

**Limitadores activos:**
- 🔐 Login: 5 intentos en 15 minutos
- 📝 Modificaciones: 10 cambios en 1 minuto
- 📡 API: 100 llamadas en 1 minuto

**Uso en componentes:**
```javascript
import { loginLimiter } from '../utils/rateLimiter';

const handleLogin = async (email, password) => {
  const rateLimitCheck = loginLimiter.isAllowed(email);
  
  if (!rateLimitCheck.allowed) {
    // Mostrar mensaje: "Demasiados intentos. Intenta en 15 min"
    const resetTime = new Date(rateLimitCheck.resetTime);
    showError(`Intenta de nuevo en ${resetTime.toLocaleTimeString()}`);
    return;
  }
  // Continuar con login...
};
```

### 2️⃣ Validación de Inputs
**Protege contra:** XSS, SQL Injection, Buffer Overflow

**Archivos:** `src/utils/securityValidation.js`

**Funciones disponibles:**
- `sanitizeString()` - Limpia caracteres peligrosos
- `isValidEmail()` - Valida emails
- `isValidSKU()` - Valida códigos de producto
- `validateProduct()` - Valida producto completo
- `validateMove()` - Valida movimiento de inventario

**Uso en formularios:**
```javascript
import { validateProduct, sanitizeString } from '../utils/securityValidation';

const handleSubmitProduct = async (productData) => {
  // Sanitizar inputs
  const sanitized = {
    ...productData,
    description: sanitizeString(productData.description),
    sku: sanitizeString(productData.sku)
  };

  // Validar
  const validation = validateProduct(sanitized);
  if (!validation.isValid) {
    showError(validation.errors.join(', '));
    return;
  }
  // Guardar...
};
```

### 3️⃣ Logging de Seguridad
**Protege contra:** Accesos no autorizados, anomalías

**Archivos:** `src/utils/securityLogger.js`

**Eventos registrados:**
- Intentos de acceso no autorizados
- Fallos de autenticación
- Cambios en datos críticos
- Rate limits excedidos
- Anomalías detectadas

**Uso:**
```javascript
import { securityLogger } from '../utils/securityLogger';

// Registrar intento de acceso no autorizado
securityLogger.logUnauthorizedAccess(user.email, '/dashboard');

// Registrar modificación de datos
securityLogger.logDataModification(
  user.email,
  'product',
  'DELETE',
  { productId: '123', productName: 'Widget' }
);

// Obtener logs críticos
const criticalLogs = securityLogger.getCriticalLogs(30); // Últimos 30 min
console.log(criticalLogs);
```

### 4️⃣ Control de Acceso
**Protege contra:** Acceso a áreas restringidas

**Componentes:**
- `useRole()` - Verifica si es super usuario
- `useSecureAccess()` - Hook de acceso basado en roles

**Rutas protegidas:**
- `/dashboard` - Solo super usuario
- `/moves` - Solo super usuario
- `/products` - Todos (autenticados)

### 5️⃣ Firebase Security Rules
**Protege a nivel de base de datos**

```javascript
// Recomendación: Implementa estas reglas en Firebase Console
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Solo usuarios autenticados pueden leer/escribir
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.email == "tu_admin_email@gmail.com";
    }
    
    match /moves/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.email == "tu_admin_email@gmail.com";
    }
  }
}
```

---

## 🔐 Mejores Prácticas

### ✅ HACER

1. **Usar HTTPS siempre** (en producción)
   - Verifica que tu hosting tenga SSL/TLS

2. **Implementar CORS** (en backend)
   ```
   Access-Control-Allow-Origin: https://tu-dominio.com
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE
   ```

3. **Validar en cliente Y servidor**
   - Frontend: Para UX inmediata
   - Backend/Firestore: Para seguridad verdadera

4. **Rotar keys regularmente**
   - Cada 3-6 meses
   - Especialmente si fue comprometida

5. **Monitorear logs de seguridad**
   - Revisa regularmente `securityLogger`
   - Busca patrones anormales

6. **Implementar 2FA**
   - Firebase ya soporta esto
   - Usa en cuentas administrativas

### ❌ NO HACER

1. **Guardar contraseñas en localStorage**
   ```javascript
   // ❌ NUNCA
   localStorage.setItem('password', userPassword);
   
   // ✅ Usa Firebase Auth - lo hace por ti
   ```

2. **Confiar solo en validación del cliente**
   ```javascript
   // ❌ NUNCA
   if (productName.length > 0) saveProduct(); // Vulnerable
   
   // ✅ Valida en cliente + Firestore Rules
   validateProduct(product) && validateInServer(product);
   ```

3. **Exponer tokens de acceso**
   ```javascript
   // ❌ NUNCA
   console.log(userToken); // En producción
   localStorage.setItem('firebaseToken', token);
   
   // ✅ Firebase Auth maneja tokens automáticamente
   ```

4. **Usar valores por defecto inseguros**
   ```javascript
   // ❌ NUNCA
   const apiKey = process.env.VITE_FIREBASE_API_KEY || 'default-key';
   
   // ✅ Requiere la variable
   if (!process.env.VITE_FIREBASE_API_KEY) {
     throw new Error('VITE_FIREBASE_API_KEY no está configurado');
   }
   ```

5. **Permitir acceso a rutas sin autenticación**
   ```javascript
   // ❌ NUNCA
   <Route path="/dashboard" element={<Dashboard />} />
   
   // ✅ Usa PrivateRoute
   <Route 
     path="/dashboard" 
     element={<PrivateRoute user={user}><Dashboard /></PrivateRoute>} 
   />
   ```

---

## 🚀 Checklist de Seguridad PRE-PRODUCCIÓN

### Antes de publicar:

- [ ] Verificar que `.env` NO esté en `.gitignore` (✅)
- [ ] Cambiar `VITE_SUPER_USER_EMAIL` a tu email
- [ ] Revisar Firebase Console Security Rules
- [ ] Habilitar autenticación de 2 factores en tu cuenta
- [ ] Rotar keys de Firebase (crear nuevas en Console)
- [ ] Configurar CORS en backend (si tienes)
- [ ] Implementar rate limiting en backend también
- [ ] Habilitar logs de auditoría en Firebase
- [ ] Revisar permisos de acceso en Firebase
- [ ] Hacer backup de datos
- [ ] Probar seguridad con herramientas como OWASP ZAP

### En producción:

- [ ] Configurar variables de entorno en hosting (NO en .env)
- [ ] Monitorear logs de seguridad diariamente
- [ ] Hacer backups automáticos
- [ ] Tener plan de recuperación ante incidentes
- [ ] Auditorías de seguridad cada 3-6 meses

---

## 📝 Cómo Reportar Vulnerabilidades

Si encuentras una vulnerabilidad:
1. ⚠️ NO la publiques públicamente
2. 📧 Contacta al administrador privadamente
3. 📋 Proporciona detalles: cómo reproducir, impacto
4. ⏳ Espera respuesta antes de divulgar

---

## 🔧 Herramientas Recomendadas

- **OWASP ZAP** - Pruebas de seguridad
- **npm audit** - Auditoría de dependencias
- **Snyk** - Monitoreo de vulnerabilidades
- **Firebase Console** - Monitoreo de aplicación
- **Browser DevTools** - Network inspection

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Learn/Server-side/First_steps/Website_security)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Última actualización:** 4 de Mayo, 2026
**Versión:** 1.0
