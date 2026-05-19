import { useState, useEffect, useMemo } from "react";
import {
  BsClipboardData, BsXCircle, BsCheck, BsTrash, BsArrowRepeat, BsUpload,
} from "react-icons/bs";
import {
  collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAccountContext } from "../context/AccountContext";
import { useWarehouseContext } from "../context/WarehouseContext";
import { useAuthContext } from "../context/AuthContext";
import { error as logError } from "../utils/logger";
import { logAuditEvent } from "../utils/auditService";
import { sanitizeString } from "../utils/securityValidation";
import {
  buildProductFromStaging,
  isMappingComplete,
} from "../utils/importStagingService";
import "../css/stagingReviewCard.css";

// Etiquetas comunes que ayudan al usuario a mapear sus columnas
const FIELDS = [
  { key: "sku",         label: "SKU" },
  { key: "description", label: "Descripción *" },
  { key: "location",    label: "Ubicación" },
  { key: "brand",       label: "Marca" },
  { key: "stock",       label: "Stock" },
  { key: "unit",        label: "Unidad" },
];

export default function StagingReviewCard() {
  const { accountId } = useAccountContext();
  const { selectedId: selectedWarehouseId, defaultWarehouseId, warehouses } = useWarehouseContext();
  const { user } = useAuthContext();

  const [open, setOpen]     = useState(false);
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");  // pending | imported | discarded | all
  const [mapping, setMapping] = useState({});  // { sku: 2, description: 1, ... }
  const [busyId, setBusyId]   = useState(null);
  const [error, setError]     = useState(null);
  const [info, setInfo]       = useState(null);
  const [editingCells, setEditingCells] = useState({});  // { rowId: [cells] }
  const [columnNames, setColumnNames] = useState([]); // nombres editables persistidos en localStorage

  // Subscribe a /importStaging filtrado por accountId
  useEffect(() => {
    if (!accountId) { setLoading(false); return; }
    const q = query(
      collection(db, "importStaging"),
      where("accountId", "==", accountId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (a.rowIndex ?? 0) - (b.rowIndex ?? 0));
        setRows(docs);
        setLoading(false);
      },
      (err) => { logError("StagingReviewCard subscribe", err); setLoading(false); },
    );
    return () => unsub();
  }, [accountId]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const headerRow = rows[0]?.headerRow || null;
  const columnCount = useMemo(() => {
    return rows.reduce((max, r) => Math.max(max, (r.cells || []).length), 0);
  }, [rows]);

  // Key de localStorage por cuenta — los nombres custom son por cuenta
  const storageKey = accountId ? `altadill.importCols.${accountId}` : null;

  // Carga inicial: localStorage > headerRow del CSV > "Col N"
  useEffect(() => {
    if (!storageKey || columnCount === 0) return;
    let saved = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch { /* ignore */ }

    const next = Array.from({ length: columnCount }, (_, i) => {
      if (Array.isArray(saved) && saved[i]) return String(saved[i]);
      if (headerRow?.[i])                    return String(headerRow[i]);
      return `Col ${i + 1}`;
    });
    setColumnNames(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, columnCount, headerRow?.length]);

  const renameColumn = (idx, value) => {
    setColumnNames((prev) => {
      const next = [...prev];
      next[idx] = value;
      try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const getColName = (i) => columnNames[i] || headerRow?.[i] || `Col ${i + 1}`;

  const counts = useMemo(() => ({
    pending:   rows.filter((r) => r.status === "pending").length,
    imported:  rows.filter((r) => r.status === "imported").length,
    discarded: rows.filter((r) => r.status === "discarded").length,
    total:     rows.length,
  }), [rows]);

  /* ── Acciones por fila ──────────────────────────────────── */

  const getCellsFor = (row) => editingCells[row.id] ?? row.cells ?? [];

  const updateCell = (rowId, colIdx, value) => {
    setEditingCells((prev) => {
      const current = prev[rowId] ?? rows.find((r) => r.id === rowId)?.cells ?? [];
      const next = [...current];
      next[colIdx] = value;
      return { ...prev, [rowId]: next };
    });
  };

  const importRow = async (row) => {
    setError(null); setInfo(null);
    if (!isMappingComplete(mapping)) {
      setError("Primero mapea al menos la columna 'Descripción' arriba.");
      return;
    }
    const targetWarehouseId = selectedWarehouseId || defaultWarehouseId || warehouses[0]?.id || "";
    if (!targetWarehouseId) {
      setError("Necesitas tener al menos un almacén creado.");
      return;
    }

    setBusyId(row.id);
    try {
      const cells = getCellsFor(row);
      const product = buildProductFromStaging(
        { ...row, cells },
        mapping,
        accountId,
      );
      product.warehouseId = targetWarehouseId;

      const productRef = await addDoc(collection(db, "products"), {
        ...product,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "importStaging", row.id), {
        status: "imported",
        importedProductId: productRef.id,
        importedAt: serverTimestamp(),
      });

      await logAuditEvent("STAGING_ROW_IMPORTED", "import", row.id, {
        productId: productRef.id,
        sku: product.sku,
      });

      setInfo(`✅ Fila ${row.rowIndex + 1} importada como producto.`);
    } catch (err) {
      setError(err?.message || "No se pudo importar la fila");
    } finally {
      setBusyId(null);
    }
  };

  const discardRow = async (row) => {
    setError(null); setInfo(null);
    setBusyId(row.id);
    try {
      await updateDoc(doc(db, "importStaging", row.id), {
        status: "discarded",
        discardedAt: serverTimestamp(),
      });
      await logAuditEvent("STAGING_ROW_DISCARDED", "import", row.id, {});
    } catch (err) {
      setError(err?.message || "No se pudo descartar la fila");
    } finally {
      setBusyId(null);
    }
  };

  const restoreRow = async (row) => {
    setError(null); setInfo(null);
    setBusyId(row.id);
    try {
      await updateDoc(doc(db, "importStaging", row.id), { status: "pending" });
    } catch (err) {
      setError(err?.message || "No se pudo restaurar");
    } finally {
      setBusyId(null);
    }
  };

  const deleteRowPermanent = async (row) => {
    if (!window.confirm("¿Eliminar esta fila del staging permanentemente?")) return;
    setError(null); setInfo(null);
    setBusyId(row.id);
    try {
      await deleteDoc(doc(db, "importStaging", row.id));
    } catch (err) {
      setError(err?.message || "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  if (!accountId) return null;

  return (
    <div className={`staging-card ${open ? "open" : ""}`}>
      <div className="staging-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="staging-trigger-left">
          <BsClipboardData size={26} className="staging-icon" />
          <div>
            <h2>Revisar import (staging)</h2>
            <p className="staging-subtitle">
              {loading
                ? "Cargando..."
                : open
                ? "Haz clic para cerrar"
                : `${counts.pending} pendientes · ${counts.imported} importadas · ${counts.discarded} descartadas`}
            </p>
          </div>
        </div>
        <span className={`staging-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="staging-panel">
          {rows.length === 0 ? (
            <div className="staging-empty">
              No hay filas en staging. Usa la card "Importar CSV" para subir
              un archivo primero.
            </div>
          ) : (
            <>
              {/* Mapeo de columnas */}
              <div className="staging-mapping">
                <h3>Mapea tus columnas a campos de producto</h3>
                <p className="staging-mapping-hint">
                  Indica qué columna del CSV corresponde a cada campo del
                  producto. Solo "Descripción" es obligatorio.
                </p>
                <div className="staging-mapping-grid">
                  {FIELDS.map(({ key, label }) => (
                    <label key={key} className="staging-mapping-field">
                      {label}
                      <select
                        value={mapping[key] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMapping((prev) => ({
                            ...prev,
                            [key]: v === "" ? undefined : Number(v),
                          }));
                        }}
                      >
                        <option value="">— Ninguna —</option>
                        {Array.from({ length: columnCount }).map((_, i) => (
                          <option key={i} value={i}>
                            {getColName(i)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtros de estado */}
              <div className="staging-filter-row">
                {["pending", "imported", "discarded", "all"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`staging-filter-btn ${statusFilter === s ? "active" : ""}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "Todas" : s === "pending" ? "Pendientes" : s === "imported" ? "Importadas" : "Descartadas"}
                    <span className="staging-filter-count">{
                      s === "all" ? counts.total : counts[s]
                    }</span>
                  </button>
                ))}
              </div>

              {error && <div className="staging-error"><BsXCircle size={14} /> {error}</div>}
              {info && <div className="staging-info">{info}</div>}

              {/* Tabla */}
              <div className="staging-table-wrap">
                <table className="staging-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {Array.from({ length: columnCount }).map((_, i) => (
                        <th key={i}>
                          <input
                            type="text"
                            value={columnNames[i] ?? ""}
                            onChange={(e) => renameColumn(i, e.target.value)}
                            className="staging-col-header-input"
                            placeholder={`Col ${i + 1}`}
                            title="Renombra la columna (se guarda automáticamente)"
                          />
                        </th>
                      ))}
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className={`staging-row staging-row-${row.status}`}>
                        <td className="staging-row-num">{(row.rowIndex ?? 0) + 1}</td>
                        {Array.from({ length: columnCount }).map((_, i) => (
                          <td key={i}>
                            {row.status === "pending" ? (
                              <input
                                type="text"
                                value={sanitizeString(String(getCellsFor(row)[i] ?? ""))}
                                onChange={(e) => updateCell(row.id, i, e.target.value)}
                                className="staging-cell-input"
                                disabled={busyId === row.id}
                              />
                            ) : (
                              <span>{sanitizeString(String(row.cells?.[i] ?? ""))}</span>
                            )}
                          </td>
                        ))}
                        <td>
                          <span className={`staging-status staging-status-${row.status}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="staging-actions-cell">
                          {row.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="staging-btn small primary"
                                onClick={() => importRow(row)}
                                disabled={busyId === row.id}
                                title="Importar como producto"
                              >
                                <BsUpload size={12} />
                              </button>
                              <button
                                type="button"
                                className="staging-btn small ghost"
                                onClick={() => discardRow(row)}
                                disabled={busyId === row.id}
                                title="Descartar"
                              >
                                <BsXCircle size={12} />
                              </button>
                            </>
                          )}
                          {row.status === "discarded" && (
                            <button
                              type="button"
                              className="staging-btn small ghost"
                              onClick={() => restoreRow(row)}
                              disabled={busyId === row.id}
                              title="Restaurar a pendiente"
                            >
                              <BsArrowRepeat size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="staging-btn small danger"
                            onClick={() => deleteRowPermanent(row)}
                            disabled={busyId === row.id}
                            title="Borrar del staging"
                          >
                            <BsTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
