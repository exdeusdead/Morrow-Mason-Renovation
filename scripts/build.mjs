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
  const legalPages = ["policies", "privacy", "terms", "cookies", "scope", "accessibility"];
  let navIndex = 0;
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
    .replace(/<option value="en"[^>]*>EN<\/option>/, '<option value="en"' + (lang === "en" ? " selected" : "") + '>EN</option>')
    .replace(/<option value="es"[^>]*>ES<\/option>/, '<option value="es"' + (lang === "es" ? " selected" : "") + '>ES</option>')
    .replace(/<a class="static-language"[^>]*>[^<]*<\/a>/g, "")
    .replace(/<\/select><\/label>/, '</select></label><a class="static-language" href="?lang=' + other[0] +
      '" lang="' + other[0] + '" hreflang="' + other[0] + '">' + other[1] + "</a>")
    .replace(/(<a class="button button-small button-dark"[^>]*>)[^<]*/, (_, open) => open + esc(c.nav.build))
    .replace("<span>Renovation studio</span>", "<span>" + (isSpanish ? "Estudio de renovación" : "Renovation studio") + "</span>")
    .replace("<p>Independent product preview. Real project delivery, vendors, contracts and policy activation require owner approval.</p>", "<p>" + esc(c.footer) + "</p>")
    .replace(/<nav aria-label="Legal links">[\s\S]*?<\/nav>/, () =>
      '<nav aria-label="' + (isSpanish ? "Enlaces legales" : "Legal links") + '">' +
      legalPages.map((page, index) => '<a href="' + page + '.html?lang=' + lang + '">' +
        esc(legalLinkLabels[lang][index]) + '</a>').join("") + '</nav>');
}

function scopePreview(lang) {
  const copy = COPY[lang].scope;
  return '<section class="view-hero section-shell"><div><p class="eyebrow">' + esc(copy.eyebrow) +
    '</p><h1>' + esc(copy.title) + '</h1></div><div><p>' + esc(copy.lede) +
    '</p><p class="view-note">' + esc(copy.note) + '</p><p class="quote-format">' + esc(copy.priceNote) + '</p></div></section>' +
    '<section class="view-content section-shell"><div class="static-brief-grid"><article class="static-brief-card"><p class="card-kicker">' +
    esc(lang === "es" ? "Qué captura" : "What it captures") + '</p><h2>' + esc(lang === "es" ? "Una conversación mejor preparada" : "A better-prepared conversation") +
    '</h2><p>' + esc(lang === "es" ? "Habitación, escala, tiempo, dirección y prioridades visibles antes de cualquier contacto real." : "Room, scale, timing, direction and priorities made visible before any real contact.") +
    '</p></article><article class="static-brief-card"><p class="card-kicker">' + esc(lang === "es" ? "Entrega" : "Handoff") +
    '</p><h2>' + esc(lang === "es" ? "Resumen local + TXT" : "Local summary + TXT") + '</h2><p>' + esc(lang === "es" ? "La versión con JavaScript permite preparar y descargar un resumen que permanece en este navegador." : "The JavaScript version prepares and downloads a summary that remains in this browser.") +
    '</p></article><article class="static-brief-card"><p class="card-kicker">' + esc(lang === "es" ? "Límite" : "Boundary") +
    '</p><h2>' + esc(lang === "es" ? "No es una cotización" : "Not a quote") + '</h2><p>' + esc(lang === "es" ? "No incluye obra, permisos, materiales, mano de obra, disponibilidad ni precio de proyecto." : "It does not include construction, permits, materials, labor, availability or a project price.") +
    '</p></article></div><p class="static-js-note">' + esc(lang === "es"
      ? "Activa JavaScript para elegir la habitación, los materiales y las prioridades y preparar un resumen local."
      : "Enable JavaScript to choose the room, materials and priorities and prepare a local brief.") +
    '</p><p class="quote-format">' + esc(PRODUCT_PRICE_LABELS[lang]) + '</p><div class="hero-actions"><a class="button button-quiet" href="?view=materials&amp;lang=' +
    lang + '">' + esc(COPY[lang].nav.materials) + '</a><a class="text-link" href="?view=work&amp;filter=kitchen&amp;lang=' + lang + '">' + esc(COPY[lang].nav.work) + '</a></div></section>';
}

