# Sonra Oku

Kişisel bir "sonra oku" Android uygulaması. Expo ile geliştirilmiştir. Makale URL'lerini kaydedin, içerik cihazda ayrıştırılır ve çevrimdışı okunmak üzere yerel veritabanında saklanır. Hesap gerekmez, harici ayrıştırma API'si yoktur.

## Özellikler

- Herhangi bir makale URL'ini kaydedin ve çevrimdışı okuyun
- Makale içeriği [@mozilla/readability](https://github.com/mozilla/readability) ile yerel olarak ayrıştırılır (harici API yok)
- Görseller gerçek çevrimdışı okuma için indirilip önbelleğe alınır
- Cihaz TTS ile sesli okuma (çevrimdışı çalışır, makale diline göre dil otomatik seçilir)
- Kaydırma ile arşivleme veya okundu/okunmadı işaretleme
- Font boyutu tercihi oturumlar arasında saklanır
- Tümü / Okunmamış / Çevrimdışı / Arşivlenmiş filtre sekmeleri

## Teknoloji

- **Expo SDK 55** — React Native, TypeScript, expo-router
- **Expo SQLite** — yerel veritabanı, tek kaynak
- **TanStack Query** — durum yönetimi ve önbellek invalidasyonu
- **react-native-webview** — Readability.js'i gizli WebView içinde çalıştırır
- **react-native-gesture-handler + reanimated** — kaydırma hareketleri
- **expo-file-system** — görsel önbellekleme
- **expo-speech** — sesli okuma

## Başlangıç

**Gereksinimler:** Node.js, pnpm, USB hata ayıklama etkin Android cihaz (veya Android emülatörü)

```bash
pnpm install
pnpm android
```

> `pnpm install` komutu `scripts/bundle-readability.js` aracılığıyla `@mozilla/readability`'yi otomatik olarak derleme zamanı varlığı olarak dahil eder.

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `pnpm start` | Metro bundler'ı başlat |
| `pnpm android` | Android'de derle ve çalıştır |
| `pnpm lint` | ESLint çalıştır |
| `pnpm format` | Prettier çalıştır |
| `pnpm doctor` | expo-doctor çalıştır |
| `pnpm fix` | Expo paket sürümü uyumsuzluklarını düzelt |

## Proje yapısı

```
app/
  _layout.tsx           # kök layout — QueryClient, GestureHandler, parse queue
  (tabs)/
    index.tsx           # makale listesi ekranı
    settings.tsx
  article/[id].tsx      # okuyucu ekranı
components/
  ArticleCard.tsx
  ArticleParser.tsx     # Readability'yi çalıştıran gizli WebView
  ReaderView.tsx
  SaveUrlSheet.tsx
  SwipeableArticleCard.tsx
lib/
  colors.ts             # tasarım token renkleri
  db.ts                 # SQLite şema + CRUD
  imageCache.ts         # görsel indirme + önbellekleme
  parser.ts             # fetchRawHtml + buildParserHtml
  parseQueue.tsx        # parse queue React context
  queryClient.ts
  sharedStyles.ts       # ekranlar arası paylaşılan stiller
  utils.ts              # getDomain, getReadTime
scripts/
  bundle-readability.js # postinstall'da Readability.js'i dahil eder
```

## Readability güncelleme

```bash
pnpm update @mozilla/readability
# postinstall lib/readabilitySource.ts dosyasını otomatik yeniden oluşturur
```

## Yol haritası

- [x] Faz 1 — Çevrimdışı çekirdek döngü
- [x] Faz 2 — Geliştirmeler (görsel önbellekleme, kaydırma hareketleri, sesli okuma, font boyutu, dil desteği)
- [ ] Faz 3 — FastAPI backend + JWT auth + delta sync
