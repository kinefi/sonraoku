[English](README.md)

# Sonra Oku

Kişisel bir "sonra oku" Android uygulaması. Makale URL'lerini kaydedin, tamamen çevrimdışı okuyun — hesap yok, bulut yok, takip yok.

## Özellikler

- Tek dokunuşla URL kaydederek makale ekleyin
- Tam çevrimdışı okuma — içerik ve görseller cihazda önbelleğe alınır
- Makale ayrıştırma Mozilla Readability ile yerel olarak çalışır (harici API yok)
- Entegre RSS Okuyucu — favori bloglarınızı ve haber sitelerini takip edin
- OPML Desteği — besleme aboneliklerinizi kolayca içe aktarın ve dışa aktarın
- Cihaz TTS ile sesli okuma, otomatik dil algılama
- Kaydırma ile arşivleme veya okundu/okunmadı işaretleme
- Favori makaleler için özel filtre ve arayüz göstergeleri
- Silme işlemleri için "Geri Al" destekli etkileşimli Bildirim (Toast) sistemi
- Yüksek Kontrast ve Sepya temalarıyla erişilebilirlik öncelikli tasarım ve yumuşak geçişler
- Oturumlar arasında saklanan ayarlanabilir font boyutu
- Türkçe / İngilizce arayüz (hiyerarşik tip güvenli çeviri anahtarları ile)
- Arka Plan Senkronizasyonu — yeni besleme öğelerini arka planda otomatik kontrol etme

## Teknoloji

| Katman | Teknoloji |
|---|---|
| Çerçeve | Expo SDK 55 (React Native, TypeScript) |
| Navigasyon | expo-router (dosya tabanlı) |
| Yerel DB | expo-sqlite |
| Durum | TanStack Query |
| Ayrıştırma | @mozilla/readability, gizli WebView içinde |
| Görsel önbellek | expo-file-system |
| TTS | expo-speech |
| Hareketler | react-native-gesture-handler |
| XML Ayrıştırma | fast-xml-parser (v5) |

## Geliştirme Ortamı Kurulumu

### Önkoşullar ve Araçlar
- **nvm**: Node.js sürüm yöneticisi. [nvm-sh/nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) veya [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows).
- **Node.js**: 18+ gereklidir, 22 önerilir. nvm ile kurun: `nvm install 22`.
- **pnpm**: Hızlı ve verimli paket yöneticisi. `npm install -g pnpm` veya `corepack enable` ile kurun.
- **[Android Studio](https://developer.android.com/studio)**: Android SDK, platform araçları ve emülatörler için gereklidir.

```bash
# 1. Depoyu kopyalayın (clone)
git clone https://github.com/kinefi/sonraoku.git
cd sonraoku

# 2. Bağımlılıkları kurun
pnpm install

# 3. Yerel veritabanı taşıma dosyalarını (migrations) oluşturun
pnpm db:generate

# 4. Android cihazda veya emülatörde çalıştırın
pnpm android
# veya
pnpm start          # Metro'yu başlat, Expo Go ile QR tara
```

## Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm start` | Metro bundler'ı başlat |
| `pnpm android` | Android'de derle ve çalıştır |
| `pnpm lint` | ESLint çalıştır |
| `pnpm type-check` | TypeScript kontrolü çalıştır |
| `pnpm format` | Prettier çalıştır |
| `pnpm doctor` | expo-doctor çalıştır |
| `pnpm audit` | Güvenlik zafiyetlerini kontrol et |
| `pnpm fix` | Expo paket sürümü uyumsuzluklarını düzelt |
| `pnpm release` | Versiyon yükselt ve changelog oluştur |

## Veritabanı ve Taşıma İşlemleri (Migrations)

Bu projede şema yönetimi için **Drizzle ORM** ve **Drizzle Kit** kullanılmaktadır.

1. **Şemayı Değiştirin**: `lib/db/schema.ts` dosyasını güncelleyin.
2. **Taşıma Dosyası Oluşturun**: `pnpm db:generate` komutunu çalıştırarak `drizzle/` klasöründe yeni bir SQL dosyası oluşturun.
3. **Uygulayın**: Taşıma işlemleri, uygulama başlatıldığında `lib/db/config.ts` içindeki `initDb()` fonksiyonu aracılığıyla otomatik olarak gerçekleştirilir.

## Mimari

**Çevrimdışı öncelikli.** SQLite tek kaynak noktasıdır — tüm okumalar yerel veritabanından gelir.

**Ayrıştırma akışı:**
1. Kullanıcı URL kaydeder → makale satırı anında eklenir (iyimser yazma)
2. Ham HTML, tarayıcı User-Agent başlığıyla indirilir
3. HTML, Readability.js ile birlikte gizli bir WebView'e enjekte edilir
4. Readability başlık, içerik, özet ve dili çıkarır
5. Görseller expo-file-system aracılığıyla indirilip önbelleğe alınır
6. WebView kaldırılır

**RSS Senkronizasyon Akışı:**
1. Uygulama standart `fetch()` ile XML besleme verisini çeker.
2. Besleme ayrıştırılır ve yeni öğeler optimize edilmiş toplu ekleme (batch insert) ile SQLite'a kaydedilir.
3. Arka plan görevleri (`expo-background-fetch`) arayüzü uyandırmadan periyodik senkronizasyonu tetikler.
4. Kullanıcılar belirli besleme öğelerini "Çevrimdışı Kaydet" seçeneğiyle makale ayrıştırma akışına dahil edebilir.
5. OPML yedekleri `.xml` dosyaları olarak oluşturulur ve yerel Android paylaşım sistemiyle paylaşılır.

**Harici ayrıştırma API'si yok.** Readability.js, özel bir Metro transformer aracılığıyla uygulamaya dahil edilir — postinstall betiği veya üretilen dosya yoktur.

## Versiyonlama ve Etiketleme

Bu proje, otomatik versiyon yönetimi için `commit-and-tag-version` kullanır.

1. Değişikliklerinizi tamamlayın ve commit edin.
2. Versiyonu yükseltmek ve git etiketi oluşturmak için `pnpm release` çalıştırın.
3. Değişiklikleri ve etiketleri uzak sunucuya gönderin:
   ```bash
   git push --follow-tags
   ```

## Proje Yapısı

```
app/              expo-router ekranları ve layout'ları
components/       yeniden kullanılabilir UI bileşenleri
lib/              db, parser, i18n, görsel önbellek, query client
scripts/          Readability.js için Metro transformer
types/            ambient TypeScript bildirimleri
```

## Yol Haritası

- [x] Faz 1 — Çevrimdışı çekirdek döngü
- [x] Faz 2 — Geliştirmeler (görsel önbellek, vurgulamalar, etiketleme, RSS, kaydırma hareketleri, sesli okuma, i18n, favoriler, bildirimler)
- [x] Versiyonlama ve Etiketleme sistemi
- [ ] Faz 3 — FastAPI backend + JWT auth + delta sync
