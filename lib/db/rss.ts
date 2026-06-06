import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db/config';
import * as schema from '@/lib/db/schema';
import { DbAction, DbResult, RssItem } from '@/lib/db/types';
import { fetchAndParseRss, discoverRssUrl } from '@/lib/reader/rssFetcher';
import * as Crypto from 'expo-crypto';
import { nanoid } from 'nanoid/non-secure';
import { sanitizeSqlString } from '@/lib/utils';

const { rssFeeds, rssItems } = schema;

/**
 * Synchronizes a single RSS feed by fetching new items and batch-inserting them.
 */
export async function syncRssFeed(feedId: string, url: string, txRunner?: any): Promise<DbAction> {
  try {
    const parsed = await fetchAndParseRss(url);

    const runSync = async (tx: any) => {
      // Fetch existing links for this feed in a single query to prevent duplicates
      const existingItems = await tx
        .select({ link: rssItems.link })
        .from(rssItems)
        .where(eq(rssItems.feed_id, feedId));

      const existingLinks = new Set(existingItems.map((i: any) => i.link.trim()));
      const newItems = [];

      for (const item of parsed.items) {
        const link = item.link?.trim();
        if (!link || existingLinks.has(link)) continue;

        newItems.push({
          id: nanoid(),
          feed_id: feedId,
          title: sanitizeSqlString(item.title),
          link: link,
          excerpt: sanitizeSqlString(item.excerpt),
          author: sanitizeSqlString(item.author),
          pub_date: item.pubDate || null,
        });
      }

      // Bulk insert new items in a single query
      if (newItems.length > 0) {
        await tx.insert(rssItems).values(newItems);
      }

      // Update sync timestamp
      await tx
        .update(rssFeeds)
        .set({ last_synced_at: Date.now() })
        .where(eq(rssFeeds.id, feedId));
    };

    if (txRunner) {
      await runSync(txRunner);
    } else {
      await db.transaction(async (tx) => {
        await runSync(tx);
      });
    }

    return { error: null };
  } catch (e) {
    console.error(`Error syncing feed ${feedId}:`, e);
    return { error: e };
  }
}

/**
 * Adds a new RSS feed. Attempts discovery if the provided URL is a website.
 */
export async function addRssFeed(url: string): Promise<DbAction> {
  try {
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

    const feedId = Crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(rssFeeds).values({
        id: feedId,
        url: feedUrl,
        title: sanitizeSqlString(parsed.title),
        site_url: parsed.siteUrl,
        created_at: Date.now(),
      });

      const syncResult = await syncRssFeed(feedId, feedUrl, tx);
      if (syncResult.error) throw syncResult.error;
    });

    return { error: null };
  } catch (e) {
    console.error('Error adding RSS feed:', e);
    return { error: e };
  }
}

export async function getRssItemById(id: string): Promise<DbResult<RssItem | null>> {
  try {
    const result = await db.select().from(rssItems).where(eq(rssItems.id, id)).limit(1);
    return { data: result[0] ?? null, error: null };
  } catch (e) { return { data: null, error: e }; }
}

export async function markRssItemAsRead(id: string): Promise<DbAction> {
  try {
    await db.update(rssItems).set({ is_read: 1 }).where(eq(rssItems.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
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
    await db.transaction(async (tx) => {
      await tx.delete(rssFeeds).where(eq(rssFeeds.id, id));
      await tx.delete(rssItems).where(eq(rssItems.feed_id, id));
    });
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
    const total = feeds.length;
    for (let i = 0; i < total; i++) {
      const feed = feeds[i];
      if (onProgress) onProgress(i / total, feed.title || feed.url);
      try {
        await syncRssFeed(feed.id, feed.url);
      } catch (err) {
        console.error(`Failed to sync feed ${feed.url}:`, err);
      }
      if (onProgress) onProgress((i + 1) / total, feed.title || feed.url);
    }
    return { error: null };
  } catch (e) { return { error: e }; }
}