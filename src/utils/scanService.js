/**
 * Servicio de escaneo de códigos (QR / código de barras).
 *
 * Seguridad aplicada:
 *  - El valor escaneado es input no confiable: se valida formato + longitud.
 *  - Se descartan caracteres de control, comillas y separadores raros.
 *  - El código se compara contra productos en memoria (sin query directa a BD).
 *  - Throttle interno: no procesar el mismo código en < SCAN_COOLDOWN_MS.
 */

const MAX_CODE_LENGTH = 80;
const MIN_CODE_LENGTH = 1;
const ALLOWED_PATTERN = /^[A-Za-z0-9._\-/ ]+$/; // alfanumérico + caracteres comunes de SKU
export const SCAN_COOLDOWN_MS = 1500;

/**
 * Normaliza un código escaneado:
 *  - quita espacios de los bordes
 *  - elimina caracteres de control
 *  - rechaza si excede longitud o tiene caracteres no permitidos
 *  - devuelve null si no es válido
 */
export function sanitizeScannedCode(raw) {
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (s.length < MIN_CODE_LENGTH || s.length > MAX_CODE_LENGTH) return null;
  if (!ALLOWED_PATTERN.test(s)) return null;
  return s;
}

/**
 * Busca un producto cuyo SKU coincida exactamente (case-insensitive) con el código.
 * Si no, devuelve el primer producto cuyo SKU comience con el código (prefijo).
 */
export function findProductByCode(products, code) {
  if (!Array.isArray(products) || !code) return null;
  const needle = code.toLowerCase();
  const exact = products.find(
    (p) => String(p?.sku || "").trim().toLowerCase() === needle,
  );
  if (exact) return exact;
  return (
    products.find((p) =>
      String(p?.sku || "").trim().toLowerCase().startsWith(needle),
    ) || null
  );
}

/**
 * Cooldown stateless: dado el timestamp del último scan + ahora, decide si aceptar.
 * Útil para tests deterministas.
 */
export function shouldAcceptScan(lastTs, nowTs, cooldown = SCAN_COOLDOWN_MS) {
  if (typeof lastTs !== "number" || lastTs <= 0) return true;
  return nowTs - lastTs >= cooldown;
}
