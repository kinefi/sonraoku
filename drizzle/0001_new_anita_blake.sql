ALTER TABLE `articles` ADD `is_favorite` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `saved_at_idx` ON `articles` (`saved_at`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `articles` (`is_archived`,`is_read`);--> statement-breakpoint
CREATE INDEX `favorite_idx` ON `articles` (`is_archived`,`is_favorite`);