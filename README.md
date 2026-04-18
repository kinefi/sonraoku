[Türkçe](README.tr.md)

# Sonra Oku

A personal "read later" app for Android. Save article URLs, read them fully offline — no account, no cloud, no tracking.

## Features

- Save articles by URL with one tap
- Full offline reading — content and images cached on device
- Article parsing runs locally via Mozilla Readability (no external API)
- Read-aloud via device TTS with automatic language detection
- Swipe to archive or mark as read
- Accessibility-first design with High Contrast and Sepia themes
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

## Development Environment Setup

### Prerequisites & Tools
- **nvm**: Version manager for Node.js. [nvm-sh/nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows).
- **Node.js**: Required 18+, recommended 22. Install via nvm: `nvm install 22`.
- **pnpm**: Fast, disk space efficient package manager. Run `npm install -g pnpm` or `corepack enable`.
- **[Android Studio](https://developer.android.com/studio)**: Required for Android SDK, platform tools, and emulators..

```bash
# 1. Clone the repository
git clone https://github.com/kinefi/sonraoku.git
cd sonraoku

# 2. Install dependencies
pnpm install

# 3. Generate local database migrations
pnpm db:generate

# 4. Run on Android device or emulator
pnpm android
# or
pnpm start          # start Metro, scan QR with Expo Go
```

## Commands

| Command | Description |
|---|---|
| `pnpm start` | Start Metro bundler |
| `pnpm android` | Build and run on Android |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript check |
| `pnpm format` | Run Prettier |
| `pnpm doctor` | Run expo-doctor |
| `pnpm audit` | Check for security vulnerabilities |
| `pnpm fix` | Fix Expo package version mismatches |
| `pnpm release` | Bump version and generate changelog |

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

## Versioning & Tags

This project uses `commit-and-tag-version` for automated version management.

1. Finalize and commit your changes.
2. Run `pnpm release` to bump the version and create a git tag.
3. Push your changes and tags to the remote repository:
   ```bash
   git push --follow-tags
   ```

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
- [x] Versioning & Tagging system
- [ ] Phase 3 — FastAPI backend + JWT auth + delta sync
