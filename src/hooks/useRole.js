import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";

// 👑 Define aquí el email del super usuario
const SUPER_USER_EMAIL = import.meta.env.VITE_SUPER_USER_EMAIL || "admin@example.com";

export default function useRole() {
  const [user, setUser] = useState(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      
      if (currentUser) {
        // Verificar si el usuario es super usuario comparando emails
        setIsSuperUser(currentUser.email === SUPER_USER_EMAIL);
      } else {
        setIsSuperUser(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isSuperUser, loading };
}
