import readabilitySource from './readabilitySource';

export async function fetchRawHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildParserHtml(rawHtml: string, url: string): string {
  // Escape </script> inside the inlined source to prevent premature tag close
  const safeSource = readabilitySource.replace(/<\/script>/gi, '<\\/script>');
  const escapedHtml = JSON.stringify(rawHtml);
  const escapedUrl = JSON.stringify(url);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
console.log('Parser HTML initialized');
</script>
<script>
${safeSource}
console.log('Readability library loaded');
</script>
<script>
console.log('Starting parser script');
(function() {
  function sendMessage(message) {
    var payload = JSON.stringify(message);
    function trySend() {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(payload);
      } else if (window.originalPostMessage) {
        window.originalPostMessage(payload);
      } else {
        setTimeout(trySend, 50);
      }
    }
    trySend();
  }

  function sendResult(article) {
    sendMessage({
      success: true,
      title: article.title || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
    });
  }

  function sendError(error) {
    sendMessage({
      success: false,
      error: error ? error.toString() : 'Unknown parse error',
    });
  }

  try {
    console.log('ReactNativeWebView available at start:', typeof window.ReactNativeWebView);
    setTimeout(function() {
      console.log('Starting parsing in WebView');
      var parser = new DOMParser();
      var doc = parser.parseFromString(${escapedHtml}, 'text/html');
      console.log('Parsed HTML document');
      var baseTag = doc.createElement('base');
      baseTag.href = ${escapedUrl};
      if (doc.head) doc.head.insertBefore(baseTag, doc.head.firstChild);
      console.log('Added base tag');
      var article = new Readability(doc).parse();
      console.log('Readability parse result - has content:', !!article, 'title:', article ? article.title : 'N/A');
      if (!article) {
        sendError('Readability returned no article');
        return;
      }
      console.log('Sending parsed result, content length:', article.content.length);
      sendResult(article);
    }, 50);
  } catch (e) {
    console.error('Parse error:', e, 'message:', e.message);
    sendError(e.message || 'Unknown parse error');
  }
})();
</script>
</body>
</html>`;
  console.log('Generated parser HTML length:', html.length);
  return html;
}
