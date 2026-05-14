import React, { useState } from 'react';
import runAllSecurityTests from '../utils/securityTests';
import runAdvancedTests    from '../utils/advancedTests';
import '../css/securityTestPanel.css';

// ── Category color map ──────────────────────────────────────
const CATEGORY_META = {
  'XSS Prevention':      { color: '#e74c3c', icon: '🛡️' },
  'Prototype Pollution': { color: '#9b59b6', icon: '☠️' },
  'Boundary Values':     { color: '#e67e22', icon: '📏' },
  'Business Logic':      { color: '#2980b9', icon: '⚙️' },
  'Auth & Config':       { color: '#27ae60', icon: '🔑' },
  'Error Handling':      { color: '#16a085', icon: '🧯' },
  'ReDoS Resistance':    { color: '#8e44ad', icon: '⏱️' },
  'Data Integrity':      { color: '#d35400', icon: '🗄️' },
  'Browser Security':    { color: '#2c3e50', icon: '🌐' },
};

// ── Progress bar ────────────────────────────────────────────
function ProgressBar({ passed, total }) {
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const color = pct === 100 ? '#2ed573' : pct >= 75 ? '#f9ca24' : '#ff6b6b';
  return (
    <div style={{ margin: '0.75rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
        <span>{passed} / {total} pruebas pasadas</span>
        <span style={{ color, fontWeight: 800 }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--background-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── Category block (collapsible) ────────────────────────────
function CategoryBlock({ name, tests = [], passed, failed, error }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[name] || { color: 'var(--contrast)', icon: '🔬' };
  const allPass = failed === 0 && !error;

  return (
    <div style={{
      border: `1px solid ${allPass ? 'rgba(46,213,115,0.3)' : 'rgba(255,107,107,0.3)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: '0.5rem',
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: allPass ? 'rgba(46,213,115,0.06)' : 'rgba(255,107,107,0.06)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
        <span style={{ flex: 1, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{name}</span>
        {error && <span style={{ fontSize: '0.75rem', color: '#ff6b6b' }}>Error en suite</span>}
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2ed573' }}>{passed}✓</span>
        {failed > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff6b6b' }}>{failed}✗</span>}
        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </div>

      {/* Test list */}
      {open && (
        <div style={{ padding: '0.5rem 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {error && (
            <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8, fontSize: '0.8rem', color: '#ff6b6b' }}>
              ❌ Error al ejecutar suite: {error}
            </div>
          )}
          {tests.map((t, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              borderLeft: `3px solid ${t.passed ? '#2ed573' : '#ff6b6b'}`,
              background: 'var(--background-tertiary)',
              fontSize: '0.82rem',
            }}>
              <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>{t.passed ? '✅' : '❌'}</span>
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t.name}</strong>
                <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{t.message}</div>
                {t.detail && (
                  <div style={{ marginTop: '0.2rem', fontFamily: 'monospace', fontSize: '0.73rem', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                    payload: {t.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Summary KPI row ─────────────────────────────────────────
function SummaryKPIs({ summary, elapsed, label, color }) {
  return (
    <div style={{ background: 'var(--background-tertiary)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: '0.6rem' }}>{label}</div>
      <ProgressBar passed={summary.passed} total={summary.total} />
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {[
          { lbl: 'Pasadas',  val: summary.passed,      col: '#2ed573' },
          { lbl: 'Fallidas', val: summary.failed,      col: '#ff6b6b' },
          { lbl: 'Total',    val: summary.total,       col: 'var(--contrast)' },
          { lbl: 'Éxito',    val: `${summary.successRate}%`, col: '#4ecdc4' },
          ...(elapsed ? [{ lbl: 'Tiempo', val: `${elapsed}ms`, col: 'var(--text-secondary)' }] : []),
        ].map(({ lbl, val, col }) => (
          <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 60 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: col, lineHeight: 1 }}>{val}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.2rem' }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────
const SecurityTestPanel = () => {
  const [baseResults,     setBaseResults]     = useState(null);
  const [advancedResults, setAdvancedResults] = useState(null);
  const [loading,         setLoading]         = useState(null); // 'base'|'advanced'|'all'
  const [activeTab,       setActiveTab]       = useState('all'); // 'base'|'advanced'|'all'

  const run = async (mode) => {
    setLoading(mode);
    // Micro-delay para que React muestre el estado de carga
    await new Promise(r => setTimeout(r, 60));
    try {
      if (mode === 'base' || mode === 'all') {
        const r = runAllSecurityTests();
        setBaseResults(r);
      }
      if (mode === 'advanced' || mode === 'all') {
        const r = runAdvancedTests();
        setAdvancedResults(r);
      }
      setActiveTab(mode === 'all' ? 'all' : mode);
    } catch (err) {
      console.error('Error running tests:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleExport = () => {
    const data = { base: baseResults, advanced: advancedResults, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `security-tests-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build combined summary
  const combinedSummary = (baseResults || advancedResults) ? {
    passed:      (baseResults?.summary?.passed || 0) + (advancedResults?.summary?.passed || 0),
    failed:      (baseResults?.summary?.failed || 0) + (advancedResults?.summary?.failed || 0),
    total:       (baseResults?.summary?.total  || 0) + (advancedResults?.summary?.total  || 0),
    successRate: (() => {
      const p = (baseResults?.summary?.passed || 0) + (advancedResults?.summary?.passed || 0);
      const t = (baseResults?.summary?.total  || 0) + (advancedResults?.summary?.total  || 0);
      return t > 0 ? ((p / t) * 100).toFixed(1) : '0';
    })(),
  } : null;

  // Base categories (group by name from allTests)
  const baseCategories = baseResults?.allTests
    ? [{ name: 'Suite Base', tests: baseResults.allTests.map(t => ({ ...t, category: 'Suite Base' })), passed: baseResults.summary.passed, failed: baseResults.summary.failed }]
    : [];

  return (
    <div className="security-test-panel">

      {/* ── Header ── */}
      <div className="test-header">
        <h2>🔒 Panel de Pruebas de Seguridad</h2>
        <p>Suite base + suite avanzada — XSS, Prototype Pollution, ReDoS, Boundary Values, Business Logic, Error Handling y más.</p>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          className="test-button primary"
          style={{ flex: 2, minWidth: 180, margin: 0 }}
          onClick={() => run('all')}
          disabled={!!loading}
        >
          {loading === 'all' ? '⏳ Ejecutando todo...' : '▶ Ejecutar Todo'}
        </button>
        <button
          className="test-button secondary"
          style={{ flex: 1, minWidth: 130 }}
          onClick={() => run('base')}
          disabled={!!loading}
        >
          {loading === 'base' ? '⏳...' : '🔐 Suite Base'}
        </button>
        <button
          className="test-button secondary"
          style={{ flex: 1, minWidth: 130 }}
          onClick={() => run('advanced')}
          disabled={!!loading}
        >
          {loading === 'advanced' ? '⏳...' : '🔬 Suite Avanzada'}
        </button>
      </div>

      {/* ── Results ── */}
      {combinedSummary && (
        <div style={{ animation: 'slideIn 0.3s ease' }}>

          {/* Global summary */}
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: 14,
            marginBottom: '1rem',
            background: combinedSummary.failed === 0 ? 'rgba(46,213,115,0.08)' : 'rgba(255,107,107,0.08)',
            border: `2px solid ${combinedSummary.failed === 0 ? 'rgba(46,213,115,0.4)' : 'rgba(255,107,107,0.4)'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: combinedSummary.failed === 0 ? '#2ed573' : '#ff6b6b' }}>
              {combinedSummary.failed === 0 ? '✅ TODAS LAS PRUEBAS PASARON' : `❌ ${combinedSummary.failed} PRUEBA(S) FALLARON`}
            </div>
            <ProgressBar passed={combinedSummary.passed} total={combinedSummary.total} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              <span style={{ color: '#2ed573', fontWeight: 800 }}>{combinedSummary.passed} ✓ pasadas</span>
              <span style={{ color: '#ff6b6b', fontWeight: 800 }}>{combinedSummary.failed} ✗ fallidas</span>
              <span style={{ color: 'var(--text-secondary)' }}>{combinedSummary.total} total</span>
              <span style={{ color: '#4ecdc4', fontWeight: 800 }}>{combinedSummary.successRate}% éxito</span>
            </div>
          </div>

          {/* Tabs */}
          {baseResults && advancedResults && (
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {[
                { key: 'all',      label: 'Todo' },
                { key: 'base',     label: '🔐 Suite Base' },
                { key: 'advanced', label: '🔬 Suite Avanzada' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`test-button ${activeTab === key ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, margin: 0, padding: '0.5rem', fontSize: '0.82rem' }}
                  onClick={() => setActiveTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Base results */}
          {(activeTab === 'all' || activeTab === 'base') && baseResults && (
            <div>
              <SummaryKPIs
                summary={baseResults.summary}
                label="Suite Base"
                color="var(--contrast)"
              />
              {baseCategories.map((cat, i) => (
                <CategoryBlock key={i} {...cat} />
              ))}
            </div>
          )}

          {/* Advanced results */}
          {(activeTab === 'all' || activeTab === 'advanced') && advancedResults && (
            <div style={{ marginTop: activeTab === 'all' && baseResults ? '1rem' : 0 }}>
              <SummaryKPIs
                summary={advancedResults.summary}
                elapsed={advancedResults.elapsed}
                label="Suite Avanzada"
                color="#9b59b6"
              />
              {advancedResults.categories.map((cat, i) => (
                <CategoryBlock key={i} {...cat} />
              ))}
            </div>
          )}

          {/* Export */}
          <div className="test-actions" style={{ marginTop: '1rem' }}>
            <button className="test-button secondary" onClick={handleExport}>
              📥 Exportar JSON completo
            </button>
            <button className="test-button secondary" onClick={() => { setBaseResults(null); setAdvancedResults(null); }}>
              ✕ Limpiar resultados
            </button>
          </div>
        </div>
      )}

      {/* ── Info box ── */}
      {!combinedSummary && (
        <div className="test-info-box">
          <h4>🔬 Cobertura de pruebas</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.5rem' }}>
            {[
              '🛡️ XSS Prevention (15 vectores)',
              '☠️ Prototype Pollution',
              '📏 Boundary Values',
              '⚙️ Business Logic',
              '🔑 Auth & Config',
              '🧯 Error Handling (null/NaN/Infinity)',
              '⏱️ ReDoS Resistance',
              '🗄️ Data Integrity',
              '🌐 Browser Security',
              '🔐 Rate Limiting',
              '🛡️ Input Validation',
              '📦 Product Validation',
              '📋 Security Logging',
              '🔑 Variables de entorno',
              '📁 Gitignore check',
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.2rem 0' }}>{item}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityTestPanel;
