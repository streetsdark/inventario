/**
 * 🛡️ Validaciones de Seguridad
 * Sanitización y validación de inputs para prevenir ataques XSS, SQL Injection, etc.
 */

/**
 * Sanitiza strings eliminando caracteres peligrosos
 * @param {string} input - String a sanitizar
 * @returns {string} String sanitizado
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    // Remover scripts HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remover tags HTML peligrosas que pueden ejecutar JS
    .replace(/<(img|svg|input|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, '')
    // Remover eventos inline con comillas
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    // Remover eventos inline sin comillas
    .replace(/on\w+\s*=\s*[^\s>'"]+/gi, '')
    // Remover protocolo javascript:
    .replace(/javascript\s*:/gi, '')
    // Remover caracteres de control
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Escapar caracteres especiales HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Valida que sea un número seguro
 * @param {any} value - Valor a validar
 * @returns {boolean}
 */
export const isValidNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= 0;
};

/**
 * Valida SKU (código de producto)
 * Permite solo alfanuméricos y guiones/guiones bajos
 * @param {string} sku - SKU a validar
 * @returns {boolean}
 */
export const isValidSKU = (sku) => {
  // Reject prototype pollution keys (__proto__, __defineGetter__, etc.)
  if (/^__/.test(sku)) return false;
  const skuRegex = /^[a-zA-Z0-9_-]{1,50}$/;
  return skuRegex.test(sku);
};

/**
 * Valida descripción (máximo 500 caracteres, sin scripts)
 * @param {string} description - Descripción a validar
 * @returns {boolean}
 */
export const isValidDescription = (description) => {
  return (
    typeof description === 'string' &&
    description.length >= 1 &&
    description.length <= 500 &&
    !/<script|on\w+\s*=/i.test(description)
  );
};

/**
 * Valida cantidad (debe ser número positivo)
 * @param {any} quantity - Cantidad a validar
 * @returns {boolean}
 */
export const isValidQuantity = (quantity) => {
  const num = Number(quantity);
  return Number.isInteger(num) && num > 0 && num < 1000000;
};

/**
 * Valida fecha en formato YYYY-MM-DD
 * @param {string} dateString - Fecha a validar
 * @returns {boolean}
 */
export const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const [year, month, day] = dateString.split('-').map(Number);
  if (year < 1) return false;

  // Use UTC to avoid timezone shifts that could change the date
  const date = new Date(`${dateString}T00:00:00Z`);
  if (isNaN(date.getTime())) return false;

  // Verify parts match — catches rolled-over dates like Feb 30 → Mar 1
  return date.getUTCFullYear() === year &&
         date.getUTCMonth() + 1 === month &&
         date.getUTCDate() === day;
};

/**
 * Valida ubicación en almacén (máximo 100 caracteres, sin scripts)
 * @param {string} location - Ubicación a validar
 * @returns {boolean}
 */
export const isValidLocation = (location) => {
  return (
    typeof location === 'string' &&
    location.trim().length >= 1 &&
    location.length <= 100 &&
    !/<script|on\w+\s*=/i.test(location)
  );
};

/**
 * Valida datos de producto completo
 * @param {object} product - Objeto producto
 * @returns {object} { isValid: boolean, errors: [] }
 */
export const validateProduct = (product) => {
  if (!product || typeof product !== 'object') {
    return { isValid: false, errors: ['Producto inválido o nulo.'] };
  }

  const errors = [];

  if (!isValidSKU(product.sku)) {
    errors.push('SKU inválido. Use solo letras, números, guiones y guiones bajos.');
  }

  if (!isValidDescription(product.description)) {
    errors.push('Descripción inválida. Máximo 500 caracteres.');
  }

  if (!isValidLocation(product.location)) {
    errors.push('Ubicación inválida. Máximo 100 caracteres y es obligatoria.');
  }

  if (!isValidNumber(product.cost)) {
    errors.push('Costo debe ser un número válido.');
  }

  if (!isValidNumber(product.stock)) {
    errors.push('Stock debe ser un número válido.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida movimiento de inventario
 * @param {object} move - Objeto movimiento
 * @returns {object} { isValid: boolean, errors: [] }
 */
export const validateMove = (move) => {
  const errors = [];

  if (!isValidQuantity(move.quantity)) {
    errors.push('Cantidad inválida.');
  }

  if (!isValidDate(move.date)) {
    errors.push('Fecha inválida.');
  }

  if (move.type !== 'in' && move.type !== 'out') {
    errors.push('Tipo de movimiento inválido.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  sanitizeString,
  isValidEmail,
  isValidNumber,
  isValidSKU,
  isValidDescription,
  isValidQuantity,
  isValidDate,
  isValidLocation,
  validateProduct,
  validateMove
};
