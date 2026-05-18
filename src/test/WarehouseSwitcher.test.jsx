import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockWh = vi.hoisted(() => ({
  warehouses: [],
  loading: false,
  selectedId: "",
  setSelectedId: vi.fn(),
}));

const mockRole = vi.hoisted(() => ({
  isSuperUser: false,
}));

vi.mock("../context/WarehouseContext", () => ({
  useWarehouseContext: () => mockWh,
}));

vi.mock("../hooks/useRole", () => ({
  default: () => mockRole,
}));

import WarehouseSwitcher from "../components/WarehouseSwitcher";

describe("WarehouseSwitcher", () => {
  beforeEach(() => {
    mockWh.warehouses = [];
    mockWh.loading = false;
    mockWh.selectedId = "";
    mockWh.setSelectedId = vi.fn();
    mockRole.isSuperUser = false;
  });

  it("no renderiza nada si está cargando", () => {
    mockWh.loading = true;
    const { container } = render(<WarehouseSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza nada si no hay almacenes", () => {
    const { container } = render(<WarehouseSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza opciones de almacenes con estrella en el default", () => {
    mockWh.warehouses = [
      { id: "w1", name: "Principal", isDefault: true },
      { id: "w2", name: "Madrid", isDefault: false },
    ];
    mockWh.selectedId = "w1";
    render(<WarehouseSwitcher />);
    expect(screen.getByText(/Principal/)).toBeInTheDocument();
    expect(screen.getByText(/Madrid/)).toBeInTheDocument();
  });

  it("incluye opción 'Todos' SOLO para superuser", () => {
    mockWh.warehouses = [{ id: "w1", name: "Principal", isDefault: true }];
    mockRole.isSuperUser = true;
    render(<WarehouseSwitcher />);
    expect(screen.getByText(/Todos.*admin/i)).toBeInTheDocument();
  });

  it("NO incluye opción 'Todos' para usuarios normales", () => {
    mockWh.warehouses = [{ id: "w1", name: "Principal", isDefault: true }];
    mockRole.isSuperUser = false;
    render(<WarehouseSwitcher />);
    expect(screen.queryByText(/Todos.*admin/i)).toBeNull();
  });

  it("dispara setSelectedId al cambiar el select", () => {
    mockWh.warehouses = [
      { id: "w1", name: "Principal", isDefault: true },
      { id: "w2", name: "Madrid", isDefault: false },
    ];
    mockWh.selectedId = "w1";
    render(<WarehouseSwitcher />);
    fireEvent.change(screen.getByLabelText(/almacén/i), { target: { value: "w2" } });
    expect(mockWh.setSelectedId).toHaveBeenCalledWith("w2");
  });
});
