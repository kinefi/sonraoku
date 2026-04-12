import { Paths, File, Directory } from 'expo-file-system';

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;

async function downloadWithTimeout(url: string, dest: File): Promise<{ uri: string }> {
  const download = File.downloadFileAsync(url, dest);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Download timed out')), IMAGE_DOWNLOAD_TIMEOUT_MS)
  );
  return Promise.race([download, timeout]);
}

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
