# Sonra Oku App — Project Brief

This file gives you full context on architecture decisions made before this session.
Read it entirely before writing any code.

---

## What this app is

A personal "read later" Android app built with Expo, targeting Turkish users. Users save
article URLs, the app fetches and parses the article content locally, and stores it for
offline reading. A FastAPI backend will be added later for cross-device sync — but the
app must be fully functional offline-first without it.

**Language:** All user-facing strings must go through the i18n system (`lib/translations.ts`).
The app supports Turkish and English with an in-app language switcher in settings.

---

## Tech stack

### Mobile (primary focus now)

- **Expo SDK 55** (TypeScript, file-based routing via expo-router, pnpm)
- **Drizzle ORM + Expo SQLite** — local database, single source of truth; schema-first with automated migrations via `drizzle-kit`
- **TanStack Query (React Query)** — server state, optimistic updates, mutation queue
- **react-native-webview** — hidden WebView for article parsing (see parser section)
- **@mozilla/readability** — article parsing library (runs inside the hidden WebView); source
  served as a raw string module via a custom Metro transformer (`scripts/rawStringTransformer.js`)
  hooked into `metro.config.js` — no postinstall script, no generated file
- **react-native-render-html** — renders parsed article HTML in the reader screen
- **expo-file-system** — caches article images locally for true offline reading
- **expo-speech** — read aloud via device TTS, works offline; language detected from article `lang` attribute
- **react-native-gesture-handler + react-native-reanimated** — swipe gestures on article cards (`Swipeable` — `ReanimatedSwipeable` is incompatible with SDK 55, do not upgrade)
- **@react-native-async-storage/async-storage** — persists reader font size preference and
  selected UI language (`'reader_font_size'` and `'app_language'` keys)
- **expo-background-fetch + expo-task-manager** — background sync (Phase 3, not yet implemented)
- **expo-clipboard** — copies highlights to device clipboard
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
  _layout.tsx          # root layout — QueryClient, GestureHandler, parse queue, DB init
  (tabs)/
    _layout.tsx        # bottom tab navigator
    index.tsx          # article list screen
    tags.tsx           # browse articles by tags
    highlights.tsx     # global feed of all highlights
    settings.tsx       # language + font size settings
  article/[id].tsx     # reader screen
components/
  ArticleCard.tsx      # card used in list screen
  ArticleParser.tsx    # hidden WebView that runs Readability
  ArticleMetaHeader.tsx # reader screen header
  ArticleFallback.tsx  # empty/error state for reader
  ReaderView.tsx       # renders article HTML via WebView
  ReaderFabPill.tsx    # floating actions in reader
  SwipeableArticleCard.tsx # wraps ArticleCard with swipe gestures
  HighlightsModal.tsx
  TagsModal.tsx
  SaveUrlSheet.tsx
  SearchBar.tsx
  FabGroup.tsx
lib/
  db.ts                # Database connection, migration runner, and CRUD helpers
  schema.ts            # Drizzle ORM table and relation definitions
  utils.ts             # shared helpers (domain, read time, fetchRawHtml)
  translations.ts      # TR/EN strings and interpolation logic
  languageContext.tsx  # LanguageProvider + useLanguage hook (translate helper)
  hooks.ts             # Custom hooks for managing app-wide settings (e.g., font size, highlight color, cache)
  imageCache.ts        # Downloads + local caching of article images
  parseQueue.tsx       # React context for background article parsing
  queryClient.ts       # TanStack Query configuration
  theme.ts             # Design tokens (colors, shared styles, highlights)
  readerAssets.ts      # CSS and JS injected into the reader WebView
  htmlBuilder.ts       # Builder for the parser WebView
  constants.ts         # Global keys (Storage, etc)
scripts/
  rawStringTransformer.js  # Serves @mozilla/readability/Readability.js as raw string
drizzle/               # Generated SQL migrations and metadata
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
  lang TEXT,
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

CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  context_before TEXT NOT NULL,
  context_after TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS article_tags (
  article_id TEXT,
  tag_id TEXT,
  PRIMARY KEY (article_id, tag_id)
);
```

`lang` was added as a migration — existing installs are handled via `pragma_table_info` check on startup.

**Important:** `db.ts` exports `initDb()` which must be called once on app start (inside a
`useEffect` in `app/_layout.tsx`). Schema creation and migrations are inside `initDb()` so
that any failure is caught and does not prevent the splash screen from dismissing.

---

## Article parsing approach

**No external API.** Parsing runs fully locally using `@mozilla/readability` inside a
hidden `react-native-webview`. This avoids Hermes/jsdom compatibility issues.

Flow:

1. User submits a URL
2. `fetchRawHtml(url)` fetches raw HTML via `fetch()` with a browser User-Agent header
3. `buildParserHtml(rawHtml, url)` strips `<script>`, `<style>`, `<link>`, `<noscript>` tags to reduce size, then injects Readability.js + the stripped HTML into a minimal HTML page
4. A hidden `<WebView>` mounts, runs the script, and calls `window.ReactNativeWebView.postMessage()`
5. The result (`{ title, content, excerpt, lang }`) is received via `onMessage` and saved to SQLite; `lang` comes from `doc.documentElement.lang`
6. The WebView is unmounted after parsing completes
7. Images in the HTML are downloaded and cached locally via expo-file-system

**Timeouts:** 20s for WebView load + 15s reset on `onLoadEnd` for Readability execution.

**Retry:** failed parses are re-queued up to 2 times (`MAX_PARSE_RETRIES` in `_layout.tsx`).

**Fallback:** if parsing yields no content (paywalled, JS-rendered SPA), show a
"Tarayıcıda Aç" button — never crash or show a blank reader.

**Readability.js bundling:** `scripts/rawStringTransformer.js` is registered as Metro's
`babelTransformerPath` in `metro.config.js`. It intercepts the import of
`@mozilla/readability/Readability.js` and returns the file contents as a raw string module,
avoiding the need for a postinstall script or a generated source file.

---

## i18n

All user-facing strings live in `lib/translations.ts` as two typed translation objects (`tr`, `en`).
Parameterized strings use `{key}` placeholders (e.g., `readTime: '{m} min read'`).
`lib/languageContext.tsx` provides `useLanguage()` which returns `{ lang, setLang, t, translate, isReady }`.

- `t` is the full translation object for the active language — use it everywhere instead of hardcoded strings
- `translate(key, params)` handles string interpolation for parameterized values
- Language is persisted to AsyncStorage under the key defined in `STORAGE_KEYS.LANGUAGE`
- Default language is `'tr'` (Turkish)

---

## Offline-first architecture

- SQLite is the single source of truth — all reads come from local DB
- Optimistic writes: save to SQLite immediately on URL submission, sync to backend later
- Unsynced articles tracked via `synced_at IS NULL OR updated_at > synced_at`
- Images stored at: `{Paths.document}/images/{articleId}/` (expo-file-system v55 API)
- Green dot indicator in UI = article fully cached (content + images)

---

## UI design decisions

### Design language

- Primary accent: `colors.primary` (`#534AB7`, purple)
- Active/pressed primary: `colors.primaryDark` (`#3f369f`)
- Offline indicator: `colors.success` (`#1D9E75`, green dot)
- Error/archive: `colors.error` (`#e53e3e`)
- Use `useTheme()` hook for dynamic colors (supports light/dark mode transitions).
- Support for 'Sepia' and 'High Contrast' accessibility themes.
- Wrap `StyleSheet.create` in `useMemo` and integrate `sharedStyles(colors)` to maintain consistent, responsive layouts.
- All color values must use `lib/theme.ts` tokens; never write hex codes directly in components.
- Clean, minimal — content-first, no heavy chrome
- Centralized `IconButton` component for consistent interactions and accessibility properties.
- No gradients; minimal elevation/shadow only on floating elements (FAB, modal dropdowns)

### List screen

- Article cards show: domain, title, excerpt, time saved, read time estimate, unread dot
- Green dot on card = offline-ready (content + images cached)
- Purple dot = unread
- Read articles are dimmed (opacity 0.65)
- Filter chips: Tümü / Okunmamış / Çevrimdışı / Arşivlenmiş (labels from `t.*`)
- FAB (purple +) opens SaveUrlSheet bottom sheet

### Reader screen

- Thin purple progress bar at top tracks scroll position
- Back button returns to list
- Domain + çevrimdışı indicator below nav
- Font size controls (A− / A+) in bottom bar, disabled at min/max limits (12–36pt)
- Font size persisted to AsyncStorage key `'reader_font_size'`; default 16pt
- Read aloud (expo-speech) splits text into ≤4000 char chunks; uses article `lang` for TTS language, falls back to `'tr'`
- Swipe actions include accessibility hints and announcements for screen reader users.
- Blockquotes styled with left purple border accent

---

## Build phases

### Phase 1 — Core loop (offline-only, no backend)

- [x] `lib/db.ts` — SQLite schema + CRUD helpers
- [x] `lib/utils.ts` — fetchRawHtml + buildParserHtml
- [x] `components/ArticleParser.tsx` — hidden WebView component
- [x] `app/(tabs)/index.tsx` — article list reading from SQLite
- [x] `app/article/[id].tsx` — reader view with react-native-render-html
- [x] ESLint + Prettier setup

### Phase 2 — Polish

- [x] Image caching via expo-file-system
- [x] Font size preference persisted via AsyncStorage
- [x] Read aloud via expo-speech with chunking + language detection
- [x] Swipe gestures (archive/unarchive, mark read/unread)
- [x] SaveUrlSheet bottom sheet (non-blocking: sheet closes before fetch, fetch queues in background)
- [x] Parse failure fallback UI with retry button
- [x] Parse retry logic (up to 2 retries on failure)
- [x] Shared design tokens (`lib/theme.ts`) — all hex codes banned from components
- [x] i18n support — Turkish/English with in-app language switcher (`lib/translations.ts`, `lib/languageContext.tsx`)
- [x] Default font size setting in settings screen
- [x] Metro transformer for Readability.js (replaces postinstall script)
- [x] DB initialization moved to `useEffect` to prevent splash screen freeze
- [X] Article search functionality to filter articles
- [X] Show only 20 recent articles in list and load more when list pulled down
- [X] Add article tagging mechanism
- [x] Storage usage monitoring and cache clearing in settings
- [x] Add git tag and versioning mechanism (commit-and-tag-version)
- [ ] Add notifications for relevant operations and errors
- [ ] Favorite articles and listing them with a filter

### Phase 3 — Backend sync

- [ ] Expo routers backend or from Google ecosystem like firebase for simple backend? Let's plan first.
- [ ] Move parsing to backend
- [ ] JWT auth
- [ ] Delta sync endpoint + sync engine

---

## Key constraints

- Android only (no iOS considerations needed)
- All user-facing strings must use `lib/i18n.ts` — never hardcode display strings
- No Mercury Parser or any paid/external parsing API
- App must be fully usable with no network connection
- Backend is a future concern — do not block Phase 1 on it
- Follow Rule of Hooks strictly: initialize all hooks at the top level before any conditional returns.
- Prefer concise, readable TypeScript — no over-engineering
- Use functional components + hooks throughout
- Do not use `ReanimatedSwipeable` — incompatible with current SDK 55 setup
- Never write hex color codes directly in components — always use `lib/theme.ts` tokens
