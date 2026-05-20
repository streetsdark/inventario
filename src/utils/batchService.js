/**
 * Servicio centralizado para batches y chunking de Firestore.
 *
 * Antes había 4 funciones de chunking duplicadas:
 *  - bulkReassignService.chunkIds
 *  - dataDelete.chunkForDelete
 *  - legacyMigrationService.chunkForBatch
 *  - wipeService.chunkForWipe
 *
 * Todas hacían exactamente lo mismo. Ahora todas re-exportan o usan esta.
 *
 * Firestore writeBatch admite hasta 500 operaciones. Cuando una sola
 * operación lógica de negocio = 2 ops Firestore (ej. crear producto +
 * actualizar staging), usamos FIRESTORE_OPS_BATCH_SIZE / 2 filas por batch.
 */

// Límite duro de operaciones por writeBatch en Firestore.
export const FIRESTORE_OPS_LIMIT = 500;

// Tamaño recomendado para batches simples (1 op por elemento): 500.
export const FIRESTORE_SINGLE_OP_BATCH_SIZE = 500;

// Tamaño recomendado para batches dobles (2 ops por elemento, ej. set + update): 200.
// 200 elementos × 2 ops = 400 ops, queda margen para evitar bordes.
export const FIRESTORE_DOUBLE_OP_BATCH_SIZE = 200;

/**
 * Particiona un array en chunks del tamaño indicado.
 * Devuelve [] si la entrada no es un array. Lanza si size <= 0.
 */
export function chunkArray(items, size = FIRESTORE_SINGLE_OP_BATCH_SIZE) {
  if (!Array.isArray(items)) return [];
  if (size <= 0) throw new Error("size debe ser > 0");
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
