import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const glossary = JSON.parse(await fs.readFile(path.join(root, "data/glossary.json"), "utf8"));
const atlas = JSON.parse(await fs.readFile(path.join(root, "data/cell-atlas.json"), "utf8"));

const categoryTypes = {
  "免疫细胞": "cell",
  "免疫器官与组织": "organ",
  "分化群(CD)与表面分子": "molecule",
  "免疫球蛋白与抗体": "molecule",
  "固有免疫分子与受体": "molecule",
  "细胞因子与趋化因子": "molecule",
  "补体系统": "molecule",
  "MHC/HLA与抗原提呈": "process",
  "信号通路与免疫调节": "process",
  "基础概念与综合": "concept",
  "免疫学技术": "technique",
  "疫苗与免疫防治": "intervention",
  "自身免疫病": "disease",
  "免疫缺陷": "disease",
  "超敏反应": "disease",
  "移植免疫": "process",
  "肿瘤免疫": "process",
};

const categoryIds = new Map(
  glossary.categories.map((category, index) => [category, `category:${String(index + 1).padStart(2, "0")}`]),
);
categoryIds.set("Cell Ontology 补充亚型", "category:cell-ontology");

const sourceSerialToCell = new Map();
for (const cell of atlas.cells) {
  for (const serial of cell.sourceSerials) sourceSerialToCell.set(String(serial), cell.id);
}

const nodes = [];
const edges = [];
const nodeById = new Map();
const edgeKeys = new Set();

function addNode(node) {
  if (nodeById.has(node.id)) return nodeById.get(node.id);
  nodes.push(node);
  nodeById.set(node.id, node);
  return node;
}

function addEdge(edge) {
  const key = `${edge.source}|${edge.predicate}|${edge.target}`;
  if (edge.source === edge.target || edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push({ id: `edge:${String(edges.length + 1).padStart(4, "0")}`, directed: true, ...edge });
}

for (const [category, id] of categoryIds) {
  addNode({
    id,
    abbreviation: "",
    chineseName: category,
    englishName: "Category",
    label: category,
    description: `来自速查表的“${category}”分类。`,
    nodeType: "category",
    category,
    aliases: [],
    sourceKind: category === "Cell Ontology 补充亚型" ? "curated" : "excel",
    sourceRef: category === "Cell Ontology 补充亚型" ? "Cell Ontology" : "Excel 分类",
    sourceUrl: "",
    imageId: "",
    imageMode: "none",
  });
}

for (const cell of atlas.cells) {
  const sourceRefs = cell.sourceSerials.map((serial) => `Excel #${serial}`);
  addNode({
    id: `cell:${cell.id}`,
    abbreviation: cell.abbreviation,
    chineseName: cell.chineseName,
    englishName: cell.englishName,
    label: cell.abbreviation || cell.chineseName,
    description: cell.definition,
    nodeType: "cell",
    category: cell.sourceCategory,
    aliases: cell.aliases,
    sourceKind: cell.sourceType || "excel",
    sourceRef: sourceRefs.join("、") || cell.externalId || "Cell Ontology",
    sourceUrl: cell.externalUrl || "",
    imageId: cell.imageId,
    imageMode: cell.imageMode,
    externalId: cell.externalId || "",
  });
  const categoryId = categoryIds.get(cell.sourceCategory);
  if (categoryId) {
    addEdge({
      source: `cell:${cell.id}`,
      target: categoryId,
      predicate: "categorized_as",
      label: "属于分类",
      evidenceStatus: cell.sourceType === "cell-ontology" ? "ontology-curated" : "source-explicit",
      sourceKind: cell.sourceType || "excel",
      sourceRef: sourceRefs.join("、") || cell.externalId || "Cell Ontology",
      sourceUrl: cell.externalUrl || "",
    });
  }
}

for (const record of glossary.records) {
  const cellId = sourceSerialToCell.get(String(record.serial));
  if (cellId) continue;
  const id = `term:${record.serial}`;
  addNode({
    id,
    abbreviation: record.abbreviation,
    chineseName: record.chineseName,
    englishName: record.englishName,
    label: record.abbreviation || record.chineseName,
    description: record.definition,
    nodeType: categoryTypes[record.category] || "concept",
    category: record.category,
    aliases: [],
    sourceKind: "excel",
    sourceRef: `Excel #${record.serial}`,
    sourceUrl: "",
    imageId: "",
    imageMode: "none",
  });
  addEdge({
    source: id,
    target: categoryIds.get(record.category),
    predicate: "categorized_as",
    label: "属于分类",
    evidenceStatus: "source-explicit",
    sourceKind: "excel",
    sourceRef: `Excel #${record.serial}`,
    sourceUrl: "",
  });
}

const relationPredicates = {
  "分化": "develops_into",
  "主要分支": "develops_into",
  "终末分化": "develops_into",
  "组织分化": "develops_into",
  "教学简化": "develops_into",
  "功能亚群": "has_subtype",
  "受体亚群": "has_subtype",
  "特殊亚群": "has_subtype",
  "亚群": "has_subtype",
  "主要亚群": "has_subtype",
  "教学归类": "has_subtype",
  "组织亚群": "has_subtype",
  "成熟状态": "has_state",
  "先天样亚群": "has_subtype",
  "抗原激活": "state_transition",
  "形成记忆": "state_transition",
  "再次刺激": "state_transition",
  "病理性扩增": "state_transition",
};

for (const relation of atlas.relations) {
  const target = atlas.cells.find((cell) => cell.id === relation.target);
  const isOntology = target?.sourceType === "cell-ontology";
  const isTeaching = relation.label.includes("教学");
  addEdge({
    source: `cell:${relation.source}`,
    target: `cell:${relation.target}`,
    predicate: relationPredicates[relation.label] || "related_to",
    label: relation.label,
    evidenceStatus: isOntology ? "ontology-curated" : isTeaching ? "teaching-simplified" : "curated",
    sourceKind: isOntology ? "cell-ontology" : "curation",
    sourceRef: isOntology ? target.externalId : "谱系策展",
    sourceUrl: isOntology ? target.externalUrl : "",
  });
}

const apcNode = glossary.records.find((record) => record.abbreviation === "APC");
if (apcNode) {
  for (const memberId of atlas.functionalGroups[0].memberIds) {
    addEdge({
      source: `cell:${memberId}`,
      target: `term:${apcNode.serial}`,
      predicate: "member_of",
      label: "典型成员",
      evidenceStatus: "curated",
      sourceKind: "excel+curation",
      sourceRef: `Excel #${apcNode.serial}`,
      sourceUrl: "",
    });
  }
}

const abbreviationToNode = new Map();
for (const node of nodes) {
  if (node.abbreviation) abbreviationToNode.set(node.abbreviation.toLocaleLowerCase("en"), node.id);
}

const curatedTermRelations = [
  ["cell:b-cell", "expresses", "BCR", "表达"],
  ["cell:t-cell", "expresses", "TCR", "表达"],
  ["cell:th1", "secretes", "IFN-γ", "分泌"],
  ["cell:th2", "secretes", "IL", "分泌多种白细胞介素"],
  ["cell:th17", "secretes", "IL", "分泌 IL-17 家族细胞因子"],
  ["cell:treg", "secretes", "TGF-β", "分泌"],
  ["cell:treg", "secretes", "IL", "分泌 IL-10 等白细胞介素"],
  ["cell:pdc", "secretes", "IFN-α/β", "大量产生"],
  ["cell:cdc1", "participates_in", "Cross-presentation", "擅长"],
  ["cell:naive-b", "expresses", "IgD", "表面表达"],
  ["cell:naive-b", "expresses", "IgM", "表面表达"],
  ["cell:naive-b", "expresses", "CD20", "表达"],
  ["cell:naive-t", "expresses", "CD45RA", "典型表达"],
  ["cell:cdc2", "expresses", "CD11b", "常表达"],
];

for (const [source, predicate, abbreviation, label] of curatedTermRelations) {
  const target = abbreviationToNode.get(abbreviation.toLocaleLowerCase("en"));
  if (!target || !nodeById.has(source)) continue;
  const sourceNode = nodeById.get(source);
  addEdge({
    source,
    target,
    predicate,
    label,
    evidenceStatus: sourceNode.sourceKind === "cell-ontology" ? "ontology-curated" : "source-explicit",
    sourceKind: sourceNode.sourceKind,
    sourceRef: sourceNode.sourceRef,
    sourceUrl: sourceNode.sourceUrl,
  });
}

const searchableTerms = [];
for (const record of glossary.records) {
  const nodeId = sourceSerialToCell.has(String(record.serial))
    ? `cell:${sourceSerialToCell.get(String(record.serial))}`
    : `term:${record.serial}`;
  if (record.abbreviation.length >= 3) {
    searchableTerms.push({ nodeId, value: record.abbreviation, mode: "token" });
  }
  if (record.chineseName.length >= 4) searchableTerms.push({ nodeId, value: record.chineseName, mode: "includes" });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const record of glossary.records) {
  const source = sourceSerialToCell.has(String(record.serial))
    ? `cell:${sourceSerialToCell.get(String(record.serial))}`
    : `term:${record.serial}`;
  const text = `${record.definition} ${record.notes}`;
  let matches = 0;
  for (const candidate of searchableTerms) {
    if (candidate.nodeId === source || matches >= 6) continue;
    const found = candidate.mode === "includes"
      ? text.includes(candidate.value)
      : new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(candidate.value)}(?=$|[^A-Za-z0-9])`, "i").test(text);
    if (!found) continue;
    addEdge({
      source,
      target: candidate.nodeId,
      predicate: "mentions",
      label: "释义提及",
      evidenceStatus: "source-explicit",
      sourceKind: "excel",
      sourceRef: `Excel #${record.serial}`,
      sourceUrl: "",
    });
    matches += 1;
  }
}

const countsByType = Object.fromEntries(
  [...new Set(nodes.map((node) => node.nodeType))].sort().map((type) => [type, nodes.filter((node) => node.nodeType === type).length]),
);

const output = {
  meta: {
    generatedFrom: ["glossary.json", "cell-atlas.json"],
    nodeCount: nodes.length,
    edgeCount: edges.length,
    countsByType,
    visualSystem: "Bioicons",
    evidenceStatuses: ["source-explicit", "ontology-curated", "curated", "teaching-simplified"],
  },
  nodes,
  edges,
};

const text = `${JSON.stringify(output, null, 2)}\n`;
await fs.writeFile(path.join(root, "data/knowledge-graph.json"), text);
await fs.writeFile(path.join(root, "public/data/knowledge-graph.json"), text);
console.log(JSON.stringify(output.meta));
