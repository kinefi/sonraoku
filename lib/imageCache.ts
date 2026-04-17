import { Paths, File, Directory } from 'expo-file-system';

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;

/**
 * Extracts all potential image URLs from HTML attributes like src, srcset, and data-src.
 */
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /(?:src|srcset|data-src)=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Split srcset by commas and clean up descriptors like "1024w"
    const candidates = match[1].split(',').map(s => s.trim().split(' ')[0]);
    urls.push(...candidates.filter(u => u.startsWith('http')));
  }
  return [...new Set(urls)];
}

/**
 * Generates a safe local filename for a remote URL.
 */
function urlToFilename(url: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop()?.split('?')[0];
    // Keep filenames reasonably short and clean
    if (name && name.length > 0 && name.length < 80) return `${index}_${name}`;
  } catch { /* fall through */ }
  return `img_${index}_${Date.now()}`;
}

/**
 * Downloads a single image with a timeout.
 */
async function downloadWithTimeout(url: string, dest: File): Promise<{ uri: string }> {
  const download = File.downloadFileAsync(url, dest);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Download timed out')), IMAGE_DOWNLOAD_TIMEOUT_MS)
  );
  return Promise.race([download.then(() => ({ uri: dest.uri })), timeout]);
}

/**
 * Core logic: Extracts images from HTML, downloads them to a local directory,
 * and returns the updated HTML with local file URIs.
 */
export async function cacheArticleImages(
  html: string, 
  articleId: string,
  onImageDownloaded?: (url: string, localPath: string) => void
): Promise<string> {
  const urls = extractImageUrls(html);
  if (urls.length === 0) return html;

  // Create article-specific directory: {Documents}/images/{articleId}/
  const dir = new Directory(Paths.document, 'images', articleId);
  if (!dir.exists) {
    dir.create();
  }

  // Download all images in parallel (using Settled so one failure doesn't block others)
  const results = await Promise.allSettled(
    urls.map(async (url, i) => {
      const dest = new File(dir, urlToFilename(url, i));
      const downloaded = await downloadWithTimeout(url, dest);
      
      // Optional callback to save metadata to SQLite (cached_images table)
      if (onImageDownloaded) {
        onImageDownloaded(url, downloaded.uri);
      }
      
      return { url, localUri: downloaded.uri };
    })
  );

  let updatedHtml = html;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      // Replace all occurrences of the remote URL with the local file URI
      updatedHtml = updatedHtml.replaceAll(result.value.url, result.value.localUri);
    }
  }

  return updatedHtml;
}

/**
 * Recursively calculates the size of a directory.
 */
async function getDirSize(dir: Directory): Promise<number> {
  let size = 0;
  const items = dir.list();
  for (const item of items) {
    if (item instanceof File) {
      size += item.size;
    } else if (item instanceof Directory) {
      size += await getDirSize(item);
    }
  }
  return size;
}

export async function deleteArticleImageCache(articleId: string): Promise<void> {
  const dir = new Directory(Paths.document, 'images', articleId);
  if (dir.exists) {
    dir.delete();
  }
}

export async function getTotalCacheSize(): Promise<number> {
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) return 0;
  return getDirSize(dir);
}

export async function clearAllImageCache(): Promise<void> {
  const dir = new Directory(Paths.document, 'images');
  if (dir.exists) {
    dir.delete();
  }
}