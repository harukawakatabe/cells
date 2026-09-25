"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Core } from "cytoscape";
import { ArrowLeft, ChevronRight, ExternalLink, Focus, Loader2, Network, RotateCcw, Search } from "lucide-react";

import assetsData from "@/data/assets.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type KnowledgeNode = {
  id: string;
  abbreviation: string;
  chineseName: string;
  englishName: string;
  label: string;
  description: string;
  nodeType: string;
  category: string;
  aliases: string[];
  sourceKind: string;
  sourceRef: string;
  sourceUrl: string;
  imageId: string;
  imageMode: string;
  externalId?: string;
};

type KnowledgeEdge = {
  id: string;
  source: string;
  target: string;
  predicate: string;
  label: string;
  evidenceStatus: string;
  sourceKind: string;
  sourceRef: string;
  sourceUrl: string;
  directed: boolean;
};

type GraphResponse = {
  centerId: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  truncated: boolean;
  meta: { totalNodes: number; totalEdges: number; visualSystem: string };
};

const nodeColors: Record<string, string> = {
  cell: "#0891b2",
  molecule: "#2563eb",
  process: "#7c3aed",
  organ: "#d97706",
  disease: "#dc2626",
  technique: "#475569",
  intervention: "#059669",
  concept: "#64748b",
  category: "#0f172a",
};

const typeLabels: Record<string, string> = {
  cell: "细胞",
  molecule: "分子/受体",
  process: "过程/通路",
  organ: "器官/组织",
  disease: "疾病",
  technique: "技术",
  intervention: "防治",
  concept: "概念",
  category: "分类",
};

const evidenceLabels: Record<string, string> = {
  "source-explicit": "原表明确",
  "ontology-curated": "本体校验",
  curated: "人工策展",
  "teaching-simplified": "教学简化",
};

const INITIAL_CENTER_ID = "cell:t-cell";

function NodeTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 bg-white font-normal">
      <span className="size-2 rounded-full" style={{ backgroundColor: nodeColors[type] ?? nodeColors.concept }} />
      {typeLabels[type] ?? type}
    </Badge>
  );
}

