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

  let updatedHtml = html;

  await Promise.allSettled(
    urls.map(async (url, i) => {
      const filename = urlToFilename(url, i);
      const dest = new File(dir, filename);
      try {
        const downloaded = await File.downloadFileAsync(url, dest);
        updatedHtml = updatedHtml.replaceAll(url, downloaded.uri);
      } catch {
        // keep original URL — image won't load offline but won't crash
      }
    })
  );

  return updatedHtml;
}
