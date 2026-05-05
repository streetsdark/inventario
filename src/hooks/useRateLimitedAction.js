import { useState, useCallback } from "react";
import { auth } from "../firebase/config";

/**
 * Hook para aplicar Rate Limiting a acciones específicas
 * Limita el número de solicitudes por usuario en un período de tiempo
 */
export function useRateLimitedAction(
  action,
  maxAttempts = 5,
  windowMs = 60000
) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remaining, setRemaining] = useState(maxAttempts);
  const [resetTime, setResetTime] = useState(null);

  // Usar localStorage para persistir rate limit entre pestañas
  const getStorageKey = () => {
    const userId = auth.currentUser?.uid || "anonymous";
    return `rateLimit_${action}_${userId}`;
  };

  const getAttemptData = () => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const saveAttemptData = (data) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  };

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    let attempts = getAttemptData();

    // Si no hay datos previos o la ventana expiró
    if (!attempts || now - attempts.firstAttempt > windowMs) {
      attempts = {
        count: 1,
        firstAttempt: now,
      };
      saveAttemptData(attempts);
      setIsBlocked(false);
      setRemaining(maxAttempts - 1);
      setResetTime(now + windowMs);
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    // Incrementar contador
    attempts.count++;
    const timeToReset = attempts.firstAttempt + windowMs;

    if (attempts.count > maxAttempts) {
      saveAttemptData(attempts);
      setIsBlocked(true);
      setRemaining(0);
      setResetTime(timeToReset);

      console.warn(
        `⚠️ Rate limit alcanzado para "${action}". Reintenta en ${Math.ceil((timeToReset - now) / 1000)} segundos.`
      );

      return {
        allowed: false,
        remaining: 0,
        resetTime: timeToReset,
      };
    }

    saveAttemptData(attempts);
    setIsBlocked(false);
    setRemaining(maxAttempts - attempts.count);
    setResetTime(timeToReset);

    return {
      allowed: true,
      remaining: maxAttempts - attempts.count,
      resetTime: timeToReset,
    };
  }, [action, maxAttempts, windowMs]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      setIsBlocked(false);
      setRemaining(maxAttempts);
      setResetTime(null);
    } catch {
      // Ignorar errores de localStorage
    }
  }, [getStorageKey, maxAttempts]);

  return {
    checkRateLimit,
    isBlocked,
    remaining,
    resetTime,
    reset,
  };
}

/**
 * Formatea el tiempo de espera en un formato legible
 */
export function formatResetTime(resetTime) {
  if (!resetTime) return "";
  const seconds = Math.ceil((resetTime - Date.now()) / 1000);
  if (seconds <= 0) return "Ya disponible";
  return `${seconds}s`;
}
