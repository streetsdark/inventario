import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "./helpers/renderWithRouter";
import Landing from "../views/Landing";

describe("Landing page", () => {
  it("renderiza el hero con CTA principal", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText(/El inventario serio/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Empieza gratis/i).length).toBeGreaterThan(0);
  });

  it("muestra las 6 features anunciadas", () => {
    renderWithRouter(<Landing />);
    expect(screen.getAllByText(/Analíticas interactivas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Escáner QR/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Multi-almacén real/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CSV \/ PDF/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/multi-tenant/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Auditoría completa/i).length).toBeGreaterThan(0);
  });

  it("muestra los 3 planes con precios", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("29")).toBeInTheDocument();
    expect(screen.getByText("79")).toBeInTheDocument();
    expect(screen.getByText("149")).toBeInTheDocument();
  });

  it("Pro está marcado como featured (badge 'Más popular')", () => {
    renderWithRouter(<Landing />);
    expect(screen.getByText(/Más popular/i)).toBeInTheDocument();
  });

  it("muestra al menos 6 preguntas en el FAQ", () => {
    renderWithRouter(<Landing />);
    const faqItems = document.querySelectorAll(".landing-faq-item");
    expect(faqItems.length).toBeGreaterThanOrEqual(6);
  });

  it("footer incluye links a Términos, Privacidad y Cookies", () => {
    renderWithRouter(<Landing />);
    expect(screen.getAllByText(/Términos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Privacidad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cookies/i).length).toBeGreaterThan(0);
  });

  it("links 'Iniciar sesión' apuntan a /login", () => {
    renderWithRouter(<Landing />);
    const loginLinks = screen.getAllByText(/Iniciar sesión/i);
    expect(loginLinks[0].closest("a")).toHaveAttribute("href", "/login");
  });
});
