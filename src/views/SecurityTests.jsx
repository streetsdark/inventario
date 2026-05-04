import React from 'react';
import useRole from '../hooks/useRole';
import ProfileCard from '../components/ProfileCard';
import SecurityTestPanel from '../components/SecurityTestPanel';
import useSecureAccess from '../hooks/useSecureAccess';
import '../css/dashboard.css';

const SecurityTests = () => {
  const { isSuperUser } = useRole();
  const { hasAccess, loading } = useSecureAccess('any');

  if (loading) {
    return <div className="content"><p>Cargando...</p></div>;
  }

  if (!hasAccess) {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '40px', color: '#FF6B6B' }}>
          <h2>⛔ Acceso Restringido</h2>
          <p>Debes estar autenticado para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (!isSuperUser) {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '40px', color: '#FF6B6B' }}>
          <h2>⛔ Solo Administrador</h2>
          <p>Las pruebas de seguridad solo están disponibles para el administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <ProfileCard />
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem' }}>🧪 Pruebas de Seguridad</h1>
        <p style={{ opacity: 0.6 }}>
          Ejecuta pruebas completas del sistema de seguridad
        </p>
      </div>
      <SecurityTestPanel />
    </div>
  );
};

export default SecurityTests;
