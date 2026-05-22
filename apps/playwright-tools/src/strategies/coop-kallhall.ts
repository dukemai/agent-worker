import type { Page } from "@playwright/test";
import type { ScrapedPromotion, StorePromotionStrategy } from "../promotion-types";

const COOP_KALLHALL_STORE_KEY = "coop-kallhall";
const COOP_KALLHALL_STORE_NAME = "Coop Kallhäll";
const COOP_KALLHALL_STORE_PAGE_URL =
  "https://www.coop.se/butiker-erbjudanden/coop/coop-kallhall/";
const COOP_BARKARBY_STORE_KEY = "stora-coop-barkarby";
const COOP_BARKARBY_STORE_NAME = "Stora Coop Barkarby";
const COOP_BARKARBY_STORE_PAGE_URL =
  "https://www.coop.se/butiker-erbjudanden/stora-coop/stora-coop-barkarby/";

const pageStoreKey = new WeakMap<Page, string>();

function storeKeyForPage(page: Page): string {
  return pageStoreKey.get(page) ?? COOP_KALLHALL_STORE_KEY;
}

function normalizeSpace(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function dedupeKey(p: Pick<ScrapedPromotion, "title" | "cardText">): string {
  return `${normalizeSpace(p.title).toLocaleLowerCase("sv-SE")}|${normalizeSpace(
    p.cardText,
  )
    .toLocaleLowerCase("sv-SE")
    .slice(0, 260)}`;
}

async function dismissCoopCookieWallIfPresent(page: Page): Promise<void> {
  const modal = page.locator("#cmpbox").first();
  if (await modal.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const necessaryOnly = modal
      .getByRole("button", { name: /endast\s+nödvändiga\s+cookies/i })
      .first();
    if (await necessaryOnly.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await necessaryOnly.click();
      await modal.waitFor({ state: "hidden", timeout: 8_000 }).catch(() => undefined);
      return;
    }
  }

  const fallback = page
    .getByRole("button", { name: /endast\s+nödvändiga\s+cookies/i })
    .first();
  if (await fallback.isVisible({ timeout: 500 }).catch(() => false)) {
    await fallback.click();
  }
}

async function htmlOfferAnchorCount(page: Page): Promise<number> {
  const saveButtons = await page.getByRole("button", { name: /spara\s+i\s+lista/i }).count();
  const seeItemButtons = await page
    .getByRole("button", { name: /se\s+\d+\s+varor/i })
    .count();
  return saveButtons + seeItemButtons;
}

async function waitForHtmlOfferAnchors(page: Page): Promise<void> {
  for (let i = 0; i < 30; i += 1) {
    await dismissCoopCookieWallIfPresent(page);
    if ((await htmlOfferAnchorCount(page)) > 0) {
      return;
    }
    await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.8)));
    await page.waitForTimeout(350);
  }

  throw new Error(
    "Could not find Coop HTML offer buttons: expected 'Spara i lista' or 'Se N varor'.",
  );
}

