CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`status` text NOT NULL,
	`extracted_length` integer DEFAULT 0 NOT NULL,
	`preview` text DEFAULT '' NOT NULL,
	`signals_json` text DEFAULT '{}' NOT NULL,
	`service_id` text DEFAULT 'contract' NOT NULL,
	`feature` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_object_key_unique` ON `documents` (`object_key`);