import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockProducts = vi.hoisted(() => ({ products: [], loading: false }));
const mockWh = vi.hoisted(() => ({
  warehouses: [],
  loading: false,
  selectedId: null,
}));
const mockAccount = vi.hoisted(() => ({ accountId: "acc-1" }));

vi.mock("../hooks/useProducts", () => ({ default: () => mockProducts }));
vi.mock("../context/WarehouseContext", () => ({ useWarehouseContext: () => mockWh }));
vi.mock("../context/AccountContext", () => ({ useAccountContext: () => mockAccount }));

vi.mock("../firebase/config", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

import BulkReassignCard from "../components/BulkReassignCard";

describe("BulkReassignCard", () => {
  beforeEach(() => {
    mockProducts.products = [];
    mockProducts.loading = false;
    mockWh.warehouses = [];
  });

  it("renderiza el trigger", () => {
    render(<BulkReassignCard />);
    expect(screen.getByText(/Reasignar productos en bloque/i)).toBeInTheDocument();
  });

  it("abre el panel al pulsar trigger", () => {
    render(<BulkReassignCard />);
    fireEvent.click(screen.getByText(/Reasignar productos en bloque/i));
    // El panel abierto muestra los labels Origen y Destino (puede haber más
    // ocurrencias por opciones del select, basta con que exista al menos una)
    expect(screen.getAllByText(/Origen/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Destino/i).length).toBeGreaterThan(0);
  });

  it("muestra mensaje vacío si no hay productos legacy", () => {
    render(<BulkReassignCard />);
    fireEvent.click(screen.getByText(/Reasignar productos en bloque/i));
    expect(screen.getByText(/No hay productos sin almacén asignado/i)).toBeInTheDocument();
  });

  it("lista productos legacy en el dropdown origen 'Sin asignar'", () => {
    mockProducts.products = [
      { id: "p1", sku: "X-1", description: "Producto legacy", stock: 5 },
      { id: "p2", sku: "X-2", description: "Producto sin acc", stock: 3 },
    ];
    render(<BulkReassignCard />);
    fireEvent.click(screen.getByText(/Reasignar productos en bloque/i));
    expect(screen.getByText("Producto legacy")).toBeInTheDocument();
    expect(screen.getByText("Producto sin acc")).toBeInTheDocument();
  });

  it("dropdown destino incluye todos los almacenes excepto el origen", () => {
    mockProducts.products = [];
    mockWh.warehouses = [
      { id: "w1", name: "Principal", isDefault: true },
      { id: "w2", name: "Madrid",    isDefault: false },
    ];
    render(<BulkReassignCard />);
    fireEvent.click(screen.getByText(/Reasignar productos en bloque/i));
    // Las opciones del select de destino deben incluir Principal y Madrid
    expect(screen.getAllByText(/Principal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Madrid/).length).toBeGreaterThan(0);
  });
});