async function expandLazyLoadedHtmlOffers(page: Page): Promise<void> {
  let lastCount = await htmlOfferAnchorCount(page);
  let noIncreaseStreak = 0;

  for (let i = 0; i < 80; i += 1) {
    await dismissCoopCookieWallIfPresent(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(450);
    const count = await htmlOfferAnchorCount(page);
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

async function gotoCoopOffersPage(
  page: Page,
  storeKey: string,
  offersUrl: string,
): Promise<void> {
  pageStoreKey.set(page, storeKey);
  const response = await page.goto(offersUrl, {
    waitUntil: "domcontentloaded",
  });
  if (!response?.ok()) {
    throw new Error(`Failed to load Coop store page: HTTP ${response?.status()}`);
  }
  await dismissCoopCookieWallIfPresent(page);
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await waitForHtmlOfferAnchors(page);
}

async function scrapeHtmlCoopOfferElements(page: Page): Promise<ScrapedPromotion[]> {
  const storeKey = storeKeyForPage(page);
  const sourceUrl = page.url();
  await expandLazyLoadedHtmlOffers(page);

  const rows = await page.evaluate(() => {
    const normalize = (s: string) =>
      s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const ctaRx = /(?:spara\s+i\s+lista|se\s+\d+\s+varor)/i;
    const priceRx =
      /\d.*(?:kr|:-|för|\/kg|\/st|\/liter|\/l|rabatt|medlemspris|ord\.?\s*pris|jfr-pris|%)/i;

    function productImageFromCard(card: Element): { imageUrl?: string; imageAlt?: string } {
      for (const img of card.querySelectorAll("img")) {
        const raw =
          img.getAttribute("src") ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-lazy-src") ||
          img.currentSrc ||
          "";
        if (!raw || raw.startsWith("data:")) {
          continue;
        }
        try {
          const abs = new URL(raw, location.href).href;
          if (/placeholder|spacer|1x1|blank\.(gif|png)/i.test(abs)) {
            continue;
          }
          if (/^https?:\/\//i.test(abs)) {
            return {
              imageUrl: abs,
              imageAlt: normalize(img.getAttribute("alt") ?? ""),
            };
          }
        } catch {
          /* skip invalid URLs */
        }
      }
      return {};
    }

    function linesFromText(text: string): string[] {
      return text
        .replace(/\u00a0/g, " ")
        .split(/\r?\n/)
        .map(normalize)
        .filter(Boolean);
    }

    function titleFromLines(lines: string[], cardText: string): string {
      return (
        lines.find(
          (line) =>
            line.length >= 3 &&
            line.length <= 140 &&
            /[a-zåäö]/i.test(line) &&
            !ctaRx.test(line) &&
            !priceRx.test(line) &&
            !/^(medlemspris|ord\.?\s*pris|jfr-pris|du sparar)$/i.test(line),
        ) ??
        lines.find((line) => /[a-zåäö]/i.test(line) && !ctaRx.test(line)) ??
        cardText.slice(0, 140)
      );
    }

    const ctas = [
      ...document.querySelectorAll("button, a[href], [role='button']"),
    ].filter((node) => ctaRx.test(node.textContent ?? ""));

    const out: {
      title: string;
      cardText: string;
      priceHint?: string;
      imageUrl?: string;
    }[] = [];

    for (const cta of ctas) {
      let card: Element | null = null;
      let node: Element | null = cta;

      for (let depth = 0; depth < 14 && node; depth += 1) {
        node = node.parentElement;
        if (!node) {
          break;
        }
        const text = normalize(node.textContent ?? "");
        const ctaHits = (text.match(new RegExp(ctaRx.source, "gi")) ?? []).length;
        if (ctaHits === 1 && text.length >= 30 && text.length <= 2500) {
          card = node;
          if (priceRx.test(text) || /se\s+\d+\s+varor/i.test(text)) {
            break;
          }
        }
      }

      if (!card) {
        continue;
      }

      const renderedText =
        "innerText" in card ? ((card as HTMLElement).innerText ?? "") : "";
      const cardText = normalize(renderedText || card.textContent || "");
      const lines = linesFromText(cardText).filter((line) => !ctaRx.test(line));
      const { imageUrl, imageAlt } = productImageFromCard(card);
      const h3Title = normalize(card.querySelector("h3")?.textContent ?? "");
      const title = normalize(
        h3Title && h3Title.length >= 3 && h3Title.length <= 140
          ? h3Title
          : imageAlt && imageAlt.length >= 3 && imageAlt.length <= 140
          ? imageAlt
          : titleFromLines(lines, cardText),
      );
      const priceHint =
        cardText.match(
          /(?:medlemspris\s*)?(?:\d+\s*för\s*)?\d{1,4}(?::|,)?\d{0,2}\s*(?:kr|:-)\s*(?:\/\s*(?:kg|st|l|liter))?/i,
        )?.[0] ??
        lines.find((line) => /(medlemspris|\d+\s*för\s*\d+\s*kr|\d+\s*kr)/i.test(line));
      out.push({
        title,
        cardText,
        priceHint,
        imageUrl,
      });
    }

    return out;
  });

  const seen = new Set<string>();
  const promotions: ScrapedPromotion[] = [];

  for (const row of rows) {
    const promotion: ScrapedPromotion = {
      storeKey,
      sourceUrl,
      index: promotions.length,
      title: normalizeSpace(row.title),
      cardText: normalizeSpace(row.cardText),
      priceHint: row.priceHint ? normalizeSpace(row.priceHint) : undefined,
      imageUrl: row.imageUrl,
    };
    const key = dedupeKey(promotion);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    promotions.push(promotion);
  }

  return promotions;
}

function createCoopHtmlStrategy(config: {
  storeKey: string;
  storeName: string;
  offersUrl: string;
}): StorePromotionStrategy {
  return {
    storeKey: config.storeKey,
    storeName: config.storeName,
    defaultOffersUrl: config.offersUrl,
    gotoOffersPage: (page) =>
      gotoCoopOffersPage(page, config.storeKey, config.offersUrl),
    extractPromotions: scrapeHtmlCoopOfferElements,
  };
}

export const coopKallhallStrategy = createCoopHtmlStrategy({
  storeKey: COOP_KALLHALL_STORE_KEY,
  storeName: COOP_KALLHALL_STORE_NAME,
  offersUrl: COOP_KALLHALL_STORE_PAGE_URL,
});

export const coopBarkarbyStrategy = createCoopHtmlStrategy({
  storeKey: COOP_BARKARBY_STORE_KEY,
  storeName: COOP_BARKARBY_STORE_NAME,
  offersUrl: COOP_BARKARBY_STORE_PAGE_URL,
});
