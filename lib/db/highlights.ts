import { eq, desc, asc, or, like } from 'drizzle-orm';
import { db } from '@/lib/db/config';
import * as schema from '@/lib/db/schema';
import { Highlight, DbResult, DbAction } from '@/lib/db/types';
const { highlights, articles } = schema;
export type HighlightWithArticle = Highlight & { article_title: string | null };

export async function getHighlightsByArticle(articleId: string): Promise<DbResult<Highlight[]>> {
  try {
    const data = await db.select().from(highlights).where(eq(highlights.article_id, articleId)).orderBy(asc(highlights.created_at));
    return { data, error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function insertHighlight(
  id: string, articleId: string, selectedText: string, contextBefore: string, contextAfter: string
): Promise<DbAction> {
  try {
    await db.insert(highlights).values({
      id, article_id: articleId, selected_text: selectedText,
      context_before: contextBefore, context_after: contextAfter, created_at: Date.now(),
    });
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function deleteHighlight(id: string): Promise<DbAction> {
  try {
    await db.delete(highlights).where(eq(highlights.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function getAllHighlights(searchQuery?: string): Promise<DbResult<HighlightWithArticle[]>> {
  try {
    const q = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;
    const data = await db.select({
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
    return { data, error: null };
  } catch (e) { return { data: null, error: e }; }
}