#!/usr/bin/env node
/**
 * Builds docs/requirements/ica-maxi-promo-picker-catalog.json from:
 * - docs/requirements/ica-maxi-initial-state-raw.json → data.categories (nav tree)
 * - docs/requirements/ica-maxi-catalog-*-raw.json snapshots merged onto matching fullURLPath nodes
 *
 * Output: categories (filter groups) + items (leaf pickables for promo_watchlist suggestions).
 *
 * Usage: node scripts/build-ica-maxi-promo-picker-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const reqs = path.join(repoRoot, "docs/requirements");

const INITIAL = path.join(reqs, "ica-maxi-initial-state-raw.json");
const OUT = path.join(reqs, "ica-maxi-promo-picker-catalog.json");
const OUT_DASHBOARD = path.join(
  repoRoot,
  "apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json",
);

/** Match build-ica-maxi-category-menu.mjs */
const EXCLUDED_ROOT_NAMES = new Set(["Påsk"]);

/** Snapshots: parent fullURLPath → JSON filename (array of ICA category nodes) */
const SNAPSHOTS = [
  {
    parentPath: "Frukt-Grönt/Frukt",
    file: "ica-maxi-catalog-frukt-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Färska-bär",
    file: "ica-maxi-catalog-farska-bar-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Färska-kryddor",
    file: "ica-maxi-catalog-farska-kryddor-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Grönsaker",
    file: "ica-maxi-catalog-gronsaker-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Kål",
    file: "ica-maxi-catalog-kal-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Lök",
    file: "ica-maxi-catalog-lok-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Potatis",
    file: "ica-maxi-catalog-potatis-raw.json",
  },
  {
    parentPath: "Frukt-Grönt/Rotfrukter",
    file: "ica-maxi-catalog-rot-frukter-raw.json",
  },
  {
    parentPath: "Dryck/Juice-Fruktdryck",
    file: "ica-maxi-catalog-juice-fruktdryck-raw.json",
  },
  {
    parentPath: "Dryck",
    file: "ica-maxi-catalog-dryck-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Ägg-Jäst",
    file: "ica-maxi-catalog-agg-jast-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Mjölk",
    file: "ica-maxi-catalog-mjolk-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Filmjölk",
    file: "ica-maxi-catalog-filmjolk-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Ost",
    file: "ica-maxi-catalog-ost-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Grädde",
    file: "ica-maxi-catalog-gradde-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Smör-Margarin",
    file: "ica-maxi-catalog-smor-magarin-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Crème-fraiche",
    file: "ica-maxi-catalog-creme-fraiche-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Gräddfil",
    file: "ica-maxi-catalog-graddfil-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Kvarg",
    file: "ica-maxi-catalog-kvarg-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Cottage-cheese",
    file: "ica-maxi-catalog-cottage-cheese-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Kylda-mellanmål-desserter",
    file: "ica-maxi-catalog-cottage-kylda-mellanmal-desserter-raw.json",
  },
  {
    parentPath: "Mejeri-Ost/Yoghurt",
    file: "ica-maxi-catalog-yoghurt-raw.json",
  },
  {
    parentPath: "Fisk-Skaldjur",
    file: "ica-maxi-catalog-fisk-skaldjur-raw.json",
  },
  {
    parentPath: "Bröd-Kakor",
    file: "ica-maxi-catalog-brod-kakor-raw.json",
  },
  {
    parentPath: "Barn",
    file: "ica-maxi-catalog-barn-raw.json",
  },
  {
    parentPath: "Fryst",
    file: "ica-maxi-catalog-fryst-raw.json",
  },
  {
    parentPath: "Glass-Godis-Snacks",
    file: "ica-maxi-catalog-glass-godis-snacks-raw.json",
  },
  {
    parentPath: "Grill",
    file: "ica-maxi-catalog-grill-raw.json",
  },
  {
    parentPath: "Skafferi",
    file: "ica-maxi-catalog-skafferi-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Delikatesschark",
    file: "ica-maxi-catalog-fageldelikatesschark-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Inälvsmat",
    file: "ica-maxi-catalog-inalvsmat-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Korv",
    file: "ica-maxi-catalog-korv-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Kött",
    file: "ica-maxi-catalog-kott-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Köttfärs",
    file: "ica-maxi-catalog-kott-fars-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Kyckling-Fågel",
    file: "ica-maxi-catalog-kyckling-fagel-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Matchark",
    file: "ica-maxi-catalog-matchark-raw.json",
  },
  {
    parentPath: "Kött-Chark-Fågel/Pålägg",
    file: "ica-maxi-catalog-palagg-raw.json",
  },
];

const raw = JSON.parse(fs.readFileSync(INITIAL, "utf8"));
const cat = raw.data?.categories;
if (!cat?.categories || !cat.root) {
  console.error("Missing data.categories");
  process.exit(1);
}

const byId = cat.categories;

/** Preserve manually curated item labels across catalog rebuilds. */
const existingLabelsById = new Map();
for (const p of [OUT_DASHBOARD, OUT]) {
  if (!fs.existsSync(p)) continue;
  try {
    const existing = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const item of existing.items ?? []) {
      if (
        typeof item.id === "string" &&
        item.labels &&
        typeof item.labels.sv === "string" &&
        typeof item.labels.en === "string" &&
        typeof item.labels.vi === "string"
      ) {
        existingLabelsById.set(item.id, item.labels);
      }
    }
  } catch {
    // Existing generated file is best-effort input only.
  }
}

