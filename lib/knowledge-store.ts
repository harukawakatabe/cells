import { env } from "cloudflare:workers";

import snapshotData from "@/data/knowledge-graph.json";

export type KnowledgeNode = (typeof snapshotData.nodes)[number];
export type KnowledgeEdge = (typeof snapshotData.edges)[number];
export type KnowledgeSnapshot = {
  meta: typeof snapshotData.meta;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
};

function snapshot(): KnowledgeSnapshot {
  return snapshotData as KnowledgeSnapshot;
}

async function loadFromD1(): Promise<KnowledgeSnapshot | null> {
  const db = env.DB;
  if (!db) return null;

  try {
    const count = await db.prepare("SELECT COUNT(*) AS count FROM concepts").first<{ count: number }>();
    if (!count?.count) return null;

    const [nodeRows, edgeRows, aliasRows] = await Promise.all([
      db.prepare(
        `SELECT id, abbreviation, chinese_name AS chineseName, english_name AS englishName,
          description, node_type AS nodeType, category, source_kind AS sourceKind,
          source_ref AS sourceRef, source_url AS sourceUrl, image_id AS imageId,
          image_mode AS imageMode FROM concepts`,
      ).all(),
      db.prepare(
        `SELECT id, source_concept_id AS source, predicate, target_concept_id AS target,
          label, evidence_status AS evidenceStatus, source_kind AS sourceKind,
          source_ref AS sourceRef, source_url AS sourceUrl, directed FROM relations`,
      ).all(),
      db.prepare("SELECT concept_id AS conceptId, label FROM aliases ORDER BY id").all(),
    ]);

    const aliases = new Map<string, string[]>();
    for (const row of aliasRows.results as Array<{ conceptId: string; label: string }>) {
      aliases.set(row.conceptId, [...(aliases.get(row.conceptId) ?? []), row.label]);
    }

    const nodes = (nodeRows.results as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      label: String(row.abbreviation || row.chineseName),
      aliases: aliases.get(String(row.id)) ?? [],
      externalId: "",
    })) as KnowledgeNode[];

    const edges = (edgeRows.results as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      directed: Boolean(row.directed),
    })) as KnowledgeEdge[];

    return {
      meta: {
        ...snapshotData.meta,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
      nodes,
      edges,
    };
  } catch {
    return null;
  }
}

export async function getKnowledgeSnapshot(): Promise<KnowledgeSnapshot> {
  return (await loadFromD1()) ?? snapshot();
}

export function selectNeighborhood(data: KnowledgeSnapshot, centerId: string, depth: number) {
  const existingCenter = data.nodes.some((node) => node.id === centerId) ? centerId : "cell:t-cell";
  const selected = new Set([existingCenter]);
  let frontier = new Set([existingCenter]);

  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const edge of data.edges) {
      if (frontier.has(edge.source)) next.add(edge.target);
      if (frontier.has(edge.target)) next.add(edge.source);
    }
    for (const id of next) selected.add(id);
    frontier = next;
    if (selected.size >= 70) break;
  }

  const orderedIds = [existingCenter, ...[...selected].filter((id) => id !== existingCenter)].slice(0, 70);
  const allowed = new Set(orderedIds);
  const nodes = orderedIds.map((id) => data.nodes.find((node) => node.id === id)).filter(Boolean) as KnowledgeNode[];
  const edges = data.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target)).slice(0, 140);

  return {
    centerId: existingCenter,
    nodes,
    edges,
    truncated: selected.size > nodes.length || data.edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target)).length > edges.length,
  };
}
