import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export default function useRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const superUserEmail = import.meta.env.VITE_SUPER_USER_EMAIL;
      // Comparación sin distinción de mayúsculas para evitar errores de tipeo en el .env
      if (superUserEmail && user.email?.toLowerCase() === superUserEmail.toLowerCase()) {
        // Siempre fuerza role='superuser' en Firestore (merge para no perder otros campos)
        try {
          await setDoc(
            doc(db, "users", user.uid),
            { email: user.email, displayName: user.displayName || "", role: "superuser" },
            { merge: true }
          );
        } catch (_) { /* sin bloquear si falla */ }
        setRole("superuser");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setRole(userSnap.data().role || "basic");
        } else {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || "",
            role: "basic",
            createdAt: serverTimestamp(),
          });
          setRole("basic");
        }
      } catch (err) {
        console.error("useRole error:", err);
        setRole("basic");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    role,
    isSuperUser: role === "superuser",
    isAdmin: role === "admin" || role === "superuser",
    canAccessDashboard: role === "superuser" || role === "admin",
    loading,
  };
}
