import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de QRCode (no genera imagen real — devolvemos un data URL falso)
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async () => "data:image/png;base64,FAKE"),
  },
}));

// Mock de jsPDF (mismo patrón que exportService tests)
vi.mock("jspdf", () => {
  function MockPDF() {
    this.addImage  = vi.fn();
    this.addPage   = vi.fn();
    this.setFontSize = vi.fn();
    this.text      = vi.fn();
    this.save      = vi.fn();
  }
  return { default: MockPDF };
});

import {
  sanitizeQrPayload,
  generateQrDataUrl,
  generateLabelsPdf,
} from "../utils/qrService";

describe("sanitizeQrPayload", () => {
  it("acepta SKU válidos", () => {
    expect(sanitizeQrPayload("TOR-001")).toBe("TOR-001");
    expect(sanitizeQrPayload("ABC.123_456/789")).toBe("ABC.123_456/789");
  });

  it("recorta espacios y elimina caracteres de control", () => {
    expect(sanitizeQrPayload("  TOR-001  ")).toBe("TOR-001");
    expect(sanitizeQrPayload("TOR\x00-001")).toBe("TOR-001");
  });

  it("rechaza caracteres no permitidos", () => {
    expect(sanitizeQrPayload("<script>")).toBeNull();
    expect(sanitizeQrPayload("a=b")).toBeNull();
    expect(sanitizeQrPayload("foo&bar")).toBeNull();
    expect(sanitizeQrPayload('"; DROP')).toBeNull();
  });

  it("rechaza cadenas vacías, no-string, demasiado largas", () => {
    expect(sanitizeQrPayload("")).toBeNull();
    expect(sanitizeQrPayload(null)).toBeNull();
    expect(sanitizeQrPayload(undefined)).toBeNull();
    expect(sanitizeQrPayload(123)).toBeNull();
    expect(sanitizeQrPayload("A".repeat(81))).toBeNull();
    expect(sanitizeQrPayload("A".repeat(80))).toBe("A".repeat(80));
  });
});

describe("generateQrDataUrl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("genera data URL para payloads válidos", async () => {
    const url = await generateQrDataUrl("TOR-001");
    expect(url).toMatch(/^data:image\/png/);
  });

  it("lanza error si el payload es inválido", async () => {
    await expect(generateQrDataUrl("<script>")).rejects.toThrow(/inválido/i);
    await expect(generateQrDataUrl("")).rejects.toThrow(/inválido/i);
    await expect(generateQrDataUrl(null)).rejects.toThrow(/inválido/i);
  });
});

describe("generateLabelsPdf", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza input que no sea array", async () => {
    await expect(generateLabelsPdf(null)).rejects.toThrow(/array/i);
    await expect(generateLabelsPdf("foo")).rejects.toThrow(/array/i);
  });

  it("lanza error si no hay ningún SKU válido", async () => {
    await expect(generateLabelsPdf([
      { sku: "", description: "X" },
      { sku: "<script>", description: "Y" },
    ])).rejects.toThrow(/v[áa]lidos/i);
  });

  it("genera PDF y devuelve count + skipped", async () => {
    const products = [
      { sku: "TOR-001", description: "Tornillo M8" },
      { sku: "LLA-002", description: "Llave inglesa" },
      { sku: "<bad>",   description: "Inválido" },
    ];
    const result = await generateLabelsPdf(products);
    expect(result.count).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it("rechaza si hay más de 1000 productos", async () => {
    const huge = new Array(1001).fill({ sku: "TOR-001", description: "x" });
    await expect(generateLabelsPdf(huge)).rejects.toThrow(/m[áa]x|demasiados/i);
  });

  it("acepta exactamente 1000 productos", async () => {
    const exactly = new Array(1000).fill({ sku: "TOR-001", description: "x" });
    const r = await generateLabelsPdf(exactly);
    expect(r.count).toBe(1000);
  });
});
