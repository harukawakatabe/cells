import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

import assetsData from "@/data/assets.json";
import graphData from "@/data/knowledge-graph.json";
import glossaryData from "@/data/glossary.json";

async function runInChunks(db: D1Database, statements: D1PreparedStatement[], size = 50) {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

export async function replaceKnowledgeData(db: D1Database) {
  await db.batch([
    db.prepare("DELETE FROM concept_assets"),
    db.prepare("DELETE FROM assets"),
    db.prepare("DELETE FROM relations"),
    db.prepare("DELETE FROM aliases"),
    db.prepare("DELETE FROM concepts"),
    db.prepare("DELETE FROM source_records"),
  ]);

  await runInChunks(db, glossaryData.records.map((record) => db.prepare(
    `INSERT INTO source_records
      (serial, abbreviation, english_name, chinese_name, definition, category, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(Number(record.serial), record.abbreviation, record.englishName, record.chineseName, record.definition, record.category, record.notes)));

  await runInChunks(db, graphData.nodes.map((node) => db.prepare(
    `INSERT INTO concepts
      (id, abbreviation, chinese_name, english_name, description, node_type, category,
       source_kind, source_ref, source_url, image_id, image_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(node.id, node.abbreviation, node.chineseName, node.englishName, node.description, node.nodeType,
    node.category, node.sourceKind, node.sourceRef, node.sourceUrl, node.imageId, node.imageMode)));

  const aliasStatements = graphData.nodes.flatMap((node) => node.aliases.map((alias, index) => db.prepare(
    "INSERT INTO aliases (id, concept_id, label, language, alias_type) VALUES (?, ?, ?, ?, ?)",
  ).bind(`${node.id}:alias:${index + 1}`, node.id, alias, "und", "alias")));
  await runInChunks(db, aliasStatements);

  await runInChunks(db, graphData.edges.map((edge) => db.prepare(
    `INSERT INTO relations
      (id, source_concept_id, predicate, target_concept_id, label, evidence_status,
       source_kind, source_ref, source_url, directed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(edge.id, edge.source, edge.predicate, edge.target, edge.label, edge.evidenceStatus,
    edge.sourceKind, edge.sourceRef, edge.sourceUrl, edge.directed ? 1 : 0)));

  await runInChunks(db, assetsData.assets.map((asset) => db.prepare(
    `INSERT INTO assets
      (id, file, name, author, license, license_url, source_path, visual_system)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(asset.id, asset.file, asset.name, asset.author, asset.license, asset.licenseUrl,
    asset.sourcePath, assetsData.visualSystem)));

  const conceptAssetStatements = graphData.nodes
    .filter((node) => node.imageId)
    .map((node) => db.prepare(
      "INSERT INTO concept_assets (concept_id, asset_id, role, match_level) VALUES (?, ?, ?, ?)",
    ).bind(node.id, node.imageId, "primary", node.imageMode));
  await runInChunks(db, conceptAssetStatements);

  return {
    sourceRecords: glossaryData.records.length,
    concepts: graphData.nodes.length,
    relations: graphData.edges.length,
    assets: assetsData.assets.length,
  };
}
