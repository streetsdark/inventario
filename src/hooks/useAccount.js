import { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  runTransaction,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { error as logError } from "../utils/logger";
import { logAuditEvent } from "../utils/auditService";
import { sanitizeString, isValidEmail } from "../utils/securityValidation";
import RateLimiter from "../utils/rateLimiter";
import {
  slugify,
  isValidAccountName,
  isValidAccountRole,
  canManageMembers,
  canTransferOwnership,
  canChangeMemberRole,
} from "../utils/accountUtils";
import { useAuthContext } from "../context/AuthContext";

// Rate limiter dedicado a invitaciones (anti-abuso): máx 5/min por usuario.
const inviteLimiter = new RateLimiter(5, 60 * 1000);

/**
 * Hook que gestiona la cuenta (Account) del usuario logueado y su lista de miembros.
 *
 * Responsabilidad única (SRP): Account + miembros. Sin warehouses, sin billing,
 * sin auth. Esas dimensiones viven en sus propios contextos.
 *
 * Compatibilidad: si el usuario no pertenece a ninguna cuenta, devuelve account=null
 * sin lanzar — para que el resto de la app siga funcionando durante la migración
 * progresiva (Fase 1 no endurece nada).
 */
export default function useAccount() {
  const { user, loading: authLoading } = useAuthContext();

  const [accountId, setAccountId]   = useState(null);
  const [accountRole, setAccountRole] = useState(null);
  const [account, setAccount]       = useState(null);
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);

  // 1) Suscripción al doc del usuario para descubrir su accountId / accountRole.
  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setAccountId(null);
      setAccountRole(null);
      setAccount(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data() || {};
        setAccountId(typeof data.accountId === "string" && data.accountId ? data.accountId : null);
        setAccountRole(isValidAccountRole(data.accountRole) ? data.accountRole : null);
      },
      (err) => {
        logError("useAccount: subscribe user doc", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user, authLoading]);

  // 2) Suscripción al doc de la cuenta.
  useEffect(() => {
    if (!accountId) {
      setAccount(null);
      setLoading(authLoading);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "accounts", accountId),
      (snap) => {
        if (!snap.exists()) {
          setAccount(null);
          setLoading(false);
          return;
        }
        const data = snap.data() || {};
        setAccount({
          id: snap.id,
          name:        sanitizeString(data.name || ""),
          slug:        sanitizeString(data.slug || ""),
          ownerId:     typeof data.ownerId === "string" ? data.ownerId : "",
          plan:        typeof data.plan === "string" ? data.plan : "free",
          status:      typeof data.status === "string" ? data.status : "active",
          memberCount: Number.isFinite(Number(data.memberCount)) ? Number(data.memberCount) : 0,
          createdAtMs: data.createdAt?.toMillis?.() ?? 0,
          trialEndsAtMs: data.trialEndsAt?.toMillis?.() ?? null,
        });
        setLoading(false);
      },
      (err) => {
        logError("useAccount: subscribe account doc", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [accountId, authLoading]);

  // 3) Suscripción a la lista de miembros (users con accountId == este).
  useEffect(() => {
    if (!accountId) { setMembers([]); return; }
    const q = query(collection(db, "users"), where("accountId", "==", accountId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            uid:         d.id,
            email:       sanitizeString(data.email || ""),
            displayName: sanitizeString(data.displayName || ""),
            accountRole: isValidAccountRole(data.accountRole) ? data.accountRole : "member",
          };
        });
        setMembers(list);
      },
      (err) => logError("useAccount: subscribe members", err),
    );
    return () => unsub();
  }, [accountId]);

  // ── Mutaciones ──────────────────────────────────────────────────────────

  const createAccount = useCallback(async ({ name }) => {
    if (!user?.uid) throw new Error("No autenticado");
    if (accountId)  throw new Error("Ya perteneces a una cuenta");
    if (!isValidAccountName(name)) throw new Error("Nombre de cuenta inválido");
    const slug = slugify(name);
    if (!slug) throw new Error("No se pudo generar un slug válido");

    // Validar unicidad de slug client-side (las reglas también deben prevenir).
    const existing = await getDocs(query(collection(db, "accounts"), where("slug", "==", slug)));
    if (!existing.empty) throw new Error("Ya existe una cuenta con ese nombre");

    const accountRef = await addDoc(collection(db, "accounts"), {
      name: name.trim(),
      slug,
      ownerId: user.uid,
      plan: "free",
      status: "trial",
      trialEndsAt: null,
      memberCount: 1,
      createdAt: serverTimestamp(),
    });

    // Vincular al usuario como owner.
    await setDoc(
      doc(db, "users", user.uid),
      { accountId: accountRef.id, accountRole: "owner" },
      { merge: true },
    );

    await logAuditEvent("ACCOUNT_CREATED", "account", accountRef.id, {
      name: name.trim(),
      slug,
      actorUid: user.uid,
    });

    return { id: accountRef.id, slug };
  }, [user, accountId]);

  const inviteMember = useCallback(async ({ email, role = "member" }) => {
    if (!user?.uid) throw new Error("No autenticado");
    if (!accountId) throw new Error("No perteneces a ninguna cuenta");
    if (!canManageMembers(accountRole)) throw new Error("Sin permisos para invitar");
    if (!isValidEmail(email)) throw new Error("Email inválido");
    if (!isValidAccountRole(role) || role === "owner") throw new Error("Rol inválido");

    const limited = inviteLimiter.isAllowed(`invite:${user.uid}`);
    if (!limited.allowed) throw new Error("Demasiadas invitaciones, espera un momento");

    const normalizedEmail = email.trim().toLowerCase();

    // Buscar si ya existe un usuario con ese email.
    const userSnap = await getDocs(query(collection(db, "users"), where("email", "==", normalizedEmail)));
    if (userSnap.empty) {
      throw new Error("El usuario debe registrarse primero con ese email");
    }
    const targetDoc = userSnap.docs[0];
    if (targetDoc.data().accountId) {
      throw new Error("Ese usuario ya pertenece a una cuenta");
    }

    await updateDoc(doc(db, "users", targetDoc.id), {
      accountId,
      accountRole: role,
    });

    // Mantenemos memberCount denormalizado.
    await updateDoc(doc(db, "accounts", accountId), {
      memberCount: members.length + 1,
    });

    await logAuditEvent("MEMBER_INVITED", "account", accountId, {
      targetUid: targetDoc.id,
      email: normalizedEmail,
      role,
      actorUid: user.uid,
    });
  }, [user, accountId, accountRole, members.length]);

  const removeMember = useCallback(async (uid) => {
    if (!user?.uid) throw new Error("No autenticado");
    if (!accountId) throw new Error("No perteneces a ninguna cuenta");
    if (!canManageMembers(accountRole)) throw new Error("Sin permisos");
    if (!uid || typeof uid !== "string") throw new Error("UID inválido");
    if (uid === user.uid) throw new Error("No puedes eliminarte a ti mismo");

    const target = members.find((m) => m.uid === uid);
    if (!target) throw new Error("Miembro no encontrado");
    if (target.accountRole === "owner") throw new Error("No se puede eliminar al owner");

    await updateDoc(doc(db, "users", uid), { accountId: null, accountRole: null });
    await updateDoc(doc(db, "accounts", accountId), {
      memberCount: Math.max(0, members.length - 1),
    });

    await logAuditEvent("MEMBER_REMOVED", "account", accountId, {
      targetUid: uid,
      previousRole: target.accountRole,
      actorUid: user.uid,
    });
  }, [user, accountId, accountRole, members]);

  const updateMemberRole = useCallback(async (uid, newRole) => {
    if (!user?.uid) throw new Error("No autenticado");
    if (!accountId) throw new Error("No perteneces a ninguna cuenta");
    const target = members.find((m) => m.uid === uid);
    if (!target) throw new Error("Miembro no encontrado");

    const allowed = canChangeMemberRole({
      actorRole: accountRole,
      actorUid: user.uid,
      targetUid: uid,
      targetCurrentRole: target.accountRole,
      targetNewRole: newRole,
    });
    if (!allowed) throw new Error("No puedes hacer ese cambio de rol");

    await updateDoc(doc(db, "users", uid), { accountRole: newRole });

    await logAuditEvent("MEMBER_ROLE_CHANGED", "account", accountId, {
      targetUid: uid,
      previousRole: target.accountRole,
      newRole,
      actorUid: user.uid,
    });
  }, [user, accountId, accountRole, members]);

  const transferOwnership = useCallback(async (newOwnerUid) => {
    if (!user?.uid) throw new Error("No autenticado");
    if (!accountId) throw new Error("No perteneces a ninguna cuenta");
    if (!canTransferOwnership(accountRole)) throw new Error("Solo el owner puede transferir");
    if (!newOwnerUid || newOwnerUid === user.uid) throw new Error("Destino inválido");
    const target = members.find((m) => m.uid === newOwnerUid);
    if (!target) throw new Error("El destino no es miembro de la cuenta");

    // Transacción atómica: nuevo owner ascendido, viejo owner pasa a admin,
    // doc de la cuenta apunta al nuevo ownerId.
    await runTransaction(db, async (tx) => {
      tx.update(doc(db, "users", newOwnerUid), { accountRole: "owner" });
      tx.update(doc(db, "users", user.uid),    { accountRole: "admin" });
      tx.update(doc(db, "accounts", accountId), { ownerId: newOwnerUid });
    });

    await logAuditEvent("OWNERSHIP_TRANSFERRED", "account", accountId, {
      previousOwnerUid: user.uid,
      newOwnerUid,
    });
  }, [user, accountId, accountRole, members]);

  const isLoading = authLoading || loading;

  return useMemo(() => ({
    account,
    accountId,
    accountRole,
    members,
    loading: isLoading,
    createAccount,
    inviteMember,
    removeMember,
    updateMemberRole,
    transferOwnership,
  }), [account, accountId, accountRole, members, isLoading, createAccount, inviteMember, removeMember, updateMemberRole, transferOwnership]);
}
