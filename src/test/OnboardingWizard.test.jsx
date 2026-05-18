import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockAccount = vi.hoisted(() => ({
  account: { id: "acc-1", name: "ACME" },
  accountId: "acc-1",
  accountRole: "owner",
}));

const mockWh = vi.hoisted(() => ({
  warehouses: [],
  defaultWarehouseId: null,
  createWarehouse: vi.fn(() => Promise.resolve()),
}));

const mockOnb = vi.hoisted(() => ({
  completed: false,
  loading: false,
  complete: vi.fn(() => Promise.resolve()),
  skip: vi.fn(() => Promise.resolve()),
}));

vi.mock("../context/AccountContext", () => ({
  useAccountContext: () => mockAccount,
}));

vi.mock("../context/WarehouseContext", () => ({
  useWarehouseContext: () => mockWh,
}));

vi.mock("../hooks/useOnboarding", () => ({
  default: () => mockOnb,
}));

vi.mock("../firebase/config", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => "doc-ref"),
  collection: vi.fn(() => "col-ref"),
  serverTimestamp: vi.fn(() => "ts"),
  updateDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: "p1" })),
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

import OnboardingWizard from "../components/OnboardingWizard";

describe("OnboardingWizard — visibilidad", () => {
  beforeEach(() => {
    mockAccount.accountId = "acc-1";
    mockAccount.accountRole = "owner";
    mockOnb.completed = false;
    mockOnb.loading = false;
  });

  it("no renderiza si onboarding ya completado", () => {
    mockOnb.completed = true;
    const { container } = render(<OnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza si está cargando", () => {
    mockOnb.loading = true;
    const { container } = render(<OnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza sin accountId", () => {
    mockAccount.accountId = null;
    const { container } = render(<OnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza si el usuario NO es owner", () => {
    mockAccount.accountRole = "admin";
    const { container } = render(<OnboardingWizard />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza para owner sin completar", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText(/Bienvenido a ACME/i)).toBeInTheDocument();
  });
});

describe("OnboardingWizard — interacción", () => {
  beforeEach(() => {
    mockAccount.accountId = "acc-1";
    mockAccount.accountRole = "owner";
    mockOnb.completed = false;
    mockOnb.loading = false;
    mockOnb.skip.mockClear();
  });

  it("muestra el paso 1 al iniciar", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText(/Paso 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Cuéntanos de tu negocio/i)).toBeInTheDocument();
  });

  it("botón 'Saltar todo' está visible", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText(/Saltar todo/i)).toBeInTheDocument();
  });

  it("'Saltar todo' llama a onb.skip()", async () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByText(/Saltar todo/i));
    expect(mockOnb.skip).toHaveBeenCalledTimes(1);
  });

  it("muestra los 3 pasos en el indicador de progreso", () => {
    const { container } = render(<OnboardingWizard />);
    expect(container.querySelectorAll(".onb-progress-step").length).toBe(3);
  });

  it("el primer paso muestra el selector de sector", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText(/Sector/i)).toBeInTheDocument();
  });
});
