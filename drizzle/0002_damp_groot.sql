CREATE TABLE `rss_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`site_url` text,
	`icon_url` text,
	`last_synced_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rss_feeds_url_unique` ON `rss_feeds` (`url`);--> statement-breakpoint
CREATE TABLE `rss_items` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`excerpt` text,
	`author` text,
	`pub_date` integer,
	`is_read` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `rss_feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feed_link_idx` ON `rss_items` (`feed_id`,`link`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_article_tags` (
	`article_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`article_id`, `tag_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_article_tags`("article_id", "tag_id") SELECT "article_id", "tag_id" FROM `article_tags`;--> statement-breakpoint
DROP TABLE `article_tags`;--> statement-breakpoint
ALTER TABLE `__new_article_tags` RENAME TO `article_tags`;--> statement-breakpoint
PRAGMA foreign_keys=ON;