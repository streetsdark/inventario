/**
 * 📊 Sistema de Logging de Seguridad
 * Registra acciones sospechosas para auditoría
 */

class SecurityLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Máximo de logs en memoria
  }

  /**
   * Registra un evento de seguridad
   * @param {string} eventType - Tipo de evento
   * @param {string} user - Usuario involucrado
   * @param {string} action - Acción realizada
   * @param {string} severity - 'info' | 'warning' | 'error' | 'critical'
   * @param {object} metadata - Datos adicionales
   */
  log(eventType, user, action, severity = 'info', metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      user,
      action,
      severity,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logs.push(logEntry);

    // Limitar tamaño de logs en memoria
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log en consola si es crítico
    if (severity === 'critical' || severity === 'error') {
      console.error(`[SECURITY] ${eventType}:`, logEntry);
    } else if (severity === 'warning') {
      console.warn(`[SECURITY] ${eventType}:`, logEntry);
    }

    // Aquí podrías enviar logs a un servidor en producción
    if (severity === 'critical') {
      this.sendToServer(logEntry);
    }
  }

  /**
   * Registra intento de acceso no autorizado
   */
  logUnauthorizedAccess(user, attemptedResource) {
    this.log(
      'UNAUTHORIZED_ACCESS',
      user,
      `Intento de acceso no autorizado a ${attemptedResource}`,
      'warning',
      { attemptedResource }
    );
  }

  /**
   * Registra fallo de autenticación
   */
  logAuthenticationFailure(email, reason) {
    this.log(
      'AUTH_FAILURE',
      email,
      `Falló el intento de autenticación: ${reason}`,
      'warning',
      { email, reason }
    );
  }

  /**
   * Registra cambios en datos críticos
   */
  logDataModification(user, dataType, action, details) {
    this.log(
      'DATA_MODIFICATION',
      user,
      `${action} en ${dataType}`,
      'info',
      { dataType, action, details }
    );
  }

  /**
   * Registra intento de rate limit
   */
  logRateLimitHit(identifier, action) {
    this.log(
      'RATE_LIMIT_EXCEEDED',
      identifier,
      `Rate limit excedido en ${action}`,
      'warning',
      { action }
    );
  }

  /**
   * Registra anomalía detectada
   */
  logAnomaly(user, anomalyType, description) {
    this.log(
      'ANOMALY_DETECTED',
      user,
      description,
      'critical',
      { anomalyType }
    );
  }

  /**
   * Obtiene todos los logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Obtiene logs filtrados
   */
  getLogsByType(eventType) {
    return this.logs.filter(log => log.eventType === eventType);
  }

  /**
   * Obtiene logs por usuario
   */
  getLogsByUser(user) {
    return this.logs.filter(log => log.user === user);
  }

  /**
   * Obtiene logs críticos recientes
   */
  getCriticalLogs(minutes = 30) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    return this.logs.filter(
      log => log.severity === 'critical' && log.timestamp > cutoff
    );
  }

  /**
   * Exporta logs para análisis
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Limpia logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Envía logs críticos al servidor (implementar en producción)
   */
  sendToServer(logEntry) {
    // En producción, aquí enviarías a tu backend
    // fetch('/api/security-logs', { method: 'POST', body: JSON.stringify(logEntry) })
    if (process.env.NODE_ENV === 'production') {
      console.log('[DEBUG] En producción, esto se enviaría al servidor:', logEntry);
    }
  }
}

// Instancia global de SecurityLogger
export const securityLogger = new SecurityLogger();

export default SecurityLogger;
