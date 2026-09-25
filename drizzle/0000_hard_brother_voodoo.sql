CREATE TABLE `aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`concept_id` text NOT NULL,
	`label` text NOT NULL,
	`language` text DEFAULT 'und' NOT NULL,
	`alias_type` text DEFAULT 'alias' NOT NULL,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_aliases_concept_id` ON `aliases` (`concept_id`);--> statement-breakpoint
CREATE INDEX `idx_aliases_label` ON `aliases` (`label`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`file` text NOT NULL,
	`name` text NOT NULL,
	`author` text NOT NULL,
	`license` text NOT NULL,
	`license_url` text NOT NULL,
	`source_path` text NOT NULL,
	`visual_system` text DEFAULT 'Bioicons' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concept_assets` (
	`concept_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`role` text DEFAULT 'primary' NOT NULL,
	`match_level` text NOT NULL,
	PRIMARY KEY(`concept_id`, `asset_id`),
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`abbreviation` text DEFAULT '' NOT NULL,
	`chinese_name` text NOT NULL,
	`english_name` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`node_type` text NOT NULL,
	`category` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_ref` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`image_id` text DEFAULT '' NOT NULL,
	`image_mode` text DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_concepts_node_type` ON `concepts` (`node_type`);--> statement-breakpoint
CREATE INDEX `idx_concepts_category` ON `concepts` (`category`);--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_file` text NOT NULL,
	`source_hash` text NOT NULL,
	`record_count` integer NOT NULL,
	`imported_at` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_concept_id` text NOT NULL,
	`predicate` text NOT NULL,
	`target_concept_id` text NOT NULL,
	`label` text NOT NULL,
	`evidence_status` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_ref` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`directed` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`source_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_relations_source` ON `relations` (`source_concept_id`);--> statement-breakpoint
CREATE INDEX `idx_relations_target` ON `relations` (`target_concept_id`);--> statement-breakpoint
CREATE INDEX `idx_relations_predicate` ON `relations` (`predicate`);--> statement-breakpoint
CREATE TABLE `source_records` (
	`serial` integer PRIMARY KEY NOT NULL,
	`abbreviation` text NOT NULL,
	`english_name` text NOT NULL,
	`chinese_name` text NOT NULL,
	`definition` text NOT NULL,
	`category` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
PRAGMA optimize;
