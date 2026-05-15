import { useState, useMemo, useEffect } from "react";
import { BsArrowLeftRight, BsXCircle, BsCheck, BsExclamationTriangle } from "react-icons/bs";
import { writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import useProducts from "../hooks/useProducts";
import { useWarehouseContext } from "../context/WarehouseContext";
import { logAuditEvent } from "../utils/auditService";
import {
  filterCandidates,
  chunkIds,
  validateReassign,
  UNASSIGNED,
  FIRESTORE_BATCH_LIMIT,
} from "../utils/bulkReassignService";
import "../css/bulkReassignCard.css";

export default function BulkReassignCard() {
  const { products, loading: productsLoading } = useProducts();
  const { warehouses, loading: warehousesLoading, selectedId: contextSelectedId } = useWarehouseContext();

  const [open, setOpen]                 = useState(false);
  const [originId, setOriginId]         = useState(UNASSIGNED);
  const [destinationId, setDestinationId] = useState("");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState({}); // { productId: true }
  const [confirming, setConfirming]     = useState(false);
  const [busy, setBusy]                 = useState(false);
  const [error, setError]               = useState(null);
  const [info, setInfo]                 = useState(null);

  const loading = productsLoading || warehousesLoading;

  // Para que useProducts nos devuelva todo (no filtrado por almacén actual),
  // mostramos un aviso si está filtrado y sugerimos cambiar a "Todos".
  const candidates = useMemo(() => {
    return filterCandidates(products, originId);
  }, [products, originId]);

  const filtered = useMemo(() => {
    const term = search.trim().slice(0, 80).toLowerCase();
    if (!term) return candidates;
    return candidates.filter((p) => {
      const sku  = String(p?.sku || "").toLowerCase();
      const desc = String(p?.description || "").toLowerCase();
      return sku.includes(term) || desc.includes(term);
    });
  }, [candidates, search]);

  // Reset de selección cuando cambia el origen o destino.
  useEffect(() => { setSelected({}); setInfo(null); setError(null); }, [originId, destinationId]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );

  const toggleOne = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const markAll   = () => setSelected(Object.fromEntries(filtered.map((p) => [p.id, true])));
  const clearAll  = () => setSelected({});

  const destinationName = warehouses.find((w) => w.id === destinationId)?.name || "";

  const handleConfirm = () => {
    setError(null);
    const validation = validateReassign({
      originId: originId === UNASSIGNED ? "" : originId,
      destinationId,
      ids: selectedIds,
      warehouses,
    });
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }
    setConfirming(true);
  };

  const handleExecute = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const chunks = chunkIds(selectedIds);
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          batch.update(doc(db, "products", id), { warehouseId: destinationId });
        });
        await batch.commit();
      }
      logAuditEvent("PRODUCTS_BULK_REASSIGNED", "products", "bulk", {
        from: originId,
        to: destinationId,
        count: selectedIds.length,
        skuSample: candidates
          .filter((p) => selected[p.id])
          .slice(0, 10)
          .map((p) => p.sku || p.id),
      });
      setInfo(`✅ ${selectedIds.length} productos movidos a "${destinationName}".`);
      setSelected({});
      setConfirming(false);
    } catch (err) {
      setError(err?.message || "No se pudo completar la reasignación");
    } finally {
      setBusy(false);
    }
  };

  const cancelConfirm = () => setConfirming(false);

  return (
    <div className={`bulk-card ${open ? "open" : ""}`}>
      <div className="bulk-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="bulk-trigger-left">
          <BsArrowLeftRight size={26} className="bulk-icon" />
          <div>
            <h2>Reasignar productos en bloque</h2>
            <p className="bulk-subtitle">
              {loading ? "Cargando..." : open ? "Haz clic para cerrar" : "Mueve varios productos a otro almacén de una vez"}
            </p>
          </div>
        </div>
        <span className={`bulk-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="bulk-panel">
          {contextSelectedId && contextSelectedId !== "__all__" && (
            <div className="bulk-hint">
              <BsExclamationTriangle size={14} /> Tienes el filtro de almacén activo:
              solo se ven los productos de ese almacén o legados. Cambia a
              <b> "— Todos —"</b> arriba si quieres reasignar entre cualquier par.
            </div>
          )}

          <div className="bulk-row">
            <label className="bulk-field">
              Origen
              <select value={originId} onChange={(e) => setOriginId(e.target.value)} disabled={busy}>
                <option value={UNASSIGNED}>Sin asignar (legacy)</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.isDefault ? " ★" : ""}</option>
                ))}
              </select>
            </label>

            <label className="bulk-field">
              Destino
              <select value={destinationId} onChange={(e) => setDestinationId(e.target.value)} disabled={busy}>
                <option value="">— Selecciona destino —</option>
                {warehouses
                  .filter((w) => w.id !== originId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>{w.name}{w.isDefault ? " ★" : ""}</option>
                  ))}
              </select>
            </label>
          </div>

          <input
            type="text"
            className="bulk-search"
            placeholder="Buscar por SKU o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={80}
            disabled={busy}
          />

          <div className="bulk-list-wrap">
            {filtered.length === 0 ? (
              <div className="bulk-empty">
                {originId === UNASSIGNED
                  ? "No hay productos sin almacén asignado."
                  : "No hay productos en este origen."}
              </div>
            ) : (
              <ul className="bulk-list">
                {filtered.map((p) => (
                  <li key={p.id} className="bulk-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={!!selected[p.id]}
                        onChange={() => toggleOne(p.id)}
                        disabled={busy}
                      />
                      <span className="bulk-item-sku">{p.sku || "(sin SKU)"}</span>
                      <span className="bulk-item-desc">{p.description || "(sin nombre)"}</span>
                      <span className="bulk-item-stock">{p.stock ?? 0} {p.product_Unit || "u."}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bulk-toolbar">
            <span className="bulk-counter">
              {filtered.length} visible{filtered.length === 1 ? "" : "s"} ·{" "}
              <b>{selectedIds.length}</b> seleccionado{selectedIds.length === 1 ? "" : "s"}
            </span>
            <div className="bulk-toolbar-actions">
              <button type="button" className="bulk-btn ghost" onClick={markAll} disabled={busy || filtered.length === 0}>
                Marcar todos
              </button>
              <button type="button" className="bulk-btn ghost" onClick={clearAll} disabled={busy || selectedIds.length === 0}>
                Desmarcar todos
              </button>
            </div>
          </div>

          {error && (
            <div className="bulk-error">
              <BsXCircle size={14} /> {error}
            </div>
          )}
          {info && <div className="bulk-info">{info}</div>}

          {selectedIds.length > FIRESTORE_BATCH_LIMIT && (
            <div className="bulk-hint">
              <BsExclamationTriangle size={14} /> Vas a mover {selectedIds.length} productos:
              se ejecutará en {Math.ceil(selectedIds.length / FIRESTORE_BATCH_LIMIT)} batches
              de hasta {FIRESTORE_BATCH_LIMIT} cada uno (límite Firestore).
            </div>
          )}

          <div className="bulk-actions">
            <button
              type="button"
              className="bulk-btn primary"
              disabled={busy || loading || selectedIds.length === 0 || !destinationId}
              onClick={handleConfirm}
            >
              <BsCheck size={16} /> Mover {selectedIds.length} a {destinationName || "..."}
            </button>
          </div>

          {confirming && (
            <div className="bulk-confirm-overlay" onClick={cancelConfirm}>
              <div className="bulk-confirm-box" onClick={(e) => e.stopPropagation()}>
                <h3>¿Mover {selectedIds.length} producto{selectedIds.length === 1 ? "" : "s"} a "{destinationName}"?</h3>
                <p>
                  Esta acción afecta su stock visible y futuros movimientos.
                  Los movimientos históricos quedan donde estaban (no se reescribe el historial).
                </p>
                <div className="bulk-confirm-actions">
                  <button type="button" className="bulk-btn ghost" onClick={cancelConfirm} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="button" className="bulk-btn primary" onClick={handleExecute} disabled={busy}>
                    {busy ? "Moviendo..." : "Sí, mover"}
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
