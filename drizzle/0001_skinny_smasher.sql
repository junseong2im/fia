CREATE TABLE `action_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`service_id` text NOT NULL,
	`service_title` text NOT NULL,
	`feature` text NOT NULL,
	`action` text NOT NULL,
	`amount` integer NOT NULL,
	`permission` text NOT NULL,
	`operation` text NOT NULL,
	`adapter` text NOT NULL,
	`status` text NOT NULL,
	`code` text NOT NULL,
	`detail` text NOT NULL,
	`external_ref` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `action_requests_idempotency_key_unique` ON `action_requests` (`idempotency_key`);