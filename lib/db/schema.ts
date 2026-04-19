import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  title: text('title'),
  excerpt: text('excerpt'),
  html_content: text('html_content'),
  lang: text('lang'),
  is_read: integer('is_read').notNull().default(0),
  is_favorite: integer('is_favorite').notNull().default(0),
  is_archived: integer('is_archived').notNull().default(0),
  saved_at: integer('saved_at').notNull(),
  updated_at: integer('updated_at').notNull(),
  synced_at: integer('synced_at'),
}, (table) => {
  return {
    savedAtIndex: index('saved_at_idx').on(table.saved_at),
    statusIndex: index('status_idx').on(table.is_archived, table.is_read),
    favoriteIndex: index('favorite_idx').on(table.is_archived, table.is_favorite),
  };
});

export const cachedImages = sqliteTable('cached_images', {
  url: text('url').primaryKey(),
  local_path: text('local_path').notNull(),
  article_id: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
});

export const highlights = sqliteTable('highlights', {
  id: text('id').primaryKey(),
  article_id: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  selected_text: text('selected_text').notNull(),
  context_before: text('context_before').notNull(),
  context_after: text('context_after').notNull(),
  created_at: integer('created_at').notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').unique(),
});

export const articleTags = sqliteTable('article_tags', {
  article_id: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.article_id, t.tag_id] }),
}));