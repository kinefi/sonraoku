[English](README.md)

# Sonra Oku

Kişisel bir "sonra oku" Android uygulaması. Makale URL'lerini kaydedin, tamamen çevrimdışı okuyun — hesap yok, bulut yok, takip yok.

## Özellikler

- Tek dokunuşla URL kaydederek makale ekleyin
- Tam çevrimdışı okuma — içerik ve görseller cihazda önbelleğe alınır
- Makale ayrıştırma Mozilla Readability ile yerel olarak çalışır (harici API yok)
- Cihaz TTS ile sesli okuma, otomatik dil algılama
- Kaydırma ile arşivleme veya okundu/okunmadı işaretleme
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

## Başlangıç

**Gereksinimler:** Node.js 18+, pnpm, Android cihaz veya emülatör

```bash
pnpm install
pnpm android        # bağlı cihaz/emülatörde derle ve çalıştır
# veya
pnpm start          # Metro'yu başlat, Expo Go ile QR tara
```

## Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm start` | Metro bundler'ı başlat |
| `pnpm android` | Android'de derle ve çalıştır |
| `pnpm lint` | ESLint çalıştır |
| `pnpm format` | Prettier çalıştır |
| `pnpm doctor` | expo-doctor çalıştır |
| `pnpm fix` | Expo paket sürümü uyumsuzluklarını düzelt |

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
- [ ] Faz 3 — FastAPI backend + JWT auth + delta sync
