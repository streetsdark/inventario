import { useState, useEffect, useMemo } from "react";
import { BsGrid, BsDownload, BsXCircle } from "react-icons/bs";
import useProducts from "../hooks/useProducts";
import { logAuditEvent } from "../utils/auditService";
import {
  generateQrDataUrl,
  downloadQrPng,
  generateLabelsPdf,
  sanitizeQrPayload,
} from "../utils/qrService";
import "../css/qrLabelsCard.css";

export default function QrLabelsCard() {
  const { products, loading } = useProducts();
  const [open, setOpen]         = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch]     = useState("");
  const [preview, setPreview]   = useState(null);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [info, setInfo]         = useState(null);
  const [layout, setLayout]     = useState("4x6"); // 4×6 = 24 por A4

  // Filtra por nombre o SKU. Tope de longitud para evitar regex catastróficos.
  const filteredProducts = useMemo(() => {
    const term = search.trim().slice(0, 80).toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const sku  = String(p?.sku || "").toLowerCase();
      const desc = String(p?.description || "").toLowerCase();
      return sku.includes(term) || desc.includes(term);
    });
  }, [products, search]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId],
  );

  // Si el producto seleccionado se filtra fuera, deselecciona.
  useEffect(() => {
    if (!selectedId) return;
    if (!filteredProducts.some((p) => p.id === selectedId)) setSelectedId("");
  }, [filteredProducts, selectedId]);

  // Genera el preview al cambiar producto seleccionado
  useEffect(() => {
    let cancelled = false;
    if (!selectedProduct) { setPreview(null); return; }
    const sku = sanitizeQrPayload(selectedProduct.sku);
    if (!sku) { setPreview(null); setError("Este producto tiene un SKU inválido para QR."); return; }
    setError(null);
    generateQrDataUrl(sku, { width: 280 })
      .then((url) => { if (!cancelled) setPreview(url); })
      .catch(() => { if (!cancelled) setError("No se pudo generar el QR."); });
    return () => { cancelled = true; };
  }, [selectedProduct]);

  const handleDownloadPng = async () => {
    if (!selectedProduct) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await downloadQrPng(selectedProduct.sku, `qr_${selectedProduct.sku}`);
      logAuditEvent("QR_DOWNLOADED", "qr", selectedProduct.id, { sku: selectedProduct.sku });
      setInfo("PNG descargado.");
    } catch (err) {
      setError(err?.message || "No se pudo descargar el QR");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkPdf = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const [cols, rows] = layout.split("x").map(Number);
      const { count, skipped } = await generateLabelsPdf(products, { cols, rows });
      logAuditEvent("QR_BULK_PRINTED", "qr", "all", { count, skipped, layout });
      setInfo(`PDF generado con ${count} etiquetas${skipped ? ` (${skipped} omitidas por SKU inválido)` : ""}.`);
    } catch (err) {
      setError(err?.message || "No se pudo generar el PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`qr-card ${open ? "open" : ""}`}>
      <div className="qr-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="qr-trigger-left">
          <BsGrid size={26} className="qr-icon" />
          <div>
            <h2>Generar etiquetas QR</h2>
            <p className="qr-subtitle">
              {loading ? "Cargando..." : open ? "Haz clic para cerrar" : "QR individual por producto o PDF masivo para imprimir"}
            </p>
          </div>
        </div>
        <span className={`qr-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="qr-panel">
          {/* Modo 1: individual */}
          <div className="qr-section">
            <h3 className="qr-section-title">QR individual</h3>
            <p className="qr-section-hint">Busca por nombre o código, elige un producto y descarga el PNG.</p>

            <input
              type="text"
              className="qr-search"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={80}
              disabled={loading || busy}
            />

            <select
              className="qr-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loading || busy || filteredProducts.length === 0}
              size={search.trim() ? Math.min(6, Math.max(2, filteredProducts.length + 1)) : 1}
            >
              <option value="">
                {filteredProducts.length === 0
                  ? "— Sin resultados —"
                  : `— Selecciona un producto (${filteredProducts.length}) —`}
              </option>
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku ? `${p.sku} · ` : ""}{p.description || "(sin nombre)"}
                </option>
              ))}
            </select>

            {selectedProduct && preview && (
              <div className="qr-preview">
                <img src={preview} alt={`QR ${selectedProduct.sku}`} className="qr-preview-img" />
                <div className="qr-preview-info">
                  <p className="qr-preview-sku">{selectedProduct.sku}</p>
                  <p className="qr-preview-name">{selectedProduct.description}</p>
                  <button type="button" className="qr-btn primary" onClick={handleDownloadPng} disabled={busy}>
                    <BsDownload size={14} /> Descargar PNG
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modo 2: bulk */}
          <div className="qr-section">
            <h3 className="qr-section-title">Imprimir etiquetas en hoja A4</h3>
            <p className="qr-section-hint">
              Genera un PDF con todos los productos visibles ({products.length}) listos para imprimir y recortar.
            </p>

            <div className="qr-bulk-row">
              <label className="qr-label">
                Diseño:&nbsp;
                <select
                  className="qr-select compact"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  disabled={busy}
                >
                  <option value="3x4">3 × 4 (12 por hoja, etiquetas grandes)</option>
                  <option value="4x6">4 × 6 (24 por hoja, recomendado)</option>
                  <option value="5x8">5 × 8 (40 por hoja, etiquetas pequeñas)</option>
                </select>
              </label>
              <button
                type="button"
                className="qr-btn primary"
                disabled={loading || busy || products.length === 0}
                onClick={handleBulkPdf}
              >
                <BsDownload size={14} /> Generar PDF
              </button>
            </div>
          </div>

          {error && (
            <div className="qr-error">
              <BsXCircle size={14} /> {error}
            </div>
          )}
          {info && <div className="qr-info">{info}</div>}
        </div>
      )}
    </div>
  );
}
