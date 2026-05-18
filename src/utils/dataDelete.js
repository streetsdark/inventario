/**
 * Helpers puros para el cascade delete de una cuenta (GDPR).
 *
 * Sin dependencias de Firebase/React → testeable al 100%.
 */

export const DELETE_BATCH_LIMIT = 500;
export const DELETE_COLLECTIONS = Object.freeze([
  "products",
  "moves",
  "warehouses",
  "productRequests",
  "notifications",
]);

/**
 * Particiona ids en chunks que respetan el batch limit de Firestore.
 */
export function chunkForDelete(ids, size = DELETE_BATCH_LIMIT) {
  if (!Array.isArray(ids)) return [];
  if (size <= 0) throw new Error("size debe ser > 0");
  const out = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/**
 * Comprueba si el nombre escrito por el usuario coincide exactamente con el
 * de la cuenta. Usado en el modal de triple confirmación.
 */
export function isExactAccountNameMatch(typedName, actualName) {
  if (typeof typedName !== "string" || typeof actualName !== "string") return false;
  return typedName.trim() === actualName.trim();
}

/**
 * Valida los parámetros antes de la operación de borrado.
 */
export function validateDelete({ accountId, confirmationTyped, accountName, role }) {
  if (typeof accountId !== "string" || accountId.length === 0) {
    return { ok: false, reason: "Cuenta inválida" };
  }
  if (role !== "owner") {
    return { ok: false, reason: "Solo el owner puede borrar la cuenta" };
  }
  if (!isExactAccountNameMatch(confirmationTyped, accountName)) {
    return { ok: false, reason: "El nombre escrito no coincide con el de la cuenta" };
  }
  return { ok: true };
}

/**
 * Cuenta el total de ids agrupados por colección.
 */
export function totalToDelete(idsByCollection) {
  if (!idsByCollection || typeof idsByCollection !== "object") return 0;
  return Object.values(idsByCollection).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
}
