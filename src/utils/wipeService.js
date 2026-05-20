/**
 * Helpers puros para el wipe completo de la app (solo superuser).
 *
 * Sin dependencias de Firebase/React → testeables al 100%.
 *
 * Filosofía:
 *  - Borra TODOS los docs de todas las colecciones de datos.
 *  - Borra accounts y users (excepto el superuser actual para que pueda volver
 *    a entrar después).
 *  - Borra warehouses (incluyendo defaults — el superuser tiene bypass).
 *  - Conserva auditLogs por defecto (historial). Opción para borrarlos también.
 *  - NO borra usuarios de Firebase Auth (eso requiere Admin SDK desde server).
 */

// Retrocompat: constante delegada en batchService.
export { FIRESTORE_OPS_LIMIT as WIPE_BATCH_LIMIT } from "./batchService";

// Colecciones de datos de negocio que se borran sí o sí
export const DATA_COLLECTIONS = Object.freeze([
  "products",
  "moves",
  "warehouses",
  "productRequests",
  "notifications",
]);

// Colecciones meta que se borran también (con cuidado)
export const META_COLLECTIONS = Object.freeze([
  "accounts",
]);

// Frase exacta que el usuario debe escribir para confirmar el wipe.
// Mayúsculas obligatorias — anti-confirmación accidental.
export const WIPE_CONFIRMATION_PHRASE = "BORRAR TODO";

// Retrocompat: chunkForWipe ahora delega en batchService.chunkArray.
export { chunkArray as chunkForWipe } from "./batchService";

/**
 * Valida que el texto escrito coincide EXACTAMENTE con la frase de
 * confirmación. Sensible a mayúsculas para evitar pulsaciones accidentales.
 */
export function validateWipeConfirmation(typed) {
  if (typeof typed !== "string") return false;
  return typed.trim() === WIPE_CONFIRMATION_PHRASE;
}

/**
 * Filtra los UIDs de usuarios que SÍ se deben borrar, preservando al actor.
 * El superuser actual debe sobrevivir para poder seguir usando la app.
 */
export function filterUsersToDelete(allUserIds, currentUid) {
  if (!Array.isArray(allUserIds)) return [];
  if (typeof currentUid !== "string" || !currentUid) return [];
  return allUserIds.filter((id) => id !== currentUid);
}

/**
 * Resumen pre-wipe para mostrar al usuario antes de confirmar.
 */
export function summarizeWipe(countsByCollection, usersToDelete) {
  if (!countsByCollection || typeof countsByCollection !== "object") {
    return { total: 0, detail: {} };
  }
  let total = (usersToDelete?.length || 0);
  const detail = { users: usersToDelete?.length || 0 };
  for (const col of [...DATA_COLLECTIONS, ...META_COLLECTIONS]) {
    const n = countsByCollection[col] || 0;
    detail[col] = n;
    total += n;
  }
  return { total, detail };
}
