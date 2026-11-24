import { test, expect } from "playwright/test";

const indexUrl = new URL("../dist/index.html", import.meta.url).href;
test.use({ channel: "chrome" });

test("selected material samples travel to the scope and clear with the brief", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${indexUrl}?view=materials&lang=es&qa=materials`);
  await page.locator('[data-material-group="counter"][data-material="oak"]').click();
  await page.getByRole("link", { name: "Añadir muestras al alcance" }).click();
  const summary = page.locator(".scope-material-summary");
  await expect(summary).toContainText("Roble cálido, Roble cálido, Azulejo verde salvia");
  expect(new URL(page.url()).searchParams.get("qa")).toBe("materials");
  await page.locator("#language-select").selectOption("en");
  await expect(summary).toContainText("Warm oak, Warm oak, Quiet sage tile");
  await page.reload();
  await expect(summary).toBeVisible();
  await page.locator("#scope-clear").click();
  await expect(summary).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("counter")).toBe(false);
  await page.goto(`${indexUrl}?view=scope&cabinet=oak&counter=unknown&tile=sage`);
  await expect(summary).toHaveCount(0);
});

test("material notes follow the selected finish and preserve keyboard focus", async ({ page }) => {
  for (const [lang, width] of [["es", 390], ["en", 1440]]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${indexUrl}?view=materials&lang=${lang}`);
    const notes = page.locator(".material-notes");
    await expect(notes.locator("dd")).toHaveCount(3);
    await expect(notes).toContainText(lang === "es" ? "derrames" : "spills");
    const oak = page.locator('[data-material-group="counter"][data-material="oak"]');
    await oak.focus();
    await page.keyboard.press("Enter");
    await expect(oak).toBeFocused();
    await expect(oak).toHaveAttribute("aria-pressed", "true");
    await expect(notes).toContainText(lang === "es" ? "fregadero" : "sink");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test("keeps review context in native view and legal links", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of ["en", "es"]) {
    await page.goto(`${indexUrl}?view=home&lang=${lang}&qa=review&cache=fixture#main-content`);
    const work = page.locator('#primary-nav a[data-view-link="work"]');
    const href = new URL(await work.getAttribute("href"), page.url());
    expect(Object.fromEntries(href.searchParams)).toEqual({ view: "work", lang, qa: "review", cache: "fixture" });
    expect(href.hash).toBe("#main-content");
    const tab = await context.newPage();
    await tab.goto(href.href);
    await expect(tab.locator("html")).toHaveAttribute("lang", lang);
    await expect(tab.locator('#primary-nav a[aria-current="page"]')).toHaveAttribute("data-view-link", "work");
    await tab.close();
    await page.locator('.footer-shell a[href*="policies.html"]').click();
    const legal = new URL(page.url());
    expect(Object.fromEntries(legal.searchParams)).toEqual({ lang, qa: "review", cache: "fixture" });
    expect(legal.hash).toBe("");
    const back = new URL(await page.locator("header .brand").getAttribute("href"), page.url());
    expect(Object.fromEntries(back.searchParams)).toEqual({ lang, qa: "review", cache: "fixture" });
  }
});

test.describe("Morrow scope builder", () => {
  for (const width of [390, 1440]) {
  test(`keeps brief state, focus and URL coherent in EN/ES at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${indexUrl}?view=scope&lang=en&qa=browser&cache=fixture#main-content`);
    await expect(page).toHaveTitle("Scope Builder | Morrow & Mason");
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('#primary-nav [aria-current="page"]')).toHaveAttribute("data-view-link", "scope");

    const form = page.locator("#scope-form");
    const status = page.locator("#scope-status");
    const submit = form.locator('button[type="submit"]');
    const clear = page.locator("#scope-clear");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".eyebrow").first()).toHaveCSS("font-size", "14px");
    await expect(page.locator(".field-label").first()).toHaveCSS("font-size", "14px");
    await expect(page.locator(".field-help").first()).toHaveCSS("font-size", "14px");
    await expect(page.locator(".check-list label").first()).toHaveCSS("font-size", "14px");
    await expect(status).toHaveCSS("font-size", "14px");
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
    const selector = page.locator("#language-select");
    await expect(selector).toHaveCSS("font-size", "14px");
    expect((await selector.boundingBox()).height).toBeGreaterThanOrEqual(40);
    for (const [name, size] of [[".summary-item", "14px"], [".summary-note", "16px"], [".view-note", "16px"]]) {
      await expect(page.locator(name).first()).toHaveCSS("font-size", size);
    }

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
    await expect(submit).toHaveText("Preparar resumen de demo");
    await expect(clear).toHaveText("Limpiar resumen");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

    await submit.click();
    await expect(status).toContainText("Resumen de demo preparado localmente");
    await expect(status).toBeFocused();
    await expect(submit).toHaveText("Actualizar este resumen");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.locator("body")).not.toHaveText(/\b(preview|brief|handoff)\b/i);
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
  });
  test(`keeps filters and material controls legible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const lang of ["en", "es"]) {
      for (const [view, selector] of [["work", ".filter-button"], ["materials", ".swatch-button"], ["home", ".button-small"]]) {
        await page.goto(`${indexUrl}?view=${view}&lang=${lang}`);
        const control = page.locator(selector).first();
        await expect(control).toHaveCSS("font-size", "14px");
        if (selector === ".button-small") await expect(control).toHaveCSS("min-height", "40px");
        else expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(40);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      }
    }
  });
  }
});
