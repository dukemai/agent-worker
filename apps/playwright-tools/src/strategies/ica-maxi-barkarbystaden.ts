import type { Page } from "@playwright/test";
import type {
  ExtractPromotionsOptions,
  ScrapedPromotion,
  StorePromotionStrategy,
} from "../promotion-types";
import {
  loadIcaMaxiPromoPickerCatalog,
  mergeIcaMaxiWeeklyOffersDepartments,
  resolveIcaMaxiDepartmentsForInterests,
} from "../ica-maxi/promo-picker-catalog";

const BARKARBYSTADEN_OFFERS_URL =
  "https://www.ica.se/erbjudanden/maxi-ica-stormarknad-barkarbystaden-1003408/";
const KALLHALL_OFFERS_URL =
  "https://www.ica.se/erbjudanden/ica-nara-kallhall-1004315/";

const BARKARBYSTADEN_STORE_KEY = "ica-maxi-barkarbystaden";
const KALLHALL_STORE_KEY = "ica-nara-kallhall";
const BARKARBYSTADEN_STORE_NAME = "ICA Maxi Barkarbystaden";
const KALLHALL_STORE_NAME = "ICA Nära Kallhäll";

const pageStoreKey = new WeakMap<Page, string>();

function storeKeyForPage(page: Page): string {
  return pageStoreKey.get(page) ?? BARKARBYSTADEN_STORE_KEY;
}

/** Weekly-offers department chips live here on the current ICA Maxi template. */
const OFFERS_CATEGORIES_CONTAINER = ".categoriesContainer";

function stripListCta(s: string): string {
  return s.replace(/\s*lägg\s+i\s+inköpslista\s*$/i, "").trim();
}

function dedupeKey(p: Pick<ScrapedPromotion, "title" | "cardText">): string {
  return `${stripListCta(p.title)}|${stripListCta(p.cardText).slice(0, 240)}`;
}

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip trailing offer count (ICA uses `, N erbjudanden.` or legacy `(N)`), lowercase Swedish, single spaces.
 */
function normalizeOfferChipBase(label: string): string {
  return label
    .replace(/,?\s*\d+\s+erbjudanden\.?$/i, "")
    .replace(/\s*\(\s*\d+\s*\)\s*$/, "")
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ");
}

/** True if chip label (full text) is the synthetic "Alla (n)" row. */
function isAllaChipLabel(chipLabel: string): boolean {
  return /^alla$/i.test(normalizeOfferChipBase(chipLabel));
}

/**
 * Regexes for weekly-offers chip accessible names, e.g. `Frukt & Grönt, 10 erbjudanden.` or `Mejeri (12)`.
 */
function chipPatternsForDepartment(departmentName: string): RegExp[] {
  const clean = departmentName.trim();
  const patterns: RegExp[] = [];
  const spaced = escapeRx(clean).replace(/\s+/g, "\\s*");
  patterns.push(
    new RegExp(`^\\s*${spaced}\\s*,\\s*\\d+\\s+erbjudanden\\.?`, "i"),
  );
  patterns.push(new RegExp(`^\\s*${spaced}\\s*\\(\\s*\\d+\\s*\\)`, "i"));
  const firstSegment = clean.split(/[&,]/)[0]?.trim();
  if (firstSegment && firstSegment !== clean) {
    const e = escapeRx(firstSegment).replace(/\s+/g, "\\s*");
    patterns.push(
      new RegExp(`^\\s*${e}\\s*,\\s*\\d+\\s+erbjudanden\\.?`, "i"),
    );
    patterns.push(new RegExp(`^\\s*${e}[^\\(]*\\(\\s*\\d+\\s*\\)`, "i"));
  }
  return patterns;
}

/**
 * Pick the promotions-page chip that corresponds to a catalog department name.
 * Only considers labels present in `chips` (from `.categoriesContainer`); skips `Alla (n)`.
 */
