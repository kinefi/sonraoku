# Sonra Oku App — Project Brief

This file gives you full context on architecture decisions made before this session.
Read it entirely before writing any code.

---

## What this app is

A personal "read later" Android app built with Expo. Users save article URLs, the app
fetches and parses the article content locally, and stores it for offline reading.
A FastAPI backend will be added later for cross-device sync — but the app must be
fully functional offline-first without it.

---

## Tech stack

### Mobile (primary focus now)

- **Expo SDK 55** (TypeScript, file-based routing via expo-router, pnpm)
- **Expo SQLite** — local database, single source of truth
- **TanStack Query (React Query)** — server state, optimistic updates, mutation queue
- **react-native-webview** — hidden WebView for article parsing (see parser section)
- **@mozilla/readability** — article parsing library (runs inside the hidden WebView); source inlined at build time via `scripts/bundle-readability.js` (runs on `postinstall`)
- **react-native-render-html** — renders parsed article HTML in the reader screen
- **expo-file-system** — caches article images locally for true offline reading
- **expo-speech** — read aloud via device TTS, works offline
- **react-native-gesture-handler + react-native-reanimated** — swipe gestures on article cards
- **@react-native-async-storage/async-storage** — persists reader font size preference
- **expo-background-fetch + expo-task-manager** — background sync (Phase 3, not yet implemented)
- **ESLint** (`eslint-config-expo`) + **Prettier** — linting and formatting

### Backend (Phase 3 — not yet built)

- FastAPI + PostgreSQL + SQLAlchemy (async)
- Celery + Redis for async parse jobs
- trafilatura or newspaper4k for server-side article parsing
- JWT auth
- Delta sync via `updated_at` timestamp

---

## Project file structure

```
app/
  _layout.tsx          # root layout — QueryClient, GestureHandler, parse queue
  (tabs)/
    _layout.tsx        # bottom tab navigator
    index.tsx          # article list screen
    settings.tsx
  article/[id].tsx     # reader screen
components/
  ArticleCard.tsx      # card used in list screen
  ArticleParser.tsx    # hidden WebView that runs Readability
  ReaderView.tsx       # renders article HTML
  SaveUrlSheet.tsx     # bottom sheet triggered by FAB
  SwipeableArticleCard.tsx  # wraps ArticleCard with swipe-to-archive/read
lib/
  db.ts               # SQLite setup, schema, CRUD helpers
  imageCache.ts       # downloads + caches article images via expo-file-system
  parseQueue.tsx      # React context for the article parse queue
  parser.ts           # fetchRawHtml + buildParserHtml
  queryClient.ts      # TanStack Query client setup
  readabilitySource.ts  # AUTO-GENERATED — do not edit (see scripts/bundle-readability.js)
  sync.ts             # sync engine (placeholder for Phase 3)
scripts/
  bundle-readability.js  # inlines Readability.js as a TS string (runs on postinstall)
```

---

## SQLite schema

```sql
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  excerpt TEXT,
  html_content TEXT,
  is_read INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  saved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER
);

CREATE TABLE IF NOT EXISTS cached_images (
  url TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  article_id TEXT NOT NULL
);
```

---

## Article parsing approach

**No external API.** Parsing runs fully locally using `@mozilla/readability` inside a
hidden `react-native-webview`. This avoids Hermes/jsdom compatibility issues.

Flow:

1. User submits a URL
2. `fetchRawHtml(url)` fetches raw HTML via `fetch()` with a browser User-Agent header
3. `buildParserHtml(rawHtml, url)` injects Readability.js + the raw HTML into a minimal HTML page
4. A hidden `<WebView>` mounts, runs the script, and calls `window.ReactNativeWebView.postMessage()`
5. The result (`{ title, content, excerpt }`) is received via `onMessage` and saved to SQLite
6. The WebView is unmounted after parsing completes
7. Images in the HTML are downloaded and cached locally via expo-file-system

**Fallback:** if parsing yields no content (paywalled, JS-rendered SPA), show a
"open in browser" button — never crash or show a blank reader.

---

## Offline-first architecture

- SQLite is the single source of truth — all reads come from local DB
- Optimistic writes: save to SQLite immediately on URL submission, sync to backend later
- Unsynced articles tracked via `synced_at IS NULL OR updated_at > synced_at`
- Images stored at: `{Paths.document}/images/{articleId}/` (expo-file-system v55 API)
- Green dot indicator in UI = article fully cached (content + images)

---

## UI design decisions

### List screen

- Article cards show: domain, title, excerpt, time saved, read time estimate, read/unread badge
- Green dot on card = offline-ready (content + images cached)
- Read articles are dimmed (opacity 0.65)
- Filter chips: All / Unread / Offline / Archived
- FAB (purple +) opens SaveUrlSheet bottom sheet
- Bottom nav: List / Archive / Recent / Profile

### Reader screen

- Thin purple progress bar at top tracks scroll position
- Back button returns to list
- Top-right actions: bookmark, share, options
- Domain + "saved offline" indicator below nav
- Font size controls (A− / A+) in bottom bar
- Estimated reading time remaining shown bottom-right
- Blockquotes styled with left purple border accent

### Design language

- Primary accent: `#534AB7` (purple)
- Offline indicator: `#1D9E75` (teal/green dot)
- Clean, minimal — content-first, no heavy chrome
- No gradients, no shadows

---

## Build phases

### Phase 1 — Core loop (offline-only, no backend)

- [x] `lib/db.ts` — SQLite schema + CRUD helpers
- [x] `lib/parser.ts` — fetchRawHtml + buildParserHtml
- [x] `components/ArticleParser.tsx` — hidden WebView component
- [x] `app/(tabs)/index.tsx` — article list reading from SQLite
- [x] `app/article/[id].tsx` — reader view with react-native-render-html
- [x] ESLint + Prettier setup

### Phase 2 — Polish

- [x] Image caching via expo-file-system
- [x] Font size preference persisted via AsyncStorage
- [x] Read aloud via expo-speech (device TTS, works offline)
- [x] Swipe gestures (archive, mark read/unread)
- [x] SaveUrlSheet bottom sheet
- [x] Parse failure fallback UI

### Phase 3 — Backend sync

- [ ] FastAPI + PostgreSQL (Docker Compose)
- [ ] Move parsing to backend
- [ ] JWT auth
- [ ] Delta sync endpoint + sync engine

---

## Key constraints

- Android only (no iOS considerations needed)
- No Mercury Parser or any paid/external parsing API
- App must be fully usable with no network connection
- Backend is a future concern — do not block Phase 1 on it
- Prefer concise, readable TypeScript — no over-engineering
- Use functional components + hooks throughout