/** @type {Map<string, object[]>} */
const snapshotByParent = new Map();
for (const { parentPath, file } of SNAPSHOTS) {
  const p = path.join(reqs, file);
  if (!fs.existsSync(p)) {
    console.warn("Skip missing snapshot:", file);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!Array.isArray(data)) {
    console.error(file, "must be a JSON array");
    process.exit(1);
  }
  snapshotByParent.set(parentPath, data);
}

/**
 * @param {object} snap
 * @returns {object}
 */
function fromSnapshot(snap) {
  return {
    id: snap.id,
    name: snap.name,
    fullURLPath: snap.fullURLPath,
    retailerCategoryId: snap.retailerCategoryId,
    productCount: snap.productCount,
    children: (snap.children ?? []).map(fromSnapshot),
  };
}

/**
 * @param {string} categoryId
 * @param {string} departmentId
 * @returns {object} tree node (nav + merged snapshots)
 */
function buildNode(categoryId, departmentId) {
  const src = byId[categoryId];
  if (!src) return null;

  const snap = snapshotByParent.get(src.fullURLPath);
  let childNodes;
  if (snap) {
    childNodes = snap.map(fromSnapshot);
  } else {
    childNodes = (src.children ?? [])
      .map((cid) => buildNode(cid, departmentId))
      .filter(Boolean);
  }

  return {
    id: src.id,
    name: src.name,
    fullURLPath: src.fullURLPath,
    retailerId: src.retailerId,
    children: childNodes,
  };
}

/** @type {object[]} */
const departments = [];
for (const rid of cat.root) {
  const root = byId[rid];
  if (!root) continue;
  if (EXCLUDED_ROOT_NAMES.has(root.name)) continue;
  const tree = buildNode(rid, root.id);
  if (tree) departments.push(tree);
}

/** @type {Array<{ id: string, name: string, fullURLPath: string, parentId: string | null, departmentId: string }>} */
const categories = [];

/** @type {Array<{ id: string, name: string, watchlistText: string, fullURLPath: string, parentCategoryId: string, departmentId: string, retailerCategoryId?: string, productCount?: number }>} */
const items = [];

/**
 * @param {object} node
 * @param {string | null} parentId
 * @param {string} departmentId
 */
function walk(node, parentId, departmentId) {
  const hasKids = node.children && node.children.length > 0;
  if (hasKids) {
    categories.push({
      id: node.id,
      name: node.name,
      fullURLPath: node.fullURLPath,
      parentId,
      departmentId,
    });
    for (const ch of node.children) {
      walk(ch, node.id, departmentId);
    }
  } else {
    items.push({
      id: node.id,
      name: node.name,
      watchlistText: node.name,
      labels: existingLabelsById.get(node.id) ?? {
        sv: node.name,
        en: "",
        vi: "",
      },
      fullURLPath: node.fullURLPath,
      parentCategoryId: parentId,
      departmentId,
      ...(node.retailerCategoryId != null
        ? { retailerCategoryId: node.retailerCategoryId }
        : {}),
      ...(node.productCount != null ? { productCount: node.productCount } : {}),
    });
  }
}

for (const dept of departments) {
  categories.push({
    id: dept.id,
    name: dept.name,
    fullURLPath: dept.fullURLPath,
    parentId: null,
    departmentId: dept.id,
  });
  for (const ch of dept.children ?? []) {
    walk(ch, dept.id, dept.id);
  }
}

/**
 * Dedupe picker rows:
 * - Same fullURLPath twice (duplicate links in nav) → one row.
 * - Same ICA category id under different paths (e.g. Avokado under Frukt and Grönsaker) → one row;
 *   first DFS visit wins so paths stay stable for the tree order in initial state.
 */
const seenPaths = new Set();
const seenIds = new Set();
const dedupedItems = [];
for (const it of items) {
  if (seenPaths.has(it.fullURLPath)) continue;
  if (seenIds.has(it.id)) continue;
  seenPaths.add(it.fullURLPath);
  seenIds.add(it.id);
  dedupedItems.push(it);
}

dedupedItems.sort((a, b) => a.name.localeCompare(b.name, "sv"));
categories.sort((a, b) => a.fullURLPath.localeCompare(b.fullURLPath, "sv"));

const sources = [
  path.relative(repoRoot, INITIAL),
  ...SNAPSHOTS.map((s) => path.join("docs/requirements", s.file)),
];

const payload = {
  schemaVersion: 1,
  retailer: "ica-maxi",
  meta: {
    generatedAt: new Date().toISOString(),
    description:
      "ICA Maxi Handla category tree + merged leaf snapshots for promo watchlist picker suggestions.",
    sources: sources.filter((s) => fs.existsSync(path.join(repoRoot, s))),
  },
  categories,
  items: dedupedItems,
};

const body = `${JSON.stringify(payload, null, 2)}\n`;
fs.writeFileSync(OUT, body);
fs.mkdirSync(path.dirname(OUT_DASHBOARD), { recursive: true });
fs.writeFileSync(OUT_DASHBOARD, body);
console.log(
  "Wrote",
  path.relative(repoRoot, OUT),
  "and",
  path.relative(repoRoot, OUT_DASHBOARD),
  `(${categories.length} categories, ${dedupedItems.length} items)`,
);
