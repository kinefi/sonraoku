import * as Crypto from 'expo-crypto';
import { eq, and, asc, like } from 'drizzle-orm';
import { db } from '@/lib/db/config';
import { DbResult, DbAction } from '@/lib/db/types';
import * as schema from '@/lib/db/schema';

const { tags, articleTags } = schema;

export async function getTagsForArticle(articleId: string): Promise<DbResult<string[]>> {
  try {
    const results = await db.select({ name: tags.name }).from(tags)
      .innerJoin(articleTags, eq(tags.id, articleTags.tag_id))
      .where(eq(articleTags.article_id, articleId)).orderBy(asc(tags.name));
    return { data: results.map(r => r.name!).filter(Boolean), error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function getAllTags(searchQuery?: string): Promise<DbResult<string[]>> {
  try {
    const q = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;
    const results = await db.select({ name: tags.name }).from(tags)
      .where(q ? like(tags.name, q) : undefined).orderBy(asc(tags.name));
    return { data: results.map(r => r.name!).filter(Boolean), error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function addTagToArticle(articleId: string, tagName: string): Promise<DbAction> {
  try {
    const name = tagName.trim().toLowerCase();
    if (!name) return { error: null };
    const existingTag = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).limit(1);
    let tagId = existingTag[0]?.id;
    if (!tagId) {
      tagId = Crypto.randomUUID();
      await db.insert(tags).values({ id: tagId, name });
    }
    await db.insert(articleTags).values({ article_id: articleId, tag_id: tagId }).onConflictDoNothing();
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function removeTagFromArticle(articleId: string, tagName: string): Promise<DbAction> {
  try {
    const tag = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, tagName.toLowerCase())).limit(1);
    if (tag[0]) {
      await db.delete(articleTags).where(
        and(eq(articleTags.article_id, articleId), eq(articleTags.tag_id, tag[0].id))
      );
    }
    return { error: null };
  } catch (e) { return { error: e }; }
}