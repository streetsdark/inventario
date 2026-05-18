import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock del contexto Account — controlable por test
const mockCtx = vi.hoisted(() => ({
  accountId: null,
  loading: false,
  createAccount: vi.fn(() => Promise.resolve({ id: "acc-1", slug: "acme" })),
}));

vi.mock("../context/AccountContext", () => ({
  useAccountContext: () => mockCtx,
}));

import SignupAccountForm from "../components/SignupAccountForm";

describe("SignupAccountForm", () => {
  beforeEach(() => {
    mockCtx.accountId = null;
    mockCtx.loading = false;
    mockCtx.createAccount = vi.fn(() => Promise.resolve({ id: "acc-1", slug: "acme" }));
  });

  it("no renderiza nada si está cargando", () => {
    mockCtx.loading = true;
    const { container } = render(<SignupAccountForm />);
    expect(container.firstChild).toBeNull();
  });

  it("no renderiza nada si el usuario ya tiene cuenta", () => {
    mockCtx.accountId = "acc-1";
    const { container } = render(<SignupAccountForm />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el formulario si no hay cuenta", () => {
    render(<SignupAccountForm />);
    expect(screen.getByText(/crea tu cuenta/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ACME/i)).toBeInTheDocument();
  });

  it("muestra preview del slug al escribir nombre válido", () => {
    render(<SignupAccountForm />);
    fireEvent.change(screen.getByPlaceholderText(/ACME/i), {
      target: { value: "Hierros Altadill" },
    });
    expect(screen.getByText(/hierros-altadill/)).toBeInTheDocument();
  });

  it("deshabilita el botón si el nombre no es válido (< 2 chars)", () => {
    render(<SignupAccountForm />);
    fireEvent.change(screen.getByPlaceholderText(/ACME/i), {
      target: { value: "a" },
    });
    const button = screen.getByRole("button", { name: /crear cuenta/i });
    expect(button).toBeDisabled();
  });

  it("llama a createAccount al enviar nombre válido", async () => {
    render(<SignupAccountForm />);
    fireEvent.change(screen.getByPlaceholderText(/ACME/i), {
      target: { value: "ACME S.L." },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => {
      expect(mockCtx.createAccount).toHaveBeenCalledWith({ name: "ACME S.L." });
    });
  });

  it("muestra error si createAccount falla", async () => {
    mockCtx.createAccount = vi.fn(() => Promise.reject(new Error("Ya existe")));
    render(<SignupAccountForm />);
    fireEvent.change(screen.getByPlaceholderText(/ACME/i), {
      target: { value: "ACME S.L." },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => {
      expect(screen.getByText(/ya existe/i)).toBeInTheDocument();
    });
  });
});
