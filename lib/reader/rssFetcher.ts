import { XMLParser } from 'fast-xml-parser';
import { fetchRawHtml } from '@/lib/utils';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export interface ParsedRssItem {
  title: string;
  link: string;
  excerpt?: string;
  author?: string;
  pubDate?: number;
}

export interface ParsedRssFeed {
  title: string;
  siteUrl?: string;
  items: ParsedRssItem[];
}

export async function fetchAndParseRss(url: string): Promise<ParsedRssFeed> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  const xml = await fetchRawHtml(normalizedUrl);
  const jsonObj = parser.parse(xml);

  // Handle RSS 2.0
  if (jsonObj.rss?.channel) {
    const channel = jsonObj.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

    return {
      title: channel.title || 'Untitled Feed',
      siteUrl: channel.link,
      items: items.map((item: any) => ({
        title: item.title || 'Untitled',
        link: typeof item.link === 'string' ? item.link : item.link?.['#text'] || item.link?.['@_href'],
        excerpt: item.description || item['content:encoded'],
        author: item.author || item['dc:creator'],
        pubDate: item.pubDate ? new Date(item.pubDate).getTime() : undefined,
      })),
    };
  }

  // Handle Atom
  if (jsonObj.feed) {
    const feed = jsonObj.feed;
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry].filter(Boolean);

    return {
      title: feed.title?.['#text'] || feed.title || 'Untitled Feed',
      siteUrl: Array.isArray(feed.link) 
        ? feed.link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href'] 
        : feed.link?.['@_href'],
      items: entries.map((entry: any) => ({
        title: entry.title?.['#text'] || entry.title || 'Untitled',
        link: Array.isArray(entry.link)
          ? entry.link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href']
          : entry.link?.['@_href'],
        excerpt: entry.summary?.['#text'] || entry.summary || entry.content?.['#text'],
        author: entry.author?.name,
        pubDate: entry.published ? new Date(entry.published).getTime() : new Date(entry.updated).getTime(),
      })),
    };
  }

  throw new Error('Unsupported feed format');
}

export async function discoverRssUrl(siteUrl: string): Promise<string | null> {
  try {
    const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const html = await fetchRawHtml(normalizedUrl);
    const rssRegex = /<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i;
    const match = html.match(rssRegex);
    if (match && match[2]) {
      return new URL(match[2], normalizedUrl).href;
    }
  } catch (e) { console.warn('RSS Discovery failed:', e); }
  return null;
}

/**
 * Parses an OPML file string and returns an array of feed URLs and titles
 */
export function parseOpml(xml: string): { title: string; url: string }[] {
  const jsonObj = parser.parse(xml);
  const feeds: { title: string; url: string }[] = [];

  const processOutline = (outline: any) => {
    if (!outline) return;
    const items = Array.isArray(outline) ? outline : [outline];
    for (const item of items) {
      const xmlUrl = item['@_xmlUrl'];
      if (xmlUrl) {
        feeds.push({ title: item['@_title'] || item['@_text'] || xmlUrl, url: xmlUrl });
      }
      if (item.outline) processOutline(item.outline);
    }
  };

  if (jsonObj.opml?.body?.outline) {
    processOutline(jsonObj.opml.body.outline);
  }
  return feeds;
}

/**
 * Basic URL syntax validation
 */
export function isValidUrl(url: string): boolean {
  const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  return !!pattern.test(url);
}