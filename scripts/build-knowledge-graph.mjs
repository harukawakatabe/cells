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

const exactVisuals = new Map(Object.entries({
  BM: ["bone-marrow", "exact"],
  LN: ["lymph-node", "exact"],
  Spl: ["spleen", "exact"],
  Ig: ["immunoglobulin", "exact"],
  Ab: ["antibody", "exact"],
  "MHC-I": ["mhc-i", "exact"],
  "MHC-II": ["mhc-ii", "exact"],
  TCR: ["tcr-cd3", "exact"],
  HIV: ["hiv-virus", "exact"],
  FCM: ["flow-cytometer", "exact"],
  FACS: ["flow-cytometer", "exact"],
  WB: ["western-blot", "exact"],
  "Phage display": ["phage", "exact"],
}));

const representativeVisuals = new Map();
function mapRepresentative(abbreviations, imageId) {
  for (const abbreviation of abbreviations) representativeVisuals.set(abbreviation, [imageId, "representative"]);
}

mapRepresentative(["IS", "MALT", "TDA"], "lymphatic-system");
mapRepresentative(["PP", "GALT"], "intestine");
mapRepresentative(["BALT"], "lung");
mapRepresentative(["SALT"], "skin");
mapRepresentative(["IgG", "IgA", "sIgA", "IgM", "IgE", "IgD", "mIg"], "immunoglobulin");
mapRepresentative(["Fab", "Fc", "F(ab')2", "mAb", "scFv", "BsAb", "Antitoxin", "Titer"], "antibody");
mapRepresentative(["Ag", "Hapten", "Epitope", "ELISA", "ELISPOT", "RIA", "SRID"], "antibody-ligand");
mapRepresentative(["MHC", "HLA", "BCR", "Tetramer"], "receptor");
mapRepresentative(["CD", "CD3", "CD4", "CD8", "CD19", "CD20", "CD25", "CD28", "CD80", "CD86", "CD40", "CD40L", "CD154", "CTLA-4", "PD-1", "PD-L1", "CD56", "CD16", "CD64", "CD23", "CD21", "CD35", "CD11b", "CD14", "CD45", "CD45RA", "CD45RO", "CD34", "LFA-1", "ICAM-1", "VCAM-1", "VLA-4", "L-Selectin", "PRR", "TLR", "RLR", "NLR", "CLR", "ChemR", "CR1", "CR2", "CR3", "CR4"], "receptor");
mapRepresentative(["CK", "IL", "IFN", "IFN-α/β", "IFN-γ", "TNF", "TGF-β", "CSF", "G-CSF", "GM-CSF", "EPO", "TPO", "SCF", "TSLP", "LIF", "Chemokine", "MCP-1", "RANTES", "IL-8", "SDF-1", "C1-C9", "MBL", "MASP", "C3b", "iC3b", "DAF", "MCP", "CD59"], "protein");
mapRepresentative(["IHC", "IF", "Hybridoma"], "microscope");
mapRepresentative(["IEP", "CIE"], "electrophoresis");
mapRepresentative(["Single-cell RNA-seq"], "dna-sequencer");
mapRepresentative(["Active immunization", "Attenuated vaccine", "Inactivated vaccine", "Subunit vaccine", "Conjugate vaccine", "Vector vaccine", "Toxoid", "Adjuvant", "Booster", "Cancer vaccine"], "vaccine");
mapRepresentative(["mRNA vaccine"], "rna");
mapRepresentative(["DNA vaccine"], "dna");
mapRepresentative(["TAA", "TSA", "CEA", "AFP", "Tumor escape", "Immunoediting", "TMB", "MSI", "Neoantigen"], "tumor");
mapRepresentative(["AIDS"], "hiv-virus");

function termVisual(record) {
  const visual = exactVisuals.get(record.abbreviation) ?? representativeVisuals.get(record.abbreviation);
  return visual ? { imageId: visual[0], imageMode: visual[1] } : { imageId: "", imageMode: "none" };
}

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
  const visual = termVisual(record);
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
    imageId: visual.imageId,
    imageMode: visual.imageMode,
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

