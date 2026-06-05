import { db } from '@/lib/db/config';
import { DbResult, Tag, TagWithCount } from '@/lib/db/types';
import * as schema from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

const { tags, articleTags } = schema;

/**
 * Fetches all tags from the database.
 */
export async function getTags(): Promise<DbResult<TagWithCount[]>> {
  try {
    const data = await db.select({
      id: tags.id,
      name: tags.name,
      articleCount: count(articleTags.article_id),
    })
    .from(tags)
    .leftJoin(articleTags, eq(tags.id, articleTags.tag_id))
    .groupBy(tags.id);

    return { data, error: null };
  } catch (e) {
    console.error('Error getting all tags:', e);
    return { data: null, error: e };
  }
}

/**
 * Fetches a single tag by its name.
 */
export async function getTagByName(name: string): Promise<DbResult<Tag | null>> {
  try {
    const normalized = name.trim().toLowerCase();
    const result = await db.select().from(tags).where(eq(tags.name, normalized)).limit(1);
    return { data: result[0] ?? null, error: null };
  } catch (e) {
    console.error('Error getting tag by name:', e);
    return { data: null, error: e };
  }
}

/**
 * Inserts a new tag into the database.
 * Returns the newly created tag.
 */
export async function insertTag(name: string): Promise<DbResult<Tag | null>> {
  try {
    const normalized = name.trim().toLowerCase();
    const newTagId = Crypto.randomUUID();
    const result = await db.insert(tags).values({ id: newTagId, name: normalized }).returning();
    return { data: result[0] ?? null, error: null };
  } catch (e) {
    console.error('Error inserting tag:', e);
    return { data: null, error: e };
  }
}