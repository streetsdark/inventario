import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockRole = vi.hoisted(() => ({ isSuperUser: false }));
const mockAuth = vi.hoisted(() => ({ user: { uid: "u-1", email: "test@x.com" } }));

vi.mock("../hooks/useRole", () => ({ default: () => mockRole }));
vi.mock("../context/AuthContext", () => ({ useAuthContext: () => mockAuth }));

vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], size: 0 })),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

import DangerZoneCard from "../components/DangerZoneCard";

describe("DangerZoneCard — visibilidad por rol", () => {
  beforeEach(() => { mockRole.isSuperUser = false; });

  it("NO se renderiza si el usuario no es superuser", () => {
    const { container } = render(<DangerZoneCard />);
    expect(container.firstChild).toBeNull();
  });

  it("se renderiza si el usuario es superuser", () => {
    mockRole.isSuperUser = true;
    render(<DangerZoneCard />);
    expect(screen.getByText(/zona de peligro/i)).toBeInTheDocument();
  });
});

describe("DangerZoneCard — flujo trigger", () => {
  beforeEach(() => { mockRole.isSuperUser = true; });

  it("abre el panel al pulsar el trigger", () => {
    render(<DangerZoneCard />);
    fireEvent.click(screen.getByText(/zona de peligro/i));
    expect(screen.getByText(/Borrar TODOS los datos/i)).toBeInTheDocument();
  });

  it("muestra el botón 'Analizar y borrar todo' al abrir", () => {
    render(<DangerZoneCard />);
    fireEvent.click(screen.getByText(/zona de peligro/i));
    expect(screen.getByRole("button", { name: /Analizar.*borrar todo/i })).toBeInTheDocument();
  });

  it("pulsar Analizar dispara getDocs por cada colección de datos", async () => {
    const { getDocs } = await import("firebase/firestore");
    render(<DangerZoneCard />);
    fireEvent.click(screen.getByText(/zona de peligro/i));
    fireEvent.click(screen.getByRole("button", { name: /Analizar.*borrar todo/i }));
    await waitFor(() => {
      // products, moves, warehouses, productRequests, notifications, accounts, users
      expect(getDocs).toHaveBeenCalledTimes(7);
    });
  });
});
