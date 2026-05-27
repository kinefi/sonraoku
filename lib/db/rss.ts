import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid/non-secure';
import { db } from '@/lib/db/config';
import { rssFeeds, rssItems } from '@/lib/db/schema';
import { fetchAndParseRss } from '@/lib/reader/rssFetcher';
import { DbAction } from '@/lib/db/types';
import { sanitizeSqlString } from '@/lib/utils';

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

export async function deleteRssItem(id: string): Promise<DbAction> {
  try {
    await db.delete(rssItems).where(eq(rssItems.id, id));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function markRssFeedAsRead(feedId: string): Promise<DbAction> {
  try {
    await db.update(rssItems).set({ is_read: 1 }).where(eq(rssItems.feed_id, feedId));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function deleteRssFeed(feedId: string): Promise<DbAction> {
  try {
    await db.delete(rssFeeds).where(eq(rssFeeds.id, feedId));
    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function addRssFeed(url: string): Promise<DbAction> {
  try {
    const parsed = await fetchAndParseRss(url);
    const feedId = nanoid();

    await db.transaction(async (tx) => {
      await tx.insert(rssFeeds).values({
        id: feedId,
        url,
        title: sanitizeSqlString(parsed.title),
        site_url: parsed.siteUrl,
        created_at: Date.now(),
      });
      
      const syncResult = await syncRssFeed(feedId, url);
      if (syncResult.error) throw syncResult.error;
    });

    return { error: null };
  } catch (e) { return { error: e }; }
}

export async function syncAllFeeds(onProgress?: (p: number, title?: string) => void) {
  const allFeeds = await db.select().from(rssFeeds);
  const total = allFeeds.length;
  
  for (let i = 0; i < total; i++) {
    const feed = allFeeds[i];
    if (onProgress) onProgress(i / total, feed.title || feed.url);
    await syncRssFeed(feed.id, feed.url);
    if (onProgress) onProgress((i + 1) / total, feed.title || feed.url);
  }
}

export async function syncRssFeed(feedId: string, url: string): Promise<DbAction> {
  try {
    const parsed = await fetchAndParseRss(url);

    await db.transaction(async (tx) => {
      // Optimization: Fetch existing links once to avoid N+1 select queries in the loop
      const existingItems = await tx.select({ link: rssItems.link })
        .from(rssItems)
        .where(eq(rssItems.feed_id, feedId));
      
      const existingLinks = new Set(existingItems.map(i => i.link));
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
          pub_date: item.pubDate,
        });
      }

      // Bulk insert new items
      if (newItems.length > 0) {
        await tx.insert(rssItems).values(newItems);
      }

      await tx.update(rssFeeds)
        .set({ last_synced_at: Date.now() })
        .where(eq(rssFeeds.id, feedId));
    });

    return { error: null };
  } catch (e) { return { error: e }; }
}