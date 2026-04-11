import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('sonraoku.db');

// Initialize schema at module load — safe because native module is ready by this point
db.execSync(`
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
`);

export type Article = {
  id: string;
  url: string;
  title: string | null;
  excerpt: string | null;
  html_content: string | null;
  is_read: number;
  is_archived: number;
  saved_at: number;
  updated_at: number;
  synced_at: number | null;
};

export function insertArticle(id: string, url: string): void {
  const now = Date.now();
  db.runSync(`INSERT INTO articles (id, url, saved_at, updated_at) VALUES (?, ?, ?, ?)`, [
    id,
    url,
    now,
    now,
  ]);
}

export function updateArticleContent(
  id: string,
  title: string,
  excerpt: string,
  htmlContent: string
): void {
  db.runSync(
    `UPDATE articles SET title = ?, excerpt = ?, html_content = ?, updated_at = ? WHERE id = ?`,
    [title, excerpt, htmlContent, Date.now(), id]
  );
}

export function getAllArticles(): Article[] {
  return db.getAllSync<Article>('SELECT * FROM articles ORDER BY saved_at DESC');
}

export function getArticleById(id: string): Article | null {
  return db.getFirstSync<Article>('SELECT * FROM articles WHERE id = ?', [id]);
}

export function markArticleRead(id: string): void {
  db.runSync('UPDATE articles SET is_read = 1, updated_at = ? WHERE id = ?', [Date.now(), id]);
}

export function markArticleUnread(id: string): void {
  db.runSync('UPDATE articles SET is_read = 0, updated_at = ? WHERE id = ?', [Date.now(), id]);
}

export function archiveArticle(id: string): void {
  db.runSync('UPDATE articles SET is_archived = 1, updated_at = ? WHERE id = ?', [Date.now(), id]);
}
