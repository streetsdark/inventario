import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildExportPayload,
  summarizePayload,
  downloadJsonExport,
  EXPORT_VERSION,
} from "../utils/dataExport";

describe("buildExportPayload", () => {
  it("estructura el payload con todos los campos esperados", () => {
    const r = buildExportPayload({
      account: { id: "a", name: "ACME" },
      members: [{ uid: "u1" }],
      products: [{ id: "p1" }],
      moves: [{ id: "m1" }],
      warehouses: [{ id: "w1" }],
      productRequests: [{ id: "r1" }],
      notifications: [{ id: "n1" }],
    });
    expect(r.exportVersion).toBe(EXPORT_VERSION);
    expect(r.account).toEqual({ id: "a", name: "ACME" });
    expect(r.members).toHaveLength(1);
    expect(r.data.products).toHaveLength(1);
    expect(r.data.notifications).toHaveLength(1);
    expect(typeof r.exportedAt).toBe("string");
  });

  it("tolera entradas faltantes/no-array", () => {
    const r = buildExportPayload({});
    expect(r.account).toBeNull();
    expect(r.members).toEqual([]);
    expect(r.data.products).toEqual([]);
    expect(r.data.notifications).toEqual([]);
  });
});

describe("summarizePayload", () => {
  it("cuenta items por colección", () => {
    const payload = buildExportPayload({
      members: [{ uid: "u1" }, { uid: "u2" }],
      products: [{ id: "p1" }],
      moves: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
      warehouses: [],
      productRequests: [{ id: "r1" }],
      notifications: [],
    });
    const s = summarizePayload(payload);
    expect(s).toEqual({
      members: 2,
      products: 1,
      moves: 3,
      warehouses: 0,
      productRequests: 1,
      notifications: 0,
    });
  });

  it("devuelve ceros si el payload es inválido", () => {
    const s = summarizePayload(null);
    expect(s.products).toBe(0);
  });
});

describe("downloadJsonExport", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);
  });

  it("genera el blob JSON y dispara descarga", () => {
    const payload = buildExportPayload({ products: [{ id: "p1" }] });
    const r = downloadJsonExport(payload, "test-export");
    expect(r.bytes).toBeGreaterThan(0);
    expect(r.name).toBe("test-export.json");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});
