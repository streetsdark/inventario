import { useState } from "react";
import {
  BsPeople, BsPersonPlus, BsXCircle, BsStarFill, BsTrash, BsCheck,
} from "react-icons/bs";
import { useAccountContext } from "../context/AccountContext";
import { useAuthContext } from "../context/AuthContext";
import { canManageMembers, canTransferOwnership, ACCOUNT_ROLES } from "../utils/accountUtils";
import "../css/accountMembersCard.css";

export default function AccountMembersCard() {
  const { account, accountRole, members, loading, inviteMember, removeMember, updateMemberRole, transferOwnership } = useAccountContext();
  const { user } = useAuthContext();

  const [open, setOpen]         = useState(false);
  const [email, setEmail]       = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [info, setInfo]         = useState(null);

  if (loading || !account) return null;
  if (!canManageMembers(accountRole)) return null;

  const handleInvite = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null);
    setBusy(true);
    try {
      await inviteMember({ email, role: inviteRole });
      setInfo(`✅ ${email} añadido a la cuenta.`);
      setEmail("");
    } catch (err) {
      setError(err?.message || "No se pudo invitar");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (uid, name) => {
    if (!window.confirm(`¿Eliminar a ${name || uid} de la cuenta?`)) return;
    setError(null); setInfo(null);
    setBusy(true);
    try {
      await removeMember(uid);
      setInfo("Miembro eliminado.");
    } catch (err) {
      setError(err?.message || "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (uid, newRole) => {
    setError(null); setInfo(null);
    setBusy(true);
    try {
      await updateMemberRole(uid, newRole);
      setInfo("Rol actualizado.");
    } catch (err) {
      setError(err?.message || "No se pudo cambiar el rol");
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async (uid, name) => {
    if (!window.confirm(`¿Transferir la propiedad de la cuenta a ${name || uid}? Pasarás a admin.`)) return;
    setError(null); setInfo(null);
    setBusy(true);
    try {
      await transferOwnership(uid);
      setInfo(`✅ Propiedad transferida.`);
    } catch (err) {
      setError(err?.message || "No se pudo transferir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`members-card ${open ? "open" : ""}`}>
      <div className="members-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="members-trigger-left">
          <BsPeople size={26} className="members-icon" />
          <div>
            <h2>Miembros de "{account.name}"</h2>
            <p className="members-subtitle">
              {open ? "Haz clic para cerrar" : `${members.length} miembro${members.length === 1 ? "" : "s"} · plan ${account.plan}`}
            </p>
          </div>
        </div>
        <span className={`members-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {open && (
        <div className="members-panel">
          <form className="members-invite-form" onSubmit={handleInvite}>
            <input
              type="email"
              placeholder="Email del nuevo miembro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              disabled={busy}
              required
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} disabled={busy}>
              <option value="member">Miembro</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="members-btn primary" disabled={busy}>
              <BsPersonPlus size={14} /> Invitar
            </button>
          </form>

          {error && <div className="members-error"><BsXCircle size={14} /> {error}</div>}
          {info && <div className="members-info">{info}</div>}

          <ul className="members-list">
            {members.map((m) => {
              const isSelf  = m.uid === user?.uid;
              const isOwner = m.accountRole === "owner";
              return (
                <li key={m.uid} className={`members-item ${isOwner ? "owner" : ""}`}>
                  <div className="members-item-info">
                    <span className="members-item-name">
                      {m.displayName || m.email || m.uid}
                      {isOwner && <BsStarFill size={12} className="members-owner-star" title="Owner" />}
                      {isSelf && <span className="members-item-self">(tú)</span>}
                    </span>
                    {m.email && <span className="members-item-email">{m.email}</span>}
                  </div>

                  <div className="members-item-actions">
                    {!isOwner && !isSelf && (
                      <select
                        value={m.accountRole}
                        onChange={(e) => handleRoleChange(m.uid, e.target.value)}
                        disabled={busy}
                      >
                        {ACCOUNT_ROLES.filter((r) => r !== "owner").map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    )}

                    {canTransferOwnership(accountRole) && !isOwner && !isSelf && (
                      <button
                        type="button"
                        className="members-btn ghost"
                        onClick={() => handleTransfer(m.uid, m.displayName || m.email)}
                        disabled={busy}
                        title="Transferir propiedad"
                      >
                        <BsStarFill size={13} />
                      </button>
                    )}

                    {!isOwner && !isSelf && (
                      <button
                        type="button"
                        className="members-btn danger"
                        onClick={() => handleRemove(m.uid, m.displayName || m.email)}
                        disabled={busy}
                        title="Eliminar"
                      >
                        <BsTrash size={13} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
