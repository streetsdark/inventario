import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RateLimiter from '../utils/rateLimiter';

describe('RateLimiter', () => {
  let limiter;
  let mockNow;

  beforeEach(() => {
    mockNow = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    limiter = new RateLimiter(3, 60000); // 3 intentos, ventana de 1 minuto
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Primer intento ─────────────────────────────────────────────────────

  it('permite el primer intento de una clave nueva', () => {
    const { allowed } = limiter.isAllowed('user-1');
    expect(allowed).toBe(true);
  });

  it('devuelve remaining correcto en el primer intento', () => {
    const { remaining } = limiter.isAllowed('user-1');
    expect(remaining).toBe(2); // maxAttempts(3) - 1
  });

  // ── Conteo de intentos ─────────────────────────────────────────────────

  it('decrementa remaining en cada intento', () => {
    limiter.isAllowed('user-1'); // remaining: 2
    const { remaining } = limiter.isAllowed('user-1'); // remaining: 1
    expect(remaining).toBe(1);
  });

  it('bloquea al superar el máximo de intentos', () => {
    limiter.isAllowed('user-1'); // intento 1
    limiter.isAllowed('user-1'); // intento 2
    limiter.isAllowed('user-1'); // intento 3 — llega al límite
    const { allowed, remaining } = limiter.isAllowed('user-1'); // intento 4 — bloqueado
    expect(allowed).toBe(false);
    expect(remaining).toBe(0);
  });

  it('devuelve resetTime al bloquear', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    const { resetTime } = limiter.isAllowed('user-1');
    expect(resetTime).toBeGreaterThan(mockNow);
  });

  it('claves distintas no se afectan entre sí', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1'); // user-1 bloqueado

    const { allowed } = limiter.isAllowed('user-2'); // user-2 independiente
    expect(allowed).toBe(true);
  });

  // ── Ventana de tiempo ──────────────────────────────────────────────────

  it('reinicia el contador cuando expira la ventana de tiempo', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1'); // bloqueado

    // Avanzamos el tiempo más allá de la ventana (60001 ms)
    Date.now.mockReturnValue(mockNow + 60001);

    const { allowed, remaining } = limiter.isAllowed('user-1');
    expect(allowed).toBe(true);
    expect(remaining).toBe(2);
  });

  it('no reinicia antes de que expire la ventana', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1'); // bloqueado

    // Avanzamos menos que la ventana (30 segundos)
    Date.now.mockReturnValue(mockNow + 30000);

    const { allowed } = limiter.isAllowed('user-1');
    expect(allowed).toBe(false);
  });

  // ── reset() ────────────────────────────────────────────────────────────

  it('reset() permite volver a intentar inmediatamente', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1'); // bloqueado

    limiter.reset('user-1');

    const { allowed } = limiter.isAllowed('user-1');
    expect(allowed).toBe(true);
  });

  it('reset() no afecta a otras claves', () => {
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1');
    limiter.isAllowed('user-1'); // bloqueado

    limiter.isAllowed('user-2');
    limiter.reset('user-1');

    // user-2 sigue con sus propios intentos
    const { remaining } = limiter.isAllowed('user-2');
    expect(remaining).toBe(1);
  });

  // ── cleanup() ──────────────────────────────────────────────────────────

  it('cleanup() elimina registros más antiguos que 2x la ventana', () => {
    limiter.isAllowed('user-viejo');

    // Avanzamos más de 2x la ventana (120001 ms)
    Date.now.mockReturnValue(mockNow + 120001);
    limiter.cleanup();

    // Después del cleanup, user-viejo vuelve a tener remaining máximo
    const { remaining } = limiter.isAllowed('user-viejo');
    expect(remaining).toBe(2);
  });

  it('cleanup() no elimina registros recientes', () => {
    limiter.isAllowed('user-reciente');
    limiter.isAllowed('user-reciente'); // 1 intento usado

    // Avanzamos solo 30 segundos
    Date.now.mockReturnValue(mockNow + 30000);
    limiter.cleanup();

    // Sigue contando desde donde estaba
    const { remaining } = limiter.isAllowed('user-reciente');
    expect(remaining).toBe(0);
  });
});
