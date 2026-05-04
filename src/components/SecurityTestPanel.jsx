import React, { useState } from 'react';
import runAllSecurityTests from '../utils/securityTests';
import '../css/securityTestPanel.css';

const SecurityTestPanel = () => {
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleRunTests = async () => {
    setIsLoading(true);
    try {
      const results = runAllSecurityTests();
      setTestResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error running tests:', error);
      setTestResults({
        success: false,
        error: error.message
      });
      setShowResults(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportResults = () => {
    if (testResults) {
      const dataStr = JSON.stringify(testResults, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-test-results-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
    }
  };

  return (
    <div className="security-test-panel">
      <div className="test-header">
        <h2>🔒 Panel de Pruebas de Seguridad</h2>
        <p>Ejecuta pruebas completas del sistema de seguridad</p>
      </div>

      <button
        className="test-button primary"
        onClick={handleRunTests}
        disabled={isLoading}
      >
        {isLoading ? '⏳ Ejecutando pruebas...' : '▶️ Ejecutar Pruebas Completas'}
      </button>

      {showResults && testResults && (
        <div className={`test-results ${testResults.success ? 'success' : 'failure'}`}>
          <div className="results-header">
            {testResults.success ? (
              <>
                <h3>✅ TODAS LAS PRUEBAS PASARON</h3>
                <p className="success-message">Tu sistema está protegido correctamente</p>
              </>
            ) : (
              <>
                <h3>❌ ALGUNAS PRUEBAS FALLARON</h3>
                <p className="error-message">Revisa los detalles abajo</p>
              </>
            )}
          </div>

          {testResults.summary && (
            <div className="test-summary">
              <div className="summary-item">
                <span className="label">Pruebas Pasadas:</span>
                <span className="value passed">{testResults.summary.passed}</span>
              </div>
              <div className="summary-item">
                <span className="label">Pruebas Fallidas:</span>
                <span className="value failed">{testResults.summary.failed}</span>
              </div>
              <div className="summary-item">
                <span className="label">Total:</span>
                <span className="value total">{testResults.summary.total}</span>
              </div>
              <div className="summary-item">
                <span className="label">Tasa de Éxito:</span>
                <span className="value success-rate">{testResults.summary.successRate}%</span>
              </div>
            </div>
          )}

          {testResults.allTests && (
            <div className="test-details">
              <h4>Detalles de Pruebas:</h4>
              <div className="test-list">
                {testResults.allTests.map((test, index) => (
                  <div key={index} className={`test-item ${test.passed ? 'passed' : 'failed'}`}>
                    <span className="test-status">
                      {test.passed ? '✅' : '❌'}
                    </span>
                    <div className="test-info">
                      <strong>{test.name}</strong>
                      <p>{test.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResults.error && (
            <div className="test-error">
              <h4>❌ Error:</h4>
              <p>{testResults.error}</p>
            </div>
          )}

          <div className="test-actions">
            <button className="test-button secondary" onClick={handleExportResults}>
              📥 Descargar Resultados
            </button>
            <button className="test-button secondary" onClick={() => setShowResults(false)}>
              ✕ Cerrar Resultados
            </button>
          </div>
        </div>
      )}

      <div className="test-info-box">
        <h4>ℹ️ Información</h4>
        <ul>
          <li>🔐 Prueba Rate Limiting</li>
          <li>🛡️ Prueba Validación de Inputs</li>
          <li>📦 Prueba Validación de Productos</li>
          <li>📋 Prueba Logging de Seguridad</li>
          <li>🔑 Prueba Variables de Entorno</li>
          <li>📁 Verifica .gitignore</li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityTestPanel;
