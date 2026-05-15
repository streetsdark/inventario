import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuthContext } from "../context/AuthContext";
import { error as logError } from "../utils/logger";
import { logAuditEvent } from "../utils/auditService";

/**
 * Estado del onboarding del usuario actual.
 * SRP: solo lee/escribe el flag `onboardingCompleted` en users/{uid}.
 *
 * Compatibilidad: si el doc no tiene el flag (usuario antiguo), se asume
 * completado para no molestar a quien ya conoce la app.
 */
export default function useOnboarding() {
  const { user, loading: authLoading } = useAuthContext();
  const [completed, setCompleted] = useState(true);   // optimista: no molestar
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (authLoading || !user?.uid) { setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data() || {};
        // Usuario sin el campo = ya en uso → completado (no molestamos).
        // Usuario con el campo === false = en wizard.
        setCompleted(data.onboardingCompleted !== false);
        setLoading(false);
      },
      (err) => {
        logError("useOnboarding: subscribe", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user, authLoading]);

  const complete = useCallback(async () => {
    if (!user?.uid) return;
    await setDoc(
      doc(db, "users", user.uid),
      { onboardingCompleted: true },
      { merge: true },
    );
    await logAuditEvent("ONBOARDING_COMPLETED", "user", user.uid, {});
  }, [user]);

  const skip = useCallback(async () => {
    if (!user?.uid) return;
    await setDoc(
      doc(db, "users", user.uid),
      { onboardingCompleted: true, onboardingSkipped: true },
      { merge: true },
    );
    await logAuditEvent("ONBOARDING_SKIPPED", "user", user.uid, {});
  }, [user]);

  return { completed, loading, complete, skip };
}
