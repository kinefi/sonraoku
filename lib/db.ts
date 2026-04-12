import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

const db = SQLite.openDatabaseSync('sonraoku.db');

export function initDb(): void {
  db.execSync(`CREATE TABLE IF NOT EXISTS articles (
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
)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS cached_images (
  url TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  article_id TEXT NOT NULL
)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  context_before TEXT NOT NULL,
  context_after TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE
)`);

  db.execSync(`CREATE TABLE IF NOT EXISTS article_tags (
  article_id TEXT,
  tag_id TEXT,
  PRIMARY KEY (article_id, tag_id)
)`);

  // Migration: add lang column to existing installs
  const langColumnExists = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pragma_table_info('articles') WHERE name = 'lang'"
  );
  if (!langColumnExists?.count) {
    db.execSync('ALTER TABLE articles ADD COLUMN lang TEXT');
  }

  // Migration: drop color column from highlights (color is now a display-only preference)
  const highlightColorExists = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pragma_table_info('highlights') WHERE name = 'color'"
  );
  if (highlightColorExists?.count) {
    db.execSync(`CREATE TABLE highlights_new (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      selected_text TEXT NOT NULL,
      context_before TEXT NOT NULL,
      context_after TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    db.execSync(`INSERT INTO highlights_new SELECT id, article_id, selected_text, context_before, context_after, created_at FROM highlights`);
    db.execSync(`DROP TABLE highlights`);
    db.execSync(`ALTER TABLE highlights_new RENAME TO highlights`);
  }
}

export type Article = {
  id: string;
  url: string;
  title: string | null;
  excerpt: string | null;
  html_content: string | null;
  lang: string | null;
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

function stripNulls(s: string): string {
  return s.replace(/\0/g, '');
}

export function updateArticleContent(
  id: string,
  title: string,
  excerpt: string,
  htmlContent: string,
  lang: string
): void {
  db.runSync(
    `UPDATE articles SET title = ?, excerpt = ?, html_content = ?, lang = ?, updated_at = ? WHERE id = ?`,
    [stripNulls(title), stripNulls(excerpt), stripNulls(htmlContent), lang || null, Date.now(), id]
  );
}

export function getAllArticles(): Article[] {
  return db.getAllSync<Article>('SELECT * FROM articles ORDER BY saved_at DESC');
}

export function getArticles(
  limit: number,
  offset: number,
  filter: string,
  searchQuery: string,
  tagName?: string
): Article[] {
  let query = 'SELECT * FROM articles';
  const params: (string | number)[] = [];
  const whereClauses: string[] = [];

  if (filter === 'archived') {
    whereClauses.push('is_archived = 1');
  } else {
    whereClauses.push('is_archived = 0');
    if (filter === 'unread') whereClauses.push('is_read = 0');
    if (filter === 'offline') whereClauses.push('html_content IS NOT NULL');
  }

  if (searchQuery.trim()) {
    whereClauses.push(`(
      title LIKE ? OR 
      url LIKE ? OR 
      excerpt LIKE ? OR 
      id IN (SELECT article_id FROM article_tags JOIN tags ON article_tags.tag_id = tags.id WHERE tags.name LIKE ?)
    )`);
    const q = `%${searchQuery.trim()}%`;
    params.push(q, q, q, q);
  }

  if (tagName) {
    whereClauses.push(`id IN (SELECT article_id FROM article_tags WHERE tag_id = (SELECT id FROM tags WHERE name = ?))`);
    params.push(tagName.toLowerCase());
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY saved_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.getAllSync<Article>(query, params);
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

export function archiveAllReadArticles(): void {
  db.runSync('UPDATE articles SET is_archived = 1, updated_at = ? WHERE is_read = 1 AND is_archived = 0', [Date.now()]);
}

export function unarchiveArticle(id: string): void {
  db.runSync('UPDATE articles SET is_archived = 0, updated_at = ? WHERE id = ?', [Date.now(), id]);
}

export type Highlight = {
  id: string;
  article_id: string;
  selected_text: string;
  context_before: string;
  context_after: string;
  created_at: number;
};

export function getHighlightsByArticle(articleId: string): Highlight[] {
  return db.getAllSync<Highlight>(
    'SELECT * FROM highlights WHERE article_id = ? ORDER BY created_at ASC',
    [articleId]
  );
}

export function insertHighlight(
  id: string,
  articleId: string,
  selectedText: string,
  contextBefore: string,
  contextAfter: string
): void {
  db.runSync(
    `INSERT INTO highlights (id, article_id, selected_text, context_before, context_after, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, articleId, selectedText, contextBefore, contextAfter, Date.now()]
  );
}

export function deleteHighlight(id: string): void {
  db.runSync('DELETE FROM highlights WHERE id = ?', [id]);
}

export type HighlightWithArticle = Highlight & { article_title: string | null };

export function getAllHighlights(): HighlightWithArticle[] {
  return db.getAllSync<HighlightWithArticle>(
    `SELECT h.*, a.title as article_title 
     FROM highlights h 
     JOIN articles a ON h.article_id = a.id 
     ORDER BY h.created_at DESC`
  );
}


export function getTagsForArticle(articleId: string): string[] {
  return db.getAllSync<{ name: string }>(
    `SELECT t.name FROM tags t 
     JOIN article_tags at ON t.id = at.tag_id 
     WHERE at.article_id = ? ORDER BY t.name ASC`,
    [articleId]
  ).map(r => r.name);
}

export function getAllTags(): string[] {
  return db.getAllSync<{ name: string }>('SELECT name FROM tags ORDER BY name ASC').map(r => r.name);
}

export function addTagToArticle(articleId: string, tagName: string): void {
  const name = tagName.trim().toLowerCase();
  if (!name) return;

  let tag = db.getFirstSync<{ id: string }>('SELECT id FROM tags WHERE name = ?', [name]);
  let tagId = tag?.id;

  if (!tagId) {
    tagId = Crypto.randomUUID();
    db.runSync('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, name]);
  }

  db.runSync('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)', [articleId, tagId]);
}

export function removeTagFromArticle(articleId: string, tagName: string): void {
  db.runSync(
    `DELETE FROM article_tags WHERE article_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ?)`,
    [articleId, tagName.toLowerCase()]
  );
}
