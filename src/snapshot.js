// Clean Print – page snapshot (content script run via executeScript; the last expression is the result).
// Output: { title, url, html (frozen body), bodyStyle, reader (Readability HTML) }
(() => {
  try {
    const MAX_NODES = 15000;
    const doc = document;
    // PDF viewer / plugin content: no editable DOM
    if (/pdf/i.test(doc.contentType || "") || (doc.body && doc.body.children.length === 1 && /^(EMBED|OBJECT)$/.test(doc.body.children[0].tagName)))
      return { error: "pdf" };
    const base = doc.baseURI;

    // ---- 0) schema.org Recipe (JSON-LD): exact ingredients + steps, better than Readability on recipe sites ----
    let reader = null;
    const escHtml = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const stripTags = (t) => String(t ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const findRecipe = () => {
      for (const sc of doc.querySelectorAll('script[type="application/ld+json"]')) {
        let data; try { data = JSON.parse(sc.textContent); } catch { continue; }
        const stack = Array.isArray(data) ? [...data] : [data];
        while (stack.length) {
          const n = stack.shift(); if (!n || typeof n !== "object") continue;
          const t = [].concat(n["@type"] || []); if (t.includes("Recipe")) return n;
          if (n["@graph"]) stack.push(...n["@graph"]); if (n.mainEntity) stack.push(n.mainEntity);
        }
      }
      return null;
    };
    const fmtDur = (d) => { const m = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(d || ""); if (!m) return ""; const h = +m[1] || 0, mi = +m[2] || 0; return (h ? h + " h " : "") + (mi ? mi + " min" : "") || d; };
    try {
      const r = findRecipe();
      if (r && (r.recipeIngredient || r.recipeInstructions)) {
        const name = r.name || doc.title;
        const img = Array.isArray(r.image) ? r.image[0] : (r.image && r.image.url) || r.image;
        const meta = [];
        if (r.recipeYield) meta.push("Yield: " + escHtml([].concat(r.recipeYield)[0]));
        if (r.prepTime) meta.push("Prep: " + fmtDur(r.prepTime));
        if (r.cookTime) meta.push("Cook: " + fmtDur(r.cookTime));
        if (r.totalTime) meta.push("Total: " + fmtDur(r.totalTime));
        const steps = [];
        const walkSteps = (x) => { for (const st of [].concat(x || [])) { if (typeof st === "string") steps.push({ text: stripTags(st) }); else if (st && st["@type"] === "HowToSection") { steps.push({ section: st.name }); walkSteps(st.itemListElement); } else if (st) steps.push({ text: stripTags(st.text || st.name || ""), img: Array.isArray(st.image) ? st.image[0] : (st.image && st.image.url) || st.image }); } };
        walkSteps(r.recipeInstructions);
        let html = `<h1>${escHtml(name)}</h1>`;
        if (r.author) html += `<div class="byline">${escHtml([].concat(r.author).map((a) => a.name || a).join(", "))}</div>`;
        if (img && typeof img === "string") html += `<figure><img src="${escHtml(img)}" alt=""></figure>`;
        if (r.description) html += `<p>${escHtml(stripTags(r.description))}</p>`;
        if (meta.length) html += `<p class="recipe-meta">${meta.join(" · ")}</p>`;
        if (r.recipeIngredient) html += `<h2>Ingredients</h2><ul>${[].concat(r.recipeIngredient).map((i) => `<li>${escHtml(stripTags(i))}</li>`).join("")}</ul>`;
        if (steps.length) {
          html += `<h2>Instructions</h2>`; let open = false;
          for (const st of steps) {
            if (st.section) { if (open) html += "</ol>"; html += `<h3>${escHtml(st.section)}</h3><ol>`; open = true; continue; }
            if (!open) { html += "<ol>"; open = true; }
            html += `<li>${escHtml(st.text)}${st.img && typeof st.img === "string" ? `<br><img src="${escHtml(st.img)}" alt="" style="max-width:320px">` : ""}</li>`;
          }
          if (open) html += "</ol>";
        }
        reader = { title: name, byline: "", content: html, siteName: "", source: "recipe" };
      }
    } catch (_) { /* fall through to Readability */ }

    // ---- 1) Readability (reader layout) ----
    try {
      const clone = doc.cloneNode(true);
      const art = new Readability(clone, { keepClasses: false }).parse();
      if (!reader && art && art.content && art.length > 200) reader = { title: art.title, byline: art.byline, content: art.content, siteName: art.siteName };
    } catch (_) { /* Readability may fail on some pages */ }

    // ---- 2) Frozen body: DOM clone + critical computed styles ----
    const KEEP = ["display", "width", "height",
      "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "font-family", "font-size", "font-weight", "font-style", "line-height", "color", "background-color", "background-image",
      "text-align", "text-decoration", "text-transform", "letter-spacing", "white-space", "vertical-align",
      "border-top", "border-right", "border-bottom", "border-left", "border-radius", "border-collapse", "border-spacing",
      "list-style-type", "list-style-position", "table-layout", "object-fit", "quotes", "content"];
    const DEFAULTS = { display: null, position: "static", float: "none", clear: "none", opacity: "1", visibility: "visible", "text-decoration": "none", "text-transform": "none", "letter-spacing": "normal", "white-space": "normal", "background-image": "none", "border-radius": "0px", overflow: "visible", "box-sizing": "content-box" };

    const skipTag = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "CANVAS", "VIDEO", "AUDIO", "SOURCE", "TRACK", "MAP", "AREA"]);
    let count = 0;

    function abs(u) { try { return new URL(u, base).href; } catch { return u; } }

    function freeze(src) {
      if (src.nodeType === Node.TEXT_NODE) return doc.createTextNode(src.nodeValue);
      if (src.nodeType !== Node.ELEMENT_NODE) return null;
      if (skipTag.has(src.tagName)) return null;
      const cs = getComputedStyle(src);
      if (cs.display === "none" || cs.visibility === "hidden") return null;
      if (++count > MAX_NODES) return null; // count only nodes we keep
      // fixed/sticky elements (bars, cookie banners, chat bubbles) are unwanted in print
      if ((cs.position === "fixed" || cs.position === "sticky") && src !== doc.body) return null;
      // page chrome: navigation, site header/footer, sidebars, search forms, skip links
      const role = (src.getAttribute("role") || "").toLowerCase();
      if (["NAV", "FOOTER", "ASIDE", "FORM", "BUTTON", "DIALOG", "MENU"].includes(src.tagName)) return null;
      if (src.tagName === "HEADER" && !src.closest("article, main, [role=main]")) return null;
      if (["navigation", "banner", "contentinfo", "complementary", "search", "dialog", "menu", "menubar", "toolbar", "button"].includes(role)) return null;
      if (src.getAttribute("aria-hidden") === "true") return null;
      if (src.tagName === "A" && /^#/.test(src.getAttribute("href") || "") && /skip|atla|jump/i.test(src.textContent + " " + src.className)) return null;
      const r = src.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && !["BR", "WBR"].includes(src.tagName) && src.textContent.trim() === "") return null;

      const el = doc.createElement(src.tagName === "SVG" || src.namespaceURI === "http://www.w3.org/2000/svg" ? "span" : src.tagName.toLowerCase());
      if (src.namespaceURI === "http://www.w3.org/2000/svg") { // svg: serialize as a sized image
        const s = doc.createElement("img");
        try { s.src = "data:image/svg+xml;utf8," + encodeURIComponent(new XMLSerializer().serializeToString(src)); } catch { return null; }
        s.width = Math.round(r.width); s.height = Math.round(r.height); s.style.cssText = "display:inline-block;vertical-align:middle";
        return s;
      }
      // safe attributes
      if (src.className && typeof src.className === "string") el.setAttribute("class", src.className.trim().split(/\s+/).slice(0, 4).join(" "));
      if (src.id) el.setAttribute("data-id", src.id);
      for (const a of ["href", "src", "alt", "title", "colspan", "rowspan", "type", "value", "checked", "placeholder", "width", "height", "dir", "lang", "start"]) {
        if (src.hasAttribute(a)) el.setAttribute(a, a === "href" || a === "src" ? abs(src.getAttribute(a)) : src.getAttribute(a));
      }
      if (src.tagName === "IMG") {
        let s = src.currentSrc || src.src;
        if (!s || /^data:image\/(gif|svg)/.test(s) || /blank|placeholder|1x1|spacer/i.test(s)) { // lazy-loaded: look for the real source
          const lazy = src.getAttribute("data-src") || src.getAttribute("data-lazy-src") || src.getAttribute("data-original") || (src.getAttribute("data-srcset") || src.getAttribute("srcset") || "").split(",").pop().trim().split(" ")[0];
          if (lazy) s = abs(lazy);
        }
        if (!s || s.startsWith("data:image/gif")) return null;
        el.setAttribute("src", s); el.setAttribute("width", Math.round(r.width)); el.setAttribute("height", Math.round(r.height)); el.removeAttribute("srcset");
        el.setAttribute("loading", "eager");
      }
      if (src.tagName === "INPUT" || src.tagName === "TEXTAREA" || src.tagName === "SELECT") { // turn form values into text
        const span = doc.createElement("span"); span.textContent = src.tagName === "SELECT" ? (src.selectedOptions[0]?.text || "") : (src.type === "checkbox" || src.type === "radio" ? (src.checked ? "☑" : "☐") : src.value || src.placeholder || "");
        span.style.cssText = "border:1px solid #999;padding:1px 4px;display:inline-block;min-width:1em"; return span;
      }
      if (src.tagName === "A" && src.href) el.setAttribute("href", src.href);
      // critical styles
      const parts = [];
      for (const p of KEEP) {
        const v = cs.getPropertyValue(p);
        if (!v || v === DEFAULTS[p]) continue;
        if (p === "content" && src.tagName !== "Q") continue;
        if (p === "display") { // screen layouts (grid/flex) don't fit paper: reduce to flow layout
          if (/grid|flex/.test(v)) { parts.push(`display:${v.startsWith("inline") ? "inline-block" : "block"}`); continue; }
          if (v === "inline-block" || v === "inline" || v === "block" || v === "list-item" || v.startsWith("table")) { parts.push(`display:${v}`); }
          continue;
        }
        if (p === "width" && src.tagName !== "IMG" && src.tagName !== "TD" && src.tagName !== "TH") continue;
        if (p === "height" && src.tagName !== "IMG") continue;
        if (p === "background-image" && !/url\(/.test(v)) continue;
        if (p === "background-color" && /rgba\(0, 0, 0, 0\)|transparent/.test(v)) continue;
        if (p.startsWith("border-") && /0px/.test(v) && !/radius|collapse|spacing/.test(p)) continue;
        if (/^(margin|padding)-/.test(p)) { // huge margins (space reserved for fixed bars etc.) leave gaps in print
          const n = parseFloat(v); if (!n) continue;
          if (Math.abs(n) > 24 && !/^(P|H[1-6]|LI|BLOCKQUOTE|FIGURE|TABLE|UL|OL|DL|PRE)$/.test(src.tagName)) { parts.push(`${p}:24px`); continue; }
          if (n < 0) continue;
        }
        parts.push(`${p}:${v}`);
      }
      if (parts.length) el.setAttribute("style", parts.join(";"));
      el.setAttribute("data-cp", String(count));
      for (const child of src.childNodes) { let c = null; try { c = freeze(child); } catch (_) { c = null; } if (c) el.appendChild(c); }
      // ::before/::after content (icon fonts excluded)
      for (const ps of ["::before", "::after"]) {
        const pcs = getComputedStyle(src, ps); const c = pcs.content;
        if (c && c !== "none" && c !== "normal" && /^"(?:[^"\\]|\\.)*"$/.test(c) && c.length < 80 && !/^"[\uE000-\uF8FF]"/.test(c)) {
          let txt = null; try { txt = JSON.parse(c); } catch (_) { txt = null; }
          if (txt && txt.trim()) { const t = doc.createTextNode(txt); ps === "::before" ? el.prepend(t) : el.append(t); }
        }
      }
      return el;
    }

    const body = freeze(doc.body);
    if (!body || (body.textContent || "").trim().length < 40 && !body.querySelector("img,table")) return { error: "empty" };
    const bcs = getComputedStyle(doc.body);
    const bodyStyle = `font-family:${bcs.fontFamily};font-size:${bcs.fontSize};line-height:${bcs.lineHeight};color:${bcs.color};background:${/rgba\(0, 0, 0, 0\)/.test(bcs.backgroundColor) ? "#fff" : bcs.backgroundColor}`;
    return {
      title: doc.title, url: location.href, capturedAt: Date.now(), truncated: count > MAX_NODES,
      html: body ? body.innerHTML : "", bodyStyle, reader,
    };
  } catch (e) { return { error: String(e && e.message || e) }; }
})();
