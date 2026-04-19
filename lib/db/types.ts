import { articles, highlights, tags } from './schema';

/**
 * Standardized Result types for database operations
 */
export type DbResult<T> = { data: T; error: null } | { data: null; error: any };
export type DbAction = { error: any | null };

/**
 * Inferred Domain Types from Drizzle Schema
 */
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Highlight = typeof highlights.$inferSelect;
export type Tag = typeof tags.$inferSelect;