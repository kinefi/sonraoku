import * as FileSystem from 'expo-file-system';
import { Paths, File as FileSystemFile, Directory as FileSystemDirectory } from 'expo-file-system';
import { IMAGE_CACHE_FOLDER, TIMEOUTS } from '@/lib/constants';

const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

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
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let name = pathname.split('/').pop()?.split('?')[0];
    
    // Keep filenames reasonably short and clean
    if (name && name.length > 0 && name.length < 80) {
      return `${index}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    }
  } catch { /* fall through */ }
  return `img_${index}_${Date.now()}`;
}

/**
 * Downloads a single image with a timeout.
 */
async function downloadWithTimeout(url: string, dest: FileSystemFile): Promise<{ uri: string }> {
  // Basic validation: ensure it looks like an image URL
  const lowerUrl = url.toLowerCase();
  const hasValidExt = VALID_IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext));
  
  if (!hasValidExt && !url.includes('data:image')) {
    throw new Error('Invalid image URL or extension');
  }

  const download = FileSystem.downloadAsync(url, dest.uri);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Download timed out')), TIMEOUTS.IMAGE_DOWNLOAD)
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
  const dir = new FileSystemDirectory(Paths.document, IMAGE_CACHE_FOLDER, articleId);
  if (!dir.exists) {
    await dir.create();
  }

  // Download all images in parallel (using Settled so one failure doesn't block others)
  const results = await Promise.allSettled(
    urls.map(async (url, i) => {
      const filename = urlToFilename(url, i);
      const dest = new FileSystemFile(dir, filename);

      // Avoid redundant downloads if file already exists
      if (dest.exists) {
        return { url, localUri: dest.uri };
      }

      const downloaded = await downloadWithTimeout(url, dest);
      
      if (onImageDownloaded) {
        onImageDownloaded(url, downloaded.uri);
      }
      
      return { url, localUri: downloaded.uri };
    })
  );

  // Filter successfully downloaded/verified images
  const successfulDownloads = results
    .filter((r): r is PromiseFulfilledResult<{url: string, localUri: string}> => r.status === 'fulfilled')
    .map(r => r.value);

  let updatedHtml = html;
  for (const result of successfulDownloads) {
    // Escape the URL for use in a Regex and replace only when it is inside quotes (HTML attributes)
    const escapedUrl = result.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const attributeRegex = new RegExp(`(["'])${escapedUrl}(["'])`, 'g');
    updatedHtml = updatedHtml.replace(attributeRegex, `$1${result.localUri}$2`);
  }

  return updatedHtml;
}

/**
 * Recursively calculates the size of a directory.
 */
async function getDirSize(dir: FileSystemDirectory): Promise<number> {
  let size = 0;
  const items = await dir.list();
  for (const item of items) {
    if (item instanceof FileSystemFile) {
      size += item.size;
    } else if (item instanceof FileSystemDirectory) {
      size += await getDirSize(item);
    }
  }
  return size;
}

export async function deleteArticleImageCache(articleId: string): Promise<void> {
  const dir = new FileSystemDirectory(Paths.document, IMAGE_CACHE_FOLDER, articleId);
  if (dir.exists) {
    await dir.delete();
  }
}

export async function getTotalCacheSize(): Promise<number> {
  const dir = new FileSystemDirectory(Paths.document, IMAGE_CACHE_FOLDER);
  if (!dir.exists) return 0;
  return getDirSize(dir);
}

export async function clearAllImageCache(): Promise<void> {
  const dir = new FileSystemDirectory(Paths.document, IMAGE_CACHE_FOLDER);
  if (dir.exists) {
    await dir.delete();
  }
}