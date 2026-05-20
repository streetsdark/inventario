import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockAccount = vi.hoisted(() => ({ accountId: "acc-1" }));
const mockAuth    = vi.hoisted(() => ({ user: { uid: "u-1" } }));

vi.mock("../context/AccountContext", () => ({ useAccountContext: () => mockAccount }));
vi.mock("../context/AuthContext",    () => ({ useAuthContext: () => mockAuth }));
vi.mock("../firebase/config", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
  serverTimestamp: vi.fn(() => "ts"),
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

import ImportCsvCard from "../components/ImportCsvCard";

describe("ImportCsvCard", () => {
  beforeEach(() => { mockAccount.accountId = "acc-1"; });

  it("renderiza el trigger", () => {
    render(<ImportCsvCard />);
    expect(screen.getByText(/Importar CSV/i)).toBeInTheDocument();
  });

  it("abre el panel al pulsar trigger", () => {
    render(<ImportCsvCard />);
    fireEvent.click(screen.getByText(/Importar CSV/i));
    expect(screen.getByText(/Los datos del CSV se guardan/i)).toBeInTheDocument();
  });

  it("muestra aviso si no hay accountId", () => {
    mockAccount.accountId = null;
    render(<ImportCsvCard />);
    fireEvent.click(screen.getByText(/Importar CSV/i));
    expect(screen.getByText(/Necesitas tener una cuenta creada/i)).toBeInTheDocument();
  });

  it("muestra los límites en el hint", () => {
    render(<ImportCsvCard />);
    fireEvent.click(screen.getByText(/Importar CSV/i));
    expect(screen.getByText(/1000 filas/)).toBeInTheDocument();
    expect(screen.getByText(/separador.*;.*o/i)).toBeInTheDocument();
  });

  it("renderiza el input file con accept .csv", () => {
    const { container } = render(<ImportCsvCard />);
    fireEvent.click(screen.getByText(/Importar CSV/i));
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute("accept")).toMatch(/csv/);
  });
});
