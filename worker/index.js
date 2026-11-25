const portalPrefix = "/r/morrow-mason-renovation";
const views = ["home", "work", "materials", "scope"];

function pageFor(path, url, lang) {
  const pages = documents[lang];
  if (path !== "/" && path !== "/index.html") {
    return Object.hasOwn(pages.legal, path.slice(1)) ? pages.legal[path.slice(1)] : null;
  }
  const view = url.searchParams.get("view");
  if (view === "scope") return pages.scope;
  if (view === "work") {
    const filter = url.searchParams.get("filter");
    return Object.hasOwn(pages.work, filter) ? pages.work[filter] : pages.work.all;
  }
  if (view === "materials") {
    const values = config.groups.map((group) => {
      const key = url.searchParams.get(group);
      return config.options[group].includes(key) ? key : config.defaults[group];
    });
    return pages.materials[values.join("/")];
  }
  return pages.home;
}

function withNavigationContext(html, url, lang) {
  return html.replace(/<a\b[^>]*\shref="(?:\?[^"]+|[a-z]+\.html[^"]*)"/g, (markup) => {
    const raw = markup.match(/\shref="([^"]+)"/)[1].replaceAll("&amp;", "&");
    const target = new URL(raw, url);
    const languageSwitch = markup.includes('class="static-language"');
    if (!languageSwitch) target.searchParams.set("lang", lang);
    const keys = languageSwitch ? ["qa", "cache", "view", "filter", ...config.groups] : ["qa", "cache"];
    for (const key of keys) {
      if (key === "view" && !views.includes(url.searchParams.get(key))) continue;
      for (const value of url.searchParams.getAll(key)) target.searchParams.append(key, value);
    }
    const path = raw.startsWith("?") ? "" : target.pathname.split("/").pop();
    const href = (path + target.search + target.hash).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    return markup.replace(/\shref="[^"]*"/, ' href="' + href + '"');
  });
}

export default {
  fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    if (url.pathname === portalPrefix) {
      url.pathname += "/";
      return Response.redirect(url, 308);
    }
    const path = url.pathname.startsWith(portalPrefix + "/") ? url.pathname.slice(portalPrefix.length) : url.pathname;
    const head = request.method === "HEAD";
    if (Object.hasOwn(assets, path)) {
      return new Response(head ? null : assets[path].body, { headers: { "Content-Type": assets[path].type } });
    }
    const language = url.searchParams.get("lang") === "es" ? "es" : "en";
    const page = pageFor(path, url, language);
    if (!page) return new Response(null, { status: 404 });
    return new Response(head ? null : withNavigationContext(page, url, language), { headers: {
      "Content-Type": "text/html; charset=utf-8", "Content-Language": language, "Cache-Control": "private, no-store"
    } });
  }
};
