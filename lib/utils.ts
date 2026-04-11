export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getReadTime(html: string | null): string {
  if (!html) return '';
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} dk okuma`;
}
