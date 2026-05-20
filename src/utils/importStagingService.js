/**
 * Helpers puros para el flujo de import en staging.
 *
 * Filosofía: guardamos las filas TAL CUAL las trae el CSV (sin transformar
 * ni perder información). El usuario decide qué hacer con cada fila desde
 * la app (importar, editar, descartar).
 *
 * Solo se sanitiza al renderizar (React) y al construir el producto final
 * que va a /products (cuando el usuario aprueba).
 */

import Papa from "papaparse";
import { sanitizeString } from "./securityValidation";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB
export const MAX_ROWS_PER_IMPORT = 1000;

// Detecta automáticamente separadores comunes en CSV en español
const COMMON_DELIMITERS = [";", ",", "\t", "|"];

/**
 * Parsea un texto CSV en filas (array de arrays). Sin opciones de transformación.
 * Usa Papa Parse con autodetección de delimitador y manejo de comillas.
 */
export function parseCsvText(text, options = {}) {
  if (typeof text !== "string" || text.length === 0) {
    return { rows: [], errors: [{ message: "Texto vacío" }], meta: null };
  }
  const result = Papa.parse(text, {
    delimiter:        options.delimiter ?? "",          // autodetect
    delimitersToGuess: COMMON_DELIMITERS,
    skipEmptyLines:   "greedy",
    transform:        (v) => (typeof v === "string" ? v.trim() : v),
  });
  return {
    rows: Array.isArray(result.data) ? result.data : [],
    errors: result.errors || [],
    meta: result.meta || null,
  };
}

/**
 * Valida el File del input <input type=file>.
 * Devuelve { ok: boolean, reason?: string }.
 */
export function validateFile(file) {
  if (!file) return { ok: false, reason: "No se ha seleccionado archivo" };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: `Archivo demasiado grande (máx ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB)` };
  }
  const name = String(file.name || "").toLowerCase();
  if (!name.endsWith(".csv")) {
    return { ok: false, reason: "Solo se aceptan archivos .csv en esta versión" };
  }
  return { ok: true };
}

/**
 * Detecta si la primera fila es una cabecera real (texto en todas las celdas)
 * o si parece datos. Solo usamos esto como heurística — el usuario podrá
 * marcar/desmarcar "primera fila es cabecera" en la UI.
 */
export function looksLikeHeader(firstRow) {
  if (!Array.isArray(firstRow) || firstRow.length === 0) return false;
  // Si todas las celdas son strings no numéricos no vacíos → probable cabecera
  return firstRow.every((cell) => {
    const s = String(cell ?? "").trim();
    if (!s) return false;
    return Number.isNaN(Number(s));
  });
}

/**
 * Convierte un array de filas en docs listos para escribir en /importStaging.
 * Conserva el array original de celdas en `cells` y añade metadata.
 *
 * El docId NO se asigna aquí (Firestore lo genera).
 */
export function buildStagingDocs({ rows, importId, accountId, fileName, headerRow }) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (typeof importId !== "string" || !importId) {
    throw new Error("importId requerido");
  }
  if (typeof accountId !== "string" || !accountId) {
    throw new Error("accountId requerido para escribir staging");
  }
  if (rows.length > MAX_ROWS_PER_IMPORT) {
    throw new Error(`Demasiadas filas (máx ${MAX_ROWS_PER_IMPORT})`);
  }
  const safeFileName = sanitizeString(typeof fileName === "string" ? fileName : "").slice(0, 200);
  return rows.map((cells, idx) => ({
    importId,
    accountId,
    fileName: safeFileName,
    rowIndex: idx,
    cells: Array.isArray(cells)
      ? cells.map((c) => (typeof c === "string" ? c.slice(0, 500) : String(c ?? "").slice(0, 500)))
      : [],
    headerRow: Array.isArray(headerRow)
      ? headerRow.map((c) => (typeof c === "string" ? c.slice(0, 200) : String(c ?? "").slice(0, 200)))
      : null,
    status: "pending",      // pending | imported | discarded
    notes: "",              // texto libre que añade el user al revisar
  }));
}

/**
 * A partir de una fila del staging + un mapeo de columnas (qué celda
 * corresponde a qué campo del producto), construye el objeto product
 * listo para escribir en /products.
 *
 * mapping ejemplo: { sku: 2, description: 1, location: 3, brand: 4, stock: 5 }
 *
 * options.extraValues: objeto { virtualId: value } con los valores que el
 *   usuario haya introducido en columnas virtuales del staging.
 * options.insertedColumns: [{ id, name, afterIndex }] con metadata de las
 *   columnas virtuales para asociar nombre↔valor.
 *
 * Estos extra values se guardan en el producto como `customFields: { name: value }`
 * para conservar toda la información introducida por el usuario.
 */
