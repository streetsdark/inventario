import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockeamos jspdf y jspdf-autotable para no generar PDFs reales en los tests.
vi.mock("jspdf", () => {
  function MockPDF() {
    this.save = vi.fn();
    this.text = vi.fn();
    this.setFontSize = vi.fn();
    this.internal = {};
  }
  return { default: MockPDF };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

import {
  escapeCsvCell,
  buildCsv,
  safeFileName,
  normalizeMoveRow,
  normalizeProductRow,
  exportMovementsToCSV,
  exportStockToCSV,
  exportMovementsToPDF,
  exportStockToPDF,
} from "../utils/exportService";

describe("escapeCsvCell — protección contra CSV injection", () => {
  it("prefija con apóstrofo las celdas que empiezan con =", () => {
    expect(escapeCsvCell("=SUM(A1:A9)")).toBe(`"'=SUM(A1:A9)"`);
  });

  it("prefija con apóstrofo las celdas que empiezan con +", () => {
    expect(escapeCsvCell("+CMD")).toBe(`"'+CMD"`);
  });

  it("prefija con apóstrofo las celdas que empiezan con -", () => {
    expect(escapeCsvCell("-2+3")).toBe(`"'-2+3"`);
  });

  it("prefija con apóstrofo las celdas que empiezan con @", () => {
    expect(escapeCsvCell("@SUM")).toBe(`"'@SUM"`);
  });

  it("prefija con apóstrofo las celdas que empiezan con TAB o CR", () => {
    expect(escapeCsvCell("\tcmd")).toBe(`"'\tcmd"`);
    expect(escapeCsvCell("\rcmd")).toBe(`"'\rcmd"`);
  });

  it("escapa comillas dobles duplicándolas", () => {
    expect(escapeCsvCell('hola "mundo"')).toBe(`"hola ""mundo"""`);
  });

  it("elimina caracteres de control (NUL, BEL, etc.)", () => {
    expect(escapeCsvCell("a\x00b\x07c")).toBe(`"abc"`);
  });

  it("trata null y undefined como cadena vacía", () => {
    expect(escapeCsvCell(null)).toBe(`""`);
    expect(escapeCsvCell(undefined)).toBe(`""`);
  });

  it("envuelve cadenas normales en comillas dobles", () => {
    expect(escapeCsvCell("hola")).toBe(`"hola"`);
  });
});

describe("buildCsv", () => {
  it("genera un CSV con BOM UTF-8", () => {
    const csv = buildCsv(["A", "B"], [["1", "2"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("usa CRLF entre filas", () => {
    const csv = buildCsv(["A"], [["1"], ["2"]]);
    expect(csv).toContain("\r\n");
  });

  it("rechaza entradas que no sean arrays", () => {
    expect(() => buildCsv("foo", [])).toThrow();
    expect(() => buildCsv([], "bar")).toThrow();
  });

  it("rechaza más de MAX_ROWS filas", () => {
    const huge = new Array(50001).fill(["x"]);
    expect(() => buildCsv(["A"], huge)).toThrow(/demasiadas/);
  });
});

describe("safeFileName", () => {
  it("elimina separadores de ruta y caracteres prohibidos en Windows", () => {
    expect(safeFileName("../../etc/passwd")).toBe("....etcpasswd");
    expect(safeFileName('a:b*c?d"e<f>g|h')).toBe("abcdefgh");
  });

  it("reemplaza espacios por guiones bajos", () => {
    expect(safeFileName("mi archivo final")).toBe("mi_archivo_final");
  });

  it("usa el fallback si el resultado queda vacío", () => {
    expect(safeFileName("///", "default")).toBe("default");
    expect(safeFileName("", "default")).toBe("default");
  });

  it("trunca a 80 caracteres", () => {
    expect(safeFileName("a".repeat(200)).length).toBe(80);
  });
});

describe("normalizeMoveRow", () => {
  it("sanitiza descripción y usuario", () => {
    const r = normalizeMoveRow({
      type: "out",
      description: "<script>alert(1)</script>tornillo",
      recipientUser: "Juan & Co",
      quantity: "5",
      exitDate: "2026-05-14",
    });
    expect(r.producto).not.toContain("<script>");
    expect(r.usuario).toContain("&amp;");
    expect(r.cantidad).toBe(5);
    expect(r.fecha).toBe("2026-05-14");
    expect(r.tipo).toBe("Salida");
  });

  it("ignora fechas inválidas", () => {
    const r = normalizeMoveRow({ type: "in", entryDate: "no-es-fecha" });
    expect(r.fecha).toBe("");
  });

  it("convierte cantidades no numéricas a 0", () => {
    const r = normalizeMoveRow({ type: "in", quantity: "abc" });
    expect(r.cantidad).toBe(0);
  });
});

describe("normalizeProductRow", () => {
  it("sanitiza campos de texto y normaliza números", () => {
    const r = normalizeProductRow({
      sku: "TOR-001",
      description: "<b>tornillo</b>",
      stock: "20",
      pending: 3,
      product_Unit: "u",
      location: "A-1",
      brand: "Bahco",
    });
    expect(r.sku).toBe("TOR-001");
    expect(r.producto).not.toContain("<b>");
    expect(r.stock).toBe(20);
    expect(r.pendiente).toBe(3);
  });
});

describe("exportMovementsToCSV", () => {
  let createSpy;
  let appendSpy;
  let removeSpy;
  let revokeSpy;

  beforeEach(() => {
    createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    appendSpy = vi.spyOn(document.body, "appendChild");
    removeSpy = vi.spyOn(document.body, "removeChild");
  });

  it("rechaza entradas que no sean array", () => {
    expect(() => exportMovementsToCSV("foo")).toThrow();
  });

  it("dispara la descarga del CSV con el número de filas correcto", () => {
    const moves = [
      { type: "out", description: "Tornillo M8", quantity: 5, exitDate: "2026-05-14", recipientUser: "Juan" },
      { type: "in",  description: "Llave",       quantity: 3, entryDate: "2026-05-13" },
    ];
    const result = exportMovementsToCSV(moves);
    expect(result.rows).toBe(2);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("acepta lista vacía sin lanzar", () => {
    expect(() => exportMovementsToCSV([])).not.toThrow();
  });
});

describe("exportStockToCSV", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
  });

  it("rechaza entradas que no sean array", () => {
    expect(() => exportStockToCSV(null)).toThrow();
  });

  it("normaliza productos y devuelve número de filas", () => {
    const products = [
      { sku: "A", description: "Producto A", stock: 10, pending: 0, product_Unit: "u" },
      { sku: "B", description: "Producto B", stock: 5,  pending: 2, product_Unit: "u" },
    ];
    expect(exportStockToCSV(products).rows).toBe(2);
  });
});

describe("exportMovementsToPDF / exportStockToPDF", () => {
  it("ambos lanzan si reciben algo distinto a un array", () => {
    expect(() => exportMovementsToPDF(null)).toThrow();
    expect(() => exportStockToPDF("foo")).toThrow();
  });

  it("exportMovementsToPDF devuelve el conteo de filas", () => {
    const moves = [
      { type: "out", description: "X", quantity: 1, exitDate: "2026-05-14" },
    ];
    expect(exportMovementsToPDF(moves).rows).toBe(1);
  });

  it("exportStockToPDF devuelve el conteo de filas", () => {
    const products = [{ sku: "A", description: "P", stock: 1, pending: 0, product_Unit: "u" }];
    expect(exportStockToPDF(products).rows).toBe(1);
  });
});
