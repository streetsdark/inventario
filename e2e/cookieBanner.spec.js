import { test, expect } from "@playwright/test";

test.describe("Cookie banner", () => {
  test("aparece en la primera visita y desaparece tras aceptar", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    // Limpia el localStorage por si acaso (estado previo)
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const banner = page.getByRole("dialog", { name: /cookies/i });
    await expect(banner).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /Aceptar todas/i }).click();
    await expect(banner).toBeHidden();
  });

  test("'Solo necesarias' también lo oculta", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const banner = page.getByRole("dialog", { name: /cookies/i });
    await expect(banner).toBeVisible();

    await page.getByRole("button", { name: /Solo necesarias/i }).click();
    await expect(banner).toBeHidden();
  });

  test("no reaparece tras decidir (persistencia)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole("button", { name: /Aceptar todas/i }).click();
    await page.reload();

    await expect(page.getByRole("dialog", { name: /cookies/i })).toBeHidden();
  });

  test("link 'Más info' lleva a /cookies", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole("link", { name: /Más info/i }).click();
    await expect(page).toHaveURL(/\/cookies/);
  });
});
