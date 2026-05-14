import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { error as logError } from "../utils/logger";

export default function useUsers() {
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

  const updateRole = async (uid, role) => {
    await updateDoc(doc(db, "users", uid), { role });
  };

  const updateAlias = async (uid, alias) => {
    await updateDoc(doc(db, "users", uid), { alias: alias.trim() });
  };

  return { users, loading, updateRole, updateAlias };
}
