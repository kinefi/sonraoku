import { Paths, File, Directory } from 'expo-file-system';

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /src=["'](https?:\/\/[^"']+)["']/gi;
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
    if (name && name.length > 0 && name.length < 80) return name;
  } catch {
    // fall through
  }
  return `img_${index}`;
}

export async function cacheArticleImages(html: string, articleId: string): Promise<string> {
  const urls = extractImageUrls(html);
  if (urls.length === 0) return html;

  const dir = new Directory(Paths.document, 'images', articleId);
  dir.create();

  // Collect replacements first, then apply sequentially — avoids concurrent
  // mutation of the same string reference across async callbacks.
  const results = await Promise.allSettled(
    urls.map(async (url, i) => {
      const dest = new File(dir, urlToFilename(url, i));
      const downloaded = await File.downloadFileAsync(url, dest);
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
