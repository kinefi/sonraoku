# sonraoku

A personal read-later Android app built with Expo. Save article URLs, read them offline — no account required, no external parsing API.

## Features

- Save any article URL and read it offline
- Article content parsed locally via [@mozilla/readability](https://github.com/mozilla/readability) (no external API)
- Images downloaded and cached for true offline reading
- Read aloud using device TTS (works offline)
- Swipe to archive or mark as read/unread
- Font size preference persisted across sessions
- Filter by All / Unread / Offline / Archived

## Tech stack

- **Expo SDK 55** — React Native, TypeScript, expo-router
- **Expo SQLite** — local database, single source of truth
- **TanStack Query** — state management and cache invalidation
- **react-native-webview** — runs Readability.js in a hidden WebView
- **react-native-gesture-handler + reanimated** — swipe gestures
- **expo-file-system** — image caching
- **expo-speech** — read aloud

## Getting started

**Prerequisites:** Node.js, pnpm, Android device with USB debugging enabled (or Android emulator)

```bash
pnpm install
pnpm android
```

> `pnpm install` automatically inlines `@mozilla/readability` as a build-time asset via `scripts/bundle-readability.js`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Metro bundler |
| `pnpm android` | Build and run on Android |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Run Prettier |
| `pnpm doctor` | Run expo-doctor |
| `pnpm fix` | Fix Expo package version mismatches |

## Project structure

```
app/
  _layout.tsx           # root layout — QueryClient, GestureHandler, parse queue
  (tabs)/
    index.tsx           # article list screen
    settings.tsx
  article/[id].tsx      # reader screen
components/
  ArticleCard.tsx
  ArticleParser.tsx     # hidden WebView that runs Readability
  ReaderView.tsx
  SaveUrlSheet.tsx
  SwipeableArticleCard.tsx
lib/
  db.ts                 # SQLite schema + CRUD
  imageCache.ts         # image downloading + caching
  parser.ts             # fetchRawHtml + buildParserHtml
  parseQueue.tsx        # React context for parse queue
  queryClient.ts
scripts/
  bundle-readability.js # inlines Readability.js on postinstall
```

## Updating Readability

```bash
pnpm update @mozilla/readability
# postinstall re-generates lib/readabilitySource.ts automatically
```

## Roadmap

- [x] Phase 1 — Offline core loop
- [x] Phase 2 — Polish (image caching, swipe gestures, read aloud, font size)
- [ ] Phase 3 — FastAPI backend + JWT auth + delta sync
