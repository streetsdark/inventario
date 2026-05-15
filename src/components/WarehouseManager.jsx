import { useState } from "react";
import { BsBuilding, BsPlusCircle, BsStarFill, BsTrash, BsPencil, BsXCircle, BsCheck } from "react-icons/bs";
import { useWarehouseContext } from "../context/WarehouseContext";
import { logAuditEvent } from "../utils/auditService";
import { isValidWarehouseName } from "../utils/warehouseFilter";
import "../css/warehouseManager.css";

export default function WarehouseManager() {
  const { warehouses, loading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouseContext();

  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");
  const [editLoc, setEditLoc]     = useState("");
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  const startEdit = (w) => {
    setEditingId(w.id);
    setEditName(w.name);
    setEditLoc(w.location || "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditLoc("");
    setError(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isValidWarehouseName(name)) {
      setError("Nombre inválido (2-60 caracteres, sin símbolos raros).");
      return;
    }
    setBusy(true);
    try {
      await createWarehouse({ name, location });
      logAuditEvent("WAREHOUSE_CREATED", "warehouse", name.trim(), { location });
      setName("");
      setLocation("");
    } catch (err) {
      setError(err?.message || "No se pudo crear el almacén");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (id) => {
    setError(null);
    if (!isValidWarehouseName(editName)) {
      setError("Nombre inválido (2-60 caracteres).");
      return;
    }
    setBusy(true);
    try {
      await updateWarehouse(id, { name: editName, location: editLoc });
      logAuditEvent("WAREHOUSE_UPDATED", "warehouse", id, { name: editName });
      cancelEdit();
    } catch (err) {
      setError(err?.message || "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (w) => {
    setError(null);
    if (w.isDefault) {
      setError("No se puede eliminar el almacén por defecto.");
      return;
    }
    if (!window.confirm(`¿Eliminar el almacén "${w.name}"? Los productos seguirán existiendo pero sin almacén asignado.`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteWarehouse(w.id);
      logAuditEvent("WAREHOUSE_DELETED", "warehouse", w.id, { name: w.name });
    } catch (err) {
      setError(err?.message || "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  const handleSetDefault = async (w) => {
    setError(null);
    setBusy(true);
    try {
      // Quitar default de los demás, luego marcar este.
      const others = warehouses.filter((x) => x.id !== w.id && x.isDefault);
      for (const o of others) await updateWarehouse(o.id, { isDefault: false });
      await updateWarehouse(w.id, { isDefault: true });
      logAuditEvent("WAREHOUSE_SET_DEFAULT", "warehouse", w.id, { name: w.name });
    } catch (err) {
      setError(err?.message || "No se pudo marcar por defecto");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`warehouse-manager-card ${open ? "open" : ""}`}>
      <div className="warehouse-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="warehouse-trigger-left">
          <BsBuilding size={26} className="warehouse-icon" />
          <div>
            <h2>Almacenes</h2>
            <p className="warehouse-subtitle">
              {loading ? "Cargando..." : open ? "Haz clic para cerrar" : `${warehouses.length} configurados`}
            </p>
          </div>
        </div>
        <span className={`warehouse-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="warehouse-panel">
          <form className="warehouse-create-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Nombre del almacén"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={busy}
            />
            <input
              type="text"
              placeholder="Ubicación (opcional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
              disabled={busy}
            />
            <button type="submit" className="warehouse-btn primary" disabled={busy}>
              <BsPlusCircle size={14} /> Crear
            </button>
          </form>

          {error && <div className="warehouse-error">{error}</div>}

          <ul className="warehouse-list">
            {warehouses.map((w) => (
              <li key={w.id} className={`warehouse-item ${w.isDefault ? "default" : ""}`}>
                {editingId === w.id ? (
                  <div className="warehouse-edit-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
                      disabled={busy}
                    />
                    <input
                      type="text"
                      value={editLoc}
                      onChange={(e) => setEditLoc(e.target.value)}
                      maxLength={120}
                      placeholder="Ubicación"
                      disabled={busy}
                    />
                    <button type="button" className="warehouse-btn icon" onClick={() => handleSaveEdit(w.id)} disabled={busy}>
                      <BsCheck size={14} />
                    </button>
                    <button type="button" className="warehouse-btn icon ghost" onClick={cancelEdit} disabled={busy}>
                      <BsXCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="warehouse-item-info">
                      <span className="warehouse-name">
                        {w.name}
                        {w.isDefault && <BsStarFill size={12} className="warehouse-default-star" title="Por defecto" />}
                      </span>
                      {w.location && <span className="warehouse-location">{w.location}</span>}
                    </div>
                    <div className="warehouse-item-actions">
                      {!w.isDefault && (
                        <button type="button" className="warehouse-btn icon ghost" onClick={() => handleSetDefault(w)} disabled={busy} title="Marcar por defecto">
                          <BsStarFill size={13} />
                        </button>
                      )}
                      <button type="button" className="warehouse-btn icon ghost" onClick={() => startEdit(w)} disabled={busy} title="Editar">
                        <BsPencil size={13} />
                      </button>
                      {!w.isDefault && (
                        <button type="button" className="warehouse-btn icon danger" onClick={() => handleDelete(w)} disabled={busy} title="Eliminar">
                          <BsTrash size={13} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
            {warehouses.length === 0 && !loading && (
              <li className="warehouse-empty">No hay almacenes todavía.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
