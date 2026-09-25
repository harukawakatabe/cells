import { getKnowledgeSnapshot, selectNeighborhood } from "@/lib/knowledge-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const center = url.searchParams.get("center") || "cell:t-cell";
  const depth = url.searchParams.get("depth") === "2" ? 2 : 1;
  const snapshot = await getKnowledgeSnapshot();
  const graph = selectNeighborhood(snapshot, center, depth);

  return Response.json(
    {
      ...graph,
      meta: {
        totalNodes: snapshot.meta.nodeCount,
        totalEdges: snapshot.meta.edgeCount,
        visualSystem: snapshot.meta.visualSystem,
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