export function findChipLabelForDepartment(
  chips: string[],
  departmentName: string,
): string | null {
  const candidates = chips.filter((c) => !isAllaChipLabel(c));
  const patterns = chipPatternsForDepartment(departmentName);
  for (const chip of candidates) {
    for (const p of patterns) {
      if (p.test(chip)) {
        return chip;
      }
    }
  }

  const nd = normalizeOfferChipBase(departmentName);
  const firstSeg = nd.split(/[&,]/)[0]?.trim() ?? nd;

  for (const chip of candidates) {
    const base = normalizeOfferChipBase(chip);
    if (base === nd) {
      return chip;
    }
  }

  for (const chip of candidates) {
    const base = normalizeOfferChipBase(chip);
    if (
      firstSeg.length >= 4 &&
      (base.startsWith(firstSeg) || firstSeg.startsWith(base))
    ) {
      return chip;
    }
  }

  const words = nd
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^(och|&)$/i.test(w));
  if (words.length >= 2) {
    for (const chip of candidates) {
      const base = normalizeOfferChipBase(chip);
      if (words.every((w) => base.includes(w))) {
        return chip;
      }
    }
  }

  return null;
}

/**
 * ICA cookie consent banner — click “Avvisa alla” if shown so the offers PLP can render.
 * Safe to call after navigating to any ica.se page that may show CMP.
 */
export async function dismissIcaMaxiCookieWallIfPresent(page: Page): Promise<void> {
  const rejectAll = page.getByRole("button", { name: "Avvisa alla" }).first();
  for (let i = 0; i < 20; i++) {
    if (await rejectAll.isVisible().catch(() => false)) {
      await rejectAll.click();
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function waitForOfferTiles(page: Page): Promise<void> {
  await page
    .getByText(/lägg\s+i\s+inköpslista/i)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });
}

/**
 * Weekly offers PLP lazy-loads more tiles as the user scrolls. Scroll until the
 * “Lägg i inköpslista” count stops growing so ~full grids (e.g. ~180 items) are captured.
 */
async function expandLazyLoadedOfferTiles(page: Page): Promise<void> {
  const listRx = /lägg\s+i\s+inköpslista/i;
  let lastCount = await page.getByText(listRx).count();
  let noIncreaseStreak = 0;
  const maxPasses = 80;

  for (let i = 0; i < maxPasses; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(450);
    const count = await page.getByText(listRx).count();
    if (count <= lastCount) {
      noIncreaseStreak += 1;
      if (noIncreaseStreak >= 5 && lastCount > 0) {
        break;
      }
    } else {
      noIncreaseStreak = 0;
    }
    lastCount = count;
  }
}

/**
 * Category chip labels inside `.categoriesContainer` (prefers `aria-label` when present so
 * labels align with `getByRole` / accessible name, e.g. `Frukt & Grönt, 10 erbjudanden.`).
 */
export async function listIcaMaxiOfferCategoryChips(page: Page): Promise<string[]> {
  const scope = page.locator(OFFERS_CATEGORIES_CONTAINER).first();
  await scope.waitFor({ state: "visible", timeout: 20_000 });
  return scope.locator('button, a[href], [role="button"]').evaluateAll((nodes) => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const node of nodes) {
      const aria = node.getAttribute("aria-label")?.replace(/\s+/g, " ").trim();
      const text = node.textContent
        ?.replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const t = aria && aria.length > 0 ? aria : (text ?? "");
      if (!t || t.length > 320) {
        continue;
      }
      if (seen.has(t)) {
        continue;
      }
      seen.add(t);
      ordered.push(t);
    }
    return ordered;
  });
}

/** Regexes for `getByRole(..., { name })` — ICA uses `Dept, N erbjudanden.` or legacy `Dept (N)`. */
function clickPatternsForChipLabel(chipLabelFromList: string): RegExp[] {
  const trimmed = chipLabelFromList.trim();
  const patterns: RegExp[] = [];
  if (!trimmed) {
    return patterns;
  }

  if (/erbjudanden/i.test(trimmed)) {
    const base = trimmed.replace(/,?\s*\d+\s+erbjudanden\.?$/i, "").trim();
    if (base) {
      patterns.push(
        new RegExp(
          `^\\s*${escapeRx(base).replace(/\s+/g, "\\s*")}\\s*,\\s*\\d+\\s+erbjudanden\\.?\\s*$`,
          "i",
        ),
      );
    }
  } else {
    const baseParen = trimmed.replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
    if (baseParen) {
      patterns.push(
        new RegExp(
          `^\\s*${escapeRx(baseParen).replace(/\s+/g, "\\s*")}\\s*\\(\\s*\\d+\\s*\\)\\s*$`,
          "i",
        ),
      );
    }
  }

  patterns.push(
    new RegExp(
      `^\\s*${escapeRx(trimmed).replace(/\s+/g, "\\s*")}\\s*$`,
      "i",
    ),
  );
  return patterns;
}

