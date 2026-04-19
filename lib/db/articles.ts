import { eq, and, or, like, desc, isNotNull, exists, inArray } from 'drizzle-orm';
import { db } from './config';
import { DbResult, DbAction, Article } from './types';
import * as schema from './schema';
import { sanitizeSqlString } from '@/lib/utils';

const { articles, tags, articleTags } = schema;

export async function insertArticle(id: string, url: string): Promise<DbAction> {
  try {
    const now = Date.now();
    await db.insert(articles).values({ id, url, saved_at: now, updated_at: now });
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function updateArticleContent(
  id: string, title: string, excerpt: string, htmlContent: string, lang: string
): Promise<DbAction> {
  try {
    await db.update(articles).set({
      title: sanitizeSqlString(title),
      excerpt: sanitizeSqlString(excerpt),
      html_content: sanitizeSqlString(htmlContent),
      lang: lang || null,
      updated_at: Date.now(),
    }).where(eq(articles.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function getArticles(
  limit: number, offset: number, filter: string, searchQuery: string, tagName?: string
): Promise<DbResult<Article[]>> {
  try {
    const clauses = [];
    if (filter === 'archived') clauses.push(eq(articles.is_archived, 1));
    else if (filter === 'favorites') clauses.push(eq(articles.is_archived, 0), eq(articles.is_favorite, 1));
    else {
      clauses.push(eq(articles.is_archived, 0));
      if (filter === 'unread') clauses.push(eq(articles.is_read, 0));
      if (filter === 'offline') clauses.push(isNotNull(articles.html_content));
    }

    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch) {
      const q = `%${trimmedSearch}%`;
      clauses.push(or(
        like(articles.title, q), like(articles.url, q), like(articles.excerpt, q),
        exists(
          db.select().from(articleTags)
            .innerJoin(tags, eq(articleTags.tag_id, tags.id))
            .where(and(eq(articleTags.article_id, articles.id), like(tags.name, q)))
        )
      ));
    }

    if (tagName) {
      clauses.push(exists(
        db.select().from(articleTags)
          .innerJoin(tags, eq(articleTags.tag_id, tags.id))
          .where(and(eq(articleTags.article_id, articles.id), eq(tags.name, tagName.toLowerCase())))
      ));
    }

    const data = await db.select().from(articles)
      .where(and(...clauses))
      .orderBy(desc(articles.saved_at))
      .limit(limit)
      .offset(offset);
    return { data, error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function getArticleById(id: string): Promise<DbResult<Article | null>> {
  try {
    const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    return { data: result[0] ?? null, error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function archiveArticle(id: string): Promise<DbAction> {
  try {
    await db.update(articles).set({ is_archived: 1, updated_at: Date.now() }).where(eq(articles.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function unarchiveArticle(id: string): Promise<DbAction> {
  try {
    await db.update(articles).set({ is_archived: 0, updated_at: Date.now() }).where(eq(articles.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function toggleFavoriteArticle(id: string, isFavorite: boolean): Promise<DbAction> {
  try {
    await db.update(articles).set({ 
      is_favorite: isFavorite ? 1 : 0, 
      updated_at: Date.now() 
    }).where(eq(articles.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function archiveAllReadArticles(): Promise<DbAction> {
  try {
    await db.update(articles)
      .set({ is_archived: 1, updated_at: Date.now() })
      .where(and(eq(articles.is_read, 1), eq(articles.is_archived, 0)));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function deleteArticles(ids: string[]): Promise<DbAction> {
  try {
    if (ids.length === 0) return { error: null };
    await db.delete(articles).where(inArray(articles.id, ids));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function markArticleRead(id: string): Promise<DbAction> {
  return markArticlesRead([id], true);
}

export async function markArticleUnread(id: string): Promise<DbAction> {
  return markArticlesRead([id], false);
}

export async function markArticlesRead(ids: string[], isRead: boolean): Promise<DbAction> {
  try {
    if (ids.length === 0) return { error: null };
    await db.update(articles).set({ 
      is_read: isRead ? 1 : 0, 
      updated_at: Date.now() 
    }).where(inArray(articles.id, ids));
    return { error: null };
  } catch (e) { return { error: e }; }
}