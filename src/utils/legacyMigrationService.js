/**
 * Helpers puros para la migración Fase 3 (asignar accountId a documentos
 * legacy creados antes del modelo multi-tenant).
 *
 * Sin dependencias de Firebase/React → testeables al 100%.
 */

export const MIGRATION_COLLECTIONS = Object.freeze([
  "products",
  "moves",
  "warehouses",
  "productRequests",
  "notifications",
]);

export const MIGRATION_BATCH_LIMIT = 500;

/**
 * Devuelve los IDs de los documentos que NO tienen un accountId asignado.
 * Acepta accountId == "" o == null/undefined como "legacy".
 */
export function findLegacyIds(docs) {
  if (!Array.isArray(docs)) return [];
  return docs
    .filter((d) => {
      const aid = typeof d?.accountId === "string" ? d.accountId : "";
      return aid.length === 0;
    })
    .map((d) => d?.id)
    .filter((id) => typeof id === "string" && id.length > 0);
}

/**
 * Particiona ids en chunks que respetan el límite de Firestore batch.
 */
export function chunkForBatch(ids, size = MIGRATION_BATCH_LIMIT) {
  if (!Array.isArray(ids)) return [];
  if (size <= 0) throw new Error("size debe ser > 0");
  const out = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/**
 * Valida los parámetros antes de ejecutar la migración.
 * Devuelve { ok: true } o { ok: false, reason }.
 */
export function validateMigration({ accountId, totalLegacy }) {
  if (typeof accountId !== "string" || accountId.length === 0) {
    return { ok: false, reason: "accountId requerido" };
  }
  if (typeof totalLegacy !== "number" || totalLegacy < 0) {
    return { ok: false, reason: "totalLegacy inválido" };
  }
  if (totalLegacy === 0) {
    return { ok: false, reason: "No hay documentos legacy para migrar" };
  }
  return { ok: true };
}

/**
 * Construye el patch que se aplica a cada doc en la migración.
 * Mantenerlo aquí (no inline) facilita auditoría y tests.
 */
export function buildMigrationPatch(accountId) {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new Error("accountId requerido para migración");
  }
  return { accountId };
}

/**
 * Resume el resultado de un análisis legacy por colección.
 * Acepta { products: [...], moves: [...], ... } y devuelve totales y desglose.
 */
export function summarizeAnalysis(analysisByCollection) {
  const detail = {};
  let total = 0;
  for (const col of MIGRATION_COLLECTIONS) {
    const ids = analysisByCollection?.[col] || [];
    detail[col] = ids.length;
    total += ids.length;
  }
  return { total, detail };
}
