"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Database, ExternalLink, Grid3X3, Info, Network, Search, Table2, X } from "lucide-react";

import atlasData from "@/data/cell-atlas.json";
import assetsData from "@/data/assets.json";
import glossaryData from "@/data/glossary.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Cell = (typeof atlasData.cells)[number];
type GlossaryRecord = (typeof glossaryData.records)[number];
type Asset = (typeof assetsData.assets)[number];
type Selection = { kind: "cell"; value: Cell } | { kind: "term"; value: GlossaryRecord } | null;

const toneStyles: Record<string, { shell: string; dot: string; label: string }> = {
  amber: { shell: "border-amber-200/80 bg-amber-50/70", dot: "bg-amber-500", label: "text-amber-900" },
  blue: { shell: "border-blue-200/80 bg-blue-50/65", dot: "bg-blue-500", label: "text-blue-900" },
  teal: { shell: "border-teal-200/80 bg-teal-50/65", dot: "bg-teal-500", label: "text-teal-900" },
  violet: { shell: "border-violet-200/80 bg-violet-50/65", dot: "bg-violet-500", label: "text-violet-900" },
};

function normalize(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim();
}

function cellSearchText(cell: Cell) {
  return normalize([cell.abbreviation, ...cell.aliases, cell.englishName, cell.chineseName, cell.definition, cell.notes].join(" "));
}

function glossarySearchText(record: GlossaryRecord) {
  return normalize([record.abbreviation, record.englishName, record.chineseName, record.definition, record.category, record.notes].join(" "));
}

function CellCard({ cell, asset, tone, onSelect }: { cell: Cell; asset?: Asset; tone: string; onSelect: (cell: Cell) => void }) {
  const styles = toneStyles[tone] ?? toneStyles.blue;
  return (
    <HoverCard openDelay={240} closeDelay={90}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(cell)}
          className="group relative flex min-h-44 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_28px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          aria-label={`查看 ${cell.abbreviation} ${cell.chineseName} 详情`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-bold tracking-tight text-slate-950">{cell.abbreviation}</span>
                {cell.aliases.map((alias) => <Badge key={alias} variant="secondary" className="rounded-md px-1.5 font-mono text-[10px]">{alias}</Badge>)}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-700">{cell.chineseName}</p>
            </div>
            <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", styles.dot)} />
          </div>
          <div className="my-3 flex min-h-20 flex-1 items-center justify-center rounded-xl bg-slate-50/80 p-2">
            {asset ? <Image src={asset.file} alt={`${cell.chineseName}示意图`} width={96} height={80} className="h-20 w-24 object-contain transition duration-200 group-hover:scale-105" /> : <span className="text-xs text-slate-400">暂无图示</span>}
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="line-clamp-1 text-xs text-slate-500">{cell.englishName}</p>
            {cell.imageMode === "shared" && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">共享图示</span>}
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 rounded-xl border-slate-200 p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="font-semibold text-slate-950">{cell.abbreviation} · {cell.chineseName}</div>
          <Badge variant="outline" className="font-normal">{cell.kind === "precursor" ? "谱系前体" : "免疫细胞"}</Badge>
        </div>
        <p className="text-sm leading-6 text-slate-600">{cell.definition}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-cyan-800">点击查看完整信息 <span aria-hidden="true">→</span></div>
      </HoverCardContent>
    </HoverCard>
  );
}

