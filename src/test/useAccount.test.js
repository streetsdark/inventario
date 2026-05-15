import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Estado mutable del usuario logueado para los tests
const mockAuthState = vi.hoisted(() => ({ user: { uid: "owner-1" }, loading: false }));

vi.mock("../firebase/config", () => ({ db: {}, auth: {} }));

vi.mock("../context/AuthContext", () => ({
  useAuthContext: () => mockAuthState,
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("../utils/logger", () => ({ error: vi.fn() }));

// Mock de firebase/firestore con utilidades para controlar los snapshots
const fs = vi.hoisted(() => {
  const userDocCb = { current: null };
  const accountDocCb = { current: null };
  const membersCb = { current: null };
  return {
    userDocCb, accountDocCb, membersCb,
    addDocMock: vi.fn(),
    updateDocMock: vi.fn(),
    setDocMock: vi.fn(),
    deleteDocMock: vi.fn(),
    getDocsMock: vi.fn(),
    runTransactionMock: vi.fn(),
  };
});

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc:        vi.fn((_db, col, id) => ({ __doc: `${col}/${id}` })),
  query:      vi.fn((...args) => ({ __query: args })),
  where:      vi.fn((field, op, val) => ({ __where: [field, op, val] })),
  serverTimestamp: vi.fn(() => "server-ts"),
  addDoc:    (...a) => fs.addDocMock(...a),
  updateDoc: (...a) => fs.updateDocMock(...a),
  setDoc:    (...a) => fs.setDocMock(...a),
  deleteDoc: (...a) => fs.deleteDocMock(...a),
  getDocs:   (...a) => fs.getDocsMock(...a),
  runTransaction: (...a) => fs.runTransactionMock(...a),
  onSnapshot: vi.fn((ref, cb) => {
    if (ref?.__doc?.startsWith("users/")) fs.userDocCb.current = cb;
    else if (ref?.__doc?.startsWith("accounts/")) fs.accountDocCb.current = cb;
    else if (ref?.__query) fs.membersCb.current = cb;
    return vi.fn(); // unsubscribe
  }),
}));

import useAccount from "../hooks/useAccount";

async function waitForCb(ref) {
  for (let i = 0; i < 50 && !ref.current; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
}
async function emitUserDoc(data) {
  await waitForCb(fs.userDocCb);
  await act(async () => {
    fs.userDocCb.current?.({ data: () => data, exists: () => true });
    await new Promise((r) => setTimeout(r, 10));
  });
}
async function emitAccountDoc(data) {
  await waitForCb(fs.accountDocCb);
  await act(async () => {
    fs.accountDocCb.current?.({
      id: data?.id || "acc-1",
      exists: () => !!data,
      data: () => data,
    });
    await new Promise((r) => setTimeout(r, 10));
  });
}
async function emitMembers(list) {
  await waitForCb(fs.membersCb);
  await act(async () => {
    fs.membersCb.current?.({
      docs: list.map((m) => ({ id: m.uid, data: () => m })),
    });
    await new Promise((r) => setTimeout(r, 10));
  });
}

describe("useAccount — createAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { uid: "owner-1" };
    mockAuthState.loading = false;
  });

  it("rechaza nombre inválido", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({}); // user sin accountId
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.createAccount({ name: "x" })).rejects.toThrow(/inválido/i);
  });

  it("rechaza si ya tiene cuenta", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "existing", accountRole: "owner" });
    await waitFor(() => expect(result.current.accountId).toBe("existing"));
    await expect(result.current.createAccount({ name: "ACME" })).rejects.toThrow(/ya perteneces/i);
  });

  it("crea la cuenta y vincula al usuario como owner", async () => {
    fs.getDocsMock.mockResolvedValueOnce({ empty: true });
    fs.addDocMock.mockResolvedValueOnce({ id: "acc-new" });
    fs.setDocMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAccount());
    await emitUserDoc({});
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await result.current.createAccount({ name: "ACME S.L." });
    expect(res.id).toBe("acc-new");
    expect(res.slug).toBe("acme-s-l");
    expect(fs.addDocMock).toHaveBeenCalledTimes(1);
    expect(fs.setDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accountRole: "owner", accountId: "acc-new" }),
      expect.any(Object),
    );
  });

  it("rechaza si el slug ya existe", async () => {
    fs.getDocsMock.mockResolvedValueOnce({ empty: false });
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({});
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.createAccount({ name: "ACME S.L." })).rejects.toThrow(/ya existe/i);
  });
});

