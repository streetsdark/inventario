import { useState } from "react";
import { BsArrowRepeat, BsXCircle, BsCheck, BsExclamationTriangle, BsSearch } from "react-icons/bs";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAccountContext } from "../context/AccountContext";
import { logAuditEvent } from "../utils/auditService";
import {
  MIGRATION_COLLECTIONS,
  findLegacyIds,
  chunkForBatch,
  validateMigration,
  buildMigrationPatch,
  summarizeAnalysis,
} from "../utils/legacyMigrationService";
import "../css/legacyMigrationCard.css";

export default function LegacyMigrationCard() {
  const { account, accountId } = useAccountContext();

  const [open, setOpen]               = useState(false);
  const [analysis, setAnalysis]       = useState(null); // { detail, total } o null
  const [busy, setBusy]               = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [error, setError]             = useState(null);
  const [info, setInfo]               = useState(null);

  if (!accountId || !account) return null;

  const handleAnalyze = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result = {};
      for (const col of MIGRATION_COLLECTIONS) {
        const snap = await getDocs(collection(db, col));
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        result[col] = findLegacyIds(docs);
      }
      const summary = summarizeAnalysis(result);
      setAnalysis({ ...summary, ids: result });
      if (summary.total === 0) {
        setInfo("✅ Todos tus documentos ya tienen accountId. Nada que migrar.");
      }
    } catch (err) {
      setError(err?.message || "No se pudo analizar");
    } finally {
      setBusy(false);
    }
  };

  const handleMigrate = async () => {
    setError(null);
    setInfo(null);
    if (!analysis) return;

    const validation = validateMigration({
      accountId,
      totalLegacy: analysis.total,
    });
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }

    setBusy(true);
    try {
      const patch = buildMigrationPatch(accountId);
      const perCollection = {};

      for (const col of MIGRATION_COLLECTIONS) {
        const ids = analysis.ids[col] || [];
        if (ids.length === 0) { perCollection[col] = 0; continue; }
        const chunks = chunkForBatch(ids);
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((id) => batch.update(doc(db, col, id), patch));
          await batch.commit();
        }
        perCollection[col] = ids.length;
      }

      await logAuditEvent("LEGACY_DATA_MIGRATED", "account", accountId, {
        total: analysis.total,
        perCollection,
      });

      setInfo(`✅ ${analysis.total} documentos migrados a "${account.name}".`);
      setAnalysis(null);
      setConfirming(false);
    } catch (err) {
      setError(err?.message || "No se pudo completar la migración");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`legacy-card ${open ? "open" : ""}`}>
      <div className="legacy-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="legacy-trigger-left">
          <BsArrowRepeat size={26} className="legacy-icon" />
          <div>
            <h2>Migrar datos legacy</h2>
            <p className="legacy-subtitle">
              {open ? "Haz clic para cerrar" : "Asigna esta cuenta a productos/movimientos creados antes del modelo multi-tenant"}
            </p>
          </div>
        </div>
        <span className={`legacy-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="legacy-panel">
          <p className="legacy-explain">
            Esta herramienta busca documentos sin <code>accountId</code> en
            todas las colecciones y los asigna a tu cuenta actual
            (<b>{account.name}</b>). Es seguro ejecutarla varias veces:
            si todo está migrado, no hace nada.
          </p>

          <div className="legacy-actions">
            <button
              type="button"
              className="legacy-btn"
              onClick={handleAnalyze}
              disabled={busy}
            >
              <BsSearch size={14} /> Analizar
            </button>

            {analysis && analysis.total > 0 && (
              <button
                type="button"
                className="legacy-btn primary"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                <BsCheck size={14} /> Migrar {analysis.total} a "{account.name}"
              </button>
            )}
          </div>

          {analysis && analysis.total > 0 && (
            <div className="legacy-analysis">
              <div className="legacy-analysis-header">
                <BsExclamationTriangle size={14} />
                <span><b>{analysis.total}</b> documentos legacy encontrados:</span>
              </div>
              <ul className="legacy-analysis-list">
                {MIGRATION_COLLECTIONS.map((col) => (
                  <li key={col}>
                    <span className="legacy-col-name">{col}</span>
                    <span className="legacy-col-count">{analysis.detail[col]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="legacy-error">
              <BsXCircle size={14} /> {error}
            </div>
          )}
          {info && <div className="legacy-info">{info}</div>}

          {confirming && (
            <div className="legacy-confirm-overlay" onClick={() => !busy && setConfirming(false)}>
              <div className="legacy-confirm-box" onClick={(e) => e.stopPropagation()}>
                <h3>¿Migrar {analysis?.total} documentos a "{account.name}"?</h3>
                <p>
                  Se les añadirá <code>accountId</code> en bloque. Los datos
                  pasarán a estar aislados a esta cuenta y no serán visibles
                  para usuarios de otras cuentas tras endurecer las reglas
                  Firestore (Fase 4).
                </p>
                <p>
                  No es reversible automáticamente. Asegúrate de querer
                  asignar todos estos documentos a esta cuenta.
                </p>
                <div className="legacy-confirm-actions">
                  <button type="button" className="legacy-btn" onClick={() => setConfirming(false)} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="button" className="legacy-btn primary" onClick={handleMigrate} disabled={busy}>
                    {busy ? "Migrando..." : "Sí, migrar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
