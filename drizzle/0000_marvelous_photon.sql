CREATE TABLE `alert_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text NOT NULL,
	`rule_type` text NOT NULL,
	`threshold_cents` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_alert_rules_member_type` ON `alert_rules` (`member_id`,`rule_type`);--> statement-breakpoint
CREATE TABLE `filings` (
	`doc_id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`filing_type` text NOT NULL,
	`filing_year` integer NOT NULL,
	`filed_at` text NOT NULL,
	`source_index_url` text NOT NULL,
	`source_pdf_url` text NOT NULL,
	`discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`status` text NOT NULL,
	`filing_count` integer DEFAULT 0 NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `tracked_members` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`display_name` text NOT NULL,
	`chamber` text DEFAULT 'house' NOT NULL,
	`state_district` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
