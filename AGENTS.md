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
- **react-native-gesture-handler** — swipe gestures on article cards (`Swipeable`)
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
    _layout.tsx        # Bottom tab navigator
    index.tsx          # Article list screen
    tags.tsx           # Browse articles by tags
    highlights.tsx     # Global feed of all highlights
    settings.tsx       # App settings
  article/[id].tsx     # reader screen
components/            # UI Components (exported via index.ts barrel)
  index.ts             # Public API for all components
  ArticleCard.tsx, ArticleParser.tsx, ReaderView.tsx, etc.
lib/
  db/                  # Data Layer (Drizzle + SQLite)
    index.ts           # Barrel export (config, schema, articles, highlights, tags)
    schema.ts          # Table definitions
    config.ts          # Initialization & migrations
    types.ts           # Domain & Result types
    articles.ts, highlights.ts, tags.ts # Domain services
  reader/              # Reader & Parser Logic
    index.ts           # Barrel export
    readerAssets.ts    # WebView CSS/JS & HTML building
    imageCache.ts      # Image caching logic
    parseQueue.tsx     # Background job context
    useReaderSelection.ts, useArticleParser.ts # Logic hooks
    ...
  language/            # i18n & Localization
    index.ts           # Barrel export
    tr.ts, en.ts       # Hierarchical translation files
    translations.ts, context.tsx # Interpolation logic & context
  theme/               # Design System (colors, shared styles, useTheme)
  toast/               # Toast notification context
  utils.ts             # Shared helpers (domain, read time, etc.)
  constants.ts         # Global keys and constants
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
  is_favorite INTEGER DEFAULT 0,
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
- Persistent status dots on the right: Unread (purple), Favorite (red), Offline (green).
- Inactive/off states for dots are shown in gray (`colors.border`).
- Read articles are dimmed (opacity 0.65).
- Filter chips: Tümü / Okunmamış / Çevrimdışı / Arşivlenmiş (labels from `t.*`)
- Filter chips are in a horizontal scrollable row to prevent overflow.
- FAB (purple +) opens SaveUrlSheet bottom sheet

### Reader screen

- Thin purple progress bar at top tracks scroll position
- Back button, Refresh, Favorite, Highlights, Tags, Speech, and Share actions are in a horizontal scrolling bottom "pill".
- Reading progress percentage and Font size controls (A− / A+) are in a dedicated vertical floating FAB on the right side.
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
- [x] Article search functionality to filter articles
- [x] Show only 20 recent articles in list and load more when list pulled down
- [x] Add article tagging mechanism
- [x] Storage usage monitoring and cache clearing in settings
- [x] Add git tag and versioning mechanism (commit-and-tag-version)
- [x] Add notifications for relevant operations and errors
- [x] Favorite articles and listing them with a filter
- [x] Persistent Highlighting system with context-based fuzzy matching

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
- Do not use swipe implementations that require `react-native-reanimated` or `ReanimatedSwipeable` — incompatible with current SDK 55 setup
- Never write hex color codes directly in components — always use `lib/theme.ts` tokens

### Coding Standards & Import Strategy
- **SOLID Principles:**
  - **SRP (Single Responsibility):** Hooks and modules must have one primary job. Split hardware logic (Speech), UI state (Settings), and domain actions (CRUD) into distinct hooks (e.g., `useArticleSpeech` vs `useArticleSettings`).
  - **OCP (Open/Closed):** Themes and translations are open for extension but closed for modification.
  - **LSP/ISP:** Keep hook interfaces small and specific.
  - **DIP (Dependency Inversion):** Use TanStack Query as the abstraction layer between the UI and the Database.
- **Absolute Paths:** Always use the `@/` alias for internal imports (e.g., `@/lib/db`, `@/components`).
- **Barrel Exports:** Import from directory roots rather than specific files (e.g., `import { useTheme } from '@/lib/theme'` instead of `../lib/theme/useTheme`).
- **No Circular Imports:** Avoid cyclic references. Within the `components/` directory, always use the `@/` absolute alias to target specific files (e.g., `@/components/common/IconButton`) instead of importing from the root `@/components` barrel to prevent circular dependencies.
- **Service Layer Separation:** Database modules (`lib/db/*.ts`) should focus on raw CRUD and transactions. Complex orchestration (like OPML worker pools or multi-step validation) should reside in the `lib/reader/` or a dedicated service layer to keep the DB layer lean.
- **i18n:** Use `translate('key', { param: value })` from `useLanguage()` for all strings requiring interpolation.
- **Styles:** Wrap `StyleSheet.create` in `useMemo` and always spread `sharedStyles(colors)` to maintain theme consistency.
- **Data Safety:** Use `sanitizeSqlString(s)` for all parsed web content before saving to SQLite to prevent null-byte crashes.
- **UI Transitions:** Use `useThemeTransition(targetColor)` on root containers for smooth background animations during theme swaps.
- **Single Source of Truth:** The SQLite database is the ultimate authority. UI state should reflect the DB via TanStack Query invalidation rather than maintaining local parallel state for domain data.
- **Naming Conventions:**
  - Prefix boolean variables/props with `is`, `has`, `should`, or `can` (e.g., `isSyncing`, `hasError`).
  - Use descriptive action verbs for functions (e.g., `handleArchiveArticle` instead of `archive`).
- **Readability & Guard Clauses:** Use early returns (guard clauses) to handle edge cases and errors at the start of functions, reducing indentation levels and cognitive load.
- **Side-Effect Management:** Every `useEffect` that creates a subscription, interval, or event listener must provide a cleanup function in its return statement to prevent memory leaks.

### Architectural Best Practices
- **Component-Based Architecture (Expo):** Leverage functional components and hooks. Keep components atomic and reusable. UI components in `components/` should be decoupled from specific routes where possible.
  - **Modularization:** Aim to keep components under 250 lines. If a component exceeds this, extract logical parts into custom hooks or UI parts into sub-components in the same directory.
- **State Management (Context API vs. Query):** 
  - Use **TanStack Query** for all domain/server data (articles, RSS items, tags).
  - Use **Context API** for global UI state or cross-cutting concerns (Toast, i18n, Theme, Parse Queue).
  - Use local `useState` for transient UI state (modals, search queries).
- **TypeScript for Type Safety:** Maintain strict typing. Utilize Drizzle's `$inferSelect` for domain models. Avoid `any` at all costs. Ensure translation keys are hierarchical and type-safe.
- **Performance Optimization:** Memoize expensive calculations and style objects. Use `useDeduplicatedInfiniteData` for infinite lists to handle background data shifts without duplicate key warnings.
- **Authentication & Security (Phase 3 Prep):** When implementing auth, use `expo-secure-store` for JWTs. Maintain SQL injection prevention via Drizzle's parameterization and the `sanitizeSqlString` utility.
- **Navigation Architecture:** Use **Expo Router** for file-based routing. Pass minimal data (IDs) through route parameters; components should fetch the required data from the single source of truth (DB) using those IDs.
