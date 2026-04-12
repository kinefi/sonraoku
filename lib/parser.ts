import readabilitySource from './readabilitySource';

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
  // Escape </script> inside the inlined source to prevent premature tag close
  const safeSource = readabilitySource.replace(/<\/script>/gi, '<\\/script>');
  const escapedHtml = JSON.stringify(stripHeavyTags(rawHtml));
  const escapedUrl = JSON.stringify(url);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
${safeSource}
</script>
<script>
(function() {
  function sendMessage(message) {
    var payload = JSON.stringify(message);
    function trySend() {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else {
        setTimeout(trySend, 50);
      }
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
    if (!article) {
      sendMessage({ success: false, error: 'İçerik bulunamadı' });
      return;
    }
    sendMessage({
      success: true,
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      lang: doc.documentElement.lang || '',
    });
  } catch (e) {
    sendMessage({ success: false, error: e.message || 'Bilinmeyen hata' });
  }
})();
</script>
</body>
</html>`;
}
