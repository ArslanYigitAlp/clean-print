"""Clean Print uçtan uca test."""
import http.server, threading, sys, os, tempfile, json
from pathlib import Path
from playwright.sync_api import sync_playwright

import shutil
ROOT = Path(__file__).resolve().parents[1]
# test kopyası: sekmeyi bulmak için 'tabs' izni eklenir (üründe gerekmez; activeTab yeterli)
EXT = tempfile.mkdtemp(prefix="cp-ext-")
shutil.copytree(ROOT / "src", EXT, dirs_exist_ok=True)
_m = json.loads((Path(EXT) / "manifest.json").read_text())
_m["permissions"] = list(set(_m["permissions"] + ["tabs"])); _m["host_permissions"] = ["http://127.0.0.1/*"]
(Path(EXT) / "manifest.json").write_text(json.dumps(_m))
CHROME = os.environ.get("PW_CHROME") or "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"

PAGE = """<!doctype html><html><head><title>Kira Sözleşmesi Nasıl Hazırlanır?</title>
<style>
 body{margin:0;font-family:Arial;background:#f3f3f3}
 nav{position:fixed;top:0;left:0;right:0;height:56px;background:#222;color:#fff}
 .cookie{position:fixed;bottom:0;left:0;right:0;background:#ffc;padding:20px}
 .wrap{display:grid;grid-template-columns:1fr 300px;gap:20px;padding:80px 20px 20px}
 .toolbar{display:flex;gap:10px}
 main{flex:1;background:#fff;padding:20px}
 aside{width:300px;background:#eee;padding:10px}
 .ad{background:#fdd;padding:40px;margin:16px 0;min-height:120px}
 .share{display:flex;gap:8px}
 .share a{padding:8px;background:#06c;color:#fff}
 h1{font-size:28px} p{line-height:1.6}
 .hidden{display:none}
</style></head><body>
<nav>SITE MENU · Home · News · Login</nav><div class="toolbar" role="toolbar"><button>A</button><button>B</button></div>
<div class="wrap">
 <main>
  <h1>Kira Sözleşmesi Nasıl Hazırlanır?</h1>
  <div class="byline">Av. Ayşe Yılmaz · 12 Mart 2026</div>
  <div class="share"><a href="https://x.com/share">Tweet</a><a href="https://fb.com/share">Share</a></div>
  <div class="ad">REKLAM — Bu alan bir reklam kutusudur</div>
  <p>Kira sözleşmesi, kiraya verenin bir şeyin kullanılmasını kiracıya bırakmayı, kiracının da buna karşılık kararlaştırılan kira bedelini ödemeyi üstlendiği sözleşmedir. Türk Borçlar Kanunu'nun 299. maddesinde tanımlanmıştır.</p>
  <p>Sözleşmede tarafların kimlik bilgileri, kiralananın adresi, kira bedeli ve ödeme şekli, sözleşme süresi ve depozito açıkça yazılmalıdır. Ayrıntı için <a href="https://mevzuat.gov.tr/tbk">mevzuat sayfasına</a> bakınız.</p>
  <table border="1"><tr><th>Madde</th><th>Açıklama</th></tr><tr><td>Süre</td><td>1 yıl</td></tr><tr><td>Depozito</td><td>2 kira</td></tr></table>
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" width="200" height="100" alt="örnek">
  <div class="ad">REKLAM 2</div>
  <p>Son olarak, sözleşme iki nüsha düzenlenmeli ve her iki tarafça imzalanmalıdır. Tahliye taahhüdü ayrı bir belgede alınmalıdır.</p>
  <div id="counter">Görüntülenme: 0</div>
  <div class="hidden">Gizli metin görünmemeli</div>
 </main>
 <div class="sidebar"><h3>Popüler</h3><ul><li>Haber 1</li><li>Haber 2</li></ul><div class="ad">YAN REKLAM</div></div>
</div>
<div class="cookie">Çerez kullanıyoruz. <button>Kabul</button></div>
<script>let n=0;setInterval(()=>{document.getElementById('counter').textContent='Görüntülenme: '+(++n)},200)</script>
</body></html>"""

class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/embed"):
            b = b'<html><body><embed type="application/pdf" src="x.pdf" style="width:100%;height:100%"></body></html>'
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        if self.path.startswith("/blank"):
            b = b'<html><body><div id="app"></div></body></html>'
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        b = PAGE.encode(); self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/kira"

