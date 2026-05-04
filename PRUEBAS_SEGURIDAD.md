# 🧪 GUÍA DE PRUEBAS DE SEGURIDAD

## ¿Cómo probar la seguridad de tu app?

Hay **3 formas** de ejecutar las pruebas:

---

## 🔴 OPCIÓN 1: Panel de Pruebas en la App (RECOMENDADO)

### Pasos:
1. Inicia sesión como **super usuario** (`mdavidcha@gmail.com`)
2. Ve a `http://localhost:5174/security-tests` 
3. Haz click en **"▶️ Ejecutar Pruebas Completas"**
4. Espera a que terminen y revisa los resultados
5. Opcionalmente, descarga los resultados en JSON

### Lo que verás:
- ✅ Pruebas pasadas (verdes)
- ❌ Pruebas fallidas (rojas)
- 📊 Estadísticas y tasa de éxito
- 💾 Opción para descargar resultados

---

## 🟡 OPCIÓN 2: Consola del Navegador (Developer Tools)

### Pasos:
1. Abre el navegador
2. Presiona **F12** para abrir Developer Tools
3. Ve a la pestaña **"Console"**
4. Pega este código:

```javascript
import('../src/utils/securityTests.js').then(mod => {
  mod.default();
});
```

O de forma más simple:

```javascript
// Si estás en la app, simplemente ejecuta:
window.runSecurityTests?.();
```

### Resultado:
- Verás todos los tests ejecutándose
- Output detallado en la consola
- Información de éxito/fallos

---

## 🟢 OPCIÓN 3: Desde el Código (Para Desarrolladores)

### Importar en tu componente:

```javascript
import runAllSecurityTests from '../utils/securityTests';

// En tu componente
const handleTestSecurity = () => {
  const results = runAllSecurityTests();
  console.log('Resultados:', results);
};
```

---

## 📊 Interpretando los Resultados

### Estructura del Resultado:

```javascript
{
  success: true,           // ¿Todas las pruebas pasaron?
  summary: {
    passed: 31,            // Pruebas exitosas
    failed: 0,             // Pruebas fallidas
    total: 31,             // Total de pruebas
    successRate: "100.00"  // Porcentaje
  },
  allTests: [              // Detalles de cada prueba
    {
      name: "Rate Limit - Primer intento",
      passed: true,
      message: "Permitido, 2 intentos restantes"
    },
    // ... más pruebas
  ]
}
```

---

## 🔍 Pruebas Incluidas

### 1️⃣ Rate Limiting (7 pruebas)
- ✅ Primer intento permitido
- ✅ Segundo intento permitido
- ✅ Tercero permitido
- ✅ Cuarto bloqueado (límite alcanzado)
- ✅ Usuarios tienen contadores separados
- ✅ Reset funciona
- ✅ Login limiter específico

**Protege contra:** Ataques de fuerza bruta, spam, DDoS

### 2️⃣ Validación de Inputs (12 pruebas)
- ✅ Sanitización de XSS
- ✅ Sanitización de onclick
- ✅ Email válido aceptado
- ✅ Email inválido rechazado
- ✅ SKU válido aceptado
- ✅ SKU inválido rechazado
- ✅ Descripción válida aceptada
- ✅ Descripción con script rechazada
- ✅ Cantidad válida aceptada
- ✅ Cantidad negativa rechazada
- ✅ Fecha válida aceptada
- ✅ Fecha inválida rechazada

**Protege contra:** XSS, SQL Injection, Buffer Overflow

### 3️⃣ Validación de Producto (3 pruebas)
- ✅ Producto válido pasa
- ✅ SKU inválido detectado
- ✅ Descripción vacía detectada

### 4️⃣ Logging de Seguridad (5 pruebas)
- ✅ Acceso no autorizado registrado
- ✅ Fallo de autenticación registrado
- ✅ Modificación de datos registrada
- ✅ Filtrado por usuario funciona
- ✅ Logs críticos capturados

### 5️⃣ Variables de Entorno (4 pruebas)
- ✅ VITE_FIREBASE_API_KEY existe
- ✅ VITE_SUPER_USER_EMAIL existe
- ✅ Email del super usuario es válido
- ✅ Sin valores de ejemplo

### 6️⃣ .gitignore (1 prueba)
- ✅ Archivos sensibles ocultos (verificación manual)

---

## ✅ Checklist: ¿Qué Significa Que Todo Pasó?

Si ves **100%** de tasa de éxito:

- [x] **Rate limiting** - Funciona correctamente
- [x] **XSS Protection** - Inputs sanitizados
- [x] **SQL Injection** - Validación robusta
- [x] **Seguridad de Datos** - Logs activados
- [x] **Variables de Entorno** - Configuradas correctamente
- [x] **Control de Acceso** - Roles aplicados

**Tu app está segura en el frontend** ✅

---

## ❌ Si Falla Alguna Prueba

### Ejemplo de Fallo:
```
❌ Env - VITE_FIREBASE_API_KEY: Falta configurar
```

### Solución:
1. Abre `.env` en la raíz del proyecto
2. Asegúrate de que `VITE_FIREBASE_API_KEY` tenga un valor
3. Guarda y recarga la página
4. Vuelve a ejecutar las pruebas

---

## 🔒 Pruebas ADICIONALMENTE NECESARIAS en Producción

Estas pruebas comprueban seguridad **frontend**. Para producción, también debes:

### 1. Firestore Security Rules ⚠️ CRÍTICO
```javascript
// Ve a: Firebase Console → Firestore → Rules
// Implement las reglas en: FIREBASE_SECURITY_RULES.md
```

### 2. Rate Limiting en Backend
```javascript
// Express.js ejemplo:
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100                    // 100 requests por ventana
});

app.use('/api/', limiter);
```

### 3. CORS Configuration
```javascript
// Node.js / Express
const cors = require('cors');

app.use(cors({
  origin: 'https://tu-dominio.com',
  credentials: true
}));
```

### 4. Monitorear Logs de Seguridad
```javascript
// Revisa regularmente:
securityLogger.getCriticalLogs(30); // Últimas 24 horas
```

### 5. HTTPS Obligatorio
- ✅ Vercel: Automático
- ✅ Netlify: Automático
- Otros: Configurar certificado SSL

---

## 📈 Hacer Auditorías Periódicas

Recomendación: **Ejecuta estas pruebas cada 2 semanas**

```javascript
// Guardar en tu calendario:
- Cada lunes: Pruebas de seguridad
- Cada mes: Revisar logs críticos
- Cada 3 meses: Auditoría completa
```

---

## 🆘 Si Tienes Dudas

1. Abre la consola (F12)
2. Ejecuta: `runAllSecurityTests()`
3. Copia los resultados
4. Revisa `SEGURIDAD.md` para detalles
5. Contacta al administrador si hay problemas críticos

---

## 🎯 Resultado Esperado

```
✅ TODAS LAS PRUEBAS PASARON
🎉 Tu sistema está protegido correctamente

Pruebas Pasadas:  31
Pruebas Fallidas: 0
Total:           31
Tasa de Éxito:   100.00%
```

**¡Tu app está segura!** 🛡️

---

**Última actualización:** 4 de Mayo, 2026
**Versión:** 1.0
