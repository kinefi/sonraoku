[Türkçe](README.tr.md)

# Sonra Oku

A personal "read later" app for Android. Save article URLs, read them fully offline — no account, no cloud, no tracking.

## Features

- Save articles by URL with one tap
- Full offline reading — content and images cached on device
- Article parsing runs locally via Mozilla Readability (no external API)
- Persistent Highlights — select text in articles to save highlights with fuzzy-matching context
- Article Tagging — categorize your reading list with custom tags
- Integrated RSS Reader — follow your favorite blogs and news sites
- OPML Support — easy import and export of your feed subscriptions
- Read-aloud via device TTS with automatic language detection
- Swipe to archive or mark as read
- Background Sync — automatically check for new feed items (configurable interval)
- Favorite articles with dedicated filter and UI indicators
- Interactive Toast notifications with "Undo" support for deletions
- Accessibility-first design with High Contrast and Sepia themes including smooth transitions
- Adjustable font size (persisted across sessions)
- Turkish / English UI with hierarchical type-safe translation keys
- Background Sync — automatically check for new feed items (configurable interval)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 55 (React Native, TypeScript) |
| ORM | Drizzle ORM |
| Navigation | expo-router (file-based) |
| Local DB | expo-sqlite |
| State | TanStack Query |
| Parsing | @mozilla/readability in a hidden WebView |
| Image cache | expo-file-system |
| TTS | expo-speech |
| Gestures | react-native-gesture-handler |
| XML Parsing | fast-xml-parser (v5) |

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

## Database & Migrations

This project uses **Drizzle ORM** with **Drizzle Kit** for schema management.

1. **Modify Schema**: Update `lib/db/schema.ts`.
2. **Generate Migration**: Run `pnpm db:generate` to create a new SQL migration in the `drizzle/` folder.
3. **Apply**: Migrations are applied automatically at runtime when the app starts via the `initDb()` function in `lib/db/config.ts`.

## Architecture

**Offline-first.** SQLite is the single source of truth — all reads come from the local database.

**Parsing flow:**
1. User saves a URL → article row inserted immediately (optimistic write)
2. Raw HTML fetched with a browser User-Agent
3. HTML injected into a hidden WebView alongside Readability.js
4. Readability extracts title, content, excerpt, and language
5. Images downloaded and cached locally via expo-file-system
6. WebView is unmounted

**Highlighting flow:**
1. User selects text in the Reader WebView
2. JS captures the text along with 50 characters of surrounding context (before/after)
3. Data is persisted to SQLite; on reload, a fuzzy-matching algorithm uses the context to re-apply highlights even if the underlying HTML structure has slightly shifted

**RSS Sync flow:**
1. App fetches XML feed data via standard `fetch()`
2. Feed is parsed and new items are inserted into SQLite using optimized batch inserts
3. Background tasks (via `expo-background-fetch`) trigger periodic syncs without waking the UI
4. Users can choose to "Save Offline" specific feed items, triggering the Article parsing flow above
5. OPML backups are generated as `.xml` files and shared via the native Android sharing intent

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
- [x] Phase 2 — Polish (image cache, highlights, tagging, RSS, swipe gestures, TTS, i18n, favorites, notifications)
- [x] Versioning & Tagging system
- [ ] Phase 3 — FastAPI backend + JWT auth + delta sync