def main():
    results = []
    def check(name, cond, extra=""): results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name, extra)
    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=True, executable_path=CHROME,
            args=[f"--disable-extensions-except={EXT}", f"--load-extension={EXT}", "--headless=new"])
        sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker", timeout=15000)
        ext_id = sw.url.split("/")[2]
        page = ctx.new_page(); page.set_viewport_size({"width": 1280, "height": 900})
        page.goto(URL); page.wait_for_timeout(600)

        # snapshot'ı doğrudan çalıştır (action click yerine; headless'ta action tıklanamaz)
        snap = page.evaluate("async () => { const s1 = await fetch(chrome.runtime.getURL('x')).catch(()=>null); return null; }") if False else None
        # content script'leri sayfaya enjekte etmek için helper sayfası üzerinden executeScript
        helper = ctx.new_page(); helper.goto(f"chrome-extension://{ext_id}/editor/editor.html"); helper.wait_for_timeout(300)
        tab_id = helper.evaluate("(u)=>chrome.tabs.query({url:u}).then(t=>t[0].id)", URL)
        snap = helper.evaluate("(id)=>chrome.scripting.executeScript({target:{tabId:id}, files:['vendor/Readability.js','snapshot.js']}).then(r=>r[0].result)", tab_id)
        check("snapshot captured", snap and not snap.get("error") and len(snap["html"]) > 500, str(snap.get("error") if snap else snap))
        check("snapshot has reader content", bool(snap.get("reader")) and "Borçlar" in snap["reader"]["content"])
        check("fixed nav/cookie dropped", "SITE MENU" not in snap["html"] and "Çerez" not in snap["html"])
        check("hidden text dropped", "Gizli metin" not in snap["html"])
        check("table kept", "<table" in snap["html"] and "Depozito" in snap["html"])
        check("toolbar/buttons dropped", "role=" not in snap["html"] and "<button" not in snap["html"])
        check("grid flattened to block", "grid" not in snap["html"] and "flex" not in snap["html"])
        check("img kept with size", 'src="data:image/png' in snap["html"] and 'width="200"' in snap["html"])

        # PDF benzeri (yalnızca embed) ve boş sayfa → anlamlı hata
        for path, exp in (("/embed", "pdf"), ("/blank", "empty")):
            p2 = ctx.new_page(); p2.goto(f"http://127.0.0.1:{PORT}{path}"); p2.wait_for_timeout(200)
            t2 = helper.evaluate("(u)=>chrome.tabs.query({url:u}).then(t=>t[0].id)", f"http://127.0.0.1:{PORT}{path}")
            r2 = helper.evaluate("(id)=>chrome.scripting.executeScript({target:{tabId:id}, files:['vendor/Readability.js','snapshot.js']}).then(r=>r[0].result)", t2)
            check(f"{path} → error '{exp}'", r2 and r2.get("error") == exp, str(r2)[:80]); p2.close()

        # editöre yükle
        key = "snap:test"
        helper.evaluate("([k,s])=>chrome.storage.session.set({[k]:s})", [key, snap])
        ed = ctx.new_page(); ed.set_viewport_size({"width": 1280, "height": 900})
        errors = []; ed.on("pageerror", lambda e: errors.append(str(e)))
        ed.goto(f"chrome-extension://{ext_id}/editor/editor.html#{key}"); ed.wait_for_timeout(600)
        check("editor loads reader layout", ed.locator("#paper.reader").count() == 1 and "Borçlar" in ed.locator("#paper").inner_text())
        check("header shows title", "Kira Sözleşmesi" in ed.locator("#hTitle").inner_text())

        # orijinal (dondurulmuş) düzene geç; reklamları sil
        ed.click("#original"); ed.wait_for_timeout(200)
        check("frozen layout loads", "REKLAM" in ed.locator("#paper").inner_text() and "Popüler" in ed.locator("#paper").inner_text())
        ads = ed.locator("#paper .ad")
        n0 = ads.count(); check("3 ads present", n0 == 3, f"n={n0}")
        # hover + click ile sil
        box = ads.nth(0).bounding_box(); ed.mouse.move(box["x"] + 10, box["y"] + 10); ed.wait_for_timeout(100)
        check("highlight shows on hover", ed.locator("#hl").is_visible())
        ed.mouse.click(box["x"] + 10, box["y"] + 10); ed.wait_for_timeout(100)
        check("delete removes ad", ed.locator("#paper .ad").count() == 2)
        check("undo enabled", ed.locator("#undo").is_enabled())
        ed.click("#undo"); ed.wait_for_timeout(100)
        check("undo restores ad", ed.locator("#paper .ad").count() == 3)
        ed.click("#redo"); ed.wait_for_timeout(100)
        check("redo removes again", ed.locator("#paper .ad").count() == 2)

        # Keep only: main
        ed.click("#mKeep"); ed.wait_for_timeout(50)
        mb = ed.locator("#paper main").bounding_box()
        # main'in kendisine değil bir çocuğuna gelip ← ile genişlet
        pb = ed.locator("#paper main p").nth(0).bounding_box()
        ed.mouse.move(pb["x"] + 5, pb["y"] + 5); ed.wait_for_timeout(80)
        ed.keyboard.press("ArrowLeft"); ed.wait_for_timeout(50)
        tag = ed.locator("#hlTag").inner_text()
        check("arrow-left widens to parent", "main" in tag, tag)
        ed.keyboard.press("Enter"); ed.wait_for_timeout(150)
        txt = ed.locator("#paper").inner_text()
        check("keep only removes sidebar", "Popüler" not in txt and "Borçlar" in txt)
        check("keep only strips wrapper padding", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper main').parentElement).paddingTop") == "0px")

        # Edit text
        ed.click("#mEdit"); pb = ed.locator("#paper main p").nth(0).bounding_box()
        ed.mouse.click(pb["x"] + 5, pb["y"] + 5); ed.wait_for_timeout(100)
        check("edit mode makes block editable", ed.evaluate("()=>document.activeElement && document.activeElement.isContentEditable"))
        ed.keyboard.press("End"); ed.keyboard.type(" [düzenlendi]"); ed.locator("#fs").focus(); ed.wait_for_timeout(100)
        check("text edit applied + undoable", "[düzenlendi]" in ed.locator("#paper").inner_text() and ed.locator("#undo").is_enabled())

        # Seçenekler
        ed.check("#linkFoot"); ed.wait_for_timeout(100)
        check("link footnotes built", ed.locator("#footnotes").is_visible() and "mevzuat.gov.tr" in ed.locator("#fnList").inner_text())
        ed.check("#noBg"); ed.wait_for_timeout(50)
        check("remove backgrounds clears paper bg", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper')).backgroundColor") == "rgba(0, 0, 0, 0)", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper')).backgroundColor"))
        check("remove backgrounds clears inner bg", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper main')).backgroundColor") == "rgba(0, 0, 0, 0)")
        ed.uncheck("#noBg"); ed.wait_for_timeout(50)
        check("backgrounds restored when unchecked", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper')).backgroundColor") != "rgba(0, 0, 0, 0)")
        ed.click("#resetOpts"); ed.wait_for_timeout(50)
        check("reset settings restores defaults", ed.is_checked("#noBg") and ed.is_checked("#header") and not ed.is_checked("#noImages"))
        ed.check("#noImages"); ed.wait_for_timeout(50)
        check("hide images", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper img')).display") == "none")
        ed.uncheck("#noImages")
        ed.select_option("#paperSize", "Letter"); ed.wait_for_timeout(50)
        check("letter paper class", ed.locator("#paper-wrap.letter").count() == 1)

        # Yazdırma medyası: araçlar gizli, kâğıt gölgesiz
        ed.emulate_media(media="print"); ed.wait_for_timeout(100)
        check("print: tools hidden", ed.evaluate("()=>getComputedStyle(document.querySelector('#tools')).display") == "none")
        check("print: no shadow/width auto", ed.evaluate("()=>getComputedStyle(document.querySelector('#paper-wrap')).boxShadow") == "none")
        pdf = ed.pdf(format="A4", print_background=True)
        check("pdf generated", len(pdf) > 5000, f"{len(pdf)} bytes")
        Path("/tmp/cleanprint.pdf").write_bytes(pdf)
        ed.emulate_media(media="screen")

        # Reset → reader
        ed.click("#reader"); ed.wait_for_timeout(100)
        check("reader layout restores content", "Popüler" not in ed.locator("#paper").inner_text() and "[düzenlendi]" not in ed.locator("#paper").inner_text())
        check("no page errors", not errors, "; ".join(errors)[:300])
        ed.click("#original"); ed.wait_for_timeout(200)
        ed.screenshot(path="/tmp/cleanprint.png")
        ctx.close()
    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results)-len(failed)}/{len(results)} passed")
    sys.exit(1 if failed else 0)

if __name__ == "__main__": main()
