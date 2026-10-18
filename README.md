# PMTS: Proje Mali Takip Sistemi

Ana stok kataloğu, varlık kodu ve etiketler, tarihli birim fiyat takibi ve proje bütçesi / gerçekleşen maliyet karşılaştırması. Vite + React + TypeScript + Tailwind, backend yok (veriler tarayıcıda, localStorage).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # alan mantığı testleri (node:test, ek bağımlılık yok)
npm run lint
npm run build
```

İlk açılışta örnek veri yüklenir. Ayarlar sayfasından JSON yedek alınabilir, içe aktarılabilir, veri sıfırlanabilir.

## Masaüstü uygulaması (Electron)

Aynı React kodu Electron içinde çalışır (`electron/main.cjs`), ayrı bir arayüz kodu yoktur.

```bash
npm run desktop            # build alıp uygulamayı pencere olarak açar
npm run desktop:dev        # `npm run dev` açıkken, canlı yenilemeyle (macOS/Linux)
npm run desktop:dist       # macOS arm64 .dmg  ->  release/PMTS-<sürüm>-arm64.dmg
npm run desktop:dist:win   # Windows .exe (Windows makinede veya CI'da çalıştırılmalı)
```

- **Windows `.exe`:** macOS'ta üretilemez. GitHub'daki *Actions → Desktop build → Run workflow* (`.github/workflows/desktop-build.yml`) macOS ve Windows kurulum dosyalarını derleyip çıktı olarak ekler. Hiçbir şey yayımlanmaz.
- **İmzasız sürüm:** uygulama Apple/Microsoft sertifikasıyla imzalı değildir. macOS 15 ve sonrasında ilk açılış engellenir: *Sistem Ayarları → Gizlilik ve Güvenlik* sayfasında PMTS için çıkan *Yine de Aç*'a basın (eski sürümlerde uygulamaya sağ tıklayıp *Aç*). "Hasarlı" hatası çıkarsa: `xattr -cr /Applications/PMTS.app`. Windows'ta SmartScreen uyarısında *Yine de çalıştır*'ı seçin.
- **Veri nerede:** tarayıcı sürümündeki gibi yerel depolamada, macOS'ta `~/Library/Application Support/PMTS`. Düzenli olarak Ayarlar → JSON dışa aktar ile yedek alın.
- **Tek pencere:** veri bu depolamada durduğu için uygulama aynı anda yalnızca bir kez açılır, ikinci açma mevcut pencereyi öne getirir.

## Temel kurallar

- **Stok bakiyesi hesaplanır**, elle yazılmaz: stok hareketlerinin (`giriş`, `çıkış`, `düzeltme`) toplamıdır. Negatif stok engellenir.
- **Çıkışta fiyat sabitlenir.** Projeye çıkış yapılırken kalemin o günkü birim fiyatı harekete kopyalanır. Sonradan fiyat değişse de eski projelerin maliyeti değişmez.
- **Proje maliyeti** = çıkış hareketlerinin `miktar × sabitlenmiş birim fiyat` toplamı. Her proje için tek toplam bütçe vardır.
- **Fiyat geçmişi** silinmeden birikir (tarih, birim fiyat, tedarikçi, KDV oranı). "Son fiyat" ekleme sırasına göre değil tarihe göre seçilir.
- **Tüm tutarlar KDV hariç** saklanır ve gösterilir. KDV dahil değer yalnızca fiyat geçmişinde hesaplanıp gösterilir. Para birimi TRY. Tutarlar satır bazında kuruşa yuvarlanır.
- **Varlık kodu** (`PMTS-0001`) kalıcı bir sayaçtan üretilir: silinen kod yeniden verilmez. **Etiketler** ise kodla ilgisiz, serbest renkli gruplama araçlarıdır.
- Hareketi olan kalem ve projeler silinemez.

## Yapı

```
src/domain/    saf iş mantığı: tipler, hesaplar, reducer (tüm doğrulamalar), import doğrulama, örnek veri, testler
src/data/      Repository arayüzü + localStorage uygulaması, React Context store
src/components/, src/pages/   arayüz
```

Veri saklama `src/data/repository.ts` arkasındadır; localStorage yerine başka bir depolama (dosya, API) bu arayüzün ikinci bir uygulaması olarak eklenebilir. Yönlendirme `HashRouter` ve göreli `base` kullanır, bu yüzden build çıktısı herhangi bir statik sunucudan veya `file://` ile açılabilir.
