/**
 * Helpers puros para el export GDPR de los datos de una cuenta.
 *
 * Sin dependencias de Firebase/React → testeable al 100%.
 */

import { safeFileName, downloadBlob } from "./exportService";

export const EXPORT_VERSION = "1.0";

/**
 * Combina los datos de una cuenta en un único objeto serializable.
 * No incluye campos sensibles internos (createdAt es timestamp, lo convierte).
 */
export function buildExportPayload({
  account,
  members,
  products,
  moves,
  warehouses,
  productRequests,
  notifications,
}) {
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    account: account || null,
    members: Array.isArray(members) ? members : [],
    data: {
      products:        Array.isArray(products)        ? products        : [],
      moves:           Array.isArray(moves)           ? moves           : [],
      warehouses:      Array.isArray(warehouses)      ? warehouses      : [],
      productRequests: Array.isArray(productRequests) ? productRequests : [],
      notifications:   Array.isArray(notifications)   ? notifications   : [],
    },
  };
}

/**
 * Cuenta items en cada colección. Útil para mostrar al usuario antes de
 * descargar.
 */
export function summarizePayload(payload) {
  const data = payload?.data || {};
  return {
    members:         (payload?.members || []).length,
    products:        (data.products || []).length,
    moves:           (data.moves || []).length,
    warehouses:      (data.warehouses || []).length,
    productRequests: (data.productRequests || []).length,
    notifications:   (data.notifications || []).length,
  };
}

/**
 * Sirve el blob JSON como descarga. Aislado para mockear en tests.
 */
export function downloadJsonExport(payload, filename = "altadill-export") {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const name = `${safeFileName(filename, "altadill-export")}.json`;
  downloadBlob(blob, name);
  return { bytes: blob.size, name };
}
