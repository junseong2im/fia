CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`service_title` text NOT NULL,
	`feature` text NOT NULL,
	`action` text NOT NULL,
	`amount` integer NOT NULL,
	`permission` text NOT NULL,
	`status` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