function MiniCell({ cell, onSelect }: { cell: Cell; onSelect: (cell: Cell) => void }) {
  const asset = assetsData.assets.find((item) => item.id === cell.imageId);
  return (
    <button type="button" onClick={() => onSelect(cell)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600">
      {asset && <Image src={asset.file} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />}
      <span className="min-w-0"><span className="block font-mono text-sm font-bold text-slate-900">{cell.abbreviation}</span><span className="block truncate text-xs text-slate-500">{cell.chineseName}</span></span>
    </button>
  );
}

function LineageBranch({ title, cell, branchCells, tone, onSelect }: { title: string; cell: Cell; branchCells: Cell[]; tone: "blue" | "teal"; onSelect: (cell: Cell) => void }) {
  return (
    <div className={cn("rounded-2xl border p-4", tone === "blue" ? "border-blue-200 bg-blue-50/70" : "border-teal-200 bg-teal-50/70")}>
      <div className="mx-auto max-w-sm"><MiniCell cell={cell} onSelect={onSelect} /><div className={cn("mx-auto h-6 w-px", tone === "blue" ? "bg-blue-300" : "bg-teal-300")} /></div>
      <h3 className={cn("mb-3 text-xs font-bold uppercase tracking-[0.14em]", tone === "blue" ? "text-blue-800" : "text-teal-800")}>{title}分支</h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{branchCells.map((child) => <MiniCell key={child.id} cell={child} onSelect={onSelect} />)}</div>
    </div>
  );
}

function LineageView({ cells, onSelect }: { cells: Cell[]; onSelect: (cell: Cell) => void }) {
  const byId = Object.fromEntries(cells.map((cell) => [cell.id, cell])) as Record<string, Cell>;
  const lymphoidIds = ["b-cell", "plasma-cell", "t-cell", "th1", "th2", "th17", "tfh", "treg", "ctl", "nk", "ilc"];
  const myeloidIds = ["monocyte", "macrophage", "dendritic-cell", "cdc", "neutrophil", "eosinophil", "basophil", "mast-cell"];
  const specialIds = ["gamma-delta-t", "nkt", "inkt", "pdc", "langerhans-cell", "mdsc"];
  return (
    <section aria-labelledby="lineage-title" className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 id="lineage-title" className="text-lg font-bold tracking-tight text-slate-950">免疫细胞谱系关系</h2><p className="mt-1 text-sm leading-6 text-slate-500">用于建立学习框架的简化图；复杂或跨谱系来源已标为教学归类。</p></div>
          <Badge variant="outline" className="w-fit gap-1.5 border-amber-200 bg-amber-50 text-amber-900"><Info className="size-3.5" /> 教学型简图</Badge>
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fb_100%)] p-4 shadow-sm sm:p-7">
        <div className="mx-auto max-w-sm"><MiniCell cell={byId.hsc} onSelect={onSelect} /><div className="mx-auto h-8 w-px bg-slate-300" /><div className="mx-auto h-px w-1/2 bg-slate-300" /></div>
        <div className="grid gap-5 md:grid-cols-2">
          <LineageBranch title="共同淋巴样祖细胞" cell={byId.clp} branchCells={lymphoidIds.map((id) => byId[id]).filter(Boolean)} tone="blue" onSelect={onSelect} />
          <LineageBranch title="共同髓样祖细胞" cell={byId.cmp} branchCells={myeloidIds.map((id) => byId[id]).filter(Boolean)} tone="teal" onSelect={onSelect} />
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-violet-300 bg-violet-50/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-violet-950">组织定位与特殊亚群</h3><p className="mt-0.5 text-xs text-violet-700">这些细胞需要比二叉谱系更细的发育语境，因此单独归组。</p></div><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" /></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{specialIds.map((id) => byId[id]).filter(Boolean).map((cell) => <MiniCell key={cell.id} cell={cell} onSelect={onSelect} />)}</div>
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-950 p-5 text-white">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div><div className="flex items-center gap-2"><span className="rounded-md bg-cyan-400/15 px-2 py-1 font-mono text-sm font-bold text-cyan-200">APC</span><h3 className="font-semibold">抗原提呈细胞是功能集合</h3></div><p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-100/75">{atlasData.functionalGroups[0].definition}</p></div>
            <div className="flex flex-wrap gap-2">{atlasData.functionalGroups[0].memberIds.map((id) => { const cell = byId[id]; return <button key={id} type="button" onClick={() => onSelect(cell)} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20">{cell.abbreviation}</button>; })}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return <section><h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</h3><p className="mt-2 text-[15px] leading-7 text-slate-700">{value}</p></section>;
}

function DataChip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-medium text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}

function DetailSheet({ selection, setSelection }: { selection: Selection; setSelection: (value: Selection) => void }) {
  const cell = selection?.kind === "cell" ? selection.value : null;
  const term = selection?.kind === "term" ? selection.value : null;
  const asset = cell ? assetsData.assets.find((item) => item.id === cell.imageId) : undefined;
  const cluster = cell ? atlasData.clusters.find((item) => item.id === cell.clusterId) : undefined;
  return (
    <Sheet open={selection !== null} onOpenChange={(open) => !open && setSelection(null)}>
      <SheetContent className="w-full overflow-y-auto border-slate-200 bg-[#fbfcfe] max-sm:w-full max-sm:max-w-none sm:max-w-lg">
        {cell && <>
          <SheetHeader className="border-b border-slate-200 px-6 pb-5 pt-7">
            <div className="mb-4 flex h-32 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">{asset && <Image src={asset.file} alt={`${cell.chineseName}示意图`} width={160} height={112} className="h-28 w-40 object-contain" />}</div>
            <div className="flex flex-wrap items-center gap-2"><Badge className="rounded-md bg-cyan-950 font-mono text-white hover:bg-cyan-950">{cell.abbreviation}</Badge>{cell.aliases.map((alias) => <Badge key={alias} variant="secondary" className="font-mono">别名 {alias}</Badge>)}<Badge variant="outline">{cluster?.label}</Badge></div>
            <SheetTitle className="pt-1 text-2xl tracking-tight text-slate-950">{cell.chineseName}</SheetTitle><SheetDescription className="text-sm text-slate-500">{cell.englishName}</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-6 pb-10"><DetailBlock label="功能与释义" value={cell.definition} /><DetailBlock label="联想与备注" value={cell.notes || "原表未提供备注"} />
            <div className="grid grid-cols-2 gap-3"><DataChip label="展示分类" value={cluster?.label ?? "—"} /><DataChip label="原表分类" value={cell.sourceCategory} /><DataChip label="来源序号" value={cell.sourceSerials.join("、")} /><DataChip label="图示方式" value={cell.imageMode === "exact" ? "对应图示" : "共享基础图示"} /></div>
            {cell.imageMode === "shared" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">此亚群复用基础细胞图示。图形用于帮助记忆细胞家族，不表示能凭普通形态图区分该功能亚型。</div>}
            {asset && <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">图片来源与许可</p><p className="mt-2 text-sm font-semibold text-slate-900">{asset.name} · {asset.author}</p><div className="mt-3 flex flex-wrap gap-2"><a href={`${assetsData.repository}/blob/main/${asset.sourcePath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-800 hover:underline">Bioicons 源文件 <ExternalLink className="size-3.5" /></a><span className="text-slate-300">·</span><a href={asset.licenseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-800 hover:underline">{asset.license} <ExternalLink className="size-3.5" /></a></div></div>}
          </div>
        </>}
        {term && <><SheetHeader className="border-b border-slate-200 px-6 pb-5 pt-8"><div className="flex flex-wrap items-center gap-2"><Badge className="rounded-md bg-cyan-950 font-mono text-white hover:bg-cyan-950">{term.abbreviation}</Badge><Badge variant="outline">{term.category}</Badge></div><SheetTitle className="pt-2 text-2xl tracking-tight text-slate-950">{term.chineseName}</SheetTitle><SheetDescription>{term.englishName}</SheetDescription></SheetHeader><div className="space-y-6 px-6 pb-10"><DetailBlock label="释义" value={term.definition} /><DetailBlock label="联想与备注" value={term.notes || "原表未提供备注"} /><div className="grid grid-cols-2 gap-3"><DataChip label="所属分类" value={term.category} /><DataChip label="原表序号" value={String(term.serial)} /></div></div></>}
      </SheetContent>
    </Sheet>
  );
}

function HeaderMetric({ value, label }: { value: string; label: string }) {
  return <div className="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-sm sm:min-w-28 sm:px-4"><div className="font-mono text-xl font-bold text-cyan-200">{value}</div><div className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">{label}</div></div>;
}

function FilterButton({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: string }) {
  return <button type="button" onClick={onClick} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600", active ? "border-cyan-900 bg-cyan-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900")}>{tone && <span className={cn("h-2 w-2 rounded-full", toneStyles[tone]?.dot)} />}{label}</button>;
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center"><Search className="size-8 text-slate-300" /><h3 className="mt-3 font-semibold text-slate-800">没有匹配结果</h3><p className="mt-1 text-sm text-slate-500">换一个缩写或名称，或清除当前筛选。</p><Button type="button" variant="outline" size="sm" onClick={onClear} className="mt-4">清除筛选</Button></div>;
}

export function ImmuneAtlasApp() {
  const [query, setQuery] = useState("");
  const [activeCluster, setActiveCluster] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selection, setSelection] = useState<Selection>(null);
  const normalizedQuery = normalize(query);
  const filteredCells = useMemo(() => atlasData.cells.filter((cell) => (activeCluster === "all" || cell.clusterId === activeCluster) && (!normalizedQuery || cellSearchText(cell).includes(normalizedQuery))), [activeCluster, normalizedQuery]);
  const filteredTerms = useMemo(() => glossaryData.records.filter((record) => (activeCategory === "all" || record.category === activeCategory) && (!normalizedQuery || glossarySearchText(record).includes(normalizedQuery))), [activeCategory, normalizedQuery]);
  const assetsById = Object.fromEntries(assetsData.assets.map((asset) => [asset.id, asset])) as Record<string, Asset>;
  return (
    <main className="min-h-screen bg-[#f4f7fa] text-slate-900">
      <header className="relative overflow-hidden bg-[#071b2b] text-white">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,#22d3ee_0,transparent_25%),radial-gradient(circle_at_80%_10%,#818cf8_0,transparent_25%)]" />
        <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><span className="h-px w-7 bg-cyan-400" />Immunology Reference Atlas</div><h1 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl">免疫细胞交互图谱</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">从缩写进入细胞功能、谱系关系与完整术语库。内容来自同一份速查表，图示来源与许可可逐项追溯。</p></div><div className="grid grid-cols-3 gap-2 sm:gap-3"><HeaderMetric value="28" label="细胞概念" /><HeaderMetric value="326" label="术语记录" /><HeaderMetric value="17" label="原始分类" /></div></div>
          <div className="mt-6 max-w-2xl"><label htmlFor="global-search" className="sr-only">搜索缩写、名称或功能</label><div className="relative"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索缩写、中文名、英文名或功能…" className="h-12 rounded-xl border-white/15 bg-white/10 pl-10 pr-11 text-base text-white shadow-none placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30" />{query && <Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuery("")} aria-label="清空搜索" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:bg-white/10 hover:text-white"><X /></Button>}</div></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        <Tabs defaultValue="atlas" className="gap-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"><TabsList className="h-auto w-full justify-start gap-1 bg-slate-100 p-1 sm:w-auto"><TabsTrigger value="atlas" className="min-h-10 flex-1 gap-2 px-3 sm:flex-none"><Grid3X3 /> 细胞图谱</TabsTrigger><TabsTrigger value="lineage" className="min-h-10 flex-1 gap-2 px-3 sm:flex-none"><Network /> 谱系关系</TabsTrigger><TabsTrigger value="glossary" className="min-h-10 flex-1 gap-2 px-3 sm:flex-none"><Table2 /> 全部术语</TabsTrigger></TabsList><div className="flex items-center gap-2 px-2 pb-1 text-xs text-slate-500 sm:pb-0"><Database className="size-3.5" />Excel 静态转换 · 无需后端</div></div>
          <TabsContent value="atlas">
            <section aria-labelledby="atlas-title" className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 id="atlas-title" className="text-xl font-bold tracking-tight text-slate-950">按免疫家族浏览</h2><p className="mt-1 text-sm text-slate-500">悬停快速看功能，点击打开完整释义、来源行和图片许可。</p></div><div className="flex flex-wrap gap-2" aria-label="细胞分类筛选"><FilterButton active={activeCluster === "all"} onClick={() => setActiveCluster("all")} label={`全部 ${atlasData.cells.length}`} />{atlasData.clusters.map((cluster) => <FilterButton key={cluster.id} active={activeCluster === cluster.id} onClick={() => setActiveCluster(cluster.id)} label={`${cluster.shortLabel} ${atlasData.cells.filter((cell) => cell.clusterId === cluster.id).length}`} tone={cluster.tone} />)}</div></div>
              {filteredCells.length === 0 ? <EmptyState onClear={() => { setQuery(""); setActiveCluster("all"); }} /> : <div className="space-y-5">{atlasData.clusters.map((cluster) => { const clusterCells = filteredCells.filter((cell) => cell.clusterId === cluster.id); if (!clusterCells.length) return null; const styles = toneStyles[cluster.tone] ?? toneStyles.blue; return <section key={cluster.id} className={cn("rounded-3xl border p-4 sm:p-5", styles.shell)}><div className="mb-4 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", styles.dot)} /><h3 className={cn("font-bold", styles.label)}>{cluster.label}</h3></div><p className="mt-1.5 text-sm text-slate-600">{cluster.description}</p></div><span className="font-mono text-xs text-slate-400">{String(clusterCells.length).padStart(2, "0")}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{clusterCells.map((cell) => <CellCard key={cell.id} cell={cell} asset={assetsById[cell.imageId]} tone={cluster.tone} onSelect={(value) => setSelection({ kind: "cell", value })} />)}</div></section>; })}</div>}
            </section>
          </TabsContent>
          <TabsContent value="lineage"><LineageView cells={atlasData.cells} onSelect={(value) => setSelection({ kind: "cell", value })} /></TabsContent>
          <TabsContent value="glossary">
            <section aria-labelledby="glossary-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="glossary-title" className="text-lg font-bold tracking-tight text-slate-950">完整术语库</h2><p className="mt-1 text-sm text-slate-500">显示 {filteredTerms.length} / {glossaryData.meta.recordCount} 条；点击任意行查看完整内容。</p></div><label className="text-xs font-semibold text-slate-500">所属分类<select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} className="mt-1.5 block h-10 min-w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"><option value="all">全部分类（{glossaryData.categories.length}）</option>{glossaryData.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
              {filteredTerms.length === 0 ? <div className="p-5"><EmptyState onClear={() => { setQuery(""); setActiveCategory("all"); }} /></div> : <Table><TableHeader className="sticky top-0 z-10 bg-slate-50"><TableRow><TableHead className="w-28 pl-5">缩写</TableHead><TableHead className="min-w-48">中文名称</TableHead><TableHead className="min-w-64">英文全称</TableHead><TableHead className="min-w-[420px]">释义</TableHead><TableHead className="min-w-48 pr-5">所属分类</TableHead></TableRow></TableHeader><TableBody>{filteredTerms.map((record) => <TableRow key={record.serial} onClick={() => setSelection({ kind: "term", value: record })} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelection({ kind: "term", value: record }); }} className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600"><TableCell className="pl-5 font-mono font-bold text-cyan-900">{record.abbreviation}</TableCell><TableCell className="font-medium text-slate-800">{record.chineseName}</TableCell><TableCell className="text-slate-500">{record.englishName}</TableCell><TableCell className="whitespace-normal leading-6 text-slate-600">{record.definition}</TableCell><TableCell className="pr-5"><Badge variant="secondary" className="font-normal">{record.category}</Badge></TableCell></TableRow>)}</TableBody></Table>}
            </section>
          </TabsContent>
        </Tabs>
      </div>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10"><p>内容源：免疫学核心术语与缩写速查表 · 图片：Bioicons（逐图标注 CC BY 许可）</p><a href={assetsData.repository} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-cyan-800 hover:underline">查看 Bioicons 仓库 <ExternalLink className="size-3.5" /></a></div></footer>
      <DetailSheet selection={selection} setSelection={setSelection} />
    </main>
  );
}
