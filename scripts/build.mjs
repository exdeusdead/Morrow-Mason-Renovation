import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const dist = new URL("../dist/", import.meta.url);
const read = (path) => readFile(new URL(path, dist), "utf8");
const app = await read("site.js");
const source = runInNewContext(app + "\n({ COPY, state, WORK, MATERIALS, DEFAULT_MATERIALS, MATERIAL_GROUPS, legalLinkLabels, PRODUCT_PRICE_LABELS, POLICY_PAGES, viewMetadata, renderHome, renderWork, renderMaterials, renderPolicyContent, esc });", { URLSearchParams });
const { COPY, state, WORK, MATERIALS, DEFAULT_MATERIALS, MATERIAL_GROUPS, legalLinkLabels, PRODUCT_PRICE_LABELS, POLICY_PAGES, viewMetadata, esc } = source;
const templates = { home: await read("index.html") };
for (const page of Object.keys(POLICY_PAGES)) templates[page] = await read(page + ".html");

function shell(template, lang, activeView, main, metadata) {
  const c = COPY[lang];
  const isSpanish = lang === "es";
  const other = isSpanish ? ["en", "English"] : ["es", "Español"];
  let navIndex = 0;
  let footerIndex = 0;
  return template
    .replace('<html lang="en">', '<html lang="' + lang + '">')
    .replace('<body>', '<body class="no-js">')
    .replace(/<title>[^<]*<\/title>/, () => "<title>" + esc(metadata.title) + "</title>")
    .replace(/(<meta name="description" content=")[^"]*/, (_, open) => open + esc(metadata.description))
    .replace(/(<main\b[^>]*>)[\s\S]*?<\/main>/, (_, open) => open + main + "</main>")
    .replace(/(<a class="skip-link"[^>]*>)[^<]+/, (_, open) => open + (isSpanish ? "Saltar al contenido" : "Skip to content"))
    .replace(/(<a class="brand"[^>]*?)aria-label="[^"]*"/, (_, open) =>
      open + 'aria-label="' + esc(c.a11y.home) + '"' + (activeView === "home" ? ' aria-current="page"' : ''))
    .replace(/(<button class="menu-toggle"[^>]*>)[^<]*/, (_, open) => open + esc(c.a11y.menu))
    .replace(/<nav id="primary-nav"[^>]*>[\s\S]*?<\/nav>/, (nav) =>
      nav.replace(/aria-label="[^"]*"/, 'aria-label="' + esc(c.a11y.primary) + '"')
        .replace(/(<a\b[^>]*>)[^<]+/g, (_, open) => {
          const view = ["work", "materials", "scope"][navIndex++];
          return open.replace(/>$/, activeView === view ? ' aria-current="page">' : '>') + esc(c.nav[view]);
        }))
    .replace(/(<span class="sr-only">)Language/, (_, open) => open + esc(c.a11y.language))
    .replace('id="language-select" aria-label="Language"', 'id="language-select" aria-label="' + esc(c.a11y.language) + '"')
    .replace('<option value="' + lang + '">', '<option value="' + lang + '" selected>')
    .replace(/<\/select><\/label>/, '</select></label><a class="static-language" href="?lang=' + other[0] +
      '" lang="' + other[0] + '" hreflang="' + other[0] + '">' + other[1] + "</a>")
    .replace(/(<a class="button button-small button-dark"[^>]*>)[^<]*/, (_, open) => open + esc(c.nav.build))
    .replace("<span>Renovation studio</span>", "<span>" + (isSpanish ? "Estudio de renovación" : "Renovation studio") + "</span>")
    .replace("<p>Independent product preview. Real project delivery, vendors, contracts and policy activation require owner approval.</p>", "<p>" + esc(c.footer) + "</p>")
    .replace(/<nav aria-label="Legal links">[\s\S]*?<\/nav>/, (nav) => nav
      .replace('aria-label="Legal links"', 'aria-label="' + (isSpanish ? "Enlaces legales" : "Legal links") + '"')
      .replace(/(<a\b[^>]*>)[^<]+/g, (_, open) => open + esc(legalLinkLabels[lang][footerIndex++])));
}

function scopePreview(lang) {
  const copy = COPY[lang].scope;
  return '<section class="view-hero section-shell"><div><p class="eyebrow">' + esc(copy.eyebrow) +
    '</p><h1>' + esc(copy.title) + '</h1></div><div><p>' + esc(copy.lede) +
    '</p><p class="view-note">' + esc(copy.note) + '</p></div></section>' +
    '<section class="view-content section-shell"><p>' + esc(lang === "es"
      ? "Activa JavaScript para elegir la habitación, los materiales y las prioridades y preparar un resumen local."
      : "Enable JavaScript to choose the room, materials and priorities and prepare a local brief.") +
    '</p><p>' + esc(PRODUCT_PRICE_LABELS[lang]) + '</p><a class="button button-quiet" href="?view=materials&amp;lang=' +
    lang + '">' + esc(COPY[lang].nav.materials) + '</a></section>';
}

const documents = {};
for (const lang of ["en", "es"]) {
  state.language = lang;
  const view = (name, body) => shell(templates.home, lang, name, body, viewMetadata(name, lang));
  const documentsForLanguage = { home: view("home", source.renderHome()), scope: view("scope", scopePreview(lang)), work: {}, materials: {}, legal: {} };
  for (const filter of ["all", ...WORK.map((item) => item.type)]) {
    state.currentFilter = filter;
    documentsForLanguage.work[filter] = view("work", source.renderWork(false));
  }
  let sampleSets = [{}];
  for (const group of MATERIAL_GROUPS) {
    sampleSets = sampleSets.flatMap((set) => Object.keys(MATERIALS[group]).map((key) => ({ ...set, [group]: key })));
  }
  for (const set of sampleSets) {
    state.materials = set;
    documentsForLanguage.materials[MATERIAL_GROUPS.map((group) => set[group]).join("/")] =
      view("materials", source.renderMaterials(false));
  }
  for (const [page, localized] of Object.entries(POLICY_PAGES)) {
    const [name, description] = localized[lang];
    documentsForLanguage.legal[page + ".html"] = shell(templates[page], lang, null, source.renderPolicyContent(page, lang),
      { title: name + " | Morrow & Mason", description });
  }
  documents[lang] = documentsForLanguage;
}

const assets = {
  "/site.js": { type: "application/javascript; charset=utf-8", body: app },
  "/styles.css": { type: "text/css; charset=utf-8", body: await read("styles.css") }
};
for (const name of (await readdir(new URL("assets/", dist))).sort()) {
  if (!name.endsWith(".svg")) throw new Error("Configure a content type for " + name);
  assets["/assets/" + name] = { type: "image/svg+xml", body: await read("assets/" + name) };
}

const config = { groups: MATERIAL_GROUPS, defaults: DEFAULT_MATERIALS, options: Object.fromEntries(
  MATERIAL_GROUPS.map((group) => [group, Object.keys(MATERIALS[group])])) };
const worker = await readFile(new URL("../worker/index.js", import.meta.url), "utf8");
const directory = new URL("server/", dist);
await mkdir(directory, { recursive: true });
const data = { documents, assets, config };
await writeFile(new URL("index.js", directory), "// Generated by scripts/build.mjs\n" +
  Object.entries(data).map(([name, value]) => "const " + name + " = " + JSON.stringify(value) + ";\n").join("") + worker);
