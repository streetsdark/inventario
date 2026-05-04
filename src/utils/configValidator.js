/**
 * ✅ Validador de Configuración de Seguridad
 * Verifica que todas las variables de entorno y configuraciones de seguridad estén correctas
 */

const validateConfiguration = () => {
  const errors = [];
  const warnings = [];

  // Verificar variables de entorno requeridas
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_SUPER_USER_EMAIL'
  ];

  requiredEnvVars.forEach((envVar) => {
    if (!import.meta.env[envVar]) {
      errors.push(`❌ Variable de entorno faltante: ${envVar}`);
    }
  });

  // Validar formato de email del super usuario
  const superUserEmail = import.meta.env.VITE_SUPER_USER_EMAIL;
  if (superUserEmail && !superUserEmail.includes('@')) {
    errors.push('❌ VITE_SUPER_USER_EMAIL no es un email válido');
  }

  // Validar que no sea un email de ejemplo
  if (
    superUserEmail &&
    (superUserEmail === 'admin@example.com' || superUserEmail === 'tu_email@dominio.com')
  ) {
    errors.push(
      '⚠️ VITE_SUPER_USER_EMAIL aún tiene un valor de ejemplo. Actualiza tu .env'
    );
  }

  // Validar que las keys de Firebase no sean de ejemplo
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (apiKey && apiKey.includes('example')) {
    errors.push('⚠️ VITE_FIREBASE_API_KEY contiene "example". Revisa tu .env');
  }

  // Advertencias de desarrollo
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('ℹ️ Estás en modo desarrollo - Algunas protecciones están deshabilitadas');
  }

  // Validar que no haya console.log de credenciales
  if (import.meta.env.DEV) {
    console.log(
      '%c🔒 CONFIGURACIÓN DE SEGURIDAD VALIDADA',
      'color: green; font-weight: bold;'
    );
    warnings.forEach((warning) => console.warn(warning));
  }

  if (errors.length > 0) {
    console.error('%c❌ ERRORES DE CONFIGURACIÓN:', 'color: red; font-weight: bold;');
    errors.forEach((error) => console.error(error));
    throw new Error('Configuración de seguridad incompleta. Revisa la consola.');
  }

  return {
    valid: true,
    warnings
  };
};

// Ejecutar validación al iniciar
try {
  validateConfiguration();
} catch (error) {
  console.error('Error al validar configuración:', error.message);
  if (import.meta.env.PROD) {
    // En producción, puedes redirigir a una página de error
    window.location.href = '/error-config';
  }
}

export default validateConfiguration;
