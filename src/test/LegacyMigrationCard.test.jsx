import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockAccount = vi.hoisted(() => ({
  account: { id: "acc-1", name: "ACME" },
  accountId: "acc-1",
}));

vi.mock("../context/AccountContext", () => ({ useAccountContext: () => mockAccount }));
vi.mock("../firebase/config", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], size: 0 })),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
  doc: vi.fn(),
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

import LegacyMigrationCard from "../components/LegacyMigrationCard";

describe("LegacyMigrationCard — visibilidad", () => {
  beforeEach(() => {
    mockAccount.account = { id: "acc-1", name: "ACME" };
    mockAccount.accountId = "acc-1";
  });

  it("NO se renderiza sin accountId", () => {
    mockAccount.accountId = null;
    mockAccount.account = null;
    const { container } = render(<LegacyMigrationCard />);
    expect(container.firstChild).toBeNull();
  });

  it("se renderiza con account válida", () => {
    render(<LegacyMigrationCard />);
    expect(screen.getByText(/Migrar datos legacy/i)).toBeInTheDocument();
  });
});

describe("LegacyMigrationCard — flujo analizar", () => {
  beforeEach(() => {
    mockAccount.account = { id: "acc-1", name: "ACME" };
    mockAccount.accountId = "acc-1";
  });

  it("abre el panel al pulsar el trigger", () => {
    render(<LegacyMigrationCard />);
    fireEvent.click(screen.getByText(/Migrar datos legacy/i));
    expect(screen.getByRole("button", { name: /Analizar/i })).toBeInTheDocument();
  });

  it("Analizar consulta las 5 colecciones de migración", async () => {
    const { getDocs } = await import("firebase/firestore");
    getDocs.mockClear();
    render(<LegacyMigrationCard />);
    fireEvent.click(screen.getByText(/Migrar datos legacy/i));
    fireEvent.click(screen.getByRole("button", { name: /Analizar/i }));
    await waitFor(() => {
      // products, moves, warehouses, productRequests, notifications
      expect(getDocs).toHaveBeenCalledTimes(5);
    });
  });

  it("muestra 'todos los documentos ya tienen accountId' si no hay legacy", async () => {
    render(<LegacyMigrationCard />);
    fireEvent.click(screen.getByText(/Migrar datos legacy/i));
    fireEvent.click(screen.getByRole("button", { name: /Analizar/i }));
    await waitFor(() => {
      expect(screen.getByText(/ya tienen accountId/i)).toBeInTheDocument();
    });
  });
});