/**
 * Click a category chip; tolerates changing N in `, N erbjudanden.` or in `(N)`.
 */
async function clickOffersCategoryChipByResolvedLabel(
  page: Page,
  chipLabelFromList: string,
): Promise<boolean> {
  const scope = page.locator(OFFERS_CATEGORIES_CONTAINER).first();
  await scope.waitFor({ state: "visible", timeout: 15_000 });

  for (const pattern of clickPatternsForChipLabel(chipLabelFromList)) {
    const button = scope.getByRole("button", { name: pattern });
    if ((await button.count()) > 0) {
      await button.first().click();
      await waitForOfferTiles(page);
      return true;
    }
    const link = scope.getByRole("link", { name: pattern });
    if ((await link.count()) > 0) {
      await link.first().click();
      await waitForOfferTiles(page);
      return true;
    }
  }

  const base = normalizeOfferChipBase(chipLabelFromList);
  console.warn(
    `[${storeKeyForPage(page)}] Could not click chip for label: ${chipLabelFromList} (normalized base: ${base})`,
  );
  return false;
}

/**
 * ICA product tiles expose "Lägg i inköpslista" — we treat each as one promotion
 * candidate and walk up a few DOM levels to approximate the card container.
 */
async function scrapePromotionTilesOnPage(page: Page): Promise<ScrapedPromotion[]> {
  const sourceUrl = page.url();
  const storeKey = storeKeyForPage(page);
  await expandLazyLoadedOfferTiles(page);

  const rows = await page.evaluate(() => {
    const normalize = (s: string) =>
      s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

    function productImageFromCard(card: Element): string | undefined {
      const candidates: string[] = [];
      for (const img of card.querySelectorAll("img")) {
        const raw =
          img.getAttribute("src") ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-lazy-src") ||
          img.currentSrc ||
          "";
        const t = raw.trim();
        if (!t || t.startsWith("data:")) {
          continue;
        }
        candidates.push(t);
      }
      for (const raw of candidates) {
        try {
          const abs = new URL(raw, location.href).href;
          if (/placeholder|spacer|1x1|blank\.(gif|png)/i.test(abs)) {
            continue;
          }
          if (!/^https?:\/\//i.test(abs)) {
            continue;
          }
          return abs;
        } catch {
          /* skip */
        }
      }
      return undefined;
    }

    const addButtons = [
      ...document.querySelectorAll('button, a[href], [role="button"]'),
    ].filter((b) => /lägg\s+i\s+inköpslista/i.test(b.textContent ?? ""));

    const out: {
      cardText: string;
      title: string;
      priceHint?: string;
      imageUrl?: string;
    }[] = [];

    const listRx = /lägg\s+i\s+inköpslista/gi;

    for (const btn of addButtons) {
      let card: Element | null = null;
      let node: Element | null = btn;
      for (let depth = 0; depth < 14 && node; depth++) {
        node = node.parentElement;
        if (!node) break;
        const t = normalize(node.textContent ?? "");
        const listHits = (t.match(listRx) ?? []).length;
        if (listHits === 1 && t.length >= 40 && t.length <= 2500) {
          card = node;
          break;
        }
      }
      if (!card) continue;

      const cardText = normalize(card.textContent ?? "");
      const lines = cardText
        .split("\n")
        .map(normalize)
        .filter((l) => l.length > 0 && !/lägg\s+i\s+inköpslista/i.test(l));

      const titleEl = card.querySelector("p.offer-card__title");
      const titleFromOffer = normalize(titleEl?.textContent ?? "");
      const title =
        titleFromOffer.length > 0
          ? titleFromOffer
          : (lines.find((l) => l.length > 4 && !/^\d/.test(l)) ??
              lines[0] ??
              cardText.slice(0, 120));

      const priceHint = lines.find(
        (l) =>
          /\d/.test(l) && /(kr|:-|för|\/kg|\/st|liter|cl)/i.test(l),
      );

      const imageUrl = productImageFromCard(card);

      out.push({ cardText, title, priceHint, imageUrl });
    }

    return out;
  });

  return rows.map((row, index) => ({
    storeKey,
    sourceUrl,
    index,
    title: stripListCta(row.title),
    cardText: stripListCta(row.cardText),
    priceHint: row.priceHint,
    imageUrl: row.imageUrl,
  }));
}

