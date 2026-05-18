import { test, expect } from "@playwright/test";

test.describe("Landing page (público)", () => {
  test("carga sin errores de consola críticos", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      // Ignoramos los warnings esperados del entorno dev
      if (msg.type() === "error" && !msg.text().includes("CSP")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/Altadill/i);
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("muestra hero, features, pricing y FAQ", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/El inventario serio/i)).toBeVisible();
    await expect(page.getByText(/Multi-almacén real/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business" })).toBeVisible();
    await expect(page.getByText(/Preguntas frecuentes/i)).toBeVisible();
  });

  test("CTA 'Empieza gratis' navega a /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Empieza gratis/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("link 'Iniciar sesión' del header navega a /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Iniciar sesión/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("FAQ se expande al hacer clic", async ({ page }) => {
    await page.goto("/");
    const firstFaq = page.locator(".landing-faq-item").first();
    await firstFaq.click();
    await expect(firstFaq).toHaveAttribute("open", "");
  });
});
