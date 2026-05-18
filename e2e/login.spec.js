import { test, expect } from "@playwright/test";

test.describe("Login (público)", () => {
  test("/login muestra el formulario", async ({ page }) => {
    await page.goto("/login");
    // Acepta varios layouts: input email visible, botones de Google/Email…
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });

  test("no muestra contenido de admin sin sesión", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/Dashboard de Almacen/i)).toHaveCount(0);
  });
});
