import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db/config';
import * as schema from '@/lib/db/schema';
import { DbAction, DbResult } from '@/lib/db/types';
import { fetchAndParseRss, discoverRssUrl } from '@/lib/reader/rssFetcher';
import * as Crypto from 'expo-crypto';

const { rssFeeds, rssItems } = schema;

/**
 * Adds a new RSS feed. Attempts discovery if the provided URL is a website.
 */
export async function addRssFeed(url: string): Promise<DbAction> {
  try {
    const now = Date.now();
    let feedUrl = url;
    let parsed;

    try {
      parsed = await fetchAndParseRss(url);
    } catch {
      const discovered = await discoverRssUrl(url);
      if (discovered) {
        feedUrl = discovered;
        parsed = await fetchAndParseRss(feedUrl);
      } else {
        throw new Error('No valid RSS feed found');
      }
    }

    const id = Crypto.randomUUID();
    await db.insert(rssFeeds).values({
      id,
      url: feedUrl,
      title: parsed.title,
      site_url: parsed.siteUrl,
      last_synced_at: Date.now(),
      created_at: now,
    });

    return { error: null };
  } catch (e) {
    return { error: e };
  }
}

/**
 * Soft deletes an RSS item to support the "Undo" feature.
 */
export async function deleteRssItem(id: string): Promise<DbAction> {
  try {
    await db.update(rssItems).set({ is_deleted: 1 }).where(eq(rssItems.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

/**
 * Retrieves the most recent synchronization timestamp across all feeds.
 * Ensures null is returned instead of undefined if no feeds exist to satisfy TanStack Query.
 */
export async function getLatestSyncTime(): Promise<DbResult<number | null>> {
  try {
    const result = await db
      .select({ lastSynced: rssFeeds.last_synced_at })
      .from(rssFeeds)
      .orderBy(desc(rssFeeds.last_synced_at))
      .limit(1);

    // Ensure we return null instead of undefined if the result set is empty or the value is NULL
    const lastSynced = result[0]?.lastSynced;
    return { data: lastSynced ?? null, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * Restores a soft-deleted RSS item.
 */
export async function restoreRssItem(id: string): Promise<DbAction> {
  try {
    await db.update(rssItems).set({ is_deleted: 0 }).where(eq(rssItems.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function deleteRssFeed(id: string): Promise<DbAction> {
  try {
    await db.delete(rssFeeds).where(eq(rssFeeds.id, id));
    await db.delete(rssItems).where(eq(rssItems.feed_id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function markRssFeedAsRead(feedId: string): Promise<DbAction> {
  try {
    await db.update(rssItems).set({ is_read: 1 }).where(eq(rssItems.feed_id, feedId));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function markAllRssItemsAsRead(): Promise<DbAction> {
  try {
    await db.update(rssItems).set({ is_read: 1 });
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function clearReadRssItems(): Promise<DbAction> {
  try {
    await db.delete(rssItems).where(eq(rssItems.is_read, 1));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function deleteAllRssItems(): Promise<DbAction> {
  try {
    await db.delete(rssItems);
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function syncAllFeeds(onProgress?: (progress: number, title?: string) => void): Promise<DbAction> {
  try {
    const feeds = await db.select().from(rssFeeds);
    for (let i = 0; i < feeds.length; i++) {
      if (onProgress) onProgress(i / feeds.length, feeds[i].title || feeds[i].url);
      await db.update(rssFeeds).set({ last_synced_at: Date.now() }).where(eq(rssFeeds.id, feeds[i].id));
    }
    if (onProgress) onProgress(1);
    return { error: null };
  } catch (e) { return { error: e }; }
}