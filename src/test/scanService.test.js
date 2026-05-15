import { describe, it, expect } from "vitest";
import {
  sanitizeScannedCode,
  findProductByCode,
  shouldAcceptScan,
  SCAN_COOLDOWN_MS,
} from "../utils/scanService";

describe("sanitizeScannedCode — input no confiable", () => {
  it("acepta SKU alfanuméricos válidos", () => {
    expect(sanitizeScannedCode("TOR-001")).toBe("TOR-001");
    expect(sanitizeScannedCode("abc.123_456")).toBe("abc.123_456");
    expect(sanitizeScannedCode("EAN/13 7890")).toBe("EAN/13 7890");
  });

  it("recorta espacios de los bordes", () => {
    expect(sanitizeScannedCode("   TOR-001   ")).toBe("TOR-001");
  });

  it("elimina caracteres de control", () => {
    expect(sanitizeScannedCode("TOR-\x00001")).toBe("TOR-001");
    expect(sanitizeScannedCode("\x07ABC\x1F")).toBe("ABC");
  });

  it("rechaza caracteres no permitidos (XSS, comillas, paréntesis)", () => {
    expect(sanitizeScannedCode("<script>")).toBeNull();
    expect(sanitizeScannedCode('SKU"; DROP')).toBeNull();
    expect(sanitizeScannedCode("eval(1)")).toBeNull();
    expect(sanitizeScannedCode("foo&bar")).toBeNull();
    expect(sanitizeScannedCode("a=b")).toBeNull();
  });

  it("rechaza cadena vacía o no string", () => {
    expect(sanitizeScannedCode("")).toBeNull();
    expect(sanitizeScannedCode("   ")).toBeNull();
    expect(sanitizeScannedCode(null)).toBeNull();
    expect(sanitizeScannedCode(undefined)).toBeNull();
    expect(sanitizeScannedCode(123)).toBeNull();
  });

  it("rechaza códigos demasiado largos (> 80 chars)", () => {
    expect(sanitizeScannedCode("A".repeat(81))).toBeNull();
    expect(sanitizeScannedCode("A".repeat(80))).toBe("A".repeat(80));
  });
});

describe("findProductByCode", () => {
  const products = [
    { sku: "TOR-001", description: "Tornillo M8" },
    { sku: "LLA-002", description: "Llave inglesa" },
    { sku: "TOR-003", description: "Tornillo M10" },
  ];

  it("encuentra producto por SKU exacto (case-insensitive)", () => {
    expect(findProductByCode(products, "TOR-001")?.sku).toBe("TOR-001");
    expect(findProductByCode(products, "tor-001")?.sku).toBe("TOR-001");
    expect(findProductByCode(products, "LLA-002")?.sku).toBe("LLA-002");
  });

  it("cae a coincidencia por prefijo si no hay exacto", () => {
    expect(findProductByCode(products, "TOR")?.sku).toBe("TOR-001");
  });

  it("devuelve null si no hay coincidencia", () => {
    expect(findProductByCode(products, "XYZ-999")).toBeNull();
  });

  it("devuelve null para inputs inválidos", () => {
    expect(findProductByCode(null, "TOR-001")).toBeNull();
    expect(findProductByCode(products, "")).toBeNull();
    expect(findProductByCode(products, null)).toBeNull();
  });

  it("ignora productos con sku malformado sin lanzar", () => {
    const dirty = [{ sku: null }, { sku: undefined }, { sku: "TOR-001" }];
    expect(findProductByCode(dirty, "TOR-001")?.sku).toBe("TOR-001");
  });
});

describe("shouldAcceptScan — throttle anti-rebote", () => {
  it("acepta el primer scan (lastTs = 0)", () => {
    expect(shouldAcceptScan(0, 1000)).toBe(true);
  });

  it("rechaza si han pasado < SCAN_COOLDOWN_MS desde el último", () => {
    expect(shouldAcceptScan(1000, 1000 + SCAN_COOLDOWN_MS - 1)).toBe(false);
  });

  it("acepta si han pasado >= SCAN_COOLDOWN_MS", () => {
    expect(shouldAcceptScan(1000, 1000 + SCAN_COOLDOWN_MS)).toBe(true);
    expect(shouldAcceptScan(1000, 1000 + SCAN_COOLDOWN_MS + 5000)).toBe(true);
  });

  it("respeta cooldown personalizado", () => {
    expect(shouldAcceptScan(1000, 1500, 1000)).toBe(false);
    expect(shouldAcceptScan(1000, 2500, 1000)).toBe(true);
  });

  it("acepta si lastTs no es numérico (defensa)", () => {
    expect(shouldAcceptScan(null, 1000)).toBe(true);
    expect(shouldAcceptScan(undefined, 1000)).toBe(true);
  });
});
