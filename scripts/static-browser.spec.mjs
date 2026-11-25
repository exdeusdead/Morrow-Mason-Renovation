import { test, expect } from "playwright/test";
import worker from "../dist/server/index.js";

const base = "https://morrow.example/r/morrow-mason-renovation/";
const paths = [
  ["?view=work", "Rooms with a point of view.", "Habitaciones con criterio.", ".project-card"],
  ["?view=materials", "Build the mood before the invoice.", "Crea el ambiente antes de la factura.", ".board-material"],
  ["?view=scope", "Start with the room, not the package.", "Empieza por la habitación, no por el paquete.", ".view-note"],
  ["policies.html?", "Policy readiness", "Preparación de políticas", ".policy-page article"],
  ["privacy.html?", "Privacy", "Privacidad", ".policy-page article"],
  ["terms.html?", "Terms of use", "Términos de uso", ".policy-page article"],
  ["cookies.html?", "Cookies and technology", "Cookies y tecnología", ".policy-page article"],
  ["scope.html?", "Scope and handoff", "Alcance y entrega", ".policy-page article"],
  ["accessibility.html?", "Accessibility", "Accesibilidad", ".policy-page article"]
];

test.use({ channel: "chrome", javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ context }) => {
  await context.route("**/*", async (route) => {
    if (!route.request().url().startsWith(base)) return route.abort();
    const response = await worker.fetch(new Request(route.request().url(), { method: route.request().method() }));
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
});

for (const [path, english, spanish, content] of paths) {
  test("Direct entry and return in both languages for " + path, async ({ page }) => {
    const params = path.includes("=") ? "&" : "";
    await page.goto(base + path + params + "lang=en&qa=check&cache=test");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(english);
    await expect(page.locator(content).first()).toBeVisible();
    const description = page.locator('meta[name="description"]');
    const enDescription = await description.getAttribute("content");
    const enTitle = await page.title();
    const spanishLink = page.getByRole("link", { name: "Español", exact: true });
    await spanishLink.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText(spanish);
    await expect(page.locator(content).first()).toBeVisible();
    expect(await page.title()).not.toBe(enTitle);
    await expect(description).not.toHaveAttribute("content", enDescription);
    const current = new URL(page.url());
    expect(current.searchParams.get("lang")).toBe("es");
    expect(current.searchParams.get("qa")).toBe("check");
    expect(current.searchParams.get("cache")).toBe("test");
    if (path.startsWith("?")) expect(current.searchParams.get("view")).toBe(path.split("=")[1]);
    if (path.endsWith(".html?")) {
      await expect(page.locator(".policy-page .eyebrow")).toHaveText("Pre-lanzamiento · no vigente");
    }
    if (path === "?view=scope") {
      await expect(page.getByText("Precio por cotizar")).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
    }
    await page.locator("header .brand").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(h1).not.toHaveText(spanish);
    const returned = new URL(page.url());
    expect(returned.searchParams.get("qa")).toBe("check");
    expect(returned.searchParams.get("cache")).toBe("test");
  });
}

test("home explains quote-first paths and preserves distinct destinations", async ({ page }) => {
  for (const [lang, title, price, expectedPaths] of [
    ["en", "Choose your starting point.", "Quote after review · no public price", ["materials", "work", "scope"]],
    ["es", "Elige por dónde empezar.", "Cotización después de revisar · sin precio público", ["materials", "work", "scope"]]
  ]) {
    await page.goto(base + "index.html?lang=" + lang + "&qa=packages&cache=test");
    await expect(page.locator("#package-title")).toHaveText(title);
    await expect(page.locator(".home-grid .offer-price")).toHaveCount(3);
    await expect(page.locator(".home-grid .offer-price").first()).toHaveText(price);
    await expect(page.locator("[data-package]")).toHaveCount(3);
    await expect(page.locator(".package-format")).toHaveCount(3);
    await expect(page.locator(".package-deliverable")).toHaveCount(3);
    await expect(page.locator(".package-destination")).toHaveCount(3);
    await expect(page.locator(".package-cta")).toHaveCount(3);
    const packageHrefs = await page.locator("[data-package]").evaluateAll((cards) => cards.map((card) => card.querySelector(".package-cta")?.getAttribute("href")));
    expect(new Set(packageHrefs).size).toBe(3);
    const links = await page.locator(".home-grid > a").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
    expect(links.map((href) => new URL(href, base).searchParams.get("view"))).toEqual(expectedPaths);
    expect(links[1]).toContain("filter=kitchen");
    expect(links.join(" ")).not.toMatch(/\$|€|\bUSD\b/i);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
  }
});

test("scope fallback explains the local handoff and construction boundary", async ({ page }) => {
  for (const [lang, heading, boundary] of [
    ["en", "A better-prepared conversation", "Not a quote"],
    ["es", "Una conversación mejor preparada", "No es una cotización"]
  ]) {
    await page.goto(base + "index.html?view=scope&lang=" + lang + "&qa=scope&cache=static");
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("heading", { name: boundary })).toBeVisible();
    await expect(page.locator(".static-js-note")).toBeVisible();
    await expect(page.locator(".static-brief-grid")).toBeVisible();
  }
});
