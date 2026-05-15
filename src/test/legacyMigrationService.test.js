import { describe, it, expect } from "vitest";
import {
  findLegacyIds,
  chunkForBatch,
  validateMigration,
  buildMigrationPatch,
  summarizeAnalysis,
  MIGRATION_COLLECTIONS,
  MIGRATION_BATCH_LIMIT,
} from "../utils/legacyMigrationService";

describe("findLegacyIds", () => {
  it("detecta docs sin accountId", () => {
    const docs = [
      { id: "a" },                       // legacy implícito
      { id: "b", accountId: "" },        // legacy explícito
      { id: "c", accountId: "acc-1" },   // ya migrado
      { id: "d", accountId: null },      // legacy nullish
    ];
    expect(findLegacyIds(docs).sort()).toEqual(["a", "b", "d"]);
  });

  it("ignora docs sin id válido", () => {
    expect(findLegacyIds([{ }, { id: 123 }, { id: "" }])).toEqual([]);
  });

  it("devuelve [] si no es array", () => {
    expect(findLegacyIds(null)).toEqual([]);
    expect(findLegacyIds(undefined)).toEqual([]);
    expect(findLegacyIds("foo")).toEqual([]);
  });
});

describe("chunkForBatch", () => {
  it("particiona en bloques del tamaño indicado", () => {
    expect(chunkForBatch(["a","b","c","d","e"], 2)).toEqual([["a","b"],["c","d"],["e"]]);
  });

  it("usa MIGRATION_BATCH_LIMIT por defecto", () => {
    const ids = Array.from({ length: 1300 }, (_, i) => String(i));
    const r = chunkForBatch(ids);
    expect(r.length).toBe(Math.ceil(1300 / MIGRATION_BATCH_LIMIT));
    expect(r[0].length).toBe(MIGRATION_BATCH_LIMIT);
  });

  it("devuelve [] para entrada vacía o no array", () => {
    expect(chunkForBatch([])).toEqual([]);
    expect(chunkForBatch(null)).toEqual([]);
  });

  it("lanza si size <= 0", () => {
    expect(() => chunkForBatch(["a"], 0)).toThrow();
    expect(() => chunkForBatch(["a"], -1)).toThrow();
  });
});

describe("validateMigration", () => {
  it("ok con accountId y totalLegacy > 0", () => {
    expect(validateMigration({ accountId: "acc-1", totalLegacy: 10 })).toEqual({ ok: true });
  });

  it("rechaza accountId faltante", () => {
    expect(validateMigration({ accountId: "", totalLegacy: 10 }).ok).toBe(false);
    expect(validateMigration({ accountId: null, totalLegacy: 10 }).ok).toBe(false);
  });

  it("rechaza totalLegacy inválido o cero", () => {
    expect(validateMigration({ accountId: "acc-1", totalLegacy: 0 }).ok).toBe(false);
    expect(validateMigration({ accountId: "acc-1", totalLegacy: -1 }).ok).toBe(false);
    expect(validateMigration({ accountId: "acc-1", totalLegacy: "x" }).ok).toBe(false);
  });
});

describe("buildMigrationPatch", () => {
  it("genera el patch con accountId", () => {
    expect(buildMigrationPatch("acc-1")).toEqual({ accountId: "acc-1" });
  });

  it("lanza si accountId no es string no vacío", () => {
    expect(() => buildMigrationPatch("")).toThrow();
    expect(() => buildMigrationPatch(null)).toThrow();
    expect(() => buildMigrationPatch(123)).toThrow();
  });
});

describe("summarizeAnalysis", () => {
  it("resume conteos por colección + total", () => {
    const r = summarizeAnalysis({
      products: ["p1","p2"],
      moves: ["m1"],
      warehouses: [],
      productRequests: ["r1","r2","r3"],
      notifications: ["n1"],
    });
    expect(r.total).toBe(7);
    expect(r.detail).toEqual({
      products: 2, moves: 1, warehouses: 0, productRequests: 3, notifications: 1,
    });
  });

  it("trata colecciones faltantes como 0", () => {
    const r = summarizeAnalysis({ products: ["p1"] });
    expect(r.total).toBe(1);
    expect(r.detail.moves).toBe(0);
  });

  it("incluye todas las colecciones declaradas", () => {
    const r = summarizeAnalysis({});
    MIGRATION_COLLECTIONS.forEach((c) => expect(r.detail).toHaveProperty(c, 0));
  });
});
