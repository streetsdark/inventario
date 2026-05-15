/**
 * Servicio de exportación a CSV y PDF.
 *
 * Seguridad aplicada:
 *  - CSV formula injection (=, +, -, @, TAB, CR al inicio) → se prefija con apóstrofo.
 *  - CSV escape de comillas dobles y envoltura por celda.
 *  - Limpieza de caracteres de control que podrían romper el parsing del CSV.
 *  - Validación de entrada (array, longitud máxima razonable).
 *  - Sanitización del nombre de archivo.
 *  - PDF: jsPDF trata las cadenas como texto, no como HTML/JS.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sanitizeString, isValidDate } from "./securityValidation";

const MAX_ROWS = 50000; // techo razonable de exportación
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Convierte cualquier valor a una celda CSV segura.
 *  - null/undefined → cadena vacía.
 *  - elimina caracteres de control (excepto saltos de línea internos).
 *  - prefija con ' si el primer carácter podría iniciar una fórmula.
 *  - envuelve en comillas dobles y escapa comillas internas.
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let s = String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (s.length > 0 && FORMULA_TRIGGERS.includes(s.charAt(0))) {
    s = "'" + s;
  }
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

/**
 * Genera el contenido CSV a partir de filas + encabezados.
 * Añade el BOM UTF-8 para que Excel reconozca acentos al abrirlo.
 */
export function buildCsv(headers, rows) {
  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    throw new Error("buildCsv: headers y rows deben ser arrays");
  }
  if (rows.length > MAX_ROWS) {
    throw new Error(`buildCsv: demasiadas filas (máx ${MAX_ROWS})`);
  }
  const head = headers.map(escapeCsvCell).join(",");
  const body = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  return "﻿" + head + "\r\n" + body;
}

/** Valida y normaliza un nombre de archivo (sin separadores de ruta ni control). */
export function safeFileName(name, fallback = "export") {
  const cleaned = String(name || "")
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}

/**
 * Dispara la descarga del blob como archivo.
 * Aislado para poder mockearse en tests.
 */
export function downloadBlob(blob, filename) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function safeMoveDate(m) {
  const d =
    (m.type === "in" ? m.entryDate : m.exitDate) ||
    m.movementDate ||
    "";
  const s = String(d).slice(0, 10);
  return s && isValidDate(s) ? s : "";
}

/** Normaliza un movimiento a una fila plana lista para exportar. */
export function normalizeMoveRow(m) {
  return {
    fecha:    safeMoveDate(m),
    tipo:     m.type === "in" ? "Entrada" : m.type === "out" ? "Salida" : "",
    sku:      sanitizeString(typeof m.sku === "string" ? m.sku : ""),
    producto: sanitizeString(typeof m.description === "string" ? m.description : ""),
    cantidad: Number.isFinite(Number(m.quantity)) ? Number(m.quantity) : 0,
    unidad:   sanitizeString(typeof m.product_Unit === "string" ? m.product_Unit : ""),
    usuario:  sanitizeString(typeof m.recipientUser === "string" ? m.recipientUser : ""),
    estado:   sanitizeString(typeof m.deliveryStatus === "string" ? m.deliveryStatus : ""),
  };
}

export function normalizeProductRow(p) {
  return {
    sku:        sanitizeString(typeof p.sku === "string" ? p.sku : ""),
    producto:   sanitizeString(typeof p.description === "string" ? p.description : ""),
    stock:      Number.isFinite(Number(p.stock))   ? Number(p.stock)   : 0,
    pendiente:  Number.isFinite(Number(p.pending)) ? Number(p.pending) : 0,
    unidad:     sanitizeString(typeof p.product_Unit === "string" ? p.product_Unit : ""),
    ubicacion:  sanitizeString(typeof p.location === "string" ? p.location : ""),
    marca:      sanitizeString(typeof p.brand === "string" ? p.brand : ""),
  };
}

/* ── Movimientos ──────────────────────────────────────────────── */

const MOVE_HEADERS = ["Fecha", "Tipo", "SKU", "Producto", "Cantidad", "Unidad", "Usuario", "Estado"];

export function exportMovementsToCSV(moves, filename) {
  if (!Array.isArray(moves)) throw new Error("moves debe ser un array");
  const rows = moves.map(normalizeMoveRow).map((r) => [
    r.fecha, r.tipo, r.sku, r.producto, r.cantidad, r.unidad, r.usuario, r.estado,
  ]);
  const csv = buildCsv(MOVE_HEADERS, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${safeFileName(filename, `movimientos_${todayStamp()}`)}.csv`);
  return { rows: rows.length };
}

export function exportMovementsToPDF(moves, filename) {
  if (!Array.isArray(moves)) throw new Error("moves debe ser un array");
  const rows = moves.map(normalizeMoveRow).map((r) => [
    r.fecha, r.tipo, r.sku, r.producto, String(r.cantidad), r.unidad, r.usuario, r.estado,
  ]);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Histórico de movimientos", 14, 16);
  doc.setFontSize(9);
  doc.text(`Generado: ${todayStamp()} · ${rows.length} registros`, 14, 22);
  autoTable(doc, {
    head: [MOVE_HEADERS],
    body: rows,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [77, 184, 240] },
    alternateRowStyles: { fillColor: [245, 250, 254] },
  });
  doc.save(`${safeFileName(filename, `movimientos_${todayStamp()}`)}.pdf`);
  return { rows: rows.length };
}

/* ── Stock ────────────────────────────────────────────────────── */

const STOCK_HEADERS = ["SKU", "Producto", "Stock", "Pendiente", "Unidad", "Ubicación", "Marca"];

export function exportStockToCSV(products, filename) {
  if (!Array.isArray(products)) throw new Error("products debe ser un array");
  const rows = products.map(normalizeProductRow).map((r) => [
    r.sku, r.producto, r.stock, r.pendiente, r.unidad, r.ubicacion, r.marca,
  ]);
  const csv = buildCsv(STOCK_HEADERS, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${safeFileName(filename, `stock_${todayStamp()}`)}.csv`);
  return { rows: rows.length };
}

export function exportStockToPDF(products, filename) {
  if (!Array.isArray(products)) throw new Error("products debe ser un array");
  const rows = products.map(normalizeProductRow).map((r) => [
    r.sku, r.producto, String(r.stock), String(r.pendiente), r.unidad, r.ubicacion, r.marca,
  ]);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Stock actual", 14, 16);
  doc.setFontSize(9);
  doc.text(`Generado: ${todayStamp()} · ${rows.length} productos`, 14, 22);
  autoTable(doc, {
    head: [STOCK_HEADERS],
    body: rows,
    startY: 28,
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [74, 158, 138] },
    alternateRowStyles: { fillColor: [245, 250, 248] },
  });
  doc.save(`${safeFileName(filename, `stock_${todayStamp()}`)}.pdf`);
  return { rows: rows.length };
}
