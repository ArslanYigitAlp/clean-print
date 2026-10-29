# Clean Print (v0.1.0)

Yazdırmadan önce sayfayı temizle: dondur, gereksiz öğeleri sil, sadece istediğini tut, temiz PDF al. Chrome ve Edge (MV3).

Ürün gerekçesi ve yol haritası: `SPEC.md`.

## Chrome'a yükleme

1. `chrome://extensions` → **Geliştirici modu** → **Paketlenmemiş öğe yükle** → `src` klasörü.
2. Herhangi bir sayfada ikona tıkla (Ctrl+Shift+P). Sayfanın dondurulmuş kopyası yeni sekmede editörde açılır; orijinal sayfaya dokunulmaz.

## v0.1'de olanlar

- **Dondurma:** DOM klonu + kritik hesaplanmış stiller inline (font, renk, kenar boşlukları, tablo, görsel boyutları). Script/timer yok → düzenlemeler asla kaybolmaz. Sabit/yapışkan çubuklar, çerez uyarıları, gizli öğeler, form alanları (metne çevrilir) otomatik ayıklanır. Aşırı kenar boşlukları 24px'e kırpılır (orijinal eklentinin "büyük boşluklar" şikâyeti).
- **Okuyucu düzeni:** Mozilla Readability (Apache-2.0, `src/vendor/`) ile ana içerik; tek sütun, serif tipografi.
- **Modlar:** Delete (tıkla-sil, boş kalan kapsayıcılar da gider), Keep only (sadece bunu tut; kapsayıcı padding'leri sıfırlanır), Edit text (yerinde metin düzenleme). ← → ile seçimi ebeveyn/çocuğa genişlet-daralt; Delete/Enter klavyeden.
- **Geri al / yinele** (Ctrl+Z / Ctrl+Shift+Z), Reset.
- **Düzen:** yazı boyutu, kenar boşluğu, A4/Letter, görselleri gizle, arka planları kaldır, bağlantıları dipnot yap, başlık satırı (başlık, site, tarih).
- **Çıktı:** Yazdır / PDF olarak kaydet (yazdırma CSS'i: tablo-görsel bölünmez, başlık sayfa sonunda kalmaz, orphans/widows), HTML olarak kaydet.

## Test

```
pip install playwright && playwright install chromium
python test/e2e.py     # 28 kontrol: snapshot ayıklama, okuyucu, sil/tut/düzenle, geri al, seçenekler, print CSS, PDF üretimi
```

## Bilinen sınırlar

- Çok büyük sayfalar 6.000 düğümde kesilir (editörde uyarı).
- Canvas/video/iframe içerikleri alınmaz; SVG'ler görsel olarak gömülür.
- Web font'lar kopyalanmaz; sistemdeki en yakın yazı tipi kullanılır.

## Sıradaki (SPEC.md)

- v0.2: site kuralları ("bu sitede her zaman şunları sil"), çoklu seçim, Edge Add-ons yayını.
- v0.3 (Pro, ExtensionPay): sütun/başlık-altbilgi düzen araçları, şablonlar (Makale/Fatura/Tarif), açık sekmeleri tek PDF'e birleştir.
