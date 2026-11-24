import { test, expect } from "playwright/test";

const indexUrl = new URL("../dist/index.html", import.meta.url).href;
test.use({ channel: "chrome" });

test.describe("Morrow scope builder", () => {
  for (const width of [390, 1440]) {
  test(`keeps brief state, focus and URL coherent in EN/ES at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${indexUrl}?view=scope&lang=en&qa=browser&cache=fixture#main-content`);
    await expect(page).toHaveTitle("Scope Builder | Morrow & Mason");

    const form = page.locator("#scope-form");
    const status = page.locator("#scope-status");
    const submit = form.locator('button[type="submit"]');
    const clear = page.locator("#scope-clear");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".eyebrow").first()).toHaveCSS("font-size", "14px");
    await expect(page.locator(".field-label").first()).toHaveCSS("font-size", "14px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

    await submit.click();
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(3);
    await expect(page.locator('[name="room"]')).toBeFocused();
    await expect(status).toHaveAttribute("data-tone", "error");

    await page.locator('[name="room"]').selectOption("kitchen");
    await page.locator('[name="scale"]').selectOption("remodel");
    await page.locator('[name="timeline"]').selectOption("season");
    await page.locator('[name="details"]').fill("More light and calm storage");
    await submit.click();
    await expect(status).toContainText("Demo brief prepared locally");
    await expect(status).toBeFocused();
    await expect(submit).toHaveText("Update this brief");
    await expect(clear).toHaveText("Clear brief");
    await expect(page.locator(".summary-list")).toBeVisible();

    await page.locator('[name="details"]').fill("A quieter room for hosting");
    await expect(status).not.toContainText("Demo brief prepared locally");
    await expect(page.locator(".summary-empty")).toBeVisible();
    await expect(submit).toHaveText("Prepare a demo brief");

    await page.locator("#language-select").selectOption("es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle("Planificador de alcance | Morrow & Mason");
    const url = new URL(page.url());
    expect(url.searchParams.get("qa")).toBe("browser");
    expect(url.searchParams.get("cache")).toBe("fixture");
    expect(url.hash).toBe("#main-content");
    await expect(submit).toHaveText("Preparar brief de demo");
    await expect(clear).toHaveText("Limpiar brief");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

    await submit.click();
    await expect(status).toContainText("Brief de demo preparado localmente");
    await expect(status).toBeFocused();
    await expect(submit).toHaveText("Actualizar este brief");
  });
  }
});
