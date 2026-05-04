/**
 * 🔐 Hook de Seguridad de Sesión
 * Verifica autenticación, autorización y protege contra acceso no autorizado
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useRole from './useRole';
import useAuth from './useAuth';

/**
 * Hook que verifica acceso basado en roles
 * @param {string} requiredRole - 'super' | 'user' | 'any'
 * @returns {object} { hasAccess: boolean, loading: boolean, message: string }
 */
export const useSecureAccess = (requiredRole = 'any') => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperUser, loading: roleLoading } = useRole();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      // Verificar si está autenticado
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      // Verificar roles si es necesario
      if (requiredRole === 'super' && !isSuperUser) {
        navigate('/products', { replace: true });
        return;
      }
    }
  }, [authLoading, roleLoading, user, isSuperUser, requiredRole, navigate]);

  const hasAccess =
    !authLoading &&
    !roleLoading &&
    user &&
    (requiredRole === 'any' || (requiredRole === 'super' ? isSuperUser : true));

  return {
    hasAccess,
    loading: authLoading || roleLoading,
    message: !hasAccess ? 'Acceso denegado' : ''
  };
};

export default useSecureAccess;
