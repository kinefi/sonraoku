import { articles, highlights, tags, rssFeeds, rssItems } from '@/lib/db/schema';

/**
 * Standardized Result types for database operations
 */
export type DbResult<T> = { data: T; error: null } | { data: null; error: unknown };
export type DbAction = { error: unknown | null };

/**
 * Inferred Domain Types from Drizzle Schema
 */
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Highlight = typeof highlights.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type RssItem = typeof rssItems.$inferSelect;

/**
 * Joined Types for UI
 */
export interface RssItemWithFeed {
  id: string;
  feedId: string;
  title: string;
  link: string;
  excerpt: string | null;
  pubDate: number | null;
  isRead: number;
  feedTitle: string | null;
  isDownloaded: string | null;
}