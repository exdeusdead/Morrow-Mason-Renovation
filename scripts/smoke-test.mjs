import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../dist/", import.meta.url);
const required = ["index.html", "styles.css", "site.js", "policies.html", "privacy.html", "terms.html", "cookies.html", "scope.html"];
for (const file of required) readFileSync(new URL(file, root), "utf8");

const html = readFileSync(new URL("index.html", root), "utf8");
const js = readFileSync(new URL("site.js", root), "utf8");
const css = readFileSync(new URL("styles.css", root), "utf8");

for (const phrase of ["Morrow &amp; Mason", "Material Lab", "Scope Builder", "Request a quote", "Precio por cotizar", "aria-pressed", "aria-live"]) {
  if (!html.includes(phrase) && !js.includes(phrase)) throw new Error(`Missing required product signal: ${phrase}`);
}
for (const phrase of ["openMenu", "Escape", "localDateString", "updateUrl", "currentFilter", "data-lang"]) {
  if (!js.includes(phrase)) throw new Error(`Missing interaction guard: ${phrase}`);
}
if (css.includes("→") || css.includes("↗")) throw new Error("Decorative arrows are not allowed in styles");
if (/href=["']\/(?!\/)/.test(html) || /src=["']\/(?!\/)/.test(html)) throw new Error("Root-relative asset/link escaped the portal prefix");
for (const file of ["policies.html", "privacy.html", "terms.html", "cookies.html", "scope.html"]) {
  const body = readFileSync(new URL(file, root), "utf8");
  if (!body.includes("data-policy-page") || !js.includes("Pre-launch") || !js.includes("not effective")) throw new Error(`Legal gate missing in ${file}`);
}
const assets = readdirSync(new URL("assets/", root));
if (assets.filter((name) => name.endsWith(".svg")).length < 6) throw new Error("Expected local visual asset system");
console.log("Morrow & Mason smoke test PASS: shells, bilingual signals, legal gate, assets, and interaction guards");
