[English](README.md)

# Sonra Oku

Kişisel bir "sonra oku" Android uygulaması. Makale URL'lerini kaydedin, tamamen çevrimdışı okuyun — hesap yok, bulut yok, takip yok.

## Özellikler

- Tek dokunuşla URL kaydederek makale ekleyin
- Tam çevrimdışı okuma — içerik ve görseller cihazda önbelleğe alınır
- Makale ayrıştırma Mozilla Readability ile yerel olarak çalışır (harici API yok)
- Cihaz TTS ile sesli okuma, otomatik dil algılama
- Kaydırma ile arşivleme veya okundu/okunmadı işaretleme
- Yüksek Kontrast ve Sepya temalarıyla erişilebilirlik öncelikli tasarım
- Oturumlar arasında saklanan ayarlanabilir font boyutu
- Türkçe / İngilizce arayüz

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

## Geliştirme Ortamı Kurulumu

### Önkoşullar ve Araçlar
- **nvm**: Node.js sürüm yöneticisi. [nvm-sh/nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) veya [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows).
- **Node.js**: 18+ gereklidir, 22 önerilir. nvm ile kurun: `nvm install 22`.
- **pnpm**: Hızlı ve verimli paket yöneticisi. `npm install -g pnpm` veya `corepack enable` ile kurun.
- **Android Studio**: Android SDK, platform araçları ve emülatörler için gereklidir. developer.android.com/studio adresinden indirin.

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

## Mimari

**Çevrimdışı öncelikli.** SQLite tek kaynak noktasıdır — tüm okumalar yerel veritabanından gelir.

**Ayrıştırma akışı:**
1. Kullanıcı URL kaydeder → makale satırı anında eklenir (iyimser yazma)
2. Ham HTML, tarayıcı User-Agent başlığıyla indirilir
3. HTML, Readability.js ile birlikte gizli bir WebView'e enjekte edilir
4. Readability başlık, içerik, özet ve dili çıkarır
5. Görseller expo-file-system aracılığıyla indirilip önbelleğe alınır
6. WebView kaldırılır

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
- [x] Faz 2 — Geliştirmeler (görsel önbellek, kaydırma hareketleri, sesli okuma, font boyutu, i18n)
- [x] Versiyonlama ve Etiketleme sistemi
- [ ] Faz 3 — FastAPI backend + JWT auth + delta sync
