# Clean Print — Chrome Web Store başvuru paketi

Panel: https://chrome.google.com/webstore/devconsole  (tek seferlik 5 $ geliştirici kaydı, Google hesabıyla)

Yüklenecek dosya: `clean-print-0.1.0.zip` (src klasörünün içeriği, kök dizinde manifest.json)

---

## Store listing → Product details

**Title (manifest'ten gelir):** Clean Print – Edit Page, Save Clean PDF

**Summary (manifest description, ≤132):**
Remove ads, menus and clutter before printing. Freeze the page, delete what you don't need, save a clean PDF.

**Description (EN):**

Print only what matters.

Clean Print takes a snapshot of the page you're on, opens it in a simple editor and lets you remove everything you don't want on paper — ads, menus, sidebars, comments, share buttons — then print it or save it as a clean PDF.

How it works
• Click the icon (or Ctrl+Shift+P). The page is frozen into an editable copy; the original tab is never modified, so your edits can't be lost when the page refreshes.
• Reader layout: the article is extracted automatically and laid out in a single, readable column.
• Delete: hover over any element and click to remove it. Empty leftovers disappear too — no big blank gaps in the printout.
• Keep only: click the part you want and everything else goes away.
• Edit text: fix a typo or shorten a paragraph right on the page.
• Undo / redo, font size, margins, A4 / Letter, hide images, remove backgrounds, links as footnotes, header with title / site / date.
• Print, save as PDF (via the print dialog) or save as HTML.

Privacy
Everything happens inside your browser. Clean Print has no server, no account and sends nothing anywhere. It only reads the page you explicitly click the icon on (activeTab permission) and stores your layout preferences locally.

Works on Chrome and Microsoft Edge.

**Description (TR) — Türkçe mağaza dili eklenirse:**

Sadece gerekeni yazdır.

Clean Print, bulunduğun sayfanın anlık görüntüsünü alır, basit bir editörde açar ve kâğıtta istemediğin her şeyi — reklamlar, menüler, yan paneller, yorumlar, paylaş düğmeleri — kaldırmanı sağlar; sonra yazdırır ya da temiz bir PDF olarak kaydedersin.

Nasıl çalışır
• İkona tıkla (veya Ctrl+Shift+P). Sayfa düzenlenebilir bir kopyaya dondurulur; orijinal sekmeye dokunulmaz, sayfa yenilense bile düzenlemelerin kaybolmaz.
• Okuyucu düzeni: makale otomatik ayıklanır, tek sütun halinde okunaklı dizilir.
• Sil: istediğin öğenin üzerine gel, tıkla. Boş kalan kapsayıcılar da gider — çıktıda büyük boşluklar oluşmaz.
• Sadece bunu tut: istediğin bölüme tıkla, geri kalan her şey kalkar.
• Metni düzenle: yazım hatasını düzelt, paragrafı kısalt.
• Geri al / yinele, yazı boyutu, kenar boşluğu, A4 / Letter, görselleri gizle, arka planları kaldır, bağlantıları dipnot yap, başlık satırı.
• Yazdır, PDF olarak kaydet veya HTML olarak kaydet.

Gizlilik
Her şey tarayıcının içinde olur. Sunucu yok, hesap yok, hiçbir veri gönderilmez. Yalnızca ikona tıkladığın sayfayı okur (activeTab izni) ve düzen tercihlerini yerel olarak saklar.

Chrome ve Microsoft Edge'de çalışır.

**Category:** Productivity → Tools
**Language:** English (+ Türkçe)

---

## Store listing → Graphic assets

- Icon 128×128: `src/icons/icon128.png` (hazır)
- Screenshots: 1280×800 (veya 640×400), en az 1, en fazla 5 — `store/SCREENSHOTS.md`'deki plana göre sen çek
- Small promo tile 440×280: `store/promo-440x280.png` (hazır)
- Marquee 1400×560: isteğe bağlı, atla

---

## Privacy practices (inceleme için en kritik bölüm)

**Single purpose description:**
Lets the user edit a snapshot of the current page (remove elements, adjust layout) and print it or save it as a clean PDF.

**Permission justifications:**
- `activeTab`: To read the content of the page the user is currently viewing, only when the user clicks the extension icon or presses the shortcut, so it can be copied into the editor.
- `scripting`: To run the snapshot script in the active tab (after the user clicks the icon) that copies the page content and computed styles into the editor.
- `storage`: To remember the user's layout preferences (font size, margins, paper size, checkbox options) locally. No page content is stored persistently.

**Host permissions:** none (yok; activeTab yeterli — incelemeyi hızlandırır)

**Remote code:** No, I am not using remote code. (Readability.js pakete gömülü.)

**Data usage:** "Website content" işaretle → "This data is processed locally and never transmitted" seçeneklerini işaretle. Diğer hiçbir veri türü toplanmıyor.

Üç beyanı onayla: veri satılmıyor, amaç dışı kullanılmıyor, kredi değerlendirmesi için kullanılmıyor.

**Privacy policy URL:** https://arslanyigitalp.github.io/clean-print/privacy.html  (repo → Settings → Pages → Branch: main, Folder: /docs → Save; 1–2 dk sonra yayında)

---

## Distribution

- Visibility: Public
- Regions: All regions
- Pricing: Free (Pro katmanı ileride ExtensionPay ile eklenecek; ilk sürümde ücretsiz yayınlamak inceleme riskini düşürür ve yorum toplamayı hızlandırır)

---

## Gönderim sonrası

- İlk inceleme genelde 1–3 gün; "activeTab + scripting + storage" ile ek inceleme beklenmez.
- Yayına girince: Edge Add-ons'a aynı zip ile başvur (https://partner.microsoft.com/dashboard/microsoftedge, ücretsiz).
- İlk 10 kullanıcıdan nazikçe yorum iste (arkadaş/çevre); mağaza sıralamasında puan sayısı kurulum sayısından daha etkili.
