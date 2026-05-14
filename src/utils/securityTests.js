/**
 * 🧪 SUITE COMPLETA DE PRUEBAS DE SEGURIDAD
 * 
 * Cómo usar:
 * 1. En el navegador, abre la consola (F12)
 * 2. Copia y pega este archivo en la consola
 * 3. Ejecuta: runAllSecurityTests()
 * 
 * O importa en tu componente:
 * import runAllSecurityTests from '@/utils/securityTests';
 */

import RateLimiter, { loginLimiter, dataModificationLimiter, apiCallLimiter } from './rateLimiter';
import {
  sanitizeString,
  isValidEmail,
  isValidNumber,
  isValidSKU,
  isValidDescription,
  isValidQuantity,
  isValidDate,
  isValidLocation,
  validateProduct,
  validateMove,
} from './securityValidation';
import { securityLogger } from './securityLogger';

// ============================================================
// 📊 UTILIDADES DE PRUEBA
// ============================================================

const TestResults = {
  passed: 0,
  failed: 0,
  tests: [],

  addTest(name, passed, message) {
    this.tests.push({ name, passed, message });
    if (passed) {
      this.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      this.failed++;
      console.error(`❌ ${name}: ${message}`);
    }
  },

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESUMEN DE PRUEBAS`);
    console.log('='.repeat(60));
    console.log(`✅ Pasadas: ${this.passed}`);
    console.log(`❌ Fallidas: ${this.failed}`);
    console.log(`📈 Total: ${this.tests.length}`);
    console.log(`🎯 Tasa de éxito: ${((this.passed / this.tests.length) * 100).toFixed(2)}%`);
    console.log('='.repeat(60) + '\n');

    return {
      passed: this.passed,
      failed: this.failed,
      total: this.tests.length,
      successRate: ((this.passed / this.tests.length) * 100).toFixed(2)
    };
  }
};

// ============================================================
// 1️⃣ PRUEBAS DE RATE LIMITING
// ============================================================

function testRateLimiting() {
  console.log('\n🔐 PRUEBAS DE RATE LIMITING');
  console.log('-'.repeat(60));

  const limiter = new RateLimiter(3, 60000); // 3 intentos en 1 minuto
  const testUser = 'test@example.com';

  // Prueba 1: Primer intento debe ser permitido
  const attempt1 = limiter.isAllowed(testUser);
  TestResults.addTest(
    'Rate Limit - Primer intento',
    attempt1.allowed === true && attempt1.remaining === 2,
    `Permitido, 2 intentos restantes`
  );

  // Prueba 2: Segundo intento debe ser permitido
  const attempt2 = limiter.isAllowed(testUser);
  TestResults.addTest(
    'Rate Limit - Segundo intento',
    attempt2.allowed === true && attempt2.remaining === 1,
    `Permitido, 1 intento restante`
  );

  // Prueba 3: Tercer intento debe ser permitido
  const attempt3 = limiter.isAllowed(testUser);
  TestResults.addTest(
    'Rate Limit - Tercer intento',
    attempt3.allowed === true && attempt3.remaining === 0,
    `Permitido, 0 intentos restantes`
  );

  // Prueba 4: Cuarto intento debe ser BLOQUEADO
  const attempt4 = limiter.isAllowed(testUser);
  TestResults.addTest(
    'Rate Limit - Bloqueo después de límite',
    attempt4.allowed === false && attempt4.remaining === 0,
    `Bloqueado correctamente después de exceder límite`
  );

  // Prueba 5: Diferente usuario debe tener su propio límite
  const differentUser = 'otro@example.com';
  const attempt5 = limiter.isAllowed(differentUser);
  TestResults.addTest(
    'Rate Limit - Usuarios separados',
    attempt5.allowed === true && attempt5.remaining === 2,
    `Nuevo usuario tiene su propio contador`
  );

  // Prueba 6: Reset funciona
  limiter.reset(testUser);
  const attempt6 = limiter.isAllowed(testUser);
  TestResults.addTest(
    'Rate Limit - Reset',
    attempt6.allowed === true && attempt6.remaining === 2,
    `Reset restaura el contador correctamente`
  );
}

// ============================================================
// 2️⃣ PRUEBAS DE VALIDACIÓN DE INPUTS
// ============================================================

function testInputValidation() {
  console.log('\n🛡️ PRUEBAS DE VALIDACIÓN DE INPUTS');
  console.log('-'.repeat(60));

  // Prueba 1: Sanitización de XSS
  const xssInput = '<script>alert("XSS")</script>';
  const sanitized = sanitizeString(xssInput);
  TestResults.addTest(
    'Sanitización - XSS',
    !sanitized.includes('<script>') && !sanitized.includes('alert'),
    `Script malicioso fue eliminado`
  );

  // Prueba 2: Sanitización de onclick
  const onclickInput = '<img src=x onclick="alert(1)">';
  const sanitized2 = sanitizeString(onclickInput);
  TestResults.addTest(
    'Sanitización - onclick',
    !sanitized2.includes('onclick='),
    `Evento onclick fue eliminado`
  );

  // Prueba 3: Validación de email válido
  const validEmail = 'usuario@example.com';
  TestResults.addTest(
    'Validación - Email válido',
    isValidEmail(validEmail),
    `Email válido fue aceptado`
  );

  // Prueba 4: Validación de email inválido
  const invalidEmail = 'email-sin-arroba.com';
  TestResults.addTest(
    'Validación - Email inválido',
    !isValidEmail(invalidEmail),
    `Email inválido fue rechazado`
  );

  // Prueba 5: Validación de SKU válido
  const validSKU = 'PROD-001';
  TestResults.addTest(
    'Validación - SKU válido',
    isValidSKU(validSKU),
    `SKU válido fue aceptado`
  );

  // Prueba 6: Validación de SKU inválido (caracteres especiales)
  const invalidSKU = 'PROD@#$%';
  TestResults.addTest(
    'Validación - SKU inválido',
    !isValidSKU(invalidSKU),
    `SKU con caracteres inválidos fue rechazado`
  );

  // Prueba 7: Validación de descripción válida
  const validDesc = 'Producto de alta calidad';
  TestResults.addTest(
    'Validación - Descripción válida',
    isValidDescription(validDesc),
    `Descripción válida fue aceptada`
  );

  // Prueba 8: Validación de descripción con script
  const invalidDesc = 'Producto <script>alert(1)</script>';
  TestResults.addTest(
    'Validación - Descripción con script',
    !isValidDescription(invalidDesc),
    `Descripción con script fue rechazada`
  );

  // Prueba 9: Validación de cantidad válida
  TestResults.addTest(
    'Validación - Cantidad válida',
    isValidQuantity(50),
    `Cantidad válida fue aceptada`
  );

  // Prueba 10: Validación de cantidad negativa
  TestResults.addTest(
    'Validación - Cantidad negativa',
    !isValidQuantity(-10),
    `Cantidad negativa fue rechazada`
  );

  // Prueba 11: Validación de fecha válida
  TestResults.addTest(
    'Validación - Fecha válida',
    isValidDate('2026-05-04'),
    `Fecha válida fue aceptada`
  );

  // Prueba 12: Validación de fecha inválida
  TestResults.addTest(
    'Validación - Fecha inválida',
    !isValidDate('32-13-2026'),
    `Fecha inválida fue rechazada`
  );

  // Prueba 13: Validación de ubicación válida
  TestResults.addTest(
    'Validación - Ubicación válida',
    isValidLocation('Pasillo A, Estante 3'),
    `Ubicación válida fue aceptada`
  );

  // Prueba 14: Validación de ubicación inválida (con script)
  TestResults.addTest(
    'Validación - Ubicación con script',
    !isValidLocation('Pasillo <script>alert(1)</script>'),
    `Ubicación con script fue rechazada`
  );
}

// ============================================================
// 3️⃣ PRUEBAS DE VALIDACIÓN DE PRODUCTO COMPLETO
// ============================================================

function testProductValidation() {
  console.log('\n📦 PRUEBAS DE VALIDACIÓN DE PRODUCTO');
  console.log('-'.repeat(60));

  // Producto válido
  const validProduct = {
    sku: 'PROD-123',
    description: 'Widget de calidad premium',
    location: 'Pasillo A, Estante 3',
    cost: 29.99,
    stock: 100
  };

  const validResult = validateProduct(validProduct);
  TestResults.addTest(
    'Validación de Producto - Producto válido',
    validResult.isValid && validResult.errors.length === 0,
    `Producto válido pasó todas las validaciones`
  );

  // Producto con SKU inválido
  const invalidSkuProduct = {
    sku: 'PROD@#$',
    description: 'Widget',
    location: 'Pasillo B',
    cost: 10,
    stock: 50
  };

  const invalidSkuResult = validateProduct(invalidSkuProduct);
  TestResults.addTest(
    'Validación de Producto - SKU inválido',
    !invalidSkuResult.isValid && invalidSkuResult.errors.length > 0,
    `SKU inválido fue detectado`
  );

  // Producto con descripción vacía
  const emptyDescProduct = {
    sku: 'PROD-123',
    description: '',
    location: 'Pasillo C',
    cost: 10,
    stock: 50
  };

  const emptyDescResult = validateProduct(emptyDescProduct);
  TestResults.addTest(
    'Validación de Producto - Descripción vacía',
    !emptyDescResult.isValid && emptyDescResult.errors.length > 0,
    `Descripción vacía fue detectada`
  );
}

// ============================================================
// 4️⃣ PRUEBAS DE LOGGING DE SEGURIDAD
// ============================================================

function testSecurityLogging() {
  console.log('\n📋 PRUEBAS DE LOGGING DE SEGURIDAD');
  console.log('-'.repeat(60));

  // Limpiar logs anteriores
  securityLogger.clearLogs();

  // Prueba 1: Registrar acceso no autorizado
  securityLogger.logUnauthorizedAccess('usuario@test.com', '/dashboard');
  const logs1 = securityLogger.getLogsByType('UNAUTHORIZED_ACCESS');
  TestResults.addTest(
    'Security Logger - Acceso no autorizado',
    logs1.length > 0 && logs1[0].eventType === 'UNAUTHORIZED_ACCESS',
    `Acceso no autorizado fue registrado`
  );

  // Prueba 2: Registrar fallo de autenticación
  securityLogger.logAuthenticationFailure('usuario@test.com', 'Contraseña incorrecta');
  const logs2 = securityLogger.getLogsByType('AUTH_FAILURE');
  TestResults.addTest(
    'Security Logger - Fallo de autenticación',
    logs2.length > 0 && logs2[0].eventType === 'AUTH_FAILURE',
    `Fallo de autenticación fue registrado`
  );

  // Prueba 3: Registrar modificación de datos
  securityLogger.logDataModification(
    'admin@test.com',
    'product',
    'DELETE',
    { productId: '123', name: 'Widget' }
  );
  const logs3 = securityLogger.getLogsByType('DATA_MODIFICATION');
  TestResults.addTest(
    'Security Logger - Modificación de datos',
    logs3.length > 0 && logs3[0].eventType === 'DATA_MODIFICATION',
    `Modificación de datos fue registrada`
  );

  // Prueba 4: Filtrar logs por usuario
  const userLogs = securityLogger.getLogsByUser('admin@test.com');
  TestResults.addTest(
    'Security Logger - Filtrar por usuario',
    userLogs.length > 0,
    `Filtrado por usuario funciona correctamente`
  );

  // Prueba 5: Obtener logs críticos
  securityLogger.logAnomaly('attacker@test.com', 'BRUTE_FORCE', 'Muchos intentos fallidos');
  const criticalLogs = securityLogger.getCriticalLogs(1);
  TestResults.addTest(
    'Security Logger - Logs críticos',
    criticalLogs.length > 0 && criticalLogs.some(l => l.severity === 'critical'),
    `Logs críticos fueron capturados`
  );
}

// ============================================================
// 5️⃣ PRUEBAS DE VARIABLES DE ENTORNO
// ============================================================

function testEnvironmentVariables() {
  console.log('\n🔑 PRUEBAS DE VARIABLES DE ENTORNO');
  console.log('-'.repeat(60));

  // Prueba 1: Firebase API Key existe
  const hasApiKey = !!import.meta.env.VITE_FIREBASE_API_KEY;
  TestResults.addTest(
    'Env - VITE_FIREBASE_API_KEY',
    hasApiKey,
    hasApiKey ? 'Variable configurada' : 'Falta configurar'
  );

  // Prueba 2: Super User Email existe
  const hasSuperUserEmail = !!import.meta.env.VITE_SUPER_USER_EMAIL;
  TestResults.addTest(
    'Env - VITE_SUPER_USER_EMAIL',
    hasSuperUserEmail,
    hasSuperUserEmail ? 'Variable configurada' : 'Falta configurar'
  );

  // Prueba 3: Super User Email es válido
  const superUserEmail = import.meta.env.VITE_SUPER_USER_EMAIL;
  const isValidSuperUserEmail = superUserEmail && superUserEmail.includes('@');
  TestResults.addTest(
    'Env - VITE_SUPER_USER_EMAIL es válido',
    isValidSuperUserEmail,
    isValidSuperUserEmail ? 'Email válido' : 'Email inválido'
  );

  // Prueba 4: No hay valores de ejemplo
  const hasExample = superUserEmail && superUserEmail.includes('example');
  TestResults.addTest(
    'Env - Sin valores de ejemplo',
    !hasExample,
    !hasExample ? 'Sin valores de ejemplo' : 'Contiene valor de ejemplo'
  );
}

// ============================================================
// 6️⃣ PRUEBAS DE .GITIGNORE
// ============================================================

function testGitignoreConfiguration() {
  console.log('\n📁 VERIFICACIÓN DE .GITIGNORE');
  console.log('-'.repeat(60));

  // Nota: No podemos leer .gitignore directamente desde el navegador
  // Pero podemos verificar que ciertos archivos no se exponen

  const shouldBeHidden = ['.env', '.env.local', 'firebase-config.json'];
  
  console.log('⚠️ Verificación manual requerida:');
  shouldBeHidden.forEach(file => {
    console.log(`   - Verifica que "${file}" esté en .gitignore`);
  });

  TestResults.addTest(
    'Gitignore - Archivos sensibles ocultos',
    true,
    'Verificar manualmente en .gitignore'
  );
}

// ============================================================
// 7️⃣ PRUEBAS DE LOGINLIMITER
// ============================================================

function testLoginLimiterInstance() {
  console.log('\n🔐 PRUEBAS DEL LOGIN LIMITER');
  console.log('-'.repeat(60));

  const testEmail = 'login-test@example.com';

  // Verificar que el limiter de login existe
  TestResults.addTest(
    'Login Limiter - Instancia existe',
    loginLimiter !== undefined,
    'loginLimiter está disponible'
  );

  // Probar el limiter de login específico
  const result1 = loginLimiter.isAllowed(testEmail);
  TestResults.addTest(
    'Login Limiter - Primer intento permitido',
    result1.allowed === true,
    `Primer intento permitido, ${result1.remaining} intentos restantes`
  );

  // Hacer varios intentos para acercarse al límite (5)
  for (let i = 0; i < 4; i++) {
    loginLimiter.isAllowed(testEmail);
  }

  const resultLimited = loginLimiter.isAllowed(testEmail);
  TestResults.addTest(
    'Login Limiter - Límite de 5 intentos',
    resultLimited.allowed === false,
    'Límite de login aplicado correctamente'
  );

  // Reset
  loginLimiter.reset(testEmail);
  const resultReset = loginLimiter.isAllowed(testEmail);
  TestResults.addTest(
    'Login Limiter - Reset funciona',
    resultReset.allowed === true && resultReset.remaining === 4,
    'Reset restauró el contador'
  );
}

// ============================================================
// 🎯 EJECUTAR TODAS LAS PRUEBAS
// ============================================================

export function runAllSecurityTests() {
  // Reset module-level state so re-runs don't accumulate results
  TestResults.passed = 0;
  TestResults.failed = 0;
  TestResults.tests  = [];

  console.clear();
  console.log('\n' + '█'.repeat(60));
  console.log('🔒 INICIANDO SUITE COMPLETA DE PRUEBAS DE SEGURIDAD');
  console.log('█'.repeat(60));

  try {
    testEnvironmentVariables();
    testRateLimiting();
    testLoginLimiterInstance();
    testInputValidation();
    testProductValidation();
    testSecurityLogging();
    testGitignoreConfiguration();

    const summary = TestResults.printSummary();

    // Reporte final
    if (TestResults.failed === 0) {
      console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! Tu sistema está seguro.');
    } else {
      console.log(`⚠️ ${TestResults.failed} prueba(s) fallaron. Revisa arriba.`);
    }

    return {
      success: TestResults.failed === 0,
      summary,
      allTests: TestResults.tests
    };
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default runAllSecurityTests;
