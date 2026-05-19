import { describe, it, expect } from "vitest";
import {
  parseCsvText,
  validateFile,
  looksLikeHeader,
  buildStagingDocs,
  buildProductFromStaging,
  isMappingComplete,
  summarizeImport,
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS_PER_IMPORT,
} from "../utils/importStagingService";

describe("parseCsvText", () => {
  it("parsea CSV con separador ; (autodetect)", () => {
    const csv = "sku;descripcion;stock\nTOR-001;Tornillo;50\nLLA-002;Llave;10";
    const r = parseCsvText(csv);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toEqual(["sku","descripcion","stock"]);
    expect(r.rows[1]).toEqual(["TOR-001","Tornillo","50"]);
  });

  it("parsea CSV con separador , (autodetect)", () => {
    const r = parseCsvText("a,b,c\n1,2,3");
    expect(r.rows).toEqual([["a","b","c"],["1","2","3"]]);
  });

  it("trim de espacios alrededor", () => {
    const r = parseCsvText("  hola  ;  mundo  ");
    expect(r.rows[0]).toEqual(["hola","mundo"]);
  });

  it("ignora filas totalmente vacías", () => {
    const r = parseCsvText("a;b\n;\n1;2\n;\n");
    expect(r.rows).toEqual([["a","b"],["1","2"]]);
  });

  it("devuelve objeto vacío si input no es string", () => {
    expect(parseCsvText(null).rows).toEqual([]);
    expect(parseCsvText("").rows).toEqual([]);
  });
});

describe("validateFile", () => {
  const mkFile = (name, size) => ({ name, size });

  it("rechaza si no hay archivo", () => {
    expect(validateFile(null).ok).toBe(false);
    expect(validateFile(undefined).ok).toBe(false);
  });

  it("rechaza por tamaño superior al máximo", () => {
    const file = mkFile("big.csv", MAX_FILE_SIZE_BYTES + 1);
    expect(validateFile(file).ok).toBe(false);
  });

  it("rechaza extensiones distintas a .csv", () => {
    expect(validateFile(mkFile("foo.xlsx", 1000)).ok).toBe(false);
    expect(validateFile(mkFile("foo.txt", 1000)).ok).toBe(false);
  });

  it("acepta .csv en mayúsculas", () => {
    expect(validateFile(mkFile("foo.CSV", 1000)).ok).toBe(true);
  });
});

describe("looksLikeHeader", () => {
  it("true cuando todas las celdas son strings no numéricos", () => {
    expect(looksLikeHeader(["sku","descripcion","stock"])).toBe(true);
  });

  it("false si alguna celda parece número", () => {
    expect(looksLikeHeader(["sku","descripcion","123"])).toBe(false);
  });

  it("false si hay celdas vacías", () => {
    expect(looksLikeHeader(["sku","",""])).toBe(false);
  });

  it("false si no es array", () => {
    expect(looksLikeHeader(null)).toBe(false);
    expect(looksLikeHeader([])).toBe(false);
  });
});

describe("buildStagingDocs", () => {
  it("genera un doc por fila con metadata correcta", () => {
    const docs = buildStagingDocs({
      rows: [["a","b"],["c","d"]],
      importId: "imp-1",
      accountId: "acc-1",
      fileName: "test.csv",
      headerRow: ["col1","col2"],
    });
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({
      importId: "imp-1",
      accountId: "acc-1",
      fileName: "test.csv",
      rowIndex: 0,
      status: "pending",
      cells: ["a","b"],
    });
    expect(docs[0].headerRow).toEqual(["col1","col2"]);
    expect(docs[1].rowIndex).toBe(1);
  });

  it("trunca celdas a 500 chars", () => {
    const long = "x".repeat(600);
    const docs = buildStagingDocs({
      rows: [[long]], importId: "i", accountId: "a", fileName: "f",
    });
    expect(docs[0].cells[0].length).toBe(500);
  });

  it("rechaza si no hay importId o accountId", () => {
    expect(() => buildStagingDocs({ rows: [["a"]], importId: "", accountId: "x", fileName: "f" })).toThrow();
    expect(() => buildStagingDocs({ rows: [["a"]], importId: "x", accountId: "",  fileName: "f" })).toThrow();
  });

  it("rechaza si supera el máximo de filas", () => {
    const rows = Array.from({ length: MAX_ROWS_PER_IMPORT + 1 }, () => ["x"]);
    expect(() => buildStagingDocs({ rows, importId: "i", accountId: "a", fileName: "f" })).toThrow();
  });
});

describe("buildProductFromStaging", () => {
  const staging = { id: "s1", cells: ["ignore", "Tornillo M8", "TOR-001", "A-1-1", "Bahco", "50"] };

  it("construye producto desde mapeo", () => {
    const p = buildProductFromStaging(
      staging,
      { sku: 2, description: 1, location: 3, brand: 4, stock: 5 },
      "acc-1",
    );
    expect(p).toMatchObject({
      sku: "TOR-001",
      description: "Tornillo M8",
      location: "A-1-1",
      brand: "Bahco",
      stock: 50,
      accountId: "acc-1",
      importSourceId: "s1",
    });
  });

  it("extrae primer número del stock aunque venga con texto", () => {
    const p = buildProductFromStaging(
      { id: "s2", cells: ["", "Producto", "", "", "", "2 CAJAS"] },
      { sku: 2, description: 1, location: 3, brand: 4, stock: 5 },
      "acc-1",
    );
    expect(p.stock).toBe(2);
  });

  it("'21 + 1' parsea a 21 (primer número)", () => {
    const p = buildProductFromStaging(
      { id: "s", cells: ["", "x", "", "", "", "21 + 1"] },
      { sku: 2, description: 1, location: 3, brand: 4, stock: 5 },
      "acc-1",
    );
    expect(p.stock).toBe(21);
  });

  it("stock por defecto a 0 si no hay número", () => {
    const p = buildProductFromStaging(
      { id: "s", cells: ["", "x", "", "", "", "sin numero"] },
      { description: 1, stock: 5 },
      "acc-1",
    );
    expect(p.stock).toBe(0);
  });

  it("usa 'Sin nombre' si la descripción está vacía", () => {
    const p = buildProductFromStaging(
      { id: "s", cells: ["", "", "", "", "", "10"] },
      { description: 1, stock: 5 },
      "acc-1",
    );
    expect(p.description).toBe("Sin nombre");
  });

  it("lanza si falta accountId", () => {
    expect(() => buildProductFromStaging(staging, { description: 1 }, "")).toThrow();
  });
});

describe("isMappingComplete", () => {
  it("true si tiene description como número válido", () => {
    expect(isMappingComplete({ description: 1 })).toBe(true);
    expect(isMappingComplete({ description: 0 })).toBe(true);
  });

  it("false sin description", () => {
    expect(isMappingComplete({})).toBe(false);
    expect(isMappingComplete({ sku: 1 })).toBe(false);
    expect(isMappingComplete(null)).toBe(false);
  });
});

describe("summarizeImport", () => {
  it("cuenta filas, columnas y devuelve preview de 5", () => {
    const rows = Array.from({ length: 20 }, (_, i) => [`r${i}`, "x"]);
    const s = summarizeImport(rows, ["col1", "col2"]);
    expect(s.totalRows).toBe(20);
    expect(s.columns).toBe(2);
    expect(s.hasHeader).toBe(true);
    expect(s.preview).toHaveLength(5);
  });
});