export function buildProductFromStaging(stagingRow, mapping, currentAccountId, options = {}) {
  if (!stagingRow || !Array.isArray(stagingRow.cells)) {
    throw new Error("Fila inválida");
  }
  if (!mapping || typeof mapping !== "object") {
    throw new Error("Mapeo de columnas requerido");
  }
  if (!currentAccountId) {
    throw new Error("accountId requerido");
  }

  const getCell = (index) => {
    if (typeof index !== "number" || index < 0 || index >= stagingRow.cells.length) return "";
    return String(stagingRow.cells[index] ?? "").trim();
  };

  // Stock puede venir con texto (ej "2 CAJAS", "21 + 1") — extraemos el primer número.
  const parseStock = (raw) => {
    const match = String(raw || "").match(/-?\d+/);
    return match ? Number(match[0]) : 0;
  };

  // Mapa de columnas virtuales → { nombre limpio: valor } como customFields.
  // Solo guardamos las que tienen valor no vacío para no inflar el doc.
  const customFields = {};
  const extraValues = options.extraValues || {};
  const insertedColumns = Array.isArray(options.insertedColumns) ? options.insertedColumns : [];
  for (const col of insertedColumns) {
    const raw = extraValues[col.id];
    const val = typeof raw === "string" ? raw.trim() : "";
    if (val && col.name) {
      // Sanitizamos clave: solo alfanum + espacios → camelCase corto (máx 40)
      const cleanKey = col.name.trim().slice(0, 40);
      if (cleanKey) customFields[cleanKey] = val.slice(0, 500);
    }
  }

  return {
    sku:           getCell(mapping.sku).slice(0, 50)         || "",
    description:   getCell(mapping.description).slice(0, 500) || "Sin nombre",
    location:      getCell(mapping.location).slice(0, 100)   || "",
    brand:         getCell(mapping.brand).slice(0, 100)      || "",
    stock:         parseStock(getCell(mapping.stock)),
    product_Unit:  getCell(mapping.unit).slice(0, 20)        || "u",
    cost:          0,
    pending:       0,
    stockMinimo:   0,
    totalIn:       0,
    totalOut:      0,
    imageUrl:      "",
    // Dimensiones por defecto (FormProduct espera {size, unit})
    width:     { size: 0, unit: "-" },
    height:    { size: 0, unit: "-" },
    weight:    { size: 0, unit: "-" },
    thickness: { size: 0, unit: "-" },
    color:     "",
    // Columnas virtuales del staging guardadas como customFields.
    // Solo se incluye el objeto si tiene al menos una entrada.
    ...(Object.keys(customFields).length > 0 ? { customFields } : {}),
    // Conservamos referencia al staging para auditar
    importSourceId: stagingRow.id || null,
    accountId:     currentAccountId,
    // El warehouseId se setea en el cliente desde el contexto al guardar
  };
}

/**
 * Valida que el mapeo NO solo esté completo en estructura, sino que la
 * columna mapeada a 'description' contenga datos reales (no esté toda
 * en blanco). Devuelve { ok, reason }.
 *
 * sampleSize: cuántas filas muestreamos para la validación (default 20).
 */
export function isMappingValid(mapping, rows, sampleSize = 20) {
  if (!isMappingComplete(mapping)) {
    return { ok: false, reason: "Mapea al menos la columna 'Descripción' para poder importar." };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "No hay filas para validar el mapeo." };
  }
  const descIdx = mapping.description;
  const sample = rows.slice(0, sampleSize);
  const withData = sample.filter((r) => {
    const cell = r?.cells?.[descIdx];
    return typeof cell === "string" && cell.trim().length > 0;
  });
  if (withData.length === 0) {
    return {
      ok: false,
      reason: "La columna mapeada a 'Descripción' está vacía en las filas muestreadas. Revisa el mapeo.",
    };
  }
  return { ok: true };
}

/**
 * Verifica que un mapeo tenga al menos los campos mínimos para crear un producto.
 */
export function isMappingComplete(mapping) {
  if (!mapping || typeof mapping !== "object") return false;
  // Mínimo viable: tenemos alguna celda que actúe como descripción
  return typeof mapping.description === "number" && mapping.description >= 0;
}

/**
 * Resumen del staging para mostrar al usuario antes de hacer push de docs.
 */
export function summarizeImport(rows, headerRow) {
  return {
    totalRows: rows.length,
    columns:   headerRow ? headerRow.length : (rows[0]?.length || 0),
    hasHeader: !!headerRow,
    preview:   rows.slice(0, 5),
  };
}