describe("useAccount — inviteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { uid: "owner-1" };
  });

  async function setupAsOwner() {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "owner" });
    await emitAccountDoc({ id: "acc-1", name: "ACME", ownerId: "owner-1" });
    await emitMembers([{ uid: "owner-1", email: "owner@a.com", accountRole: "owner" }]);
    return result;
  }

  it("rechaza email inválido", async () => {
    const result = await setupAsOwner();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.inviteMember({ email: "no-email" })).rejects.toThrow(/email/i);
  });

  it("rechaza rol inválido o owner", async () => {
    const result = await setupAsOwner();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.inviteMember({ email: "a@b.com", role: "owner" })).rejects.toThrow(/rol/i);
    await expect(result.current.inviteMember({ email: "a@b.com", role: "x" })).rejects.toThrow(/rol/i);
  });

  it("rechaza si el actor es member (sin permisos)", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "member" });
    await emitAccountDoc({ id: "acc-1", ownerId: "owner-1" });
    await waitFor(() => expect(result.current.accountRole).toBe("member"));
    await expect(result.current.inviteMember({ email: "a@b.com" })).rejects.toThrow(/permisos/i);
  });

  it("falla si el usuario invitado no está registrado aún", async () => {
    fs.getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] });
    const result = await setupAsOwner();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.inviteMember({ email: "nuevo@x.com" })).rejects.toThrow(/registrarse/i);
  });

  it("vincula al usuario invitado y actualiza memberCount", async () => {
    fs.getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: "u-2", data: () => ({ accountId: null }) }],
    });
    fs.updateDocMock.mockResolvedValue(undefined);
    const result = await setupAsOwner();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.inviteMember({ email: "u2@x.com", role: "admin" });
    expect(fs.updateDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accountId: "acc-1", accountRole: "admin" }),
    );
  });
});

describe("useAccount — updateMemberRole", () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthState.user = { uid: "owner-1" }; });

  it("rechaza cambiar el rol a uno mismo", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "owner" });
    await emitMembers([{ uid: "owner-1", accountRole: "owner" }]);
    await waitFor(() => expect(result.current.accountRole).toBe("owner"));
    await expect(result.current.updateMemberRole("owner-1", "admin")).rejects.toThrow();
  });

  it("rechaza ascender a otro a owner", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "owner" });
    await emitMembers([
      { uid: "owner-1", accountRole: "owner" },
      { uid: "u-2",     accountRole: "admin" },
    ]);
    await waitFor(() => expect(result.current.members.length).toBe(2));
    await expect(result.current.updateMemberRole("u-2", "owner")).rejects.toThrow();
  });

  it("admin puede mover a un member a admin", async () => {
    fs.updateDocMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "admin" });
    await emitMembers([
      { uid: "owner-1", accountRole: "admin" },
      { uid: "u-2",     accountRole: "member" },
    ]);
    await waitFor(() => expect(result.current.accountRole).toBe("admin"));
    await result.current.updateMemberRole("u-2", "admin");
    expect(fs.updateDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accountRole: "admin" }),
    );
  });
});

describe("useAccount — transferOwnership", () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthState.user = { uid: "owner-1" }; });

  it("solo el owner puede transferir", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "admin" });
    await emitMembers([
      { uid: "u-2", accountRole: "member" },
    ]);
    await waitFor(() => expect(result.current.accountRole).toBe("admin"));
    await expect(result.current.transferOwnership("u-2")).rejects.toThrow(/owner/i);
  });

  it("ejecuta una transacción atómica", async () => {
    fs.runTransactionMock.mockImplementation(async (_db, cb) => {
      const tx = { update: vi.fn() };
      await cb(tx);
      return tx;
    });
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "owner" });
    await emitMembers([
      { uid: "owner-1", accountRole: "owner" },
      { uid: "u-2",     accountRole: "admin" },
    ]);
    await waitFor(() => expect(result.current.members.length).toBe(2));
    await result.current.transferOwnership("u-2");
    expect(fs.runTransactionMock).toHaveBeenCalledTimes(1);
  });
});

describe("useAccount — removeMember", () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuthState.user = { uid: "owner-1" }; });

  it("rechaza eliminarse a uno mismo", async () => {
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "owner" });
    await emitMembers([{ uid: "owner-1", accountRole: "owner" }]);
    await waitFor(() => expect(result.current.accountRole).toBe("owner"));
    await expect(result.current.removeMember("owner-1")).rejects.toThrow();
  });

  it("rechaza eliminar al owner", async () => {
    mockAuthState.user = { uid: "actor" };
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "admin" });
    await emitMembers([
      { uid: "owner-1", accountRole: "owner" },
      { uid: "actor",   accountRole: "admin" },
    ]);
    await waitFor(() => expect(result.current.members.length).toBe(2));
    await expect(result.current.removeMember("owner-1")).rejects.toThrow(/owner/i);
  });

  it("desvincula al usuario y actualiza memberCount", async () => {
    fs.updateDocMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccount());
    await emitUserDoc({ accountId: "acc-1", accountRole: "owner" });
    await emitMembers([
      { uid: "owner-1", accountRole: "owner" },
      { uid: "u-2",     accountRole: "member" },
    ]);
    await waitFor(() => expect(result.current.members.length).toBe(2));
    await result.current.removeMember("u-2");
    expect(fs.updateDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accountId: null, accountRole: null }),
    );
  });
});
