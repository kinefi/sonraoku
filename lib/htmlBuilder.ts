import readabilitySource from '@mozilla/readability/Readability.js';

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