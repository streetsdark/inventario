import { test, expect } from "@playwright/test";

test.describe("Páginas legales (públicas)", () => {
  test("/terms carga y muestra contenido", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Términos/i);
    await expect(page.getByText(/Jurisdicción/i).first()).toBeVisible();
  });

  test("/privacy carga, menciona GDPR y subprocesadores", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Privacidad/i);
    await expect(page.getByText(/GDPR/i).first()).toBeVisible();
    await expect(page.getByText(/Firebase/i).first()).toBeVisible();
    await expect(page.getByText(/Cloudinary/i).first()).toBeVisible();
  });

  test("/cookies carga y explica el consentimiento", async ({ page }) => {
    await page.goto("/cookies");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Cookies/i);
    await expect(page.getByText(/Firebase Auth/i).first()).toBeVisible();
    await expect(page.getByText(/consentimiento/i).first()).toBeVisible();
  });

  test("links cruzados entre páginas legales funcionan", async ({ page }) => {
    await page.goto("/terms");
    await page.getByRole("link", { name: /Privacidad/i }).first().click();
    await expect(page).toHaveURL(/\/privacy/);

    await page.getByRole("link", { name: /Cookies/i }).first().click();
    await expect(page).toHaveURL(/\/cookies/);
  });

  test("'Iniciar sesión' desde legal lleva a /login", async ({ page }) => {
    await page.goto("/terms");
    await page.getByRole("link", { name: /Iniciar sesión/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});
