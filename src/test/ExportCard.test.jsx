import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMoves = vi.hoisted(() => ({ moves: [], loading: false }));
const mockProducts = vi.hoisted(() => ({ products: [], loading: false }));

vi.mock("../hooks/useMoves", () => ({ default: () => mockMoves }));
vi.mock("../hooks/useProducts", () => ({ default: () => mockProducts }));

vi.mock("../utils/auditService", () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));

const exportFns = vi.hoisted(() => ({
  exportMovementsToCSV: vi.fn(() => ({ rows: 5 })),
  exportMovementsToPDF: vi.fn(() => ({ rows: 5 })),
  exportStockToCSV:     vi.fn(() => ({ rows: 3 })),
  exportStockToPDF:     vi.fn(() => ({ rows: 3 })),
}));

vi.mock("../utils/exportService", () => exportFns);

import ExportCard from "../components/ExportCard";

describe("ExportCard", () => {
  beforeEach(() => {
    mockMoves.moves = [];
    mockMoves.loading = false;
    mockProducts.products = [];
    mockProducts.loading = false;
    Object.values(exportFns).forEach((fn) => fn.mockClear?.());
  });

  it("renderiza el trigger con título", () => {
    render(<ExportCard />);
    expect(screen.getByText(/Exportar datos/i)).toBeInTheDocument();
  });

  it("muestra 'Cargando...' mientras cargan moves o products", () => {
    mockMoves.loading = true;
    render(<ExportCard />);
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });

  it("abre el panel al pulsar el trigger", () => {
    render(<ExportCard />);
    fireEvent.click(screen.getByText(/Exportar datos/i));
    expect(screen.getByText(/Histórico de movimientos/i)).toBeInTheDocument();
    expect(screen.getByText(/Stock actual/i)).toBeInTheDocument();
  });

  it("deshabilita botones de movimientos si no hay datos", () => {
    render(<ExportCard />);
    fireEvent.click(screen.getByText(/Exportar datos/i));
    // 2 botones (CSV+PDF) para moves y 2 para stock, todos deshabilitados sin datos
    const buttons = screen.getAllByRole("button");
    // Filter only export buttons (csv/pdf), no el trigger
    const exportButtons = buttons.filter((b) => /CSV|PDF/.test(b.textContent));
    exportButtons.forEach((b) => expect(b).toBeDisabled());
  });

  it("habilita botones de movimientos si hay datos", () => {
    mockMoves.moves = [{ id: "m1" }];
    mockProducts.products = [{ id: "p1" }];
    render(<ExportCard />);
    fireEvent.click(screen.getByText(/Exportar datos/i));
    const csvButtons = screen.getAllByText(/CSV/);
    expect(csvButtons[0]).not.toBeDisabled();
  });

  it("llama a exportMovementsToCSV al pulsar CSV de movimientos", () => {
    mockMoves.moves = [{ id: "m1" }];
    mockProducts.products = [{ id: "p1" }];
    render(<ExportCard />);
    fireEvent.click(screen.getByText(/Exportar datos/i));
    const csvButtons = screen.getAllByText(/CSV/);
    fireEvent.click(csvButtons[0]); // primero = movimientos
    expect(exportFns.exportMovementsToCSV).toHaveBeenCalledTimes(1);
  });

  it("llama a exportStockToPDF al pulsar PDF de stock", () => {
    mockMoves.moves = [{ id: "m1" }];
    mockProducts.products = [{ id: "p1" }];
    render(<ExportCard />);
    fireEvent.click(screen.getByText(/Exportar datos/i));
    const pdfButtons = screen.getAllByText(/PDF/);
    fireEvent.click(pdfButtons[1]); // segundo = stock
    expect(exportFns.exportStockToPDF).toHaveBeenCalledTimes(1);
  });
});
