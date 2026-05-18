import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../css/cookieBanner.css";

const STORAGE_KEY = "altadill.cookieConsent";
const VERSION = "1";

/**
 * Cookie banner básico GDPR. Guarda la decisión en localStorage con un
 * número de versión — si cambias la política, sube la versión para que se
 * vuelva a mostrar.
 *
 * Las cookies estrictamente necesarias (Firebase Auth, localStorage de
 * preferencias) NO requieren consentimiento. Esto controla solo las
 * funcionales (Cloudinary) y futuras analytics.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setVisible(true); return; }
      const parsed = JSON.parse(raw);
      if (parsed?.version !== VERSION) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (accepted) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: VERSION,
        accepted: !!accepted,
        timestamp: new Date().toISOString(),
      }));
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Aviso de cookies">
      <div className="cookie-banner-inner">
        <p>
          Usamos cookies estrictamente necesarias para que la app funcione
          (auth, preferencias). Las funcionales (imágenes externas) son
          opcionales. Sin analytics ni marketing.{" "}
          <Link to="/cookies">Más info</Link>.
        </p>
        <div className="cookie-banner-actions">
          <button type="button" className="cookie-btn ghost" onClick={() => decide(false)}>
            Solo necesarias
          </button>
          <button type="button" className="cookie-btn primary" onClick={() => decide(true)}>
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper para que otros componentes (p.ej. carga de Cloudinary) puedan
 * saber si tienen consentimiento.
 */
export function hasFunctionalCookieConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.version === VERSION && parsed?.accepted === true;
  } catch {
    return false;
  }
}
