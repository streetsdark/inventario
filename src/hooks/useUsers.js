import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { error as logError } from "../utils/logger";
import { useAccountContext } from "../context/AccountContext";

/**
 * Lista usuarios visibles para el usuario actual.
 *
 * Las reglas Firestore (Fase 4) ya filtran a nivel servidor: cada usuario
 * solo lee los que comparten su accountId (más el propio y superusers).
 * Aquí aplicamos un segundo filtro en cliente como defensa en profundidad
 * y para que la UI sea consistente con el modelo multi-tenant.
 */
export default function useUsers() {
  const { accountId } = useAccountContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || ""))
        );
        setLoading(false);
      },
      (err) => {
        logError("useUsers error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const visibleUsers = useMemo(() => {
    if (!accountId) return users;
    return users.filter((u) => !u.accountId || u.accountId === accountId);
  }, [users, accountId]);

  const updateRole = async (uid, role) => {
    await updateDoc(doc(db, "users", uid), { role });
  };

  const updateAlias = async (uid, alias) => {
    await updateDoc(doc(db, "users", uid), { alias: alias.trim() });
  };

  return { users: visibleUsers, loading, updateRole, updateAlias };
}
