import { describe, it, expect } from "vitest";
import {
  filterByWarehouse,
  isValidWarehouseName,
  pickDefaultWarehouse,
  ALL_WAREHOUSES,
} from "../utils/warehouseFilter";

describe("filterByWarehouse", () => {
  const items = [
    { id: "a", warehouseId: "w1" },
    { id: "b", warehouseId: "w2" },
    { id: "c" }, // legado, sin warehouseId
    { id: "d", warehouseId: "" },
  ];

  it("devuelve todo si no se selecciona ningún almacén", () => {
    expect(filterByWarehouse(items, null, "w1")).toHaveLength(4);
    expect(filterByWarehouse(items, undefined, "w1")).toHaveLength(4);
    expect(filterByWarehouse(items, "", "w1")).toHaveLength(4);
  });

  it("devuelve todo si se selecciona ALL_WAREHOUSES", () => {
    expect(filterByWarehouse(items, ALL_WAREHOUSES, "w1")).toHaveLength(4);
  });

  it("filtra por warehouseId exacto", () => {
    const r = filterByWarehouse(items, "w2", "w1");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("b");
  });

  it("incluye items sin warehouseId cuando se elige el default", () => {
    const r = filterByWarehouse(items, "w1", "w1");
    expect(r.map((i) => i.id).sort()).toEqual(["a", "c", "d"]);
  });

  it("NO incluye items sin warehouseId cuando se elige un almacén distinto al default", () => {
    const r = filterByWarehouse(items, "w2", "w1");
    expect(r.map((i) => i.id)).toEqual(["b"]);
  });

  it("devuelve [] si items no es array", () => {
    expect(filterByWarehouse(null, "w1", "w1")).toEqual([]);
    expect(filterByWarehouse(undefined, "w1", "w1")).toEqual([]);
  });
});

describe("isValidWarehouseName", () => {
  it("acepta nombres normales con acentos y símbolos comunes", () => {
    expect(isValidWarehouseName("Almacén Principal")).toBe(true);
    expect(isValidWarehouseName("Sede Madrid - Nave 2")).toBe(true);
    expect(isValidWarehouseName("Depósito #1")).toBe(false); // # no permitido
    expect(isValidWarehouseName("D&L Logistics")).toBe(true);
  });

  it("rechaza nombres demasiado cortos o largos", () => {
    expect(isValidWarehouseName("a")).toBe(false);
    expect(isValidWarehouseName("ab")).toBe(true);
    expect(isValidWarehouseName("x".repeat(60))).toBe(true);
    expect(isValidWarehouseName("x".repeat(61))).toBe(false);
  });

  it("rechaza intentos de inyección y caracteres raros", () => {
    expect(isValidWarehouseName("<script>")).toBe(false);
    expect(isValidWarehouseName("Sede; DROP TABLE")).toBe(false);
    expect(isValidWarehouseName('Sede"; --')).toBe(false);
    expect(isValidWarehouseName("Sede\nMadrid")).toBe(false);
  });

  it("rechaza no-strings", () => {
    expect(isValidWarehouseName(null)).toBe(false);
    expect(isValidWarehouseName(123)).toBe(false);
    expect(isValidWarehouseName(undefined)).toBe(false);
  });
});

describe("pickDefaultWarehouse", () => {
  it("prefiere el marcado con isDefault=true", () => {
    const list = [
      { id: "a", isDefault: false, createdAtMs: 100 },
      { id: "b", isDefault: true,  createdAtMs: 200 },
      { id: "c", isDefault: false, createdAtMs: 50  },
    ];
    expect(pickDefaultWarehouse(list)?.id).toBe("b");
  });

  it("cae al más antiguo si ninguno es default", () => {
    const list = [
      { id: "a", createdAtMs: 100 },
      { id: "b", createdAtMs: 50  },
      { id: "c", createdAtMs: 200 },
    ];
    expect(pickDefaultWarehouse(list)?.id).toBe("b");
  });

  it("devuelve null para lista vacía o no-array", () => {
    expect(pickDefaultWarehouse([])).toBeNull();
    expect(pickDefaultWarehouse(null)).toBeNull();
    expect(pickDefaultWarehouse(undefined)).toBeNull();
  });
});
