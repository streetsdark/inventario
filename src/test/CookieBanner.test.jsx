import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CookieBanner, { hasFunctionalCookieConsent } from "../components/CookieBanner";

const STORAGE_KEY = "altadill.cookieConsent";

describe("CookieBanner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("aparece la primera vez (sin consentimiento previo)", () => {
    render(<CookieBanner />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/cookies/i)).toBeInTheDocument();
  });

  it("no aparece si ya hay consentimiento de la versión actual", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: "1", accepted: true, timestamp: "2026-01-01",
    }));
    const { container } = render(<CookieBanner />);
    expect(container.querySelector(".cookie-banner")).toBeNull();
  });

  it("aparece si la versión guardada no coincide (re-prompt)", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: "0", accepted: true,
    }));
    render(<CookieBanner />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("guarda accepted=true al pulsar 'Aceptar todas'", () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByText(/aceptar todas/i));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.accepted).toBe(true);
    expect(stored.version).toBe("1");
  });

  it("guarda accepted=false al pulsar 'Solo necesarias'", () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByText(/solo necesarias/i));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.accepted).toBe(false);
  });

  it("desaparece tras decidir", () => {
    const { container } = render(<CookieBanner />);
    fireEvent.click(screen.getByText(/aceptar todas/i));
    expect(container.querySelector(".cookie-banner")).toBeNull();
  });
});

describe("hasFunctionalCookieConsent", () => {
  beforeEach(() => localStorage.clear());

  it("devuelve false si no hay consentimiento", () => {
    expect(hasFunctionalCookieConsent()).toBe(false);
  });

  it("devuelve true si accepted=true y versión correcta", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: "1", accepted: true }));
    expect(hasFunctionalCookieConsent()).toBe(true);
  });

  it("devuelve false si accepted=false", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: "1", accepted: false }));
    expect(hasFunctionalCookieConsent()).toBe(false);
  });

  it("devuelve false si versión no coincide", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: "0", accepted: true }));
    expect(hasFunctionalCookieConsent()).toBe(false);
  });

  it("devuelve false si localStorage está corrupto", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{");
    expect(hasFunctionalCookieConsent()).toBe(false);
  });
});
