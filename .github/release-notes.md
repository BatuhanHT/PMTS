PMTS (Proje Mali Takip Sistemi) masaüstü uygulaması. Stok kataloğu, varlık kodları ve etiketler, tarihli birim fiyat takibi ve proje bütçesi / gerçekleşen maliyet karşılaştırması.

## Dosyalar

| Dosya | Platform |
|---|---|
| `PMTS-<sürüm>-arm64.dmg` | macOS, Apple Silicon (M1 ve sonrası). Intel Mac'lerde çalışmaz. |
| `PMTS-Setup-<sürüm>.exe` | Windows 64 bit |
| `SHA256SUMS.txt` | Dosya doğrulama toplamları |

## Kurulum

**macOS:** `.dmg` dosyasını açıp `PMTS`'i Applications klasörüne sürükleyin. İlk açılışta macOS uygulamayı engeller. *Sistem Ayarları → Gizlilik ve Güvenlik* sayfasında PMTS için çıkan *Yine de Aç*'a basın. "Hasarlı" hatası çıkarsa Terminal'de `xattr -cr /Applications/PMTS.app` komutunu çalıştırın.

**Windows:** `.exe` kurulum dosyasını çalıştırın. SmartScreen uyarısı çıkarsa *Daha fazla bilgi → Yine de çalıştır*'ı seçin.

## Bilmeniz gerekenler

- Bu sürüm Apple/Microsoft sertifikasıyla **imzalı değildir**, bu yüzden yukarıdaki uyarılar normaldir.
- Veriler **yalnızca bu bilgisayarda** saklanır, kişiler arasında paylaşılmaz. Düzenli olarak *Ayarlar → JSON olarak dışa aktar* ile yedek alın. Yedek dosyasını başka bir kişi *içe aktar* ile yükleyebilir.
- Uygulama aynı anda bir kez açılır.