async function extractPromotionsScopedByDepartments(
  page: Page,
  departmentNames: string[],
): Promise<ScrapedPromotion[]> {
  const chips = await listIcaMaxiOfferCategoryChips(page);
  const storeKey = storeKeyForPage(page);

  const skippedNoChip: string[] = [];
  const visits: { catalogDepartment: string; chipLabel: string }[] = [];

  for (const dept of departmentNames) {
    const chipLabel = findChipLabelForDepartment(chips, dept);
    if (!chipLabel) {
      skippedNoChip.push(dept);
      continue;
    }
    visits.push({ catalogDepartment: dept, chipLabel });
  }

  if (skippedNoChip.length > 0) {
    console.log(
      `[${storeKey}] Skipping ${skippedNoChip.length} department(s) with no chip on this week’s offers page: ${skippedNoChip.join("; ")}`,
    );
  }

  if (visits.length === 0) {
    console.warn(
      `[${storeKey}] No departments matched available offer chips; scraping full offers view.`,
    );
    return scrapePromotionTilesOnPage(page);
  }

  console.log(
    `[${storeKey}] Scraping offer chips for: ${visits.map((v) => `${v.catalogDepartment} → ${v.chipLabel}`).join(" | ")}`,
  );

  const seen = new Set<string>();
  const merged: ScrapedPromotion[] = [];
  let globalIndex = 0;

  for (const { chipLabel } of visits) {
    const ok = await clickOffersCategoryChipByResolvedLabel(page, chipLabel);
    if (!ok) {
      continue;
    }
    const batch = await scrapePromotionTilesOnPage(page);
    for (const row of batch) {
      const k = dedupeKey(row);
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      merged.push({
        ...row,
        index: globalIndex,
      });
      globalIndex += 1;
    }
  }

  return merged;
}

async function extractPromotions(
  page: Page,
  options?: ExtractPromotionsOptions,
): Promise<ScrapedPromotion[]> {
  const interests =
    options?.watchlistInterests
      ?.map((s) => s.trim())
      .filter((s) => s.length >= 2) ?? [];

  if (interests.length === 0) {
    return scrapePromotionTilesOnPage(page);
  }

  const catalog = loadIcaMaxiPromoPickerCatalog();
  const fromCatalog = resolveIcaMaxiDepartmentsForInterests(interests, catalog);
  const departments = mergeIcaMaxiWeeklyOffersDepartments(fromCatalog);

  if (fromCatalog.length === 0) {
    console.warn(
      `[${storeKeyForPage(page)}] No Handla catalog departments matched watchlist; trying weekly-offers chips only (${departments.join("; ")}).`,
    );
  } else {
    console.log(
      `[${storeKeyForPage(page)}] Scraping weekly offers per departments: ${departments.join("; ")}`,
    );
  }
  return extractPromotionsScopedByDepartments(page, departments);
}

async function gotoIcaOffersPage(
  page: Page,
  storeKey: string,
  offersUrl: string,
): Promise<void> {
  pageStoreKey.set(page, storeKey);
  const response = await page.goto(offersUrl, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) {
    throw new Error(`Failed to load offers: HTTP ${response?.status()}`);
  }
  await dismissIcaMaxiCookieWallIfPresent(page);
  await page
    .getByText(/Filter för erbjudanden/i)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await waitForOfferTiles(page);
}

export const icaMaxiBarkarbystadenStrategy: StorePromotionStrategy = {
  storeKey: BARKARBYSTADEN_STORE_KEY,
  storeName: BARKARBYSTADEN_STORE_NAME,
  defaultOffersUrl: BARKARBYSTADEN_OFFERS_URL,
  gotoOffersPage: (page) =>
    gotoIcaOffersPage(page, BARKARBYSTADEN_STORE_KEY, BARKARBYSTADEN_OFFERS_URL),
  extractPromotions,
};

export const icaNaraKallhallStrategy: StorePromotionStrategy = {
  storeKey: KALLHALL_STORE_KEY,
  storeName: KALLHALL_STORE_NAME,
  defaultOffersUrl: KALLHALL_OFFERS_URL,
  gotoOffersPage: (page) => gotoIcaOffersPage(page, KALLHALL_STORE_KEY, KALLHALL_OFFERS_URL),
  extractPromotions,
};
