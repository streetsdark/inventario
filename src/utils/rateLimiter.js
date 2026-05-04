/**
 * 🔒 Rate Limiter - Previene ataques de fuerza bruta
 * Limita las peticiones por dirección IP (en el frontend, por sesión)
 */

class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    // maxAttempts: máximo de intentos permitidos
    // windowMs: ventana de tiempo (por defecto 15 minutos)
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * Verifica si se permite una acción
   * @param {string} key - Identificador único (ej: email, action-name)
   * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
   */
  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key);

    // Si no hay intentos previos, crear registro
    if (!userAttempts) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        blockedUntil: null
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetTime: null
      };
    }

    // Verificar si la ventana de tiempo ha expirado
    if (now - userAttempts.firstAttempt > this.windowMs) {
      // Reiniciar contador
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        blockedUntil: null
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetTime: null
      };
    }

    // Incrementar contador dentro de la ventana
    userAttempts.count++;

    if (userAttempts.count > this.maxAttempts) {
      userAttempts.blockedUntil = now + this.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime: userAttempts.blockedUntil
      };
    }

    return {
      allowed: true,
      remaining: this.maxAttempts - userAttempts.count,
      resetTime: userAttempts.firstAttempt + this.windowMs
    };
  }

  /**
   * Limpia intentos antiguos para liberar memoria
   */
  cleanup() {
    const now = Date.now();
    for (const [key, attempts] of this.attempts.entries()) {
      if (now - attempts.firstAttempt > this.windowMs * 2) {
        this.attempts.delete(key);
      }
    }
  }

  /**
   * Reinicia el contador para una clave específica
   */
  reset(key) {
    this.attempts.delete(key);
  }
}

// Instancias de rate limiters para diferentes acciones
export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 intentos en 15 min
export const dataModificationLimiter = new RateLimiter(10, 1 * 60 * 1000); // 10 cambios en 1 min
export const apiCallLimiter = new RateLimiter(100, 1 * 60 * 1000); // 100 llamadas en 1 min

// Limpiar intentos antiguos cada 5 minutos
setInterval(() => {
  loginLimiter.cleanup();
  dataModificationLimiter.cleanup();
  apiCallLimiter.cleanup();
}, 5 * 60 * 1000);

export default RateLimiter;
