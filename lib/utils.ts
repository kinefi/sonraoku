import { USER_AGENT, TIMEOUTS } from './constants';
import { buildParserHtml } from './htmlBuilder';

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function stripTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function getReadTime(html: string | null): number {
  const stripped = stripTags(html || '');
  if (!stripped) return 0;
  const words = stripped.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function fetchRawHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.FETCH_HTML);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    if (!text) {
      throw new Error('Empty response body');
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { buildParserHtml };
