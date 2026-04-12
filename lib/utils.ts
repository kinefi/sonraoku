import readabilitySource from '@mozilla/readability/Readability.js';
import { Paths, File, Directory } from 'expo-file-system';

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getReadTime(html: string | null): number {
  if (!html) return 0;
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

const FETCH_TIMEOUT_MS = 10_000;

export async function fetchRawHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
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

function stripHeavyTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<link\b[^>]*>/gi, '');
}

export function buildParserHtml(rawHtml: string, url: string): string {
  const safeSource = readabilitySource.replace(/<\/script>/gi, '<\\/script>');
  const escapedHtml = JSON.stringify(stripHeavyTags(rawHtml));
  const escapedUrl = JSON.stringify(url);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>${safeSource}</script>
<script>
(function() {
  function sendMessage(message) {
    var payload = JSON.stringify(message);
    function trySend() {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else { setTimeout(trySend, 50); }
    }
    trySend();
  }
  try {
    var parser = new DOMParser();
    var doc = parser.parseFromString(${escapedHtml}, 'text/html');
    var baseTag = doc.createElement('base');
    baseTag.href = ${escapedUrl};
    if (doc.head) doc.head.insertBefore(baseTag, doc.head.firstChild);
    var article = new Readability(doc).parse();
    if (!article) { sendMessage({ success: false, error: 'İçerik bulunamadı' }); return; }
    sendMessage({
      success: true,
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      lang: doc.documentElement.lang || '',
    });
  } catch (e) { sendMessage({ success: false, error: e.message || 'Bilinmeyen hata' }); }
})();
</script>
</body>
</html>`;
}

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;

async function downloadWithTimeout(url: string, dest: File): Promise<{ uri: string }> {
  const download = File.downloadFileAsync(url, dest);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Download timed out')), IMAGE_DOWNLOAD_TIMEOUT_MS)
  );
  return Promise.race([download.then(() => ({ uri: dest.uri })), timeout]);
}

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /(?:src|srcset|data-src)=["'](https?:\/\/[^"'\s]+)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return [...new Set(urls)];
}

function urlToFilename(url: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop()?.split('?')[0];
    if (name && name.length > 0 && name.length < 80) return `${index}_${name}`;
  } catch { /* fall through */ }
  return `img_${index}_${Date.now()}`;
}

export async function cacheArticleImages(html: string, articleId: string): Promise<string> {
  const urls = extractImageUrls(html);
  if (urls.length === 0) return html;

  const dir = new Directory(Paths.document, 'images', articleId);
  await dir.create();

  const results = await Promise.allSettled(
    urls.map(async (url, i) => {
      const dest = new File(dir, urlToFilename(url, i));
      const downloaded = await downloadWithTimeout(url, dest);
      return { url, localUri: downloaded.uri };
    })
  );

  let updatedHtml = html;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      updatedHtml = updatedHtml.replaceAll(result.value.url, result.value.localUri);
    }
  }
  return updatedHtml;
}
