import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as FileSystem from 'expo-file-system';
import { Paths, File as FileSystemFile } from 'expo-file-system';
import { nanoid } from 'nanoid/non-secure';
import { db } from '@/lib/db/config';
import { rssFeeds } from '@/lib/db/schema';
import { fetchAndParseRss } from '@/lib/reader/rssFetcher';
import { DbAction } from '@/lib/db/types';
import { sanitizeSqlString } from '@/lib/utils';

const CONCURRENCY_LIMIT = 5;

interface OpmlParsed {
  opml?: {
    body?: {
      outline?: OpmlOutline | OpmlOutline[];
    };
  };
}

interface OpmlOutline {
  type?: string;
  xmlUrl?: string;
  text?: string;
  title?: string;
  htmlUrl?: string;
  outline?: OpmlOutline | OpmlOutline[];
}

export async function importOpml(
  opmlContent: string,
  onProgress?: (current: number, total: number, title?: string) => void,
  onConfirm?: (count: number) => Promise<boolean>
): Promise<DbAction & { successCount?: number; skippedCount?: number }> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
    });
    const parsed = parser.parse(opmlContent) as OpmlParsed;

    const feedsToAdd: { url: string; title: string; siteUrl?: string }[] = [];
    
    const traverse = (node: OpmlOutline | OpmlOutline[] | undefined) => {
      if (!node) return;
      const outlines = Array.isArray(node) ? node : [node];
      for (const outline of outlines as OpmlOutline[]) {
        if (outline.type === 'rss' && outline.xmlUrl) {
          feedsToAdd.push({
            url: outline.xmlUrl,
            title: outline.text || outline.title || outline.xmlUrl,
            siteUrl: outline.htmlUrl,
          });
        }
        if (outline.outline) traverse(outline.outline);
      }
    };

    traverse(parsed?.opml?.body?.outline);

    const total = feedsToAdd.length;
    if (total === 0) return { error: new Error('No feeds found') };

    if (total > 50 && onConfirm) {
      const confirmed = await onConfirm(total);
      if (!confirmed) return { error: null, successCount: 0, skippedCount: 0 };
    }

    const validatedFeeds: typeof feedsToAdd = [];
    let successCount = 0;
    let skippedCount = 0;
    let currentIndex = 0;

    const workers = Array(Math.min(CONCURRENCY_LIMIT, total))
      .fill(null)
      .map(async () => {
        while (currentIndex < total) {
          const index = currentIndex++;
          const feed = feedsToAdd[index];
          
          try {
            await fetchAndParseRss(feed.url);
            validatedFeeds.push(feed);
            successCount++;
          } catch (err: unknown) {
            skippedCount++;
            console.warn(`Validation failed for feed: ${feed.url}. Skipping.`, err);
          } finally {
            if (onProgress) onProgress(successCount + skippedCount, total, feed.title);
          }
        }
      });

    await Promise.all(workers);

    if (validatedFeeds.length > 0) {
      await db.transaction(async (tx) => {
        for (const feed of validatedFeeds) {
          await tx.insert(rssFeeds).values({
            id: nanoid(),
            url: feed.url,
            title: sanitizeSqlString(feed.title),
            site_url: feed.siteUrl,
            created_at: Date.now(),
          }).onConflictDoNothing();
        }
      });
    }

    return { error: null, successCount, skippedCount };
  } catch (e: unknown) { return { error: e }; }
}

export async function exportOpml(): Promise<DbAction & { filePath?: string }> {
  try {
    const feeds = await db.select().from(rssFeeds);
    const opmlData = {
      opml: {
        head: { title: 'Sonra Oku Subscriptions' },
        body: { outline: feeds.map(f => ({ 
          '@_type': 'rss', 
          '@_text': sanitizeSqlString(f.title || f.url), 
          '@_xmlUrl': f.url, 
          '@_htmlUrl': f.site_url || undefined 
        })) }
      }
    };

    const builder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true });
    const xml = builder.build(opmlData);
    const file = new FileSystemFile(Paths.cache, 'subscriptions.opml'); // Corrected File constructor usage
    await FileSystem.writeAsStringAsync(file.uri, xml);
    return { error: null, filePath: file.uri };
  } catch (e: unknown) { return { error: e, filePath: undefined }; }
}