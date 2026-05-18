import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockAccount = vi.hoisted(() => ({
  account: { id: "acc-1", name: "ACME", slug: "acme" },
  accountId: "acc-1",
  accountRole: "owner",
  members: [{ uid: "u1" }],
}));

const mockAuth = vi.hoisted(() => ({
  user: { uid: "u1", email: "owner@a.com" },
}));

vi.mock("../context/AccountContext", () => ({
  useAccountContext: () => mockAccount,
}));

vi.mock("../context/AuthContext", () => ({
  useAuthContext: () => mockAuth,
}));

vi.mock("../firebase/config", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "col"),
  doc: vi.fn(() => "doc"),
  query: vi.fn((...a) => a),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  deleteDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

import AccountSettingsCard from "../components/AccountSettingsCard";

describe("AccountSettingsCard — visibilidad", () => {
  beforeEach(() => {
    mockAccount.accountRole = "owner";
    mockAccount.accountId = "acc-1";
    mockAccount.account = { id: "acc-1", name: "ACME", slug: "acme" };
  });

  it("no renderiza si no hay cuenta", () => {
    mockAccount.account = null;
    mockAccount.accountId = null;
    const { container } = render(<AccountSettingsCard />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza para member", () => {
    mockAccount.accountRole = "member";
    const { container } = render(<AccountSettingsCard />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza para admin (solo owner)", () => {
    mockAccount.accountRole = "admin";
    const { container } = render(<AccountSettingsCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza para owner", () => {
    render(<AccountSettingsCard />);
    expect(screen.getByText(/Ajustes de cuenta/i)).toBeInTheDocument();
  });
});

describe("AccountSettingsCard — panel", () => {
  beforeEach(() => {
    mockAccount.accountRole = "owner";
    mockAccount.account = { id: "acc-1", name: "ACME", slug: "acme" };
    mockAccount.accountId = "acc-1";
  });

  it("muestra secciones Exportar y Borrar al abrir", () => {
    render(<AccountSettingsCard />);
    fireEvent.click(screen.getByText(/Ajustes de cuenta/i));
    expect(screen.getByText(/Exportar mis datos/i)).toBeInTheDocument();
    // Aparece en h3 + botón
    expect(screen.getAllByText(/Borrar mi cuenta/i).length).toBeGreaterThanOrEqual(2);
  });

  it("botón Exportar JSON visible", () => {
    render(<AccountSettingsCard />);
    fireEvent.click(screen.getByText(/Ajustes de cuenta/i));
    expect(screen.getByText(/Exportar JSON/i)).toBeInTheDocument();
  });

  it("botón Borrar mi cuenta visible (en rojo)", () => {
    render(<AccountSettingsCard />);
    fireEvent.click(screen.getByText(/Ajustes de cuenta/i));
    const deleteButtons = screen.getAllByText(/Borrar mi cuenta/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it("texto avisa que la acción no se puede deshacer", () => {
    render(<AccountSettingsCard />);
    fireEvent.click(screen.getByText(/Ajustes de cuenta/i));
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
  });
});
