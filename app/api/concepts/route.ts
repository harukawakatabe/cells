import { getKnowledgeSnapshot } from "@/lib/knowledge-store";

function normalize(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalize(url.searchParams.get("query"));
  const snapshot = await getKnowledgeSnapshot();
  const nodes = snapshot.nodes
    .filter((node) => node.nodeType !== "category")
    .filter((node) => {
      if (!query) return node.nodeType === "cell";
      return normalize([
        node.abbreviation,
        node.chineseName,
        node.englishName,
        ...node.aliases,
        node.description,
      ].join(" ")).includes(query);
    })
    .sort((left, right) => {
      if (left.nodeType === "cell" && right.nodeType !== "cell") return -1;
      if (left.nodeType !== "cell" && right.nodeType === "cell") return 1;
      return left.label.localeCompare(right.label, "zh-CN");
    })
    .slice(0, 12);

  return Response.json({ nodes }, { headers: { "Cache-Control": "no-store" } });
}
