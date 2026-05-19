import { useState } from "react";
import { BsCloudUpload, BsXCircle, BsCheck } from "react-icons/bs";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAccountContext } from "../context/AccountContext";
import { useAuthContext } from "../context/AuthContext";
import { logAuditEvent } from "../utils/auditService";
import {
  parseCsvText,
  validateFile,
  looksLikeHeader,
  buildStagingDocs,
  summarizeImport,
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS_PER_IMPORT,
} from "../utils/importStagingService";
import "../css/importCsvCard.css";

/**
 * Carga un CSV y lo guarda en /importStaging para que el usuario lo revise
 * fila por fila desde StagingReviewCard.
 *
 * NO toca /products: cada fila se sube en staging con status='pending'.
 */
export default function ImportCsvCard() {
  const { accountId } = useAccountContext();
  const { user } = useAuthContext();

  const [open, setOpen]           = useState(false);
  const [file, setFile]           = useState(null);
  const [parsed, setParsed]       = useState(null);  // { rows, headerRow, summary }
  const [useHeader, setUseHeader] = useState(true);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState(null);
  const [info, setInfo]           = useState(null);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setUseHeader(true);
    setError(null);
    setInfo(null);
  };

  const handleFileChange = async (e) => {
    setError(null); setInfo(null); setParsed(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const validation = validateFile(f);
    if (!validation.ok) {
      setError(validation.reason);
      e.target.value = "";
      return;
    }
    setFile(f);
    setBusy(true);
    try {
      const text = await f.text();
      const result = parseCsvText(text);
      if (result.rows.length === 0) {
        setError("El archivo no tiene filas legibles.");
        return;
      }
      if (result.rows.length > MAX_ROWS_PER_IMPORT) {
        setError(`Demasiadas filas (${result.rows.length}). Máximo permitido: ${MAX_ROWS_PER_IMPORT}.`);
        return;
      }
      const autoHeader = looksLikeHeader(result.rows[0]);
      setUseHeader(autoHeader);
      const headerRow = autoHeader ? result.rows[0] : null;
      const dataRows  = autoHeader ? result.rows.slice(1) : result.rows;
      setParsed({
        rows: dataRows,
        headerRow,
        summary: summarizeImport(dataRows, headerRow),
        allRowsForToggle: result.rows,
      });
    } catch (err) {
      setError(err?.message || "No se pudo leer el archivo");
    } finally {
      setBusy(false);
    }
  };

  const toggleHeader = () => {
    if (!parsed?.allRowsForToggle) return;
    const next = !useHeader;
    setUseHeader(next);
    const headerRow = next ? parsed.allRowsForToggle[0] : null;
    const dataRows  = next ? parsed.allRowsForToggle.slice(1) : parsed.allRowsForToggle;
    setParsed({
      ...parsed,
      headerRow,
      rows: dataRows,
      summary: summarizeImport(dataRows, headerRow),
    });
  };

  const handleUpload = async () => {
    if (!parsed || !accountId) return;
    setError(null); setInfo(null);

    setBusy(true);
    try {
      const importId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const docs = buildStagingDocs({
        rows: parsed.rows,
        importId,
        accountId,
        fileName: file?.name || "import.csv",
        headerRow: parsed.headerRow,
      });

      // Firestore batch limit es 500 — partimos si es necesario
      const CHUNK_SIZE = 400;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((d) => {
          const ref = doc(collection(db, "importStaging"));
          batch.set(ref, { ...d, createdAt: serverTimestamp() });
        });
        await batch.commit();
      }

      await logAuditEvent("IMPORT_STAGED", "import", importId, {
        fileName: file?.name,
        rows: docs.length,
        actorUid: user?.uid,
      });

      setInfo(`✅ ${docs.length} filas guardadas en staging. Revísalas en la card "Revisar import".`);
      reset();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el staging");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`import-card ${open ? "open" : ""}`}>
      <div className="import-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="import-trigger-left">
          <BsCloudUpload size={26} className="import-icon" />
          <div>
            <h2>Importar CSV</h2>
            <p className="import-subtitle">
              {open ? "Haz clic para cerrar" : "Sube un CSV y revísalo fila por fila antes de añadirlo al catálogo"}
            </p>
          </div>
        </div>
        <span className={`import-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="import-panel">
          {!accountId && (
            <div className="import-error">
              <BsXCircle size={14} /> Necesitas tener una cuenta creada antes
              de importar. Crea una desde la card "Crea tu cuenta" arriba.
            </div>
          )}

          <p className="import-hint">
            Los datos del CSV se guardan en un área de staging. Tus productos
            actuales NO se tocan. Después decides qué filas importar.
            <br/>
            <small>Máximo {(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB · {MAX_ROWS_PER_IMPORT} filas · Solo .csv (separador ; o ,)</small>
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={busy}
            className="import-file-input"
          />

          {error && (
            <div className="import-error"><BsXCircle size={14} /> {error}</div>
          )}
          {info && <div className="import-info">{info}</div>}

          {parsed && (
            <div className="import-preview">
              <div className="import-preview-header">
                <span><b>{parsed.summary.totalRows}</b> filas · <b>{parsed.summary.columns}</b> columnas</span>
                <label className="import-header-toggle">
                  <input
                    type="checkbox"
                    checked={useHeader}
                    onChange={toggleHeader}
                    disabled={busy}
                  />
                  Primera fila es cabecera
                </label>
              </div>

              <div className="import-preview-table-wrap">
                <table className="import-preview-table">
                  {parsed.headerRow && (
                    <thead>
                      <tr>
                        <th>#</th>
                        {parsed.headerRow.map((h, i) => <th key={i}>{h || `(col ${i + 1})`}</th>)}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {parsed.summary.preview.map((row, idx) => (
                      <tr key={idx}>
                        <td className="import-row-num">{idx + 1}</td>
                        {row.map((cell, j) => (
                          <td key={j}>{String(cell || "").slice(0, 80)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.summary.totalRows > 5 && (
                  <p className="import-preview-note">
                    Mostrando 5 de {parsed.summary.totalRows} filas. Verás todas
                    en la card de revisión.
                  </p>
                )}
              </div>

              <div className="import-actions">
                <button type="button" className="import-btn ghost" onClick={reset} disabled={busy}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="import-btn primary"
                  onClick={handleUpload}
                  disabled={busy || !accountId}
                >
                  <BsCheck size={14} /> {busy ? "Subiendo..." : `Subir ${parsed.summary.totalRows} filas a staging`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
