import { describe, it, expect } from "vitest";
import {
  chunkForWipe,
  validateWipeConfirmation,
  filterUsersToDelete,
  summarizeWipe,
  WIPE_CONFIRMATION_PHRASE,
  WIPE_BATCH_LIMIT,
  DATA_COLLECTIONS,
} from "../utils/wipeService";

describe("chunkForWipe", () => {
  it("particiona ids en chunks", () => {
    expect(chunkForWipe(["a","b","c","d","e"], 2)).toEqual([["a","b"],["c","d"],["e"]]);
  });

  it("usa WIPE_BATCH_LIMIT por defecto (500)", () => {
    const ids = Array.from({ length: 1200 }, (_, i) => String(i));
    const r = chunkForWipe(ids);
    expect(r.length).toBe(Math.ceil(1200 / WIPE_BATCH_LIMIT));
    expect(r[0].length).toBe(WIPE_BATCH_LIMIT);
  });

  it("devuelve [] para input vacío o no array", () => {
    expect(chunkForWipe([])).toEqual([]);
    expect(chunkForWipe(null)).toEqual([]);
  });

  it("lanza si size <= 0", () => {
    expect(() => chunkForWipe(["a"], 0)).toThrow();
  });
});

describe("validateWipeConfirmation", () => {
  it("acepta la frase exacta", () => {
    expect(validateWipeConfirmation("BORRAR TODO")).toBe(true);
  });

  it("acepta con espacios alrededor (trim)", () => {
    expect(validateWipeConfirmation("  BORRAR TODO  ")).toBe(true);
  });

  it("rechaza minúsculas", () => {
    expect(validateWipeConfirmation("borrar todo")).toBe(false);
    expect(validateWipeConfirmation("Borrar Todo")).toBe(false);
  });

  it("rechaza texto distinto o incompleto", () => {
    expect(validateWipeConfirmation("BORRAR")).toBe(false);
    expect(validateWipeConfirmation("TODO")).toBe(false);
    expect(validateWipeConfirmation("BORRAR TODOS")).toBe(false);
    expect(validateWipeConfirmation("")).toBe(false);
  });

  it("rechaza no-strings", () => {
    expect(validateWipeConfirmation(null)).toBe(false);
    expect(validateWipeConfirmation(undefined)).toBe(false);
    expect(validateWipeConfirmation(123)).toBe(false);
  });
});

describe("filterUsersToDelete — preserva al superuser actual", () => {
  it("excluye el currentUid", () => {
    expect(filterUsersToDelete(["u1","u2","u3"], "u2")).toEqual(["u1","u3"]);
  });

  it("devuelve [] si currentUid no es string", () => {
    expect(filterUsersToDelete(["u1","u2"], null)).toEqual([]);
    expect(filterUsersToDelete(["u1","u2"], "")).toEqual([]);
  });

  it("devuelve [] si allUserIds no es array", () => {
    expect(filterUsersToDelete(null, "u1")).toEqual([]);
    expect(filterUsersToDelete(undefined, "u1")).toEqual([]);
  });

  it("no borra a nadie si currentUid es el único", () => {
    expect(filterUsersToDelete(["u1"], "u1")).toEqual([]);
  });
});

describe("summarizeWipe", () => {
  it("suma totales por colección + users", () => {
    const r = summarizeWipe(
      { products: 10, moves: 5, warehouses: 2, productRequests: 1, notifications: 0, accounts: 1 },
      ["u1", "u2"],
    );
    expect(r.total).toBe(10 + 5 + 2 + 1 + 0 + 1 + 2);
    expect(r.detail.products).toBe(10);
    expect(r.detail.users).toBe(2);
  });

  it("trata colecciones faltantes como 0", () => {
    const r = summarizeWipe({}, []);
    DATA_COLLECTIONS.forEach((col) => expect(r.detail[col]).toBe(0));
  });

  it("acepta input vacío y devuelve total 0", () => {
    expect(summarizeWipe(null, null)).toEqual({ total: 0, detail: {} });
  });
});

describe("WIPE_CONFIRMATION_PHRASE", () => {
  it("es exactamente 'BORRAR TODO'", () => {
    expect(WIPE_CONFIRMATION_PHRASE).toBe("BORRAR TODO");
  });
});
