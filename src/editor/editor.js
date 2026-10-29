// Clean Print – editor. Works on the frozen snapshot; never touches the original page.
(() => {
  const $ = (s) => document.querySelector(s);
  const paper = $("#paper"), wrap = $("#paper-wrap"), hl = $("#hl"), hlTag = $("#hlTag");
  let snap = null, mode = "delete", layout = "original";
  let hover = null, pinned = null; // pinned: selection widened/narrowed with the keyboard
  const undoStack = [], redoStack = [];
  const MAX_UNDO = 100;

  // ---------- loading ----------
  async function load() {
    const key = location.hash.slice(1);
    snap = key ? await chrome.runtime.sendMessage({ type: "getSnapshot", key }) : null;
    if (!snap) { paper.innerHTML = `<p style="padding:40px;text-align:center;color:#777">No snapshot. Open a page and click the Clean Print icon.</p>`; return; }
    document.title = "Clean Print – " + (snap.title || snap.url);
    $("#hTitle").textContent = snap.title || "";
    $("#hMeta").textContent = `${hostOf(snap.url)} · ${new Date(snap.capturedAt).toLocaleDateString()}`;
    $("#meta").textContent = `${snap.url}${snap.truncated ? " · page was very large; captured partially" : ""}`;
    $("#reader").disabled = !snap.reader;
    if (!snap.reader) $("#meta").textContent = "Reader layout is not available for this page (no article detected); showing the frozen original. · " + $("#meta").textContent;
    setLayout(snap.reader ? "reader" : "original");
    applyOptions();
  }
  const hostOf = (u) => { try { return new URL(u).host; } catch { return u; } };

  function setLayout(l) {
    layout = l;
    $("#reader").classList.toggle("on", l === "reader"); $("#original").classList.toggle("on", l === "original");
    paper.classList.toggle("reader", l === "reader");
    if (l === "reader" && snap.reader) {
      paper.removeAttribute("style");
      paper.innerHTML = snap.reader.source === "recipe" ? snap.reader.content : `<h1>${esc(snap.reader.title || snap.title)}</h1>${snap.reader.byline ? `<div class="byline">${esc(snap.reader.byline)}</div>` : ""}${snap.reader.content}`;
    } else {
      paper.setAttribute("style", snap.bodyStyle || "");
      paper.innerHTML = snap.html;
    }
    sanitize(paper);
    undoStack.length = 0; redoStack.length = 0; updateUndo();
    buildFootnotes();
  }
  function sanitize(root) {
    root.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((n) => n.remove());
    root.querySelectorAll("*").forEach((n) => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || (a.name === "href" && /^javascript:/i.test(a.value))) n.removeAttribute(a.name); });
    root.querySelectorAll("a[href]").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- selection highlight ----------
  function target(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !paper.contains(el) || el === paper) return null;
    return el;
  }
  function highlight(el) {
    if (!el) { hl.style.display = "none"; hlTag.style.display = "none"; return; }
    const r = el.getBoundingClientRect();
    Object.assign(hl.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    hl.className = mode === "keep" ? "keep" : ""; hlTag.className = hl.className;
    const tag = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
    hlTag.textContent = `${mode === "delete" ? "delete" : mode === "keep" ? "keep only" : "edit"}: ${tag.slice(0, 60)}`;
    Object.assign(hlTag.style, { display: "block", left: r.left + "px", top: Math.max(0, r.top - 20) + "px" });
  }
  $("#stage").addEventListener("mousemove", (e) => { if (mode === "edit" && document.activeElement?.isContentEditable) return; const t = target(e); if (t !== hover) { hover = t; pinned = null; } highlight(pinned || hover); });
  $("#stage").addEventListener("mouseleave", () => { hover = null; pinned = null; highlight(null); });
  document.addEventListener("keydown", (e) => {
    if (document.activeElement?.isContentEditable) return;
    const cur = pinned || hover;
    if (e.key === "ArrowLeft" && cur && cur.parentElement && cur.parentElement !== paper) { pinned = cur.parentElement; highlight(pinned); e.preventDefault(); }
    if (e.key === "ArrowRight" && cur && cur.firstElementChild) { pinned = cur.firstElementChild; highlight(pinned); e.preventDefault(); }
    if ((e.key === "Delete" || e.key === "Backspace") && cur) { e.preventDefault(); removeEl(cur); }
    if (e.key === "Enter" && cur && mode === "keep") { e.preventDefault(); keepOnly(cur); }
    if (e.key.toLowerCase() === "d") setMode("delete"); if (e.key.toLowerCase() === "k") setMode("keep"); if (e.key.toLowerCase() === "e") setMode("edit");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") { e.preventDefault(); doPrint(); }
    if (e.key === "Escape") { pinned = null; highlight(hover); }
  });
  $("#stage").addEventListener("click", (e) => {
    const el = pinned || target(e);
    if (!el) return;
    if (mode === "edit") { e.preventDefault(); startEdit(el); return; }
    if (e.target.closest("a") && !e.ctrlKey) e.preventDefault();
    if (mode === "delete") removeEl(el); else if (mode === "keep") keepOnly(el);
  }, true);

  function setMode(m) { mode = m; $("#mDelete").classList.toggle("on", m === "delete"); $("#mKeep").classList.toggle("on", m === "keep"); $("#mEdit").classList.toggle("on", m === "edit"); highlight(pinned || hover); }
  $("#mDelete").addEventListener("click", () => setMode("delete"));
  $("#mKeep").addEventListener("click", () => setMode("keep"));
  $("#mEdit").addEventListener("click", () => setMode("edit"));

  // ---------- edit operations (undoable) ----------
  function pushUndo(entry) { undoStack.push(entry); if (undoStack.length > MAX_UNDO) undoStack.shift(); redoStack.length = 0; updateUndo(); }
  function updateUndo() { $("#undo").disabled = !undoStack.length; $("#redo").disabled = !redoStack.length; }

  function removeEl(el) {
    if (!el || el === paper) return;
    const entry = { type: "remove", els: [{ el, parent: el.parentNode, next: el.nextSibling }] };
    el.remove(); collapseEmpty(el.parentNode, entry);
    pushUndo(entry); highlight(null); pinned = null; buildFootnotes();
  }
  // Fix for blank gaps: also remove containers left empty after a deletion (empty <div>, <section>, <li> …)
  function collapseEmpty(node, entry) {
    while (node && node !== paper && node.nodeType === 1) {
      const hasContent = node.textContent.trim() !== "" || node.querySelector("img,table,hr,video,canvas,svg");
      if (hasContent || ["TD", "TH", "TR", "TBODY", "THEAD", "TABLE"].includes(node.tagName)) break;
      const parent = node.parentNode; entry.els.push({ el: node, parent, next: node.nextSibling }); node.remove(); node = parent;
    }
  }
  function keepOnly(el) {
    if (!el || el === paper) return;
    const entry = { type: "keep", removed: [] };
    let node = el;
    while (node && node !== paper) {
      const parent = node.parentNode;
      for (const sib of [...parent.childNodes]) { if (sib !== node) { entry.removed.push({ el: sib, parent, next: sib.nextSibling }); sib.remove(); } }
      node = parent;
    }
    // strip container margins/padding so they don't leave gaps in print
    node = el.parentElement;
    const styled = [];
    while (node && node !== paper) { styled.push({ el: node, style: node.getAttribute("style") }); node.style.margin = "0"; node.style.padding = "0"; node.style.width = "auto"; node = node.parentElement; }
    entry.styled = styled;
    pushUndo(entry); highlight(null); pinned = null; buildFootnotes();
  }
  function startEdit(el) {
    const block = el.closest("p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote,figcaption,div,span") || el;
    const before = block.innerHTML;
    block.contentEditable = "true"; block.focus();
    const done = () => { block.removeAttribute("contenteditable"); block.removeEventListener("blur", done); if (block.innerHTML !== before) pushUndo({ type: "edit", el: block, before, after: block.innerHTML }); buildFootnotes(); };
    block.addEventListener("blur", done);
  }
  function undo() {
    const e = undoStack.pop(); if (!e) return;
    if (e.type === "remove") { for (const r of [...e.els].reverse()) r.parent.insertBefore(r.el, r.next && r.next.parentNode === r.parent ? r.next : null); }
    else if (e.type === "keep") { for (const s of e.styled) { if (s.style == null) s.el.removeAttribute("style"); else s.el.setAttribute("style", s.style); } for (const r of [...e.removed].reverse()) r.parent.insertBefore(r.el, r.next && r.next.parentNode === r.parent ? r.next : null); }
    else if (e.type === "edit") e.el.innerHTML = e.before;
    redoStack.push(e); updateUndo(); buildFootnotes();
  }
  function redo() {
    const e = redoStack.pop(); if (!e) return;
    if (e.type === "remove") for (const r of e.els) r.el.remove();
    else if (e.type === "keep") { for (const r of e.removed) r.el.remove(); for (const s of e.styled) { s.el.style.margin = "0"; s.el.style.padding = "0"; s.el.style.width = "auto"; } }
    else if (e.type === "edit") e.el.innerHTML = e.after;
    undoStack.push(e); updateUndo(); buildFootnotes();
  }
  $("#undo").addEventListener("click", undo); $("#redo").addEventListener("click", redo);
  $("#reset").addEventListener("click", () => setLayout(layout));
  const OPT_DEFAULTS = { fs: 100, margin: "18", paper: "A4", noImages: false, noBg: true, linkFoot: false, header: true };
  function setOpts(o) { $("#fs").value = o.fs; $("#margin").value = o.margin; $("#paperSize").value = o.paper; $("#noImages").checked = !!o.noImages; $("#noBg").checked = !!o.noBg; $("#linkFoot").checked = !!o.linkFoot; $("#header").checked = !!o.header; applyOptions(); }
  $("#resetOpts").addEventListener("click", () => setOpts(OPT_DEFAULTS));
  $("#reader").addEventListener("click", () => setLayout("reader"));
  $("#original").addEventListener("click", () => setLayout("original"));

  // ---------- options ----------
  function applyOptions() {
    const fs = +$("#fs").value; $("#fsv").textContent = fs + "%"; paper.style.fontSize = fs + "%";
    const m = $("#margin").value; wrap.style.padding = m + "mm"; document.documentElement.style.setProperty("--pad", m + "mm");
    wrap.classList.toggle("letter", $("#paperSize").value === "Letter");
    paper.classList.toggle("no-images", $("#noImages").checked);
    paper.classList.toggle("no-bg", $("#noBg").checked);
    $("#docHeader").hidden = !$("#header").checked;
    buildFootnotes();
    chrome.storage.local.set({ opts: { fs, margin: m, paper: $("#paperSize").value, noImages: $("#noImages").checked, noBg: $("#noBg").checked, linkFoot: $("#linkFoot").checked, header: $("#header").checked } });
  }
  for (const id of ["fs", "margin", "paperSize", "noImages", "noBg", "linkFoot", "header"]) $("#" + id).addEventListener("input", applyOptions);
  chrome.storage.local.get("opts").then(({ opts }) => { if (!opts) return; $("#fs").value = opts.fs ?? 100; $("#margin").value = opts.margin ?? 18; $("#paperSize").value = opts.paper ?? "A4"; $("#noImages").checked = !!opts.noImages; $("#noBg").checked = opts.noBg ?? true; $("#linkFoot").checked = !!opts.linkFoot; $("#header").checked = opts.header ?? true; applyOptions(); });

  function buildFootnotes() {
    paper.querySelectorAll("sup.cp-fn").forEach((s) => s.remove());
    const on = $("#linkFoot").checked;
    $("#footnotes").hidden = true;
    if (!on) return;
    const list = $("#fnList"); list.innerHTML = "";
    let n = 0;
    for (const a of paper.querySelectorAll("a[href^='http']")) {
      if (!a.textContent.trim() || a.href === snap?.url) continue;
      if (a.textContent.trim() === a.href) continue;
      n++; const li = document.createElement("li"); li.textContent = a.href; list.append(li);
      const sup = document.createElement("sup"); sup.className = "cp-fn"; sup.textContent = `[${n}]`; a.after(sup);
    }
    $("#footnotes").hidden = n === 0;
  }

  // ---------- output ----------
  function doPrint() { highlight(null); window.print(); }
  $("#print").addEventListener("click", doPrint);
  $("#saveHtml").addEventListener("click", () => {
    const css = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch { return ""; } }).join("\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(snap.title)}</title><style>${css}\n#tools,#hl,#hlTag{display:none}#stage{padding:0}#paper-wrap{box-shadow:none;margin:0 auto}</style></head><body><main id="stage">${wrap.outerHTML}</main></body></html>`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html" })); a.download = (snap.title || "page").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) + ".html"; a.click();
  });

  load();
})();
