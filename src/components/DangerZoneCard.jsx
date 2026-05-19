import { useState } from "react";
import {
  BsExclamationTriangleFill, BsXCircle, BsCheck, BsTrash, BsSearch,
} from "react-icons/bs";
import { collection, getDocs, writeBatch, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import useRole from "../hooks/useRole";
import { useAuthContext } from "../context/AuthContext";
import { logAuditEvent } from "../utils/auditService";
import {
  WIPE_CONFIRMATION_PHRASE,
  DATA_COLLECTIONS,
  META_COLLECTIONS,
  chunkForWipe,
  validateWipeConfirmation,
  filterUsersToDelete,
  summarizeWipe,
} from "../utils/wipeService";
import "../css/dangerZoneCard.css";

/**
 * Zona de peligro: borrado total de la app.
 * Solo superuser global. Triple confirmación incluyendo escribir
 * "BORRAR TODO" textual. Preserva al propio superuser para que pueda volver
 * a entrar.
 */
export default function DangerZoneCard() {
  const { isSuperUser } = useRole();
  const { user } = useAuthContext();

  const [open, setOpen]       = useState(false);
  const [step, setStep]       = useState(0);     // 0=closed, 1=info, 2=type, 3=final
  const [typed, setTyped]     = useState("");
  const [stats, setStats]     = useState(null);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);
  const [progress, setProgress] = useState(null); // {current, total, label}

  if (!isSuperUser) return null;

  /* ── Analizar (pre-wipe) ─────────────────────────────────── */

  const openWipe = async () => {
    setError(null);
    setBusy(true);
    try {
      const countsByCollection = {};
      const idsByCollection = {};

      for (const col of [...DATA_COLLECTIONS, ...META_COLLECTIONS]) {
        const snap = await getDocs(collection(db, col));
        idsByCollection[col] = snap.docs.map((d) => d.id);
        countsByCollection[col] = snap.size;
      }

      const usersSnap = await getDocs(collection(db, "users"));
      const allUserIds = usersSnap.docs.map((d) => d.id);
      const usersToDelete = filterUsersToDelete(allUserIds, user?.uid);

      const summary = summarizeWipe(countsByCollection, usersToDelete);
      setStats({ ...summary, idsByCollection, usersToDelete });
      setStep(1);
    } catch (err) {
      setError(err?.message || "No se pudo analizar la base de datos");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setStep(0);
    setTyped("");
    setStats(null);
    setError(null);
    setProgress(null);
  };

  /* ── Ejecutar wipe ─────────────────────────────────────────── */

  const executeWipe = async () => {
    if (!validateWipeConfirmation(typed)) {
      setError(`Debes escribir exactamente "${WIPE_CONFIRMATION_PHRASE}"`);
      return;
    }
    if (!stats) return;

    setBusy(true);
    setError(null);

    try {
      // Auditamos PRIMERO (antes de borrar auditLogs si decidiera borrarlos)
      await logAuditEvent("APP_WIPED", "system", "wipe", {
        actorUid: user?.uid,
        actorEmail: user?.email,
        total: stats.total,
        detail: stats.detail,
        timestamp: new Date().toISOString(),
      });

      const allOps = [];

      // 1) Colecciones de datos + meta
      for (const col of [...DATA_COLLECTIONS, ...META_COLLECTIONS]) {
        for (const id of stats.idsByCollection[col] || []) {
          allOps.push({ col, id });
        }
      }
      // 2) Usuarios (preservando el actor)
      for (const uid of stats.usersToDelete || []) {
        allOps.push({ col: "users", id: uid });
      }

      const chunks = chunkForWipe(allOps);
      let processed = 0;
      const total = allOps.length;

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(({ col, id }) => batch.delete(doc(db, col, id)));
        await batch.commit();
        processed += chunk.length;
        setProgress({ current: processed, total, label: "Borrando documentos..." });
      }

      // 3) Resetear al superuser actual: quita su accountId/accountRole
      // (lo deja como user huérfano, vuelve a estado "necesita crear cuenta")
      if (user?.uid) {
        setProgress({ current: total, total, label: "Reseteando tu sesión..." });
        await setDoc(
          doc(db, "users", user.uid),
          { accountId: null, accountRole: null },
          { merge: true },
        );
      }

      setProgress({ current: total, total, label: "✅ Listo. Recargando..." });
      // Recarga tras 2s para que el usuario lea el mensaje
      setTimeout(() => window.location.reload(), 2000);

    } catch (err) {
      setError(err?.message || "Error durante el wipe. Algunas operaciones pueden haber fallado.");
      setBusy(false);
    }
  };

  return (
    <div className={`danger-card ${open ? "open" : ""}`}>
      <div className="danger-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="danger-trigger-left">
          <BsExclamationTriangleFill size={26} className="danger-icon" />
          <div>
            <h2>Zona de peligro</h2>
            <p className="danger-subtitle">
              {open ? "Haz clic para cerrar" : "Operaciones destructivas — solo superuser"}
            </p>
          </div>
        </div>
        <span className={`danger-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="danger-panel">
          <div className="danger-warning-block">
            <h3>🔥 Borrar TODOS los datos de la app</h3>
            <p>
              Esta acción <b>borra de forma permanente</b>:
            </p>
            <ul>
              <li>Todos los productos, movimientos, almacenes</li>
              <li>Todas las solicitudes y notificaciones</li>
              <li>Todas las cuentas y todos los usuarios (excepto tú)</li>
            </ul>
            <p>
              <b>No se puede deshacer.</b> Los datos de Firebase Auth (emails
              registrados) sobreviven, pero ya no tendrán acceso porque sus
              user docs se borrarán. Tu sesión se reseteará para que vuelvas
              a crear cuenta desde cero.
            </p>
            <button
              type="button"
              className="danger-btn destructive"
              onClick={openWipe}
              disabled={busy}
            >
              <BsSearch size={14} /> {busy && !stats ? "Analizando..." : "Analizar y borrar todo"}
            </button>
          </div>

          {error && (
            <div className="danger-error">
              <BsXCircle size={14} /> {error}
            </div>
          )}

          {/* Modal triple confirmación */}
          {step > 0 && (
            <div className="danger-overlay" onClick={() => !busy && cancel()}>
              <div className="danger-box" onClick={(e) => e.stopPropagation()}>

                {step === 1 && stats && (
                  <>
                    <h3><BsExclamationTriangleFill /> Vas a borrar la app entera</h3>
                    <p>Esto eliminará <b>{stats.total} documentos</b>:</p>
                    <ul className="danger-counts">
                      {Object.entries(stats.detail).map(([k, n]) => (
                        <li key={k}>
                          <span>{k}</span><span>{n}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="danger-warning-strong">
                      Después de esto la app queda VACÍA. Tendrás que crear
                      una cuenta nueva y empezar desde cero.
                    </p>
                    <div className="danger-actions">
                      <button type="button" className="danger-btn" onClick={cancel}>Cancelar</button>
                      <button type="button" className="danger-btn destructive" onClick={() => setStep(2)}>
                        Continuar
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3><BsExclamationTriangleFill /> Confirma escribiendo el texto exacto</h3>
                    <p>
                      Para evitar borrados accidentales, escribe la frase
                      exacta (mayúsculas incluidas):
                    </p>
                    <p className="danger-phrase">
                      <code>{WIPE_CONFIRMATION_PHRASE}</code>
                    </p>
                    <input
                      type="text"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder={WIPE_CONFIRMATION_PHRASE}
                      className="danger-input"
                      autoFocus
                      disabled={busy}
                    />
                    <div className="danger-actions">
                      <button type="button" className="danger-btn" onClick={cancel} disabled={busy}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="danger-btn destructive"
                        onClick={() => setStep(3)}
                        disabled={!validateWipeConfirmation(typed)}
                      >
                        Continuar
                      </button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h3><BsExclamationTriangleFill /> Última oportunidad</h3>
                    <p>
                      Tras pulsar "Borrar todo" la app se vacía. No hay vuelta
                      atrás (los datos no se pueden recuperar sin un backup
                      previo de Firestore).
                    </p>
                    {progress && (
                      <div className="danger-progress">
                        <div className="danger-progress-bar">
                          <div
                            className="danger-progress-fill"
                            style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                          />
                        </div>
                        <p>{progress.label} {progress.current} / {progress.total}</p>
                      </div>
                    )}
                    {error && (
                      <div className="danger-error">
                        <BsXCircle size={14} /> {error}
                      </div>
                    )}
                    <div className="danger-actions">
                      <button type="button" className="danger-btn" onClick={cancel} disabled={busy}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="danger-btn destructive"
                        onClick={executeWipe}
                        disabled={busy}
                      >
                        {busy
                          ? "Borrando..."
                          : <><BsTrash size={14} /> Borrar todo</>}
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
