import { eq, and, or, like, desc, isNotNull, exists, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/config';
import { DbResult, DbAction, Article, ArticleWithTags, Tag } from '@/lib/db/types';
import * as schema from '@/lib/db/schema';
import { sanitizeSqlString } from '@/lib/utils';
import { getTagByName, insertTag } from '@/lib/db/tags'; // Import tag utilities

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

export async function addTagsToArticles(articleIds: string[], tagNames: string[]): Promise<DbAction> {
  try {
    if (articleIds.length === 0 || tagNames.length === 0) {
      return { error: null };
    }

    const normalizedTagNames = tagNames.map(n => n.trim().toLowerCase()).filter(Boolean);
    const now = Date.now();
    const articleTagInsertValues: { article_id: string; tag_id: string }[] = [];

    // Ensure all tags exist and get their IDs
    const tagIds: string[] = [];
    for (const tagName of normalizedTagNames) {
      let tag = (await getTagByName(tagName)).data; // getTagByName will also normalize
      if (!tag) {
        tag = (await insertTag(tagName)).data;
        if (!tag) throw new Error(`Failed to create tag: ${tagName}`);
      }
      tagIds.push(tag.id);
    }

    // Prepare article_tags entries
    for (const articleId of articleIds) {
      for (const tagId of tagIds) {
        articleTagInsertValues.push({ article_id: articleId, tag_id: tagId });
      }
    }

    // Insert article_tags (batch insert)
    if (articleTagInsertValues.length > 0) {
      await db.insert(articleTags).values(articleTagInsertValues).onConflictDoNothing(); // Avoid duplicates
    }

    // Update updated_at for affected articles
    await db.update(articles)
      .set({ updated_at: now })
      .where(inArray(articles.id, articleIds));

    return { error: null };
  } catch (e) {
    console.error('Error adding tags to articles:', e);
    return { error: e };
  }
}

export async function addTagToArticle(articleId: string, tagName: string): Promise<DbAction> {
  return addTagsToArticles([articleId], [tagName]);
}

export async function removeTagFromArticle(articleId: string, tagName: string): Promise<DbAction> {
  return removeTagsFromArticles([articleId], [tagName]);
}

export async function removeTagsFromArticles(articleIds: string[], tagNames: string[]): Promise<DbAction> {
  try {
    if (articleIds.length === 0 || tagNames.length === 0) {
      return { error: null };
    }

    const now = Date.now();
    const tagsToRemove = await db.select({ id: tags.id }).from(tags).where(inArray(tags.name, tagNames));
    const tagIdsToRemove = tagsToRemove.map(t => t.id);

    if (tagIdsToRemove.length > 0) {
      await db.delete(articleTags).where(and(inArray(articleTags.article_id, articleIds), inArray(articleTags.tag_id, tagIdsToRemove)));
    }
    await db.update(articles).set({ updated_at: now }).where(inArray(articles.id, articleIds));

    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function getArticles(
  limit: number, offset: number, filter: string, searchQuery: string, tagName?: string
): Promise<DbResult<ArticleWithTags[]>> {
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
    if (trimmedSearch.length >= 2) {
      const q = `%${trimmedSearch.toLowerCase()}%`;
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

    const rawResults = await db.select({
      article: articles,
      tagName: tags.name,
    })
      .from(articles)
      .leftJoin(articleTags, eq(articles.id, articleTags.article_id))
      .leftJoin(tags, eq(articleTags.tag_id, tags.id))
      .where(and(...clauses))
      .orderBy(desc(articles.saved_at))
      .limit(limit)
      .offset(offset);

    const articlesMap = new Map<string, ArticleWithTags>();
    for (const row of rawResults) {
      if (!articlesMap.has(row.article.id)) {
        articlesMap.set(row.article.id, { ...row.article, tags: [] });
      }
      if (row.tagName) {
        articlesMap.get(row.article.id)?.tags.push(row.tagName);
      }
    }
    const data = Array.from(articlesMap.values());
    return { data, error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function getTagsForArticle(articleId: string): Promise<DbResult<Tag[]>> {
  try {
    const result = await db.select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .innerJoin(articleTags, eq(tags.id, articleTags.tag_id))
    .where(eq(articleTags.article_id, articleId));
    return { data: result, error: null };
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