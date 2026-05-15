import { useState } from "react";
import { BsDownload, BsFileEarmarkSpreadsheet, BsFileEarmarkText } from "react-icons/bs";
import useMoves from "../hooks/useMoves";
import useProducts from "../hooks/useProducts";
import { logAuditEvent } from "../utils/auditService";
import {
  exportMovementsToCSV,
  exportMovementsToPDF,
  exportStockToCSV,
  exportStockToPDF,
} from "../utils/exportService";
import "../css/exportCard.css";

export default function ExportCard() {
  const { moves, loading: loadingMoves }     = useMoves();
  const { products, loading: loadingProducts } = useProducts();
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(null);
  const [error, setError] = useState(null);

  const loading = loadingMoves || loadingProducts;

  const run = async (key, fn, auditKind) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      const { rows } = fn();
      logAuditEvent("DATA_EXPORTED", "export", auditKind, { rows, format: key });
    } catch (err) {
      setError(err?.message || "No se pudo exportar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`export-card ${open ? "open" : ""}`}>
      <div className="export-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="export-trigger-left">
          <BsDownload size={26} className="export-icon" />
          <div>
            <h2>Exportar datos</h2>
            <p className="export-subtitle">
              {loading
                ? "Cargando..."
                : open
                ? "Haz clic para cerrar"
                : "Descarga movimientos y stock en CSV o PDF"}
            </p>
          </div>
        </div>
        <span className={`export-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="export-panel">
          <div className="export-group">
            <h3 className="export-group-title">Histórico de movimientos</h3>
            <p className="export-group-hint">{moves.length} registros disponibles</p>
            <div className="export-actions">
              <button
                type="button"
                className="export-btn csv"
                disabled={loading || moves.length === 0 || busy !== null}
                onClick={() => run("csv-moves", () => exportMovementsToCSV(moves), "movements")}
              >
                <BsFileEarmarkSpreadsheet size={18} /> CSV
              </button>
              <button
                type="button"
                className="export-btn pdf"
                disabled={loading || moves.length === 0 || busy !== null}
                onClick={() => run("pdf-moves", () => exportMovementsToPDF(moves), "movements")}
              >
                <BsFileEarmarkText size={18} /> PDF
              </button>
            </div>
          </div>

          <div className="export-group">
            <h3 className="export-group-title">Stock actual</h3>
            <p className="export-group-hint">{products.length} productos en inventario</p>
            <div className="export-actions">
              <button
                type="button"
                className="export-btn csv"
                disabled={loading || products.length === 0 || busy !== null}
                onClick={() => run("csv-stock", () => exportStockToCSV(products), "stock")}
              >
                <BsFileEarmarkSpreadsheet size={18} /> CSV
              </button>
              <button
                type="button"
                className="export-btn pdf"
                disabled={loading || products.length === 0 || busy !== null}
                onClick={() => run("pdf-stock", () => exportStockToPDF(products), "stock")}
              >
                <BsFileEarmarkText size={18} /> PDF
              </button>
            </div>
          </div>

          {error && <div className="export-error">{error}</div>}
        </div>
      )}
    </div>
  );
}
