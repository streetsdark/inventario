import { describe, it, expect } from "vitest";
import {
  chunkArray,
  FIRESTORE_OPS_LIMIT,
  FIRESTORE_SINGLE_OP_BATCH_SIZE,
  FIRESTORE_DOUBLE_OP_BATCH_SIZE,
} from "../utils/batchService";

describe("chunkArray", () => {
  it("particiona en chunks del tamaño indicado", () => {
    expect(chunkArray(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"], ["c", "d"], ["e"],
    ]);
  });

  it("usa FIRESTORE_SINGLE_OP_BATCH_SIZE como default", () => {
    const ids = Array.from({ length: 1300 }, (_, i) => String(i));
    const r = chunkArray(ids);
    expect(r.length).toBe(Math.ceil(1300 / FIRESTORE_SINGLE_OP_BATCH_SIZE));
    expect(r[0].length).toBe(FIRESTORE_SINGLE_OP_BATCH_SIZE);
  });

  it("devuelve [] para entrada vacía o no-array", () => {
    expect(chunkArray([])).toEqual([]);
    expect(chunkArray(null)).toEqual([]);
    expect(chunkArray(undefined)).toEqual([]);
    expect(chunkArray("foo")).toEqual([]);
  });

  it("lanza si size <= 0", () => {
    expect(() => chunkArray(["a"], 0)).toThrow();
    expect(() => chunkArray(["a"], -5)).toThrow();
  });
});

describe("constantes Firestore batch", () => {
  it("FIRESTORE_OPS_LIMIT es 500 (límite duro Firestore)", () => {
    expect(FIRESTORE_OPS_LIMIT).toBe(500);
  });

  it("DOUBLE_OP es 200 (margen para 400 ops totales)", () => {
    expect(FIRESTORE_DOUBLE_OP_BATCH_SIZE).toBe(200);
    expect(FIRESTORE_DOUBLE_OP_BATCH_SIZE * 2).toBeLessThan(FIRESTORE_OPS_LIMIT);
  });
});
