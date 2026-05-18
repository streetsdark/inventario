import { describe, it, expect } from "vitest";
import {
  chunkForDelete,
  isExactAccountNameMatch,
  validateDelete,
  totalToDelete,
  DELETE_BATCH_LIMIT,
  DELETE_COLLECTIONS,
} from "../utils/dataDelete";

describe("chunkForDelete", () => {
  it("particiona en bloques del tamaño indicado", () => {
    expect(chunkForDelete(["a","b","c","d","e"], 2)).toEqual([["a","b"],["c","d"],["e"]]);
  });

  it("usa DELETE_BATCH_LIMIT por defecto", () => {
    const ids = Array.from({ length: 1200 }, (_, i) => String(i));
    const r = chunkForDelete(ids);
    expect(r.length).toBe(Math.ceil(1200 / DELETE_BATCH_LIMIT));
  });

  it("devuelve [] para entrada vacía", () => {
    expect(chunkForDelete([])).toEqual([]);
    expect(chunkForDelete(null)).toEqual([]);
  });

  it("lanza si size <= 0", () => {
    expect(() => chunkForDelete(["a"], 0)).toThrow();
  });
});

describe("isExactAccountNameMatch", () => {
  it("compara exactamente (trim)", () => {
    expect(isExactAccountNameMatch("ACME", "ACME")).toBe(true);
    expect(isExactAccountNameMatch("  ACME  ", "ACME")).toBe(true);
    expect(isExactAccountNameMatch("acme", "ACME")).toBe(false);
    expect(isExactAccountNameMatch("ACM", "ACME")).toBe(false);
  });

  it("rechaza tipos no-string", () => {
    expect(isExactAccountNameMatch(null, "ACME")).toBe(false);
    expect(isExactAccountNameMatch("ACME", null)).toBe(false);
    expect(isExactAccountNameMatch(undefined, undefined)).toBe(false);
  });
});

describe("validateDelete", () => {
  const base = { accountId: "acc-1", confirmationTyped: "ACME", accountName: "ACME", role: "owner" };

  it("ok cuando todo coincide", () => {
    expect(validateDelete(base)).toEqual({ ok: true });
  });

  it("rechaza si no es owner", () => {
    expect(validateDelete({ ...base, role: "admin" }).ok).toBe(false);
    expect(validateDelete({ ...base, role: "member" }).ok).toBe(false);
  });

  it("rechaza si el nombre escrito no coincide", () => {
    expect(validateDelete({ ...base, confirmationTyped: "acme" }).ok).toBe(false);
    expect(validateDelete({ ...base, confirmationTyped: "" }).ok).toBe(false);
  });

  it("rechaza accountId inválido", () => {
    expect(validateDelete({ ...base, accountId: "" }).ok).toBe(false);
    expect(validateDelete({ ...base, accountId: null }).ok).toBe(false);
  });
});

describe("totalToDelete", () => {
  it("suma todos los ids", () => {
    expect(totalToDelete({
      products: ["p1","p2"],
      moves: ["m1"],
      warehouses: [],
    })).toBe(3);
  });

  it("devuelve 0 si input inválido", () => {
    expect(totalToDelete(null)).toBe(0);
    expect(totalToDelete(undefined)).toBe(0);
  });
});

describe("DELETE_COLLECTIONS", () => {
  it("incluye todas las colecciones con datos del tenant", () => {
    expect(DELETE_COLLECTIONS).toEqual([
      "products", "moves", "warehouses", "productRequests", "notifications",
    ]);
  });
});
