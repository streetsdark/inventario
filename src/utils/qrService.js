/**
 * Servicio de generación de códigos QR.
 *
 * Seguridad:
 *  - El payload del QR es ASCII alfanumérico/SKU (whitelist aplicada antes).
 *  - Tope de longitud: el SKU se trunca a MAX_QR_PAYLOAD para evitar QRs
 *    excesivamente densos (DoS visual y de impresión).
 *  - El nombre de archivo descargado pasa por safeFileName del exportService.
 *  - jsPDF renderiza imágenes/textos como datos, nunca como HTML/JS.
 */

import QRCode from "qrcode";
import jsPDF from "jspdf";
import { sanitizeString } from "./securityValidation";
import { safeFileName, downloadBlob } from "./exportService";

const MAX_QR_PAYLOAD = 80; // mismo tope que el lector
const ALLOWED_PAYLOAD = /^[A-Za-z0-9._\-/ ]+$/;

/** Whitelist para SKU/QR: alfanumérico + . _ - / espacio. Si no, null. */
export function sanitizeQrPayload(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (s.length < 1 || s.length > MAX_QR_PAYLOAD) return null;
  if (!ALLOWED_PAYLOAD.test(s)) return null;
  return s;
}

/** Genera un data URL PNG del QR. Falla si el payload no es válido. */
export async function generateQrDataUrl(payload, { width = 320 } = {}) {
  const safe = sanitizeQrPayload(payload);
  if (!safe) throw new Error("Payload de QR inválido");
  return QRCode.toDataURL(safe, {
    width,
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Convierte un data URL (data:image/png;base64,XXX) en Blob sin usar fetch.
 * Necesario porque la CSP de la app no permite fetch a esquemas data:.
 */
export function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("dataUrl inválido");
  }
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Descarga el QR como PNG. */
export async function downloadQrPng(payload, filename) {
  const dataUrl = await generateQrDataUrl(payload, { width: 512 });
  const blob = dataUrlToBlob(dataUrl);
  downloadBlob(blob, `${safeFileName(filename, `qr_${Date.now()}`)}.png`);
}

/**
 * Construye un PDF A4 con etiquetas QR en cuadrícula.
 * - cols × rows etiquetas por hoja
 * - cada etiqueta: QR + SKU + descripción truncada
 * - paginación automática
 *
 * products: [{ sku, description }]
 */
export async function generateLabelsPdf(products, options = {}) {
  if (!Array.isArray(products)) throw new Error("products debe ser array");
  const valid = products
    .map((p) => ({
      sku: sanitizeQrPayload(p?.sku),
      description: sanitizeString(typeof p?.description === "string" ? p.description : ""),
    }))
    .filter((p) => p.sku);

  if (valid.length === 0) throw new Error("No hay SKUs válidos para imprimir");
  if (valid.length > 1000) throw new Error("Demasiados productos (máx 1000 por PDF)");

  const cols       = options.cols ?? 4;
  const rows       = options.rows ?? 6;
  const margin     = 8;   // mm
  const pageWidth  = 210; // A4 mm
  const pageHeight = 297;

  const cellW = (pageWidth  - margin * 2) / cols;
  const cellH = (pageHeight - margin * 2) / rows;
  const qrSize = Math.min(cellW, cellH) - 12;

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  for (let i = 0; i < valid.length; i++) {
    const slot = i % (cols * rows);
    if (i > 0 && slot === 0) doc.addPage();

    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = margin + col * cellW;
    const y = margin + row * cellH;

    const dataUrl = await QRCode.toDataURL(valid[i].sku, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 320,
    });

    doc.addImage(dataUrl, "PNG", x + (cellW - qrSize) / 2, y + 2, qrSize, qrSize);

    doc.setFontSize(8);
    doc.text(valid[i].sku, x + cellW / 2, y + qrSize + 5, {
      align: "center",
      maxWidth: cellW - 4,
    });

    if (valid[i].description) {
      doc.setFontSize(7);
      const desc = valid[i].description.length > 30
        ? valid[i].description.slice(0, 28) + "…"
        : valid[i].description;
      doc.text(desc, x + cellW / 2, y + qrSize + 9, {
        align: "center",
        maxWidth: cellW - 4,
      });
    }
  }

  doc.save(`${safeFileName(options.filename, `etiquetas_${new Date().toISOString().slice(0,10)}`)}.pdf`);
  return { count: valid.length, skipped: products.length - valid.length };
}
