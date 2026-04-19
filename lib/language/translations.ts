import { tr } from './tr';
import { en } from './en';

export type Lang = 'tr' | 'en';

export const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'tr', label: 'Türkçe' },
  { key: 'en', label: 'English' },
];

export const translations: Record<Lang, typeof tr> = { tr, en };
export type Translations = typeof tr;

/**
 * Simple helper to replace {key} in strings.
 * Usage: interpolate(t.readTime, { m: 5 })
 */
export function interpolate(str: string, params: Record<string, string | number>): string {
  return str.replace(/{(\w+)}/g, (_, key) => params[key]?.toString() ?? `{${key}}`);
}