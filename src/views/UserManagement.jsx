import { useState } from "react";
import { BsSearch, BsCheckCircle, BsShieldLock, BsPencil } from "react-icons/bs";
import ProfileCard from "../components/ProfileCard";
import useUsers from "../hooks/useUsers";
import useAuth from "../hooks/useAuth";
import "../css/userManagement.css";

const ROLES = [
  { value: "superuser", label: "Superusuario" },
  { value: "admin",     label: "Administrador" },
  { value: "mecanico",  label: "Mecánico" },
  { value: "basic",     label: "Básico" },
];

const ROLE_FILTER_OPTIONS = [{ value: "all", label: "Todos" }, ...ROLES];

function roleClass(role) {
  if (role === "superuser") return "um-role--super";
  if (role === "admin")     return "um-role--admin";
  if (role === "mecanico")  return "um-role--mec";
  return "um-role--basic";
}

function roleLabel(role) {
  return ROLES.find((r) => r.value === role)?.label ?? role ?? "Sin rol";
}

function Avatar({ name, alias, email }) {
  const letter = (alias || name || email || "?")[0].toUpperCase();
  return <div className="um-avatar">{letter}</div>;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { users, loading, updateRole, updateAlias } = useUsers();

  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pending, setPending]           = useState({});  // { uid: newRole }
  const [saving, setSaving]             = useState({});  // { uid: bool }
  const [feedback, setFeedback]         = useState({});  // { uid: 'ok'|'err' }

  const [pendingAlias, setPendingAlias] = useState({});  // { uid: newAlias }
  const [savingAlias, setSavingAlias]   = useState({});  // { uid: bool }
  const [feedbackAlias, setFeedbackAlias] = useState({}); // { uid: 'ok'|'err' }
  const [editingAlias, setEditingAlias] = useState({});  // { uid: bool }

  const superUserEmail = import.meta.env.VITE_SUPER_USER_EMAIL?.toLowerCase();

  const isProtected = (u) =>
    u.email?.toLowerCase() === superUserEmail || u.id === currentUser?.uid;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const countByRole = (role) => users.filter((u) => u.role === role).length;

  const handleRoleChange = (uid, newRole) => {
    setPending((prev) => ({ ...prev, [uid]: newRole }));
    setFeedback((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const handleSave = async (u) => {
    const newRole = pending[u.id];
    if (!newRole || newRole === u.role) return;
    setSaving((prev) => ({ ...prev, [u.id]: true }));
    try {
      await updateRole(u.id, newRole);
      setPending((prev) => { const n = { ...prev }; delete n[u.id]; return n; });
      setFeedback((prev) => ({ ...prev, [u.id]: "ok" }));
      setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[u.id]; return n; }), 2500);
    } catch {
      setFeedback((prev) => ({ ...prev, [u.id]: "err" }));
      setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[u.id]; return n; }), 3000);
    } finally {
      setSaving((prev) => { const n = { ...prev }; delete n[u.id]; return n; });
    }
  };

  const handleCancel = (uid) => {
    setPending((prev) => { const n = { ...prev }; delete n[uid]; return n; });
    setFeedback((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const handleAliasEdit = (uid, currentAlias) => {
    setEditingAlias((prev) => ({ ...prev, [uid]: true }));
    setPendingAlias((prev) => ({ ...prev, [uid]: currentAlias || "" }));
  };

  const handleAliasSave = async (u) => {
    const newAlias = pendingAlias[u.id] ?? "";
    setSavingAlias((prev) => ({ ...prev, [u.id]: true }));
    try {
      await updateAlias(u.id, newAlias);
      setEditingAlias((prev) => { const n = { ...prev }; delete n[u.id]; return n; });
      setPendingAlias((prev) => { const n = { ...prev }; delete n[u.id]; return n; });
      setFeedbackAlias((prev) => ({ ...prev, [u.id]: "ok" }));
      setTimeout(() => setFeedbackAlias((prev) => { const n = { ...prev }; delete n[u.id]; return n; }), 2500);
    } catch {
      setFeedbackAlias((prev) => ({ ...prev, [u.id]: "err" }));
      setTimeout(() => setFeedbackAlias((prev) => { const n = { ...prev }; delete n[u.id]; return n; }), 3000);
    } finally {
      setSavingAlias((prev) => { const n = { ...prev }; delete n[u.id]; return n; });
    }
  };

  const handleAliasCancel = (uid) => {
    setEditingAlias((prev) => { const n = { ...prev }; delete n[uid]; return n; });
    setPendingAlias((prev) => { const n = { ...prev }; delete n[uid]; return n; });
    setFeedbackAlias((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  return (
    <div className="content">
      <ProfileCard />

      <div className="um-page-header">
        <div>
          <h1>Gestión de usuarios</h1>
          <p style={{ opacity: 0.6 }}>Asigna roles sin entrar a la consola de Firebase.</p>
        </div>
      </div>

      {/* Resumen por rol */}
      <div className="um-summary-row">
        {ROLES.map((r) => (
          <div key={r.value} className={`um-summary-card um-summary--${r.value}`}>
            <span className="um-summary-count">{countByRole(r.value)}</span>
            <span className="um-summary-label">{r.label}</span>
          </div>
        ))}
        <div className="um-summary-card um-summary--total">
          <span className="um-summary-count">{users.length}</span>
          <span className="um-summary-label">Total</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="um-filters">
        <div className="um-search-wrap">
          <BsSearch size={16} className="um-search-icon" />
          <input
            className="um-search"
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="um-role-filter">
          {ROLE_FILTER_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`um-filter-btn ${roleFilter === r.value ? "active" : ""}`}
              onClick={() => setRoleFilter(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="um-loading">Cargando usuarios...</p>
      ) : filtered.length === 0 ? (
        <div className="um-empty">No se encontraron usuarios con ese criterio.</div>
      ) : (
        <div className="um-list">
          {filtered.map((u) => {
            const protected_ = isProtected(u);
            const currentRole = u.role || "basic";
            const selectedRole = pending[u.id] ?? currentRole;
            const isDirty = pending[u.id] && pending[u.id] !== currentRole;
            const isSaving = saving[u.id];
            const fb = feedback[u.id];
            const isSelf = u.id === currentUser?.uid;

            const currentAlias = u.alias || "";
            const isEditingAlias = editingAlias[u.id];
            const aliasValue = pendingAlias[u.id] ?? currentAlias;
            const fbAlias = feedbackAlias[u.id];

            return (
              <div key={u.id} className={`um-user-row ${isDirty ? "dirty" : ""} ${fb === "ok" ? "saved" : ""}`}>
                <Avatar name={u.displayName} alias={u.alias} email={u.email} />

                <div className="um-user-info">
                  <span className="um-user-name">
                    {u.displayName || "—"}
                    {isSelf && <span className="um-self-tag">Tú</span>}
                  </span>
                  <span className="um-user-email">{u.email}</span>
                </div>

                {/* Alias */}
                <div className="um-alias-cell">
                  {isEditingAlias ? (
                    <div className="um-alias-edit">
                      <input
                        className="um-alias-input"
                        type="text"
                        value={aliasValue}
                        onChange={(e) => setPendingAlias((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAliasSave(u); if (e.key === "Escape") handleAliasCancel(u.id); }}
                        placeholder="Alias..."
                        autoFocus
                        disabled={savingAlias[u.id]}
                        maxLength={32}
                      />
                      <button type="button" className="um-btn-save" onClick={() => handleAliasSave(u)} disabled={savingAlias[u.id]}>
                        <BsCheckCircle size={13} />
                        {savingAlias[u.id] ? "..." : "OK"}
                      </button>
                      <button type="button" className="um-btn-cancel" onClick={() => handleAliasCancel(u.id)}>✕</button>
                    </div>
                  ) : (
                    <button type="button" className="um-alias-display" onClick={() => handleAliasEdit(u.id, currentAlias)} title="Editar alias">
                      <span className={currentAlias ? "um-alias-value" : "um-alias-empty"}>
                        {currentAlias || "Sin alias"}
                      </span>
                      <BsPencil size={11} className="um-alias-pencil" />
                    </button>
                  )}
                  {fbAlias === "ok"  && <span className="um-feedback um-feedback--ok">✓</span>}
                  {fbAlias === "err" && <span className="um-feedback um-feedback--err">Error</span>}
                </div>

                <span className={`um-role-badge ${roleClass(currentRole)}`}>
                  {roleLabel(currentRole)}
                </span>

                {protected_ ? (
                  <div className="um-locked" title={isSelf ? "No puedes cambiar tu propio rol" : "Cuenta protegida"}>
                    <BsShieldLock size={18} />
                    <span>Protegido</span>
                  </div>
                ) : (
                  <div className="um-actions">
                    <select
                      className={`um-select ${isDirty ? "um-select--dirty" : ""}`}
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={isSaving}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>

                    {isDirty && (
                      <>
                        <button
                          type="button"
                          className="um-btn-save"
                          onClick={() => handleSave(u)}
                          disabled={isSaving}
                        >
                          <BsCheckCircle size={15} />
                          {isSaving ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          className="um-btn-cancel"
                          onClick={() => handleCancel(u.id)}
                          disabled={isSaving}
                        >
                          ✕
                        </button>
                      </>
                    )}

                    {fb === "ok" && <span className="um-feedback um-feedback--ok">✓ Guardado</span>}
                    {fb === "err" && <span className="um-feedback um-feedback--err">Error al guardar</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
