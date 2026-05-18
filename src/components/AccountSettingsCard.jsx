import { useState } from "react";
import {
  BsGear, BsDownload, BsTrash, BsXCircle, BsExclamationTriangle, BsCheck,
} from "react-icons/bs";
import { collection, getDocs, writeBatch, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAccountContext } from "../context/AccountContext";
import { useAuthContext } from "../context/AuthContext";
import { logAuditEvent } from "../utils/auditService";
import {
  buildExportPayload,
  summarizePayload,
  downloadJsonExport,
} from "../utils/dataExport";
import {
  DELETE_COLLECTIONS,
  chunkForDelete,
  validateDelete,
  totalToDelete,
} from "../utils/dataDelete";
import "../css/accountSettingsCard.css";

export default function AccountSettingsCard() {
  const { account, accountId, accountRole, members } = useAccountContext();
  const { user } = useAuthContext();

  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);
  const [info, setInfo]       = useState(null);

  // Triple confirmación de borrado
  const [deleteStep, setDeleteStep]       = useState(0); // 0=closed, 1=intro, 2=type, 3=final
  const [typedName, setTypedName]         = useState("");
  const [deleteStats, setDeleteStats]     = useState(null);

  if (!account || !accountId) return null;
  // Solo owner ve la card completa
  if (accountRole !== "owner") return null;

  /* ── Export ────────────────────────────────────────────── */

  const handleExport = async () => {
    setError(null); setInfo(null); setBusy(true);
    try {
      const collected = {};
      for (const col of ["products", "moves", "warehouses", "productRequests", "notifications"]) {
        const snap = await getDocs(query(collection(db, col), where("accountId", "==", accountId)));
        collected[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      const payload = buildExportPayload({
        account,
        members,
        ...collected,
      });
      const result = downloadJsonExport(payload, `altadill-${account.slug || accountId}`);
      await logAuditEvent("DATA_EXPORTED", "account", accountId, {
        bytes: result.bytes,
        ...summarizePayload(payload),
      });
      setInfo(`✅ Exportados ${result.bytes.toLocaleString()} bytes en ${result.name}.`);
    } catch (err) {
      setError(err?.message || "No se pudo exportar");
    } finally {
      setBusy(false);
    }
  };

  /* ── Delete (triple confirmación) ────────────────────────── */

  const openDelete = async () => {
    setError(null); setInfo(null);
    setBusy(true);
    try {
      // Pre-conteo para mostrar al usuario qué va a borrar
      const counts = {};
      for (const col of DELETE_COLLECTIONS) {
        const snap = await getDocs(query(collection(db, col), where("accountId", "==", accountId)));
        counts[col] = snap.docs.map((d) => d.id);
      }
      setDeleteStats({ counts, total: totalToDelete(counts) });
      setDeleteStep(1);
    } catch (err) {
      setError(err?.message || "No se pudo preparar el borrado");
    } finally {
      setBusy(false);
    }
  };

  const cancelDelete = () => {
    setDeleteStep(0);
    setTypedName("");
    setDeleteStats(null);
  };

  const handleDeleteConfirmed = async () => {
    setError(null);
    const validation = validateDelete({
      accountId,
      confirmationTyped: typedName,
      accountName: account.name,
      role: accountRole,
    });
    if (!validation.ok) { setError(validation.reason); return; }

    setBusy(true);
    try {
      // 1. Cascade delete por colección
      for (const col of DELETE_COLLECTIONS) {
        const ids = deleteStats?.counts[col] || [];
        const chunks = chunkForDelete(ids);
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((id) => batch.delete(doc(db, col, id)));
          await batch.commit();
        }
      }

      // 2. Auditar antes de borrar la cuenta (después no podríamos)
      await logAuditEvent("ACCOUNT_DELETED", "account", accountId, {
        accountName: account.name,
        deletedBy: user?.uid,
        countsByCollection: Object.fromEntries(
          Object.entries(deleteStats?.counts || {}).map(([k, v]) => [k, v.length]),
        ),
      });

      // 3. Desvincular al user (no borramos su user doc, solo quitamos accountId)
      const userBatch = writeBatch(db);
      members.forEach((m) => {
        userBatch.update(doc(db, "users", m.uid), {
          accountId: null,
          accountRole: null,
        });
      });
      await userBatch.commit();

      // 4. Borrar la cuenta
      await deleteDoc(doc(db, "accounts", accountId));

      // Tras esto, los hooks vuelven a estado "sin cuenta" automáticamente
      // y aparecerá el SignupAccountForm.
      setInfo("Cuenta borrada. Se recargará en unos segundos.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err?.message || "No se pudo borrar la cuenta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`settings-card ${open ? "open" : ""}`}>
      <div className="settings-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="settings-trigger-left">
          <BsGear size={26} className="settings-icon" />
          <div>
            <h2>Ajustes de cuenta</h2>
            <p className="settings-subtitle">
              {open ? "Haz clic para cerrar" : "Exportar tus datos (GDPR) o borrar la cuenta completa"}
            </p>
          </div>
        </div>
        <span className={`settings-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="settings-panel">

          {/* Export */}
          <div className="settings-section">
            <h3>Exportar mis datos</h3>
            <p>
              Descarga un JSON con todos los productos, movimientos, almacenes,
              solicitudes y notificaciones de tu cuenta. Cumple con tu derecho
              de portabilidad GDPR.
            </p>
            <button
              type="button"
              className="settings-btn primary"
              onClick={handleExport}
              disabled={busy}
            >
              <BsDownload size={14} /> {busy ? "Exportando..." : "Exportar JSON"}
            </button>
          </div>

          {/* Delete */}
          <div className="settings-section danger">
            <h3>Borrar mi cuenta</h3>
            <p>
              Elimina permanentemente tu cuenta y todos sus datos. Esta acción
              <b> no se puede deshacer</b>. Asegúrate de haber exportado tus
              datos antes si los necesitas.
            </p>
            <button
              type="button"
              className="settings-btn danger"
              onClick={openDelete}
              disabled={busy}
            >
              <BsTrash size={14} /> Borrar mi cuenta
            </button>
          </div>

          {error && <div className="settings-error"><BsXCircle size={14} /> {error}</div>}
          {info && <div className="settings-info">{info}</div>}

          {/* Modal triple confirmación */}
          {deleteStep > 0 && (
            <div className="settings-confirm-overlay" onClick={() => !busy && cancelDelete()}>
              <div className="settings-confirm-box" onClick={(e) => e.stopPropagation()}>

                {deleteStep === 1 && (
                  <>
                    <h3><BsExclamationTriangle /> Vas a borrar la cuenta</h3>
                    <p>
                      Esto eliminará permanentemente <b>{deleteStats?.total || 0} documentos</b>:
                    </p>
                    <ul className="settings-confirm-counts">
                      {Object.entries(deleteStats?.counts || {}).map(([col, ids]) => (
                        <li key={col}>
                          <span>{col}</span><span>{ids.length}</span>
                        </li>
                      ))}
                    </ul>
                    <p>
                      Todos los miembros ({members.length}) quedarán
                      desvinculados pero sus usuarios no se eliminan.
                    </p>
                    <div className="settings-confirm-actions">
                      <button type="button" className="settings-btn ghost" onClick={cancelDelete}>
                        Cancelar
                      </button>
                      <button type="button" className="settings-btn danger" onClick={() => setDeleteStep(2)}>
                        Continuar
                      </button>
                    </div>
                  </>
                )}

                {deleteStep === 2 && (
                  <>
                    <h3><BsExclamationTriangle /> Confirma con el nombre exacto</h3>
                    <p>
                      Escribe <b>{account.name}</b> para confirmar:
                    </p>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder={account.name}
                      className="settings-confirm-input"
                      autoFocus
                      disabled={busy}
                    />
                    <div className="settings-confirm-actions">
                      <button type="button" className="settings-btn ghost" onClick={cancelDelete}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="settings-btn danger"
                        onClick={() => setDeleteStep(3)}
                        disabled={typedName.trim() !== account.name.trim()}
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                )}

                {deleteStep === 3 && (
                  <>
                    <h3><BsExclamationTriangle /> Última oportunidad</h3>
                    <p>
                      Tras pulsar "Borrar permanentemente" no hay vuelta atrás.
                    </p>
                    {error && <div className="settings-error"><BsXCircle size={14} /> {error}</div>}
                    <div className="settings-confirm-actions">
                      <button type="button" className="settings-btn ghost" onClick={cancelDelete} disabled={busy}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="settings-btn danger"
                        onClick={handleDeleteConfirmed}
                        disabled={busy}
                      >
                        {busy ? "Borrando..." : <><BsCheck size={14} /> Borrar permanentemente</>}
                      </button>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
