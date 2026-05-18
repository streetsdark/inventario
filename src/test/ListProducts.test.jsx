import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockHook = vi.hoisted(() => ({
  products: [],
  loading: false,
  removeProduct: vi.fn(),
}));

vi.mock("../hooks/useProducts", () => ({
  default: () => mockHook,
}));

// Stub RequestProductModal para evitar arrastrar otros contextos
vi.mock("../components/RequestProductModal", () => ({
  default: () => null,
}));

vi.mock("../hooks/useRole", () => ({
  default: () => ({ isSuperUser: false, isAdmin: false }),
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({ user: null, loading: false }),
}));

import ListProducts from "../components/ListProducts";

describe("ListProducts — render", () => {
  beforeEach(() => {
    mockHook.products = [];
    mockHook.loading = false;
  });

  it("muestra mensaje de carga cuando loading=true", () => {
    mockHook.loading = true;
    render(<ListProducts query="" setEditProduct={() => {}} />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("muestra mensaje vacío cuando no hay productos", () => {
    render(<ListProducts query="" setEditProduct={() => {}} />);
    // Componente muestra algo cuando no hay productos
    expect(screen.queryByText(/cargando/i)).toBeNull();
  });

  it("renderiza la lista de productos con su nombre", () => {
    mockHook.products = [
      { id: "p1", sku: "TOR-001", description: "Tornillo M8", stock: 50, stockMinimo: 10, location: "A-1", product_Unit: "u" },
      { id: "p2", sku: "LLA-002", description: "Llave inglesa", stock: 0, stockMinimo: 5, location: "B-2", product_Unit: "u" },
    ];
    render(<ListProducts query="" setEditProduct={() => {}} />);
    expect(screen.getByText("Tornillo M8")).toBeInTheDocument();
    expect(screen.getByText("Llave inglesa")).toBeInTheDocument();
  });

  it("aplica clase is-out-of-stock cuando stock=0", () => {
    mockHook.products = [
      { id: "p1", sku: "X", description: "X", stock: 0, stockMinimo: 5, location: "A", product_Unit: "u" },
    ];
    const { container } = render(<ListProducts query="" setEditProduct={() => {}} />);
    expect(container.querySelector(".is-out-of-stock")).toBeInTheDocument();
  });

  it("aplica clase is-low-stock cuando stock <= stockMinimo", () => {
    mockHook.products = [
      { id: "p1", sku: "X", description: "X", stock: 3, stockMinimo: 10, location: "A", product_Unit: "u" },
    ];
    const { container } = render(<ListProducts query="" setEditProduct={() => {}} />);
    expect(container.querySelector(".is-low-stock")).toBeInTheDocument();
  });

  it("aplica clase is-in-stock cuando stock > stockMinimo", () => {
    mockHook.products = [
      { id: "p1", sku: "X", description: "X", stock: 100, stockMinimo: 10, location: "A", product_Unit: "u" },
    ];
    const { container } = render(<ListProducts query="" setEditProduct={() => {}} />);
    expect(container.querySelector(".is-in-stock")).toBeInTheDocument();
  });

  it("usa umbral default (5) si stockMinimo=0", () => {
    mockHook.products = [
      { id: "p1", sku: "X", description: "X", stock: 3, stockMinimo: 0, location: "A", product_Unit: "u" },
    ];
    const { container } = render(<ListProducts query="" setEditProduct={() => {}} />);
    expect(container.querySelector(".is-low-stock")).toBeInTheDocument();
  });

  it("filtra por stockFilter='low' (solo bajo stock)", () => {
    mockHook.products = [
      { id: "p1", sku: "A", description: "Alto",  stock: 100, stockMinimo: 10, location: "A", product_Unit: "u" },
      { id: "p2", sku: "B", description: "Bajo",  stock: 3,   stockMinimo: 10, location: "A", product_Unit: "u" },
    ];
    render(<ListProducts query="" stockFilter="low" setEditProduct={() => {}} />);
    expect(screen.getByText("Bajo")).toBeInTheDocument();
    expect(screen.queryByText("Alto")).toBeNull();
  });

  it("filtra por stockFilter='out' (solo sin stock)", () => {
    mockHook.products = [
      { id: "p1", sku: "A", description: "Disponible", stock: 50, stockMinimo: 5, location: "A", product_Unit: "u" },
      { id: "p2", sku: "B", description: "Agotado",    stock: 0,  stockMinimo: 5, location: "A", product_Unit: "u" },
    ];
    render(<ListProducts query="" stockFilter="out" setEditProduct={() => {}} />);
    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.queryByText("Disponible")).toBeNull();
  });
});
