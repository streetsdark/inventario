import { describe, it, expect } from "vitest";
import { filterByAccount, attachedAccountId, ALL_ACCOUNTS } from "../utils/accountFilter";

describe("filterByAccount", () => {
  const items = [
    { id: "a", accountId: "acc-1" },
    { id: "b", accountId: "acc-2" },
    { id: "c" },                  // legacy
    { id: "d", accountId: "" },   // legacy explícito
    { id: "e", accountId: "acc-1" },
  ];

  it("devuelve todo si selectedAccountId es falsy", () => {
    expect(filterByAccount(items, null, "acc-1")).toHaveLength(5);
    expect(filterByAccount(items, undefined, "acc-1")).toHaveLength(5);
    expect(filterByAccount(items, "", "acc-1")).toHaveLength(5);
  });

  it("devuelve todo con ALL_ACCOUNTS", () => {
    expect(filterByAccount(items, ALL_ACCOUNTS, "acc-1")).toHaveLength(5);
  });

  it("filtra por accountId exacto", () => {
    const r = filterByAccount(items, "acc-1", "acc-1");
    // acc-1 (a, e) + legacy (c, d) porque defaultAccountId == selectedAccountId
    expect(r.map((i) => i.id).sort()).toEqual(["a", "c", "d", "e"]);
  });

  it("NO incluye legacy cuando se selecciona una cuenta distinta a la del usuario", () => {
    const r = filterByAccount(items, "acc-2", "acc-1");
    expect(r.map((i) => i.id)).toEqual(["b"]);
  });

  it("devuelve [] si items no es array", () => {
    expect(filterByAccount(null, "acc-1", "acc-1")).toEqual([]);
    expect(filterByAccount(undefined, "acc-1", "acc-1")).toEqual([]);
  });
});

describe("attachedAccountId", () => {
  it("respeta el accountId existente del documento", () => {
    expect(attachedAccountId("acc-1", "acc-2")).toBe("acc-1");
  });

  it("usa selectedAccountId si no hay existing", () => {
    expect(attachedAccountId("", "acc-2")).toBe("acc-2");
    expect(attachedAccountId(null, "acc-2")).toBe("acc-2");
    expect(attachedAccountId(undefined, "acc-2")).toBe("acc-2");
  });

  it("devuelve '' si nada disponible", () => {
    expect(attachedAccountId(null, null)).toBe("");
    expect(attachedAccountId("", "")).toBe("");
    expect(attachedAccountId(undefined, undefined)).toBe("");
  });
});