function packageSection(lang) {
  const data = lang === "es" ? {
    heading: "Tres rutas comparables para empezar",
    intro: "Cada ruta es una implementación web para que un estudio de renovación explique decisiones y prepare conversaciones. La cotización sigue pendiente de aprobación; no son precios de obra ni incluyen materiales, permisos, mano de obra, compras o entrega.",
    price: "Cotización después de revisar · sin precio público",
    cards: [
      ["Dirección de materiales", "Alcance: tablero de decisiones para tres familias de acabados ficticias", "Formato: tablero de decisiones + preguntas para muestras", "Entrega: tablero local con una breve razón de diseño", "Destino: revisión del propietario / diseño", "Ejemplo: roble cálido, caliza marfil y azulejo verde salvia", "Herramientas: HTML/CSS/JS, assets visuales locales, estado en URL y borrador de sesión", "Aceptación: las tres familias siguen legibles, las muestras llegan al resumen y no se crea proveedor ni cotización", "No incluye: diseño final, compras, muestras físicas, proveedor, obra ni mantenimiento", "Comparar dirección de materiales", "?view=materials&lang=es"],
      ["Dirección de habitación", "Alcance: estudio filtrable de una cocina ficticia y sus compromisos", "Formato: estudio de habitación filtrable", "Entrega: decisiones de espacio y sus compromisos", "Destino: conversación con propietario / arquitecto", "Ejemplo: cocina Juniper — almacenamiento, luz y circulación matinal", "Herramientas: HTML/CSS/JS, estudios SVG locales, filtros y controles de teclado", "Aceptación: el filtro de cocina abre el estudio correspondiente en EN/ES y en tamaños de revisión", "No incluye: planos técnicos, permisos, contratistas, obra, compras ni supervisión", "Abrir dirección de habitación", "?view=work&filter=kitchen&lang=es"],
      ["Resumen de alcance", "Alcance: brief quote-first de habitación, escala, tiempo, dirección y prioridades", "Formato: resumen local + descarga TXT", "Entrega: habitación, escala, tiempo y prioridades", "Destino: revisión del propietario antes de una cotización real", "Ejemplo: renovación centrada en luz, almacenamiento o accesibilidad", "Herramientas: controles nativos, validación local, estado del navegador y generación TXT", "Aceptación: campos requeridos validan, editar invalida el resumen anterior y la descarga permanece local", "No incluye: cotización de obra, disponibilidad, permisos, pagos, proveedores ni reserva", "Crear resumen local", "?view=scope&lang=es"]
    ]
  } : {
    heading: "Three comparable ways to start",
    intro: "Each path is a website implementation route for a renovation studio to explain decisions and prepare better conversations. Pricing remains owner-approved quote-only; these are not construction prices and exclude materials, permits, labor, purchasing and delivery.",
    price: "Quote after review · no public price",
    cards: [
      ["Material direction", "Scope: decision board for three fictional finish families", "Format: decision board + sample questions", "Deliverable: local board with a short design rationale", "Destination: owner / design review", "Example: warm oak, ivory limestone and quiet sage tile", "Tools: HTML/CSS/JS, local visual assets, URL state and session draft", "Acceptance: all three finish families stay readable, samples reach the brief and no vendor or quote is created", "Not included: final design, purchasing, physical samples, vendor work, construction or maintenance", "Compare material direction", "?view=materials&lang=en"],
      ["Room direction", "Scope: filtered study of one fictional kitchen and its trade-offs", "Format: filtered room study", "Deliverable: room decisions and their trade-offs", "Destination: owner / architect conversation", "Example: Juniper kitchen — storage, light and a generous morning path", "Tools: HTML/CSS/JS, local SVG studies, filters and keyboard controls", "Acceptance: the kitchen filter opens its matching study in EN/ES at review sizes", "Not included: technical plans, permits, contractors, construction, purchasing or site supervision", "Open room direction", "?view=work&filter=kitchen&lang=en"],
      ["Scope brief", "Scope: quote-first brief for room, scale, timing, direction and priorities", "Format: local brief + TXT export", "Deliverable: room, scale, timing and priorities", "Destination: owner review before any real quote", "Example: a renovation shaped around light, storage or accessibility", "Tools: native controls, browser validation, local state and TXT generation", "Acceptance: required fields validate, edits invalidate the prior summary and download stays local", "Not included: construction quote, availability, permits, payments, vendors or booking", "Build a local brief", "?view=scope&lang=en"]
    ]
  };
  return '<section class="detail-packages section-shell" aria-labelledby="detail-packages-title"><div class="package-intro"><div><span class="section-index">03</span><h2 id="detail-packages-title">' + esc(data.heading) + '</h2></div><p>' + esc(data.intro) + '</p></div><div class="detail-package-grid">' + data.cards.map((card, index) => '<article class="detail-package-card" data-package="' + (index + 1) + '"><p class="card-kicker">' + esc(card[0]) + '</p><p class="offer-price" data-package-price="quote">' + esc(data.price) + '</p><dl class="package-facts"><div><dt>' + esc(lang === "es" ? "Alcance" : "Scope") + '</dt><dd class="package-scope">' + esc(card[1].replace(/^Alcance: |^Scope: /, "")) + '</dd></div><div><dt>' + esc(lang === "es" ? "Formato" : "Format") + '</dt><dd class="package-format">' + esc(card[2].replace(/^Formato: |^Format: /, "")) + '</dd></div><div><dt>' + esc(lang === "es" ? "Entrega" : "Deliverable") + '</dt><dd class="package-deliverable">' + esc(card[3].replace(/^Entrega: |^Deliverable: /, "")) + '</dd></div><div><dt>' + esc(lang === "es" ? "Destino" : "Destination") + '</dt><dd class="package-destination">' + esc(card[4].replace(/^Destino: |^Destination: /, "")) + '</dd></div><div><dt>' + esc(lang === "es" ? "Herramientas" : "Tools") + '</dt><dd class="package-tools">' + esc(card[6].replace(/^Herramientas: |^Tools: /, "")) + '</dd></div><div><dt>' + esc(lang === "es" ? "Fuera de alcance" : "Not included") + '</dt><dd class="package-exclusions">' + esc(card[8].replace(/^No incluye: |^Not included: /, "")) + '</dd></div><div><dt>' + esc(lang === "es" ? "Aceptación" : "Acceptance") + '</dt><dd class="package-acceptance">' + esc(card[7].replace(/^Aceptación: |^Acceptance: /, "")) + '</dd></div></dl><p class="feature-detail"><strong>' + esc(lang === "es" ? "Ejemplo:" : "Example:") + '</strong> ' + esc(card[5].replace(/^Ejemplo: |^Example: /, "")) + '</p><a class="button button-quiet package-cta" data-package-cta="' + (index + 1) + '" href="' + card[10] + '">' + esc(card[9]) + '</a></article>').join("") + '</div></section>';
}

const documents = {};
for (const lang of ["en", "es"]) {
  state.language = lang;
  const view = (name, body) => shell(templates.home, lang, name, body, viewMetadata(name, lang));
  const documentsForLanguage = { home: view("home", source.renderHome() + packageSection(lang)), scope: view("scope", scopePreview(lang)), work: {}, materials: {}, legal: {} };
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

for (const [lang, localized] of Object.entries(documents)) {
  for (const [file, html] of Object.entries(localized.legal)) {
    const output = lang === "en" ? file : file.replace(/\.html$/, "-es.html");
    await writeFile(new URL(output, dist), html);
  }
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
