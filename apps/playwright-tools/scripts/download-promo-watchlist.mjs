#!/usr/bin/env node
/**
 * Download promo watchlist from the dashboard API and write a local JSON file
 * for Playwright scrape/match steps (hybrid: API + on-disk cache).
 *
 * Env:
 *   DASHBOARD_BASE_URL   e.g. http://localhost:3000 (no trailing slash)
 *   SCRAPE_SYNC_SECRET   must match dashboard SCRAPE_SYNC_SECRET
 *   WATCHLIST_OUTPUT     optional path (default: ../data/promo-watchlist.json next to package root)
 *
 *   node scripts/download-promo-watchlist.mjs
 *
 * Loads `apps/playwright-tools/.env` if present (KEY=value lines; does not override existing env).
 */

import { readFileSync, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadDotEnv(path.join(packageRoot, ".env"));

const baseUrl = process.env.DASHBOARD_BASE_URL?.replace(/\/$/, "");
const secret = process.env.SCRAPE_SYNC_SECRET;
const outputPath = process.env.WATCHLIST_OUTPUT
  ? path.resolve(process.cwd(), process.env.WATCHLIST_OUTPUT)
  : path.join(packageRoot, "data", "promo-watchlist.json");

if (!baseUrl || !secret) {
  console.error(
    "Missing DASHBOARD_BASE_URL or SCRAPE_SYNC_SECRET (set in your shell or .env).",
  );
  process.exit(1);
}

const url = `${baseUrl}/api/scrape/promo-watchlist`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

let body;
try {
  body = JSON.parse(text);
} catch {
  console.error("Response is not JSON:", text.slice(0, 500));
  process.exit(1);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${body.items?.length ?? 0} item(s) to ${outputPath} (fetchedAt=${body.fetchedAt})`,
);
