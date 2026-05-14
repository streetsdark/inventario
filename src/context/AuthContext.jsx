import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { error as logError } from "../utils/logger";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      const superUserEmail = import.meta.env.VITE_SUPER_USER_EMAIL;
      if (superUserEmail && firebaseUser.email?.toLowerCase() === superUserEmail.toLowerCase()) {
        try {
          await setDoc(
            doc(db, "users", firebaseUser.uid),
            { email: firebaseUser.email, displayName: firebaseUser.displayName || "", role: "superuser" },
            { merge: true }
          );
        } catch (_) {}
        setRole("superuser");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setRole(userSnap.data().role || "basic");
        } else {
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            role: "basic",
            createdAt: serverTimestamp(),
          });
          setRole("basic");
        }
      } catch (err) {
        logError("AuthContext error:", err);
        setRole("basic");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  return ctx;
}
