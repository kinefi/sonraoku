[Türkçe](README.tr.md)

# Sonra Oku

A personal "read later" app for Android. Save article URLs, read them fully offline — no account, no cloud, no tracking.

## Features

- Save articles by URL with one tap
- Full offline reading — content and images cached on device
- Article parsing runs locally via Mozilla Readability (no external API)
- Read-aloud via device TTS with automatic language detection
- Swipe to archive or mark as read
- Adjustable font size (persisted across sessions)
- Turkish / English UI

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 55 (React Native, TypeScript) |
| Navigation | expo-router (file-based) |
| Local DB | expo-sqlite |
| State | TanStack Query |
| Parsing | @mozilla/readability in a hidden WebView |
| Image cache | expo-file-system |
| TTS | expo-speech |
| Gestures | react-native-gesture-handler |

## Getting Started

**Prerequisites:** Node.js 18+, pnpm, Android device or emulator

```bash
pnpm install
pnpm android        # build and run on connected device/emulator
# or
pnpm start          # start Metro, scan QR with Expo Go
```

## Commands

| Command | Description |
|---|---|
| `pnpm start` | Start Metro bundler |
| `pnpm android` | Build and run on Android |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Run Prettier |
| `pnpm doctor` | Run expo-doctor |
| `pnpm fix` | Fix Expo package version mismatches |

## Architecture

**Offline-first.** SQLite is the single source of truth — all reads come from the local database.

**Parsing flow:**
1. User saves a URL → article row inserted immediately (optimistic write)
2. Raw HTML fetched with a browser User-Agent
3. HTML injected into a hidden WebView alongside Readability.js
4. Readability extracts title, content, excerpt, and language
5. Images downloaded and cached locally via expo-file-system
6. WebView is unmounted

**No external parsing API.** Readability.js is bundled via a custom Metro transformer — no postinstall script, no generated files.

## Project Structure

```
app/              expo-router screens and layouts
components/       reusable UI components
lib/              db, parser, i18n, image cache, query client
scripts/          Metro transformer for Readability.js
types/            ambient TypeScript declarations
```

## Roadmap

- [x] Phase 1 — Offline core loop
- [x] Phase 2 — Polish (image cache, swipe gestures, TTS, font size, i18n)
- [ ] Phase 3 — FastAPI backend + JWT auth + delta sync
