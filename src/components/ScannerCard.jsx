import { useState, useRef, useEffect } from "react";
import {
  BsCamera, BsXCircle, BsCameraVideo, BsStopFill, BsImages,
  BsBoxArrowInDown, BsBoxArrowUp, BsClock, BsCheck,
} from "react-icons/bs";
import useProducts from "../hooks/useProducts";
import useMoves from "../hooks/useMoves";
import usePendingStock from "../hooks/usePendingStock";
import { useAuthContext } from "../context/AuthContext";
import { logAuditEvent } from "../utils/auditService";
import { isValidQuantity, isValidDate } from "../utils/securityValidation";
import {
  sanitizeScannedCode,
  findProductByCode,
  shouldAcceptScan,
} from "../utils/scanService";
import "../css/scannerCard.css";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const READER_ID = "qr-reader-region";

export default function ScannerCard() {
  const { products, loading } = useProducts();
  const { createMove }        = useMoves();
  const { submitPending }     = usePendingStock();
  const { user }              = useAuthContext();

  const [open, setOpen]           = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [error, setError]         = useState(null);
  const [lastCode, setLastCode]   = useState(null);
  const [matched, setMatched]     = useState(null);
  const [notFound, setNotFound]   = useState(null);

  // Acción inline tras escanear (entrada / salida / pendiente)
  const [actionMode, setActionMode]       = useState(null); // null | "in" | "out" | "pending"
  const [qty, setQty]                     = useState("");
  const [moveDate, setMoveDate]           = useState(todayStr());
  const [recipientUser, setRecipientUser] = useState("");
  const [outputStatus, setOutputStatus]   = useState("entregado");
  const [requestNote, setRequestNote]     = useState("");
  const [actionBusy, setActionBusy]       = useState(false);
  const [actionInfo, setActionInfo]       = useState(null);

  const scannerRef     = useRef(null);
  const lastScanTsRef  = useRef(0);
  const productsRef    = useRef(products);

  // Mantener referencia fresca de productos para el callback del scanner
  useEffect(() => { productsRef.current = products; }, [products]);

  // Cerrar el scanner al desmontar
  useEffect(() => () => stopScanner(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function startScanner() {
    setError(null);
    setMatched(null);
    setNotFound(null);
    try {
      // Import dinámico → no bloquea el bundle inicial
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode(READER_ID, /* verbose */ false);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onDecoded,
        () => { /* no-op: errores frame-a-frame */ },
      );
      setScanning(true);
    } catch (err) {
      setError(err?.message || "No se pudo iniciar la cámara");
      setScanning(false);
    }
  }

  async function stopScanner() {
    const instance = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!instance) return;
    try {
      if (instance.isScanning) await instance.stop();
      await instance.clear();
    } catch {
      // silencioso: limpieza best-effort
    }
  }

  function onDecoded(decodedText) {
    const now = Date.now();
    if (!shouldAcceptScan(lastScanTsRef.current, now)) return;
    const code = sanitizeScannedCode(decodedText);
    if (!code) {
      setError("Código no válido o con caracteres no permitidos.");
      return;
    }
    lastScanTsRef.current = now;
    setError(null);
    setLastCode(code);

    const product = findProductByCode(productsRef.current, code);
    if (product) {
      setMatched(product);
      setNotFound(null);
      logAuditEvent("PRODUCT_SCANNED", "scan", product.id || code, {
        sku: product.sku,
        match: "exact-or-prefix",
      });
    } else {
      setMatched(null);
      setNotFound(code);
      logAuditEvent("PRODUCT_SCANNED", "scan", code, { match: "not-found" });
    }
  }

  function clearResult() {
    setMatched(null);
    setNotFound(null);
    setLastCode(null);
    setError(null);
    resetAction();
  }

  function resetAction() {
    setActionMode(null);
    setQty("");
    setMoveDate(todayStr());
    setRecipientUser("");
    setOutputStatus("entregado");
    setRequestNote("");
    setActionInfo(null);
  }

  function openAction(mode) {
    if (!matched) return;
    setActionMode(mode);
    setActionInfo(null);
    setError(null);
    setQty("");
  }

  async function submitAction(e) {
    e.preventDefault();
    if (!matched) return;
    setError(null);
    setActionInfo(null);

    const quantity = Number(qty);
    if (!isValidQuantity(quantity)) {
      setError("Cantidad inválida (entero positivo).");
      return;
    }

    if (actionMode !== "pending") {
      if (!moveDate || !isValidDate(moveDate)) {
        setError("Fecha inválida.");
        return;
      }
      if (actionMode === "out" && recipientUser.trim().length === 0) {
        setError("Indica el usuario destinatario.");
        return;
      }
    }

    setActionBusy(true);
    try {
      if (actionMode === "in" || actionMode === "out") {
        await createMove({
          product: matched,
          quantity,
          typeIn: actionMode === "in",
          moveDate,
          recipientUser: actionMode === "out" ? recipientUser.slice(0, 80) : "",
          outputStatus: actionMode === "out" ? outputStatus : "",
          returnMoveId: null,
        });
        logAuditEvent("SCAN_ACTION", "scan", matched.id, {
          action: actionMode === "in" ? "entry" : "exit",
          quantity,
        });
        setActionInfo(actionMode === "in"
          ? `Entrada registrada: +${quantity} ${matched.product_Unit || "u."}`
          : `Salida registrada: -${quantity} ${matched.product_Unit || "u."}`);
      } else if (actionMode === "pending") {
        const currentUser = user?.displayName || user?.email || "Usuario";
        const { title, message } = await submitPending(matched, quantity, requestNote.slice(0, 200), currentUser);
        logAuditEvent("SCAN_ACTION", "scan", matched.id, {
          action: "pending",
          quantity,
        });
        setActionInfo(`${title}: ${message}`);
      }
      setActionMode(null);
      setQty("");
      setRequestNote("");
    } catch (err) {
      setError(err?.message || "No se pudo registrar la acción");
    } finally {
      setActionBusy(false);
    }
  }

  function togglePanel() {
    if (open && scanning) stopScanner();
    setOpen((v) => !v);
  }

  return (
    <div className={`scanner-card ${open ? "open" : ""}`}>
      <div className="scanner-trigger" onClick={togglePanel}>
        <div className="scanner-trigger-left">
          <BsCamera size={26} className="scanner-icon" />
          <div>
            <h2>Lector QR / código de barras</h2>
            <p className="scanner-subtitle">
              {loading
                ? "Cargando productos..."
                : open
                ? "Haz clic para cerrar"
                : "Escanea con la cámara y encuentra productos al instante"}
            </p>
          </div>
        </div>
        <span className={`scanner-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="scanner-panel">
          <div className="scanner-controls">
            {!scanning ? (
              <button type="button" className="scanner-btn primary" onClick={startScanner} disabled={loading}>
                <BsCameraVideo size={16} /> Iniciar cámara
              </button>
            ) : (
              <button type="button" className="scanner-btn danger" onClick={stopScanner}>
                <BsStopFill size={16} /> Detener
              </button>
            )}
            {(matched || notFound || lastCode) && (
              <button type="button" className="scanner-btn ghost" onClick={clearResult}>
                <BsXCircle size={14} /> Limpiar
              </button>
            )}
          </div>

          <div id={READER_ID} className={`scanner-viewport ${scanning ? "active" : ""}`} />

          {error && <div className="scanner-error">{error}</div>}

          {lastCode && (
            <div className="scanner-result">
              <div className="scanner-result-header">
                <span className="scanner-result-label">Código leído</span>
                <code className="scanner-result-code">{lastCode}</code>
              </div>

              {matched ? (
                <>
                  <div className="scanner-product">
                    <div className="scanner-product-media">
                      {matched.imageUrl ? (
                        <img src={matched.imageUrl} alt={matched.description || "Producto"} />
                      ) : (
                        <div className="scanner-product-empty"><BsImages size={36} /></div>
                      )}
                    </div>
                    <div className="scanner-product-info">
                      <h3>{matched.description}</h3>
                      <p><b>SKU:</b> {matched.sku}</p>
                      <p><b>Stock:</b> {matched.stock} {matched.product_Unit}</p>
                      {matched.location && <p><b>Ubicación:</b> {matched.location}</p>}
                      {matched.brand    && <p><b>Marca:</b> {matched.brand}</p>}
                    </div>
                  </div>

                  <div className="scanner-actions">
                    <button
                      type="button"
                      className={`scanner-action-btn entry ${actionMode === "in" ? "active" : ""}`}
                      onClick={() => openAction("in")}
                      disabled={actionBusy}
                    >
                      <BsBoxArrowInDown size={16} /> Entrada
                    </button>
                    <button
                      type="button"
                      className={`scanner-action-btn exit ${actionMode === "out" ? "active" : ""}`}
                      onClick={() => openAction("out")}
                      disabled={actionBusy}
                    >
                      <BsBoxArrowUp size={16} /> Salida
                    </button>
                    <button
                      type="button"
                      className={`scanner-action-btn pending ${actionMode === "pending" ? "active" : ""}`}
                      onClick={() => openAction("pending")}
                      disabled={actionBusy}
                    >
                      <BsClock size={16} /> Solicitar pendiente
                    </button>
                  </div>

                  {actionMode && (
                    <form className="scanner-action-form" onSubmit={submitAction}>
                      <div className="scanner-action-row">
                        <label className="scanner-field">
                          Cantidad
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            disabled={actionBusy}
                            autoFocus
                            required
                          />
                        </label>

                        {actionMode !== "pending" && (
                          <label className="scanner-field">
                            Fecha
                            <input
                              type="date"
                              value={moveDate}
                              onChange={(e) => setMoveDate(e.target.value)}
                              disabled={actionBusy}
                              required
                            />
                          </label>
                        )}
                      </div>

                      {actionMode === "out" && (
                        <div className="scanner-action-row">
                          <label className="scanner-field">
                            Usuario destinatario
                            <input
                              type="text"
                              value={recipientUser}
                              onChange={(e) => setRecipientUser(e.target.value)}
                              maxLength={80}
                              disabled={actionBusy}
                              required
                            />
                          </label>
                          <label className="scanner-field">
                            Estado
                            <select
                              value={outputStatus}
                              onChange={(e) => setOutputStatus(e.target.value)}
                              disabled={actionBusy}
                            >
                              <option value="entregado">Entregado</option>
                              <option value="pendiente por devolver">Pendiente por devolver</option>
                            </select>
                          </label>
                        </div>
                      )}

                      {actionMode === "pending" && (
                        <label className="scanner-field full">
                          Nota (opcional)
                          <input
                            type="text"
                            value={requestNote}
                            onChange={(e) => setRequestNote(e.target.value)}
                            maxLength={200}
                            disabled={actionBusy}
                          />
                        </label>
                      )}

                      <div className="scanner-action-row end">
                        <button type="button" className="scanner-btn ghost" onClick={resetAction} disabled={actionBusy}>
                          <BsXCircle size={14} /> Cancelar
                        </button>
                        <button type="submit" className="scanner-btn primary" disabled={actionBusy}>
                          <BsCheck size={16} /> Confirmar
                        </button>
                      </div>
                    </form>
                  )}

                  {actionInfo && <div className="scanner-action-info">{actionInfo}</div>}
                </>
              ) : notFound ? (
                <div className="scanner-notfound">
                  No se encontró ningún producto con el código <b>{notFound}</b>.
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
