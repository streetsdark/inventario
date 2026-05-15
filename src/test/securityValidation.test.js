import { describe, it, expect } from 'vitest';
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
} from '../utils/securityValidation';

// ── sanitizeString ─────────────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('elimina etiquetas <script>', () => {
    const result = sanitizeString('<script>alert("xss")</script>hola');
    expect(result).not.toContain('<script>');
    expect(result).toContain('hola');
  });

  it('elimina eventos inline (onclick, onload...)', () => {
    const result = sanitizeString('<img onclick="alert(1)">');
    expect(result).not.toContain('onclick');
  });

  it('elimina protocolo javascript:', () => {
    const result = sanitizeString('javascript:alert(1)');
    expect(result).not.toContain('javascript:');
  });

  it('devuelve string vacío si el input no es string', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(123)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('hace trim del input', () => {
    const result = sanitizeString('  hola  ');
    expect(result.startsWith(' ')).toBe(false);
  });
});

// ── isValidEmail ───────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('acepta emails válidos', () => {
    expect(isValidEmail('usuario@empresa.com')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co')).toBe(true);
  });

  it('rechaza emails sin @', () => {
    expect(isValidEmail('usuariosindominio')).toBe(false);
  });

  it('rechaza emails sin dominio', () => {
    expect(isValidEmail('usuario@')).toBe(false);
  });

  it('rechaza emails más largos de 254 caracteres', () => {
    const largo = 'a'.repeat(250) + '@b.com';
    expect(isValidEmail(largo)).toBe(false);
  });
});

// ── isValidNumber ──────────────────────────────────────────────────────────

describe('isValidNumber', () => {
  it('acepta cero y positivos', () => {
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(100)).toBe(true);
    expect(isValidNumber('42')).toBe(true);
  });

  it('rechaza NaN e Infinity', () => {
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
  });

  it('rechaza números negativos', () => {
    expect(isValidNumber(-1)).toBe(false);
  });
});

// ── isValidSKU ─────────────────────────────────────────────────────────────

describe('isValidSKU', () => {
  it('acepta alfanuméricos y guiones', () => {
    expect(isValidSKU('ABC-123')).toBe(true);
    expect(isValidSKU('prod_001')).toBe(true);
  });

  it('rechaza caracteres especiales', () => {
    expect(isValidSKU('ABC 123')).toBe(false);
    expect(isValidSKU('cod@igo')).toBe(false);
  });

  it('rechaza strings vacíos', () => {
    expect(isValidSKU('')).toBe(false);
  });

  it('rechaza prototype pollution (__proto__)', () => {
    expect(isValidSKU('__proto__')).toBe(false);
    expect(isValidSKU('__defineGetter__')).toBe(false);
  });

  it('rechaza SKUs de más de 50 caracteres', () => {
    expect(isValidSKU('A'.repeat(51))).toBe(false);
  });
});

// ── isValidQuantity ────────────────────────────────────────────────────────

describe('isValidQuantity', () => {
  it('acepta enteros positivos', () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(999999)).toBe(true);
  });

  it('rechaza cero', () => {
    expect(isValidQuantity(0)).toBe(false);
  });

  it('rechaza negativos', () => {
    expect(isValidQuantity(-5)).toBe(false);
  });

  it('rechaza decimales', () => {
    expect(isValidQuantity(1.5)).toBe(false);
  });

  it('rechaza cantidades >= 1.000.000', () => {
    expect(isValidQuantity(1000000)).toBe(false);
  });
});

// ── isValidDate ────────────────────────────────────────────────────────────

describe('isValidDate', () => {
  it('acepta fechas válidas en formato YYYY-MM-DD', () => {
    expect(isValidDate('2024-05-14')).toBe(true);
    expect(isValidDate('2000-01-01')).toBe(true);
  });

  it('rechaza formato incorrecto', () => {
    expect(isValidDate('14-05-2024')).toBe(false);
    expect(isValidDate('2024/05/14')).toBe(false);
  });

  it('rechaza fechas inexistentes (Feb 30)', () => {
    expect(isValidDate('2024-02-30')).toBe(false);
  });

  it('rechaza strings vacíos', () => {
    expect(isValidDate('')).toBe(false);
  });
});

// ── isValidLocation ────────────────────────────────────────────────────────

describe('isValidLocation', () => {
  it('acepta ubicaciones válidas', () => {
    expect(isValidLocation('Estante A-3')).toBe(true);
    expect(isValidLocation('Almacén principal')).toBe(true);
  });

  it('rechaza strings vacíos', () => {
    expect(isValidLocation('')).toBe(false);
    expect(isValidLocation('   ')).toBe(false);
  });

  it('rechaza más de 100 caracteres', () => {
    expect(isValidLocation('A'.repeat(101))).toBe(false);
  });

  it('rechaza scripts inline', () => {
    expect(isValidLocation('<script>alert(1)</script>')).toBe(false);
  });
});

// ── validateProduct ────────────────────────────────────────────────────────

describe('validateProduct', () => {
  const productoValido = {
    sku: 'PROD-001',
    description: 'Tornillo M8',
    location: 'Estante B-2',
    cost: 1.5,
    stock: 100,
  };

  it('aprueba un producto con todos los campos correctos', () => {
    const { isValid, errors } = validateProduct(productoValido);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rechaza un producto nulo', () => {
    const { isValid } = validateProduct(null);
    expect(isValid).toBe(false);
  });

  it('acumula múltiples errores', () => {
    const { isValid, errors } = validateProduct({ sku: '', description: '', location: '', cost: -1, stock: -1 });
    expect(isValid).toBe(false);
    expect(errors.length).toBeGreaterThan(1);
  });

  it('rechaza si el SKU es inválido', () => {
    const { isValid, errors } = validateProduct({ ...productoValido, sku: 'cod igo malo!' });
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('SKU'))).toBe(true);
  });
});

// ── validateMove ───────────────────────────────────────────────────────────

describe('validateMove', () => {
  const movimientoValido = { quantity: 10, date: '2024-05-14', type: 'in' };

  it('aprueba un movimiento válido de entrada', () => {
    const { isValid } = validateMove(movimientoValido);
    expect(isValid).toBe(true);
  });

  it('aprueba un movimiento válido de salida', () => {
    const { isValid } = validateMove({ ...movimientoValido, type: 'out' });
    expect(isValid).toBe(true);
  });

  it('rechaza cantidad inválida', () => {
    const { isValid, errors } = validateMove({ ...movimientoValido, quantity: 0 });
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('Cantidad'))).toBe(true);
  });

  it('rechaza fecha inválida', () => {
    const { isValid, errors } = validateMove({ ...movimientoValido, date: 'no-es-fecha' });
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('Fecha'))).toBe(true);
  });

  it('rechaza tipo de movimiento desconocido', () => {
    const { isValid, errors } = validateMove({ ...movimientoValido, type: 'transferencia' });
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('Tipo'))).toBe(true);
  });
});
