# Print Editor — Ürün Spesifikasyonu

**Çalışma adı:** Clean Print (TR: "Temiz Yazdır – Sayfayı Düzenle ve PDF Al")
**Yerini aldığı:** Print Edit WE (100k kullanıcı, 4.3★, son güncelleme Eylül 2023)
**Tek cümle:** Yazdırmadan önce sayfadaki gereksiz her şeyi kaldır, kalanı düzgün bir kâğıt/PDF düzenine oturt.

## 1. Neden var — kanıt

Mevcut eklentinin yorumları:
- Edge'de (Chromium) çalışmıyor.
- Öğeler silinse bile çıktıda büyük boşluklar kalıyor; "önizlemede mükemmel, kâğıtta dağınık".
- Düzenleme sırasında sayfa (özellikle scriptli sayfalar) yenilenince düzenlemeler kayboluyor; "sayfayı dondur" yok.
- "Çok şey vaat ediyor, teslim edemiyor" — iyi fikir, kırık uygulama.

Kitle: hukuk, muhasebe, akademi, kamu — makale, mevzuat, fatura, rezervasyon onayı, e-Devlet belgelerini temiz çıktı almak isteyenler. Ödemeye en yatkın eklenti kitlelerinden biri (kurumsal kullanıcı, zaman = para).

## 2. Kullanıcı hikâyeleri

1. "Bu makaleyi reklamsız, menüsüz, tek sütun olarak yazdır."
2. "Şu tabloyu ve şu paragrafı sil, geri kalanı A4'e sığdır."
3. "Sayfayı dondur; ben düzenlerken içerik değişmesin."
4. "Yazı tipini büyüt, kenar boşluklarını daralt, başlığı sayfanın başına al."
5. "Sonucu PDF olarak kaydet / yazıcıya gönder / HTML olarak dışa aktar."

## 3. Özellikler

### Ücretsiz
- Tek tık "Okuyucu düzeni": ana içeriği ayıkla (Readability algoritması), tek sütun, temiz tipografi.
- Öğe seç-sil / sadece bunu tut (hover vurgusu, tıkla, Delete).
- Geri al / yinele, "sayfayı dondur" (tüm script ve timer'ları durdur, DOM anlık görüntüsünü klonla).
- Çıktı: yazıcı diyaloğu (`window.print()` düzenlenmiş kopyada), Chrome'un PDF'e kaydet'i.
- Yazdırma CSS'i: sayfa kesme kontrolü, görsellerin sayfa sonunda bölünmemesi, arka plan kaldırma, bağlantı URL'lerini dipnot olarak yazma (opsiyonel).

### Pro (tek seferlik ~9 $ veya yıllık ~12 $)
- Düzen araçları: yazı tipi/boyut, sütun sayısı, kenar boşlukları, başlık/altbilgi (tarih, URL, sayfa no).
- Metin düzenleme (içerik editable), vurgu/not ekleme.
- Site kuralları: "bu sitede her zaman şu öğeleri sil" (kaydedilir, otomatik uygulanır).
- Toplu: açık sekmelerin hepsini tek PDF'e birleştir (jsPDF/print-to-pdf ile).
- Şablonlar: "Makale", "Fatura/Fiş", "Tarif", "Belge".

## 4. Teknik tasarım

- Content script: tüm düzenleme izole bir **iframe/shadow DOM kopyasında** yapılır; orijinal sayfaya dokunulmaz → yenileme sorunu ortadan kalkar.
- "Dondur": `document.documentElement.cloneNode(true)` + inline stil hesaplaması (`getComputedStyle` ile kritik stiller kopyalanır) → kendi `about:blank` sekmemizde render. Script yok, timer yok.
- Boşluk sorunu: silinen öğeler `display:none` değil, DOM'dan çıkarılır; `position:absolute/fixed` ve `min-height` kalıntıları temizlenir; flex/grid kapsayıcılar normalleştirilir. Yazdırma öncesi "collapse empty containers" geçişi.
- Readability için Mozilla Readability.js (Apache-2.0) gömülü.
- Edge desteği: aynı MV3 paketi; Edge Add-ons mağazasına da yayın.
- İzinler: `activeTab, scripting, storage`. Host izni gerekmez (kullanıcı tıkladığında çalışır) → mağaza incelemesi kolay.

## 5. Mağaza listeleme (taslak)

Başlık: *Clean Print – Sayfayı Düzenle, Temiz PDF Al*
Açıklama: Reklamları, menüleri, yorumları kaldır; sadece istediğin içeriği düzgün bir düzende yazdır veya PDF olarak kaydet. Sayfa dondurulur, düzenlemelerin kaybolmaz.
Anahtar kelimeler: print edit, print preview, save as pdf, remove ads before print, temiz yazdır, pdf kaydet.

## 6. Riskler

- Teknik olarak üç adayın en zoru (stil kopyalama köşe durumları: web font, CSS değişkenleri, canvas).
- Chrome'un yerleşik "Okuyucu modu" iyileşirse ücretsiz katmanın bir kısmı değersizleşir; Pro'daki düzen/site kuralları buna karşı tampon.
- Rakipler: Print Friendly (sunucu tabanlı, ücretli), PrintWhatYouLike (eski). Farkımız: tamamen yerel, dondurma, Edge.

## 7. Yol haritası

- v0.1 (~40 saat): dondur + seç-sil + okuyucu düzeni + yazdır/PDF.
- v0.2: geri al, bağlantı dipnotları, sayfa kesme ayarları, Edge yayını.
- v0.3 (Pro): düzen araçları, site kuralları, şablonlar, ödeme.
- v0.4: toplu PDF, not/vurgu.
