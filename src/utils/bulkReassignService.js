/**
 * Helpers puros para reasignación masiva de productos a otro almacén.
 *
 * Seguridad / robustez:
 *  - chunkIds parte la lista en bloques que respetan el tope de Firestore batch (500 ops).
 *  - validateReassign verifica origen ≠ destino, destino existe, ids no vacíos.
 *  - filterCandidates implementa la lógica del modal: qué productos ofrecer al usuario.
 *
 * Estos helpers NO tocan Firestore — solo transforman datos. Eso permite testearlos
 * sin mocks complejos y dejarlos en una utilidad reutilizable.
 */

// Retrocompat: re-exporta el límite duro desde batchService.
export { FIRESTORE_OPS_LIMIT as FIRESTORE_BATCH_LIMIT } from "./batchService";
export const UNASSIGNED = "__unassigned__";

/**
 * Filtra los productos candidatos según el origen elegido:
 *  - "__unassigned__" → productos sin warehouseId (legacy)
 *  - <id real>        → productos cuyo warehouseId coincide
 */
export function filterCandidates(products, originId) {
  if (!Array.isArray(products) || !originId) return [];
  if (originId === UNASSIGNED) {
    return products.filter((p) => {
      const wid = typeof p?.warehouseId === "string" ? p.warehouseId : "";
      return wid === "";
    });
  }
  return products.filter((p) => p?.warehouseId === originId);
}

/** Particiona ids en chunks. Wrapper retrocompatible sobre batchService.chunkArray. */
export { chunkArray as chunkIds } from "./batchService";

/**
 * Valida los parámetros antes de lanzar la operación batch.
 * Devuelve { ok: true } o { ok: false, reason: "..." }.
 */
export function validateReassign({ originId, destinationId, ids, warehouses }) {
  if (!destinationId || typeof destinationId !== "string") {
    return { ok: false, reason: "Destino requerido" };
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, reason: "Selecciona al menos un producto" };
  }
  if (originId === destinationId) {
    return { ok: false, reason: "Origen y destino no pueden ser iguales" };
  }
  if (!Array.isArray(warehouses) || !warehouses.some((w) => w?.id === destinationId)) {
    return { ok: false, reason: "El almacén destino no existe" };
  }
  // Validación adicional: todos los ids deben ser strings no vacíos.
  const allStrings = ids.every((id) => typeof id === "string" && id.length > 0);
  if (!allStrings) return { ok: false, reason: "IDs inválidos" };
  return { ok: true };
}
