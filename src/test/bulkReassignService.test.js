import { describe, it, expect } from "vitest";
import {
  filterCandidates,
  chunkIds,
  validateReassign,
  UNASSIGNED,
  FIRESTORE_BATCH_LIMIT,
} from "../utils/bulkReassignService";

const products = [
  { id: "a", warehouseId: "w1" },
  { id: "b", warehouseId: "w2" },
  { id: "c" },                  // legacy
  { id: "d", warehouseId: "" }, // legacy explícito
  { id: "e", warehouseId: "w1" },
];

describe("filterCandidates", () => {
  it("devuelve productos sin warehouseId cuando origen = UNASSIGNED", () => {
    const r = filterCandidates(products, UNASSIGNED).map((p) => p.id).sort();
    expect(r).toEqual(["c", "d"]);
  });

  it("devuelve productos del almacén indicado", () => {
    const r = filterCandidates(products, "w1").map((p) => p.id).sort();
    expect(r).toEqual(["a", "e"]);
  });

  it("devuelve [] si no hay coincidencias", () => {
    expect(filterCandidates(products, "wX")).toEqual([]);
  });

  it("devuelve [] si products no es array o origen falsy", () => {
    expect(filterCandidates(null, "w1")).toEqual([]);
    expect(filterCandidates(products, "")).toEqual([]);
    expect(filterCandidates(products, null)).toEqual([]);
  });
});

describe("chunkIds", () => {
  it("particiona en chunks del tamaño indicado", () => {
    const r = chunkIds(["a","b","c","d","e"], 2);
    expect(r).toEqual([["a","b"],["c","d"],["e"]]);
  });

  it("usa FIRESTORE_BATCH_LIMIT por defecto", () => {
    const ids = Array.from({ length: 1200 }, (_, i) => String(i));
    const r = chunkIds(ids);
    expect(r.length).toBe(Math.ceil(1200 / FIRESTORE_BATCH_LIMIT));
    expect(r[0].length).toBe(FIRESTORE_BATCH_LIMIT);
  });

  it("devuelve [] para input vacío", () => {
    expect(chunkIds([])).toEqual([]);
    expect(chunkIds(null)).toEqual([]);
  });

  it("lanza si chunkSize <= 0", () => {
    expect(() => chunkIds(["a"], 0)).toThrow();
    expect(() => chunkIds(["a"], -1)).toThrow();
  });
});

describe("validateReassign", () => {
  const warehouses = [{ id: "w1" }, { id: "w2" }];

  it("ok cuando todo es válido", () => {
    expect(validateReassign({
      originId: "w1",
      destinationId: "w2",
      ids: ["a","b"],
      warehouses,
    })).toEqual({ ok: true });
  });

  it("rechaza destino vacío", () => {
    const r = validateReassign({ originId: "w1", destinationId: "", ids: ["a"], warehouses });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/destino/i);
  });

  it("rechaza ids vacío o no array", () => {
    expect(validateReassign({ originId: "w1", destinationId: "w2", ids: [], warehouses }).ok).toBe(false);
    expect(validateReassign({ originId: "w1", destinationId: "w2", ids: null, warehouses }).ok).toBe(false);
  });

  it("rechaza origen igual a destino", () => {
    const r = validateReassign({ originId: "w1", destinationId: "w1", ids: ["a"], warehouses });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/iguales/i);
  });

  it("rechaza destino que no existe en la lista de warehouses", () => {
    const r = validateReassign({ originId: "w1", destinationId: "wX", ids: ["a"], warehouses });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no existe/i);
  });

  it("rechaza ids no string o vacíos", () => {
    expect(validateReassign({ originId: "w1", destinationId: "w2", ids: ["a", "", "b"], warehouses }).ok).toBe(false);
    expect(validateReassign({ originId: "w1", destinationId: "w2", ids: ["a", null, "b"], warehouses }).ok).toBe(false);
  });

  it("acepta legacy origen vacío con destino válido", () => {
    expect(validateReassign({ originId: "", destinationId: "w1", ids: ["a"], warehouses }).ok).toBe(true);
  });
});
