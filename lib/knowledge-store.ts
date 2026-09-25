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

export async function getKnowledgeSnapshot(): Promise<KnowledgeSnapshot> {
  return snapshot();
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