export function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [centerId, setCenterId] = useState(INITIAL_CENTER_ID);
  const [centerHistory, setCenterHistory] = useState<string[]>([]);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selectedId, setSelectedId] = useState("cell:t-cell");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/graph?center=${encodeURIComponent(centerId)}&depth=${depth}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("graph request failed");
        return response.json() as Promise<GraphResponse>;
      })
      .then((data) => {
        if (!active) return;
        setGraph(data);
        setSelectedId(data.centerId);
      })
      .catch(() => active && setError("知识网络暂时无法载入，请稍后重试。"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [centerId, depth]);

  useEffect(() => {
    const value = query.trim();
    if (!value) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`/api/concepts?query=${encodeURIComponent(value)}`, { cache: "no-store", signal: controller.signal })
        .then((response) => response.json() as Promise<{ nodes: KnowledgeNode[] }>)
        .then((data) => setResults(data.nodes))
        .catch(() => undefined);
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!graph || !containerRef.current) return;
    let disposed = false;
    import("cytoscape").then(({ default: cytoscape }) => {
      if (disposed || !containerRef.current) return;
      cyRef.current?.destroy();
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graph.nodes.map((node) => ({
            data: {
              id: node.id,
              label: node.label.length > 14 ? `${node.label.slice(0, 13)}…` : node.label,
              nodeType: node.nodeType,
              color: nodeColors[node.nodeType] ?? nodeColors.concept,
            },
          })),
          ...graph.edges.map((edge) => ({
            data: { id: edge.id, source: edge.source, target: edge.target, label: edge.label, evidence: edge.evidenceStatus },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "#0f172a",
              "font-family": "Arial, sans-serif",
              "font-size": 11,
              "font-weight": 600,
              "text-valign": "bottom",
              "text-margin-y": 8,
              "text-background-color": "#ffffff",
              "text-background-opacity": 0.92,
              "text-background-padding": 3,
              "text-background-shape": "roundrectangle",
              width: 34,
              height: 34,
              "border-width": 3,
              "border-color": "#ffffff",
              "overlay-opacity": 0,
            },
          },
          {
            selector: "node[nodeType = 'category']",
            style: { shape: "roundrectangle", width: 48, height: 30 },
          },
          {
            selector: `node[id = '${graph.centerId}']`,
            style: { width: 52, height: 52, "border-width": 5, "border-color": "#fbbf24" },
          },
          {
            selector: "node:selected",
            style: { "border-width": 5, "border-color": "#22d3ee" },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(label)",
              color: "#475569",
              "font-family": "Arial, sans-serif",
              "font-size": 8,
              "text-background-color": "#f8fafc",
              "text-background-opacity": 0.88,
              "text-background-padding": 2,
              "text-rotation": "autorotate",
              "arrow-scale": 0.75,
            },
          },
          {
            selector: "edge[evidence = 'teaching-simplified']",
            style: { "line-style": "dashed", "line-color": "#a78bfa", "target-arrow-color": "#a78bfa" },
          },
        ],
        layout: {
          name: graph.nodes.length <= 18 ? "cose" : "concentric",
          animate: false,
          fit: true,
          padding: 42,
          minNodeSpacing: 54,
        },
        minZoom: 0.45,
        maxZoom: 2.2,
        wheelSensitivity: 0.18,
      });
      cy.on("tap", "node", (event) => setSelectedId(event.target.id()));
      cyRef.current = cy;
    });
    return () => {
      disposed = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  const selected = graph?.nodes.find((node) => node.id === selectedId) ?? graph?.nodes[0];
  const selectedEdges = useMemo(
    () => graph?.edges.filter((edge) => edge.source === selectedId || edge.target === selectedId) ?? [],
    [graph, selectedId],
  );
  const assetsById = useMemo(() => Object.fromEntries(assetsData.assets.map((asset) => [asset.id, asset])), []);
  const selectedAsset = selected?.imageId ? assetsById[selected.imageId] : undefined;

  const beginGraphLoad = () => {
    setLoading(true);
    setError("");
  };

  const changeDepth = (nextDepth: 1 | 2) => {
    if (nextDepth === depth) return;
    beginGraphLoad();
    setDepth(nextDepth);
  };

  const navigateToCenter = (nodeId: string) => {
    if (nodeId === centerId) {
      setSelectedId(nodeId);
      return;
    }
    beginGraphLoad();
    setCenterHistory((history) => [...history, centerId].slice(-20));
    setCenterId(nodeId);
    setSelectedId(nodeId);
  };

  const goBack = () => {
    const previous = centerHistory.at(-1);
    if (!previous) return;
    beginGraphLoad();
    setCenterHistory((history) => history.slice(0, -1));
    setCenterId(previous);
    setSelectedId(previous);
  };

  const returnToStart = () => {
    beginGraphLoad();
    setCenterHistory([]);
    setCenterId(INITIAL_CENTER_ID);
    setSelectedId(INITIAL_CENTER_ID);
    setQuery("");
    setResults([]);
  };

  const chooseResult = (node: KnowledgeNode) => {
    navigateToCenter(node.id);
    setQuery("");
    setResults([]);
  };

  return (
    <section aria-labelledby="knowledge-title" className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><Network className="size-5 text-cyan-800" /><h2 id="knowledge-title" className="text-xl font-bold tracking-tight text-slate-950">免疫知识网络</h2></div>
          <p className="mt-1 text-sm text-slate-500">从一个概念出发查看局部关系。点击节点看证据，再将它设为新的中心。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={centerHistory.length === 0} onClick={goBack} className="gap-1.5"><ArrowLeft className="size-3.5" />返回上一步</Button>
          <Button type="button" size="sm" variant="outline" disabled={centerId === INITIAL_CENTER_ID} onClick={returnToStart} className="gap-1.5"><RotateCcw className="size-3.5" />回到起点</Button>
          <Button type="button" size="sm" variant={depth === 1 ? "default" : "outline"} onClick={() => changeDepth(1)}>一跳关系</Button>
          <Button type="button" size="sm" variant={depth === 2 ? "default" : "outline"} onClick={() => changeDepth(2)}>二跳展开</Button>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); }} placeholder="搜索细胞、分子、疾病、技术或缩写…" className="h-11 bg-white pl-9" />
        {query.trim() && results.length > 0 && (
          <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {results.map((node) => (
              <button key={node.id} type="button" onClick={() => chooseResult(node)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: nodeColors[node.nodeType] ?? nodeColors.concept }} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-900">{node.abbreviation || node.chineseName}</span><span className="block truncate text-xs text-slate-500">{node.chineseName} · {node.category}</span></span>
                <ChevronRight className="size-4 text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative min-h-[620px] bg-[radial-gradient(circle_at_center,#ffffff_0%,#f1f5f9_72%,#e2e8f0_100%)]">
          {loading && <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75"><Loader2 className="size-7 animate-spin text-cyan-700" /><span className="ml-2 text-sm font-medium text-slate-600">正在组织关系…</span></div>}
          {error && <div className="absolute inset-0 z-20 flex items-center justify-center p-8 text-center text-sm text-red-700">{error}</div>}
          <div ref={containerRef} className="h-[620px] w-full" role="img" aria-label="以当前概念为中心的免疫知识关系图" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur">
            {Object.entries(typeLabels).map(([type, label]) => <span key={type} className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ backgroundColor: nodeColors[type] }} />{label}</span>)}
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-[#fbfcfe] p-5 xl:border-l xl:border-t-0">
          {selected ? <div className="space-y-5">
            {selectedAsset && <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="flex h-28 items-center justify-center"><Image src={selectedAsset.file} alt={`${selected.chineseName}示意图`} width={176} height={112} className="h-28 w-44 object-contain" /></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500"><span>{selectedAsset.name} · {selectedAsset.author}</span><a href={`${assetsData.repository}/blob/main/${selectedAsset.sourcePath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-cyan-800 hover:underline">{selectedAsset.license}<ExternalLink className="size-3" /></a></div></div>}
            {!selectedAsset && <div className="flex h-24 items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white text-xs text-slate-500"><Network className="size-4" />Bioicons 暂无可靠匹配图示</div>}
            <div>
              <div className="flex flex-wrap items-center gap-2"><NodeTypeBadge type={selected.nodeType} /><Badge variant="secondary" className="font-normal">{selected.category}</Badge></div>
              <h3 className="mt-3 text-xl font-bold text-slate-950">{selected.abbreviation || selected.chineseName}</h3>
              <p className="mt-1 font-medium text-slate-700">{selected.chineseName}</p>
              <p className="mt-1 text-sm text-slate-500">{selected.englishName}</p>
            </div>
            <p className="text-sm leading-6 text-slate-700">{selected.description}</p>
            {selected.imageMode === "shared" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">该亚型复用 Bioicons 家族图示；图形不表示可凭普通形态区分此亚型。</div>}
            {selected.imageMode === "representative" && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">这是用于辅助识别概念类别的代表性图示，不是该分子、疾病或过程的一对一结构图。</div>}
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
              <p className="font-semibold text-slate-800">内容来源</p>
              <p className="mt-1">{selected.sourceRef}</p>
              {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-cyan-800 hover:underline">查看外部来源 <ExternalLink className="size-3" /></a>}
            </div>
            {selected.id !== graph?.centerId && <Button type="button" className="w-full gap-2" onClick={() => navigateToCenter(selected.id)}><Focus className="size-4" />以此概念为中心</Button>}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">当前邻接关系</h4>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                {selectedEdges.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">当前范围内没有更多关系。</p> : selectedEdges.map((edge) => {
                  const otherId = edge.source === selected.id ? edge.target : edge.source;
                  const other = graph?.nodes.find((node) => node.id === otherId);
                  if (!other) return null;
                  return <button key={edge.id} type="button" onClick={() => setSelectedId(other.id)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600">
                    <span className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{edge.source === selected.id ? edge.label : `被${edge.label}`}</span><Badge variant="outline" className={cn("shrink-0 text-[10px] font-normal", edge.evidenceStatus === "teaching-simplified" && "border-violet-200 text-violet-700")}>{evidenceLabels[edge.evidenceStatus] ?? edge.evidenceStatus}</Badge></span>
                    <span className="mt-1 block text-sm text-slate-600">{other.abbreviation || other.chineseName} · {other.chineseName}</span>
                  </button>;
                })}
              </div>
            </div>
          </div> : <p className="text-sm text-slate-500">选择节点查看详细信息。</p>}
        </aside>
      </div>
      {graph && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p>当前显示 {graph.nodes.length} 个节点、{graph.edges.length} 条关系；全库 {graph.meta.totalNodes} 个节点、{graph.meta.totalEdges} 条关系。</p>{graph.truncated && <p className="font-medium text-amber-700">二跳结果过多，已限制为可读范围。</p>}</div>}
    </section>
  );
}
