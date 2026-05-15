/**
 * Helpers puros para filtrar productos y movimientos por almacén.
 *
 * Reglas:
 *  - Si selectedWarehouseId es falsy → no filtra (devuelve todo).
 *  - Si un item NO tiene warehouseId Y se eligió el almacén por defecto → se incluye.
 *    Esto permite que los datos legados (sin warehouseId) sigan visibles bajo
 *    el almacén principal mientras se migran progresivamente.
 *  - Si selectedWarehouseId es "__all__" → no filtra (vista global).
 *
 * Sin estos helpers, los hooks tendrían que duplicar la lógica de fallback.
 */

export const ALL_WAREHOUSES = "__all__";

export function filterByWarehouse(items, selectedWarehouseId, defaultWarehouseId) {
  if (!Array.isArray(items)) return [];
  if (!selectedWarehouseId || selectedWarehouseId === ALL_WAREHOUSES) return items;
  return items.filter((it) => {
    const wid = typeof it?.warehouseId === "string" ? it.warehouseId : "";
    if (wid === selectedWarehouseId) return true;
    if (!wid && selectedWarehouseId === defaultWarehouseId) return true;
    return false;
  });
}

/** Valida el nombre de un almacén antes de crearlo/actualizarlo. */
export function isValidWarehouseName(name) {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  return /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.,&'°\-_/() ]+$/.test(trimmed);
}

/** Identifica el almacén marcado como default, o el más antiguo, o null. */
export function pickDefaultWarehouse(warehouses) {
  if (!Array.isArray(warehouses) || warehouses.length === 0) return null;
  const flagged = warehouses.find((w) => w?.isDefault === true);
  if (flagged) return flagged;
  return warehouses.reduce((oldest, w) => {
    if (!oldest) return w;
    const a = oldest?.createdAtMs || 0;
    const b = w?.createdAtMs || 0;
    return b < a && b > 0 ? w : oldest;
  }, null);
}
