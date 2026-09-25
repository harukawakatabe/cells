import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceRecords = sqliteTable("source_records", {
  serial: integer("serial").primaryKey(),
  abbreviation: text("abbreviation").notNull(),
  englishName: text("english_name").notNull(),
  chineseName: text("chinese_name").notNull(),
  definition: text("definition").notNull(),
  category: text("category").notNull(),
  notes: text("notes").notNull().default(""),
});

export const concepts = sqliteTable(
  "concepts",
  {
    id: text("id").primaryKey(),
    abbreviation: text("abbreviation").notNull().default(""),
    chineseName: text("chinese_name").notNull(),
    englishName: text("english_name").notNull().default(""),
    description: text("description").notNull().default(""),
    nodeType: text("node_type").notNull(),
    category: text("category").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceRef: text("source_ref").notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    imageId: text("image_id").notNull().default(""),
    imageMode: text("image_mode").notNull().default("none"),
  },
  (table) => [
    index("idx_concepts_node_type").on(table.nodeType),
    index("idx_concepts_category").on(table.category),
  ],
);

export const aliases = sqliteTable(
  "aliases",
  {
    id: text("id").primaryKey(),
    conceptId: text("concept_id").notNull().references(() => concepts.id),
    label: text("label").notNull(),
    language: text("language").notNull().default("und"),
    aliasType: text("alias_type").notNull().default("alias"),
  },
  (table) => [index("idx_aliases_concept_id").on(table.conceptId), index("idx_aliases_label").on(table.label)],
);

export const relations = sqliteTable(
  "relations",
  {
    id: text("id").primaryKey(),
    sourceConceptId: text("source_concept_id").notNull().references(() => concepts.id),
    predicate: text("predicate").notNull(),
    targetConceptId: text("target_concept_id").notNull().references(() => concepts.id),
    label: text("label").notNull(),
    evidenceStatus: text("evidence_status").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceRef: text("source_ref").notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    directed: integer("directed", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    index("idx_relations_source").on(table.sourceConceptId),
    index("idx_relations_target").on(table.targetConceptId),
    index("idx_relations_predicate").on(table.predicate),
  ],
);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  file: text("file").notNull(),
  name: text("name").notNull(),
  author: text("author").notNull(),
  license: text("license").notNull(),
  licenseUrl: text("license_url").notNull(),
  sourcePath: text("source_path").notNull(),
  visualSystem: text("visual_system").notNull().default("Bioicons"),
});

export const conceptAssets = sqliteTable(
  "concept_assets",
  {
    conceptId: text("concept_id").notNull().references(() => concepts.id),
    assetId: text("asset_id").notNull().references(() => assets.id),
    role: text("role").notNull().default("primary"),
    matchLevel: text("match_level").notNull(),
  },
  (table) => [primaryKey({ columns: [table.conceptId, table.assetId] })],
);

export const importRuns = sqliteTable("import_runs", {
  id: text("id").primaryKey(),
  sourceFile: text("source_file").notNull(),
  sourceHash: text("source_hash").notNull(),
  recordCount: integer("record_count").notNull(),
  importedAt: text("imported_at").notNull(),
  status: text("status").notNull(),
});
