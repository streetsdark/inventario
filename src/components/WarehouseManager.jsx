import { useState } from "react";
import { BsBuilding, BsPlusCircle, BsStarFill, BsTrash, BsPencil, BsXCircle, BsCheck } from "react-icons/bs";
import { useWarehouseContext } from "../context/WarehouseContext";
import { logAuditEvent } from "../utils/auditService";
import { isValidWarehouseName } from "../utils/warehouseFilter";
import "../css/warehouseManager.css";

export default function WarehouseManager() {
  const {
    warehouses,
    loading,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    deleteWarehouseWithReassign,
  } = useWarehouseContext();

  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");
  const [editLoc, setEditLoc]     = useState("");
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  // Modal de reasignación cuando se borra el almacén default
  const [reassignFor, setReassignFor]       = useState(null); // { id, name } del que se va a borrar
  const [chosenNewDefault, setChosenNewDefault] = useState("");

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

    // Caso 1: es el default y no hay otros → no se puede borrar (sería quedarse sin almacén)
    if (w.isDefault && warehouses.length <= 1) {
      setError("No puedes borrar el único almacén. Crea otro antes.");
      return;
    }

    // Caso 2: es el default y hay otros → modal de reasignación
    if (w.isDefault) {
      const others = warehouses.filter((x) => x.id !== w.id);
      setReassignFor({ id: w.id, name: w.name });
      setChosenNewDefault(others[0]?.id || "");
      return;
    }

    // Caso 3: no es default → confirm normal
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

  const confirmReassignDelete = async () => {
    if (!reassignFor || !chosenNewDefault) return;
    setError(null);
    setBusy(true);
    try {
      await deleteWarehouseWithReassign(reassignFor.id, chosenNewDefault);
      logAuditEvent("WAREHOUSE_DELETED", "warehouse", reassignFor.id, {
        name: reassignFor.name,
        promotedDefaultId: chosenNewDefault,
      });
      setReassignFor(null);
      setChosenNewDefault("");
    } catch (err) {
      setError(err?.message || "No se pudo borrar el almacén default");
    } finally {
      setBusy(false);
    }
  };

  const cancelReassign = () => {
    setReassignFor(null);
    setChosenNewDefault("");
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
                      <button
                        type="button"
                        className="warehouse-btn icon danger"
                        onClick={() => handleDelete(w)}
                        disabled={busy}
                        title={w.isDefault ? "Eliminar (te pedirá elegir un nuevo default)" : "Eliminar"}
                      >
                        <BsTrash size={13} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {warehouses.length === 0 && !loading && (
              <li className="warehouse-empty">No hay almacenes todavía.</li>
            )}
          </ul>

          {/* Modal asistido para borrar el almacén por defecto */}
          {reassignFor && (
            <div className="warehouse-reassign-overlay" onClick={() => !busy && cancelReassign()}>
              <div className="warehouse-reassign-box" onClick={(e) => e.stopPropagation()}>
                <h3>Borrar "{reassignFor.name}"</h3>
                <p>
                  Este almacén está marcado como <b>por defecto</b>. Antes de
                  borrarlo, elige cuál de los demás pasará a serlo:
                </p>
                <select
                  value={chosenNewDefault}
                  onChange={(e) => setChosenNewDefault(e.target.value)}
                  disabled={busy}
                  className="warehouse-reassign-select"
                >
                  {warehouses
                    .filter((w) => w.id !== reassignFor.id)
                    .map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
                <p className="warehouse-reassign-note">
                  Los productos sin almacén asignado quedarán bajo el nuevo
                  default. Los productos que estaban en este almacén perderán
                  su <code>warehouseId</code>.
                </p>
                <div className="warehouse-reassign-actions">
                  <button type="button" className="warehouse-btn" onClick={cancelReassign} disabled={busy}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="warehouse-btn danger"
                    onClick={confirmReassignDelete}
                    disabled={busy || !chosenNewDefault}
                  >
                    {busy ? "Borrando..." : "Promover y borrar"}
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
