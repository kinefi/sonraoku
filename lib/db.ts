import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, and, or, like, desc, asc, inArray, isNotNull, exists } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';
import * as schema from './schema';
import { DATABASE_NAME } from './constants';

// Re-export for convenience in other files
export * from './schema';

const { articles, highlights, tags, articleTags } = schema;

const sqlite = SQLite.openDatabaseSync(DATABASE_NAME);
export const db = drizzle(sqlite, { schema });

export async function initDb(): Promise<void> {
  // Enable foreign key constraints
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  
  // Enable Write-Ahead Logging (WAL) mode. 
  // This is critical for offline-first apps to allow reading while the background parser writes content.
  sqlite.execSync('PRAGMA journal_mode = WAL;');

  try {
    // WORKAROUND: Pre-emptively create the Drizzle migration metadata table using native driver.
    // This prevents a known bug where Drizzle uses invalid PostgreSQL "SERIAL" syntax.
    // We use INTEGER PRIMARY KEY (which is auto-incrementing in SQLite) to avoid syntax errors.
    // This must happen before migrate() is called.
    sqlite.execSync(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at INTEGER
      );
    `);

    // Use the imported migrations object for Expo runtime stability
    await migrate(db as any, migrations);
    console.log('Database initialized and migrations applied.');
  } catch (e) {
    console.error('Database migration failed:', e);
    throw e;
  }
}

export type Article = typeof schema.articles.$inferSelect;

export async function insertArticle(id: string, url: string): Promise<void> {
  const now = Date.now();
  await db.insert(articles).values({
    id,
    url,
    saved_at: now,
    updated_at: now,
  });
}

function stripNulls(s: string): string {
  return s.replace(/\0/g, '');
}

export async function updateArticleContent(
  id: string,
  title: string,
  excerpt: string,
  htmlContent: string,
  lang: string
): Promise<void> {
  await db.update(articles).set({
    title: stripNulls(title),
    excerpt: stripNulls(excerpt),
    html_content: stripNulls(htmlContent),
    lang: lang || null,
    updated_at: Date.now(),
  }).where(eq(articles.id, id));
}

export async function getAllArticles(): Promise<Article[]> {
  return db.select().from(articles).orderBy(desc(articles.saved_at));
}

export async function getArticles(
  limit: number,
  offset: number,
  filter: string,
  searchQuery: string,
  tagName?: string
): Promise<Article[]> {
  const buildWhereClauses = () => {
    const clauses = [];

    // Base filter logic
    if (filter === 'archived') {
      clauses.push(eq(articles.is_archived, 1));
    } else if (filter === 'favorites') {
      clauses.push(eq(articles.is_archived, 0));
      clauses.push(eq(articles.is_favorite, 1));
    } else {
      clauses.push(eq(articles.is_archived, 0));
      if (filter === 'unread') clauses.push(eq(articles.is_read, 0));
      if (filter === 'offline') clauses.push(isNotNull(articles.html_content));
    }

    // Search query logic
    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch) {
      const q = `%${trimmedSearch}%`;
      
      clauses.push(or(
        like(articles.title, q), 
        like(articles.url, q), 
        like(articles.excerpt, q), 
        exists(
          db.select().from(articleTags)
            .innerJoin(tags, eq(articleTags.tag_id, tags.id))
            .where(and(eq(articleTags.article_id, articles.id), like(tags.name, q)))
        )
      ));
    }

    // Tag specific filter
    if (tagName) {
      clauses.push(exists(
        db.select().from(articleTags)
          .innerJoin(tags, eq(articleTags.tag_id, tags.id))
          .where(and(eq(articleTags.article_id, articles.id), eq(tags.name, tagName.toLowerCase())))
      ));
    }

    return and(...clauses);
  };

  const query = db.select().from(articles);
  return query
    .where(buildWhereClauses())
    .orderBy(desc(articles.saved_at))
    .limit(limit)
    .offset(offset);
}

export async function getArticleById(id: string): Promise<Article | null> {
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result[0] ?? null;
}

export async function markArticleRead(id: string): Promise<void> {
  await db.update(articles).set({ is_read: 1, updated_at: Date.now() }).where(eq(articles.id, id));
}

export async function markArticleUnread(id: string): Promise<void> {
  await db.update(articles).set({ is_read: 0, updated_at: Date.now() }).where(eq(articles.id, id));
}

export async function archiveArticle(id: string): Promise<void> {
  await db.update(articles).set({ is_archived: 1, updated_at: Date.now() }).where(eq(articles.id, id));
}

export async function toggleFavoriteArticle(id: string, isFavorite: boolean): Promise<void> {
  await db.update(articles).set({ 
    is_favorite: isFavorite ? 1 : 0, 
    updated_at: Date.now() 
  }).where(eq(articles.id, id));
}

export async function archiveAllReadArticles(): Promise<void> {
  await db.update(articles).set({ is_archived: 1, updated_at: Date.now() })
    .where(and(eq(articles.is_read, 1), eq(articles.is_archived, 0)));
}

export async function unarchiveArticle(id: string): Promise<void> {
  await db.update(articles).set({ is_archived: 0, updated_at: Date.now() }).where(eq(articles.id, id));
}

export async function archiveArticles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.update(articles).set({ is_archived: 1, updated_at: Date.now() }).where(inArray(articles.id, ids));
}

export async function deleteArticles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(articles).where(inArray(articles.id, ids));
}

export async function markArticlesRead(ids: string[], isRead: boolean): Promise<void> {
  if (ids.length === 0) return;
  await db.update(articles).set({ is_read: isRead ? 1 : 0, updated_at: Date.now() }).where(inArray(articles.id, ids));
}

export type Highlight = typeof highlights.$inferSelect;

export async function getHighlightsByArticle(articleId: string): Promise<Highlight[]> {
  return db.select().from(highlights).where(eq(highlights.article_id, articleId)).orderBy(asc(highlights.created_at));
}

export async function insertHighlight(
  id: string,
  articleId: string,
  selectedText: string,
  contextBefore: string,
  contextAfter: string
): Promise<void> {
  await db.insert(highlights).values({
    id,
    article_id: articleId,
    selected_text: selectedText,
    context_before: contextBefore,
    context_after: contextAfter,
    created_at: Date.now(),
  });
}

export async function deleteHighlight(id: string): Promise<void> {
  await db.delete(highlights).where(eq(highlights.id, id));
}

export type HighlightWithArticle = Highlight & { article_title: string | null };

export async function getAllHighlights(searchQuery?: string): Promise<HighlightWithArticle[]> {
  const q = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;

  return db.select({
    id: highlights.id,
    article_id: highlights.article_id,
    selected_text: highlights.selected_text,
    context_before: highlights.context_before,
    context_after: highlights.context_after,
    created_at: highlights.created_at,
    article_title: articles.title,
  })
    .from(highlights)
    .innerJoin(articles, eq(highlights.article_id, articles.id))
    .where(q ? or(like(highlights.selected_text, q), like(articles.title, q)) : undefined)
    .orderBy(desc(highlights.created_at));
}

export async function getTagsForArticle(articleId: string): Promise<string[]> {
  const results = await db.select({ name: tags.name })
    .from(tags)
    .innerJoin(articleTags, eq(tags.id, articleTags.tag_id))
    .where(eq(articleTags.article_id, articleId))
    .orderBy(asc(tags.name));

  return results.map(r => r.name!).filter(Boolean);
}

export async function getAllTags(searchQuery?: string): Promise<string[]> {
  const q = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;
  const results = await db.select({ name: tags.name })
    .from(tags)
    .where(q ? like(tags.name, q) : undefined)
    .orderBy(asc(tags.name));

  return results.map(r => r.name!).filter(Boolean);
}

export async function addTagToArticle(articleId: string, tagName: string): Promise<void> {
  const name = tagName.trim().toLowerCase();
  if (!name) return;

  const existingTag = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1);
  let tagId = existingTag[0]?.id;

  if (!tagId) {
    tagId = Crypto.randomUUID();
    await db.insert(tags).values({ id: tagId, name });
  }

  await db.insert(articleTags).values({ article_id: articleId, tag_id: tagId }).onConflictDoNothing();
}

export async function removeTagFromArticle(articleId: string, tagName: string): Promise<void> {
  const tag = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, tagName.toLowerCase())).limit(1);
  if (tag[0]) {
    await db.delete(articleTags).where(and(eq(articleTags.article_id, articleId), eq(articleTags.tag_id, tag[0].id)));
  }
}
