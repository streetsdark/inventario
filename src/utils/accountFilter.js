/**
 * Helper puro para aislar datos por cuenta (multi-tenant Fase 2).
 *
 * Reglas:
 *  - Si selectedAccountId es falsy → no filtra (compatibilidad: tests
 *    legados sin AccountProvider devuelven todo).
 *  - Items con accountId que coincide → visibles.
 *  - Items SIN accountId (legacy) → visibles solo si selectedAccountId
 *    coincide con el accountId del usuario actual (defaultAccountId).
 *    Esto reproduce el patrón de warehouseFilter: los datos pre-tenant se
 *    consideran propiedad de la cuenta del usuario que los lee.
 *  - selectedAccountId === "__all__" → no filtra (vista superuser).
 */

export const ALL_ACCOUNTS = "__all__";

export function filterByAccount(items, selectedAccountId, defaultAccountId) {
  if (!Array.isArray(items)) return [];
  if (!selectedAccountId || selectedAccountId === ALL_ACCOUNTS) return items;
  return items.filter((it) => {
    const aid = typeof it?.accountId === "string" ? it.accountId : "";
    if (aid === selectedAccountId) return true;
    if (!aid && selectedAccountId === defaultAccountId) return true;
    return false;
  });
}

/**
 * Calcula el accountId que se debe escribir en un nuevo documento.
 * Prioriza el valor existente (no sobrescribir), luego el seleccionado.
 */
export function attachedAccountId(existingId, selectedAccountId) {
  if (typeof existingId === "string" && existingId.length > 0) return existingId;
  if (typeof selectedAccountId === "string" && selectedAccountId.length > 0) return selectedAccountId;
  return "";
}