const expertRelations = [
  ["Innate immunity", "is_a", "Immunity", "免疫类型"],
  ["Adaptive immunity", "is_a", "Immunity", "免疫类型"],
  ["Humoral response", "is_a", "Adaptive immunity", "适应性应答"],
  ["Cellular response", "is_a", "Adaptive immunity", "适应性应答"],
  ["Primary response", "is_a", "Adaptive immunity", "应答阶段"],
  ["Secondary response", "is_a", "Adaptive immunity", "应答阶段"],
  ["IgG", "isotype_of", "Ig", "同种型"],
  ["IgA", "isotype_of", "Ig", "同种型"],
  ["IgM", "isotype_of", "Ig", "同种型"],
  ["IgE", "isotype_of", "Ig", "同种型"],
  ["IgD", "isotype_of", "Ig", "同种型"],
  ["sIgA", "form_of", "IgA", "分泌型"],
  ["mIg", "form_of", "Ig", "膜型"],
  ["Fab", "part_of", "Ig", "结构片段"],
  ["Fc", "part_of", "Ig", "结构片段"],
  ["F(ab')2", "derived_from", "Ig", "抗体片段"],
  ["mAb", "is_a", "Ab", "抗体类型"],
  ["BsAb", "is_a", "Ab", "抗体类型"],
  ["MHC-I", "is_a", "MHC", "分子类别"],
  ["MHC-II", "is_a", "MHC", "分子类别"],
  ["HLA", "human_designation_of", "MHC", "人类MHC命名"],
  ["MHC-I", "participates_in", "Antigen presentation", "参与"],
  ["MHC-II", "participates_in", "Antigen presentation", "参与"],
  ["Cross-presentation", "is_a", "Antigen presentation", "特殊途径"],
  ["Peptide loading", "part_of", "Antigen presentation", "关键环节"],
  ["TAP", "participates_in", "Peptide loading", "参与"],
  ["HLA-DM", "participates_in", "Peptide loading", "参与"],
  ["FACS", "is_a", "FCM", "带分选功能"],
  ["ELISPOT", "derived_from", "ELISA", "衍生技术"],
  ["Co-IP", "is_a", "IP", "联合免疫沉淀"],
  ["CTLA-4", "is_a", "Checkpoint", "免疫检查点"],
  ["PD-1", "is_a", "Checkpoint", "免疫检查点"],
  ["PD-L1", "binds", "PD-1", "配体结合"],
  ["Type I", "is_a", "HS", "超敏反应分型"],
  ["Type II", "is_a", "HS", "超敏反应分型"],
  ["Type III", "is_a", "HS", "超敏反应分型"],
  ["Type IV", "is_a", "HS", "超敏反应分型"],
  ["DTH", "is_a", "Type IV", "典型形式"],
  ["Anaphylaxis", "associated_with", "Type I", "典型表现"],
  ["Arthus", "associated_with", "Type III", "典型表现"],
  ["Serum sickness", "associated_with", "Type III", "典型表现"],
  ["SCID", "is_a", "PID", "免疫缺陷类型"],
  ["XLA", "is_a", "PID", "免疫缺陷类型"],
  ["CVID", "is_a", "PID", "免疫缺陷类型"],
  ["CGD", "is_a", "PID", "免疫缺陷类型"],
  ["WAS", "is_a", "PID", "免疫缺陷类型"],
  ["DGS", "is_a", "PID", "免疫缺陷类型"],
  ["HIGM", "is_a", "PID", "免疫缺陷类型"],
  ["LAD", "is_a", "PID", "免疫缺陷类型"],
  ["AIDS", "caused_by", "HIV", "由其导致"],
  ["RA", "is_a", "AID", "自身免疫病类型"],
  ["SLE", "is_a", "AID", "自身免疫病类型"],
  ["MS", "is_a", "AID", "自身免疫病类型"],
  ["T1DM", "is_a", "AID", "自身免疫病类型"],
  ["MG", "is_a", "AID", "自身免疫病类型"],
  ["GD", "is_a", "AID", "自身免疫病类型"],
  ["HT", "is_a", "AID", "自身免疫病类型"],
  ["Attenuated vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["Inactivated vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["Subunit vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["Conjugate vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["mRNA vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["DNA vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["Vector vaccine", "is_a", "Active immunization", "主动免疫方式"],
  ["Toxoid", "is_a", "Active immunization", "主动免疫方式"],
  ["Antitoxin", "is_a", "Passive immunization", "被动免疫制剂"],
];

for (const [sourceAbbreviation, predicate, targetAbbreviation, label] of expertRelations) {
  const source = abbreviationToNode.get(sourceAbbreviation.toLocaleLowerCase("en"));
  const target = abbreviationToNode.get(targetAbbreviation.toLocaleLowerCase("en"));
  if (!source || !target) continue;
  addEdge({
    source,
    target,
    predicate,
    label,
    evidenceStatus: "curated",
    sourceKind: "expert-curation",
    sourceRef: "免疫学标准概念关系策展",
    sourceUrl: "",
  });
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
    relationPolicy: "Only explicit ontology, source-backed, or expert-curated semantic relations; text co-occurrence is excluded.",
    evidenceStatuses: ["source-explicit", "ontology-curated", "curated", "teaching-simplified"],
  },
  nodes,
  edges,
};

const text = `${JSON.stringify(output, null, 2)}\n`;
await fs.writeFile(path.join(root, "data/knowledge-graph.json"), text);
await fs.writeFile(path.join(root, "public/data/knowledge-graph.json"), text);
console.log(JSON.stringify(output.meta));
