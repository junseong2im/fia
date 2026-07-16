ALTER TABLE `action_requests` ADD `owner_id` text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `owner_id` text DEFAULT 'demo' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `owner_id` text DEFAULT 'demo' NOT NULL;