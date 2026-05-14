import React from 'react';
import ProfileCard from '../components/ProfileCard';
import SecurityTestPanel from '../components/SecurityTestPanel';
import '../css/dashboard.css';

const SecurityTests = () => {
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
