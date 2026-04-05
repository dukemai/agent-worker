#!/usr/bin/env node
/**
 * Regenerates the shop category tree inside
 * docs/requirements/ica-maxi-picker-catalog-source.md
 * (between HTML comment markers), from
 * docs/requirements/ica-maxi-initial-state-raw.json → data.categories.
 *
 * Excludes seasonal / campaign top-level roots (see EXCLUDED_ROOT_NAMES).
 *
 * Usage: node scripts/build-ica-maxi-category-menu.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const jsonPath = path.join(
  repoRoot,
  "docs/requirements/ica-maxi-initial-state-raw.json",
);
const pickerPath = path.join(
  repoRoot,
  "docs/requirements/ica-maxi-picker-catalog-source.md",
);

/** Top-level `root` departments omitted from the doc (seasonal campaigns, etc.). */
const EXCLUDED_ROOT_NAMES = new Set(["Påsk"]);

const MARKER_START = "<!-- ICA_SHOP_CATEGORY_MENU_START -->";
const MARKER_END = "<!-- ICA_SHOP_CATEGORY_MENU_END -->";

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const cat = raw.data?.categories;
if (!cat?.categories || !cat.root) {
  console.error("Missing data.categories");
  process.exit(1);
}

const byId = cat.categories;
const lines = [];

function walkChildren(id, depth) {
  const node = byId[id];
  if (!node) return;
  const indent = "  ".repeat(depth);
  const nSub = node.children?.length ?? 0;
  const subHint = nSub > 0 ? ` *(${nSub} sub)*` : "";
  lines.push(
    `${indent}- **${node.name}** — \`${node.fullURLPath}\`${subHint}`,
  );
  if (node.children?.length) {
    for (const cid of node.children) walkChildren(cid, depth + 1);
  }
}

for (const rid of cat.root) {
  const n = byId[rid];
  if (!n) continue;
  if (EXCLUDED_ROOT_NAMES.has(n.name)) continue;

  lines.push(`### ${n.name}`);
  lines.push("");
  lines.push(`- **fullURLPath:** \`${n.fullURLPath}\``);
  lines.push(`- **id:** \`${n.id}\``);
  lines.push("");
  for (const cid of n.children ?? []) walkChildren(cid, 0);
  lines.push("");
}

const menuBody = lines.join("\n").trimEnd();

let picker = fs.readFileSync(pickerPath, "utf8");
if (!picker.includes(MARKER_START) || !picker.includes(MARKER_END)) {
  console.error(`${path.basename(pickerPath)}: missing ${MARKER_START} / ${MARKER_END}`);
  process.exit(1);
}

const [before] = picker.split(MARKER_START);
const [, after] = picker.split(MARKER_END);
picker = `${before}${MARKER_START}\n\n${menuBody}\n\n${MARKER_END}${after}`;

fs.writeFileSync(pickerPath, picker);
console.log(
  "Updated",
  path.relative(repoRoot, pickerPath),
  "(menu lines:",
  lines.length,
  ", excluded roots:",
  [...EXCLUDED_ROOT_NAMES].join(", "),
  ")",
);
