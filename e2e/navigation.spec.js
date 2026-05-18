import { test, expect } from "@playwright/test";

test.describe("Navegación y rutas básicas", () => {
  test("404 muestra mensaje de error en ruta inexistente", async ({ page }) => {
    await page.goto("/no-existe-esta-ruta-1234");
    // El componente E404 debe estar visible. Aceptamos cualquier indicador.
    const body = page.locator("body");
    await expect(body).toBeVisible();
    // No debería romper la página
    const errorOrNotFound = page.locator("body").getByText(/404|no encontrad|error/i).first();
    await expect(errorOrNotFound).toBeVisible({ timeout: 5_000 });
  });

  test("/intro carga la animación original de marca", async ({ page }) => {
    await page.goto("/intro");
    // La intro tiene un video o título "ALTADILL"
    const heroTitle = page.locator(".hero-title-block, body").getByText(/ALTADILL/i).first();
    await expect(heroTitle).toBeVisible({ timeout: 5_000 });
  });

  test("rutas protegidas redirigen a /login sin sesión", async ({ page }) => {
    await page.goto("/dashboard");
    // Si no hay sesión, AuthRoute manda a /login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
