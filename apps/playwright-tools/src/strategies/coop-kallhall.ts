import type { Page } from "@playwright/test";
import type { ScrapedPromotion, StorePromotionStrategy } from "../promotion-types";

const COOP_KALLHALL_STORE_KEY = "coop-kallhall";
const COOP_KALLHALL_STORE_NAME = "Coop Kallhäll";
const COOP_KALLHALL_STORE_PAGE_URL =
  "https://www.coop.se/butiker-erbjudanden/coop/coop-kallhall/";
const COOP_KALLHALL_DR_FALLBACK_URL = "https://dr.coop.se/Butik/?store=026827";

const pageStoreKey = new WeakMap<Page, string>();
const pageFlyerSourceUrl = new WeakMap<Page, string>();
const pageFlyerText = new WeakMap<Page, string>();

function storeKeyForPage(page: Page): string {
  return pageStoreKey.get(page) ?? COOP_KALLHALL_STORE_KEY;
}

function normalizeSpace(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeLines(s: string): string[] {
  return s
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map(normalizeSpace)
    .filter((line) => line.length > 0);
}

function dedupeKey(p: Pick<ScrapedPromotion, "title" | "cardText">): string {
  return `${normalizeSpace(p.title).toLocaleLowerCase("sv-SE")}|${normalizeSpace(
    p.cardText,
  )
    .toLocaleLowerCase("sv-SE")
    .slice(0, 260)}`;
}

function looksLikePriceLine(line: string): boolean {
  return (
    /\d/.test(line) &&
    /(kr|:-|för|\/kg|\/st|\/liter|\/l|rabatt|medlemspris|ord\.?\s*pris|jfr-pris|%)/i.test(
      line,
    )
  );
}

function looksLikeOfferPriceMarker(line: string): boolean {
  return (
    /^(\d+\s*för|medlemspris|eko)$/i.test(line) ||
    /^\d{1,4}k$/i.test(line) ||
    /^\d{1,4}$/.test(line) ||
    /^\/(kg|st|pack|l|liter)$/i.test(line)
  );
}

function looksLikeStandalonePricePart(line: string): boolean {
  return (
    /^\d{1,4}([:,.]\d{1,2})?$/.test(line) ||
    /^\/(kg|st|pack|l|liter)$/i.test(line)
  );
}

function looksLikeTitleLine(line: string): boolean {
  if (line.length < 3 || line.length > 140) {
    return false;
  }
  if (looksLikePriceLine(line) || looksLikeStandalonePricePart(line)) {
    return false;
  }
  if (
    /^(du sparar|ord\.?\s*pris|jfr-pris|medlemspris|våra erbjudanden|aktuella|sänkt moms|sänkt pris|max \d|eko)\b/i.test(
      line,
    )
  ) {
    return false;
  }
  if (/^(välj mellan|kyld\.?|fryst\.?|frysta\.?|klass 1|i bit\.?|1 liter\.?|oparfymerade\.?)/i.test(line)) {
    return false;
  }
  if (looksLikeOfferPriceMarker(line)) {
    return false;
  }
  return /[a-zåäö]/i.test(line);
}

function titleFromLines(lines: string[], fallback: string): string {
  return (
    lines.find(looksLikeTitleLine) ??
    lines.find((line) => /[a-zåäö]/i.test(line) && line.length >= 3) ??
    fallback
  ).slice(0, 160);
}

function priceHintFromLines(lines: string[]): string | undefined {
  const joined = lines.join(" ");
  const joinedPrice = joined.match(
    /(?:\d+\s*för\s*)?\d{1,4}(?::|-|,)?\d{0,2}\s*(?:kr|:-)?\s*(?:\/\s*(?:kg|st|l|liter))?/i,
  )?.[0];
  return lines.find(looksLikePriceLine) ?? joinedPrice;
}

function splitCoopFlyerPages(lines: string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^cn_\d+_.*sid/i.test(line) && current.length > 0) {
      pages.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    pages.push(current);
  }
  return pages;
}

function looksLikeCoopProductStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  if (!looksLikeTitleLine(line)) {
    return false;
  }
  if (!/^[A-ZÅÄÖ0-9]/.test(line)) {
    return false;
  }
  if (
    /^(nu är|läs mer|almunge|här finns|du hittar|reservation|tryck:|coop marknad|försäkra|extra rabatt|ta med|teckna|max \d|välj mellan|kyld|fryst|frysta|klass 1|i bit|1 liter|oparfymerade)/i.test(
      line,
    )
  ) {
    return false;
  }
  const lookahead = lines.slice(index + 1, index + 5).join(" ");
  return /(jfr-pris|klass 1|kyld|fryst|frysta|välj mellan|fetthalt|kruka|g\.|ml\.|liter|pack)/i.test(
    lookahead,
  );
}

function collectCoopProductBlocks(pageLines: string[]): string[][] {
  const products: string[][] = [];
  for (let i = 0; i < pageLines.length; i += 1) {
    if (!looksLikeCoopProductStart(pageLines, i)) {
      continue;
    }

    const block = [pageLines[i]];
    let j = i + 1;
    for (; j < Math.min(pageLines.length, i + 6); j += 1) {
      const line = pageLines[j] ?? "";
      if (looksLikeOfferPriceMarker(line)) {
        break;
      }
      if (j > i + 1 && looksLikeCoopProductStart(pageLines, j)) {
        break;
      }
      if (/^(almunge|aktuella|priser|\d+\/\d|cn_\d+|här finns|försäkra)/i.test(line)) {
        break;
      }
      block.push(line);
      if (/jfr-pris/i.test(line)) {
        j += 1;
        break;
      }
    }

    if (block.length >= 2) {
      products.push(block);
      i = Math.max(i, j - 1);
    }
  }
  return products;
}

function collectCoopOfferPrices(pageLines: string[]): string[] {
  const prices: string[] = [];
  let pendingMemberPrice = false;
  const withPrefix = (price: string) => {
    const value = pendingMemberPrice ? `MEDLEMSPRIS ${price}` : price;
    pendingMemberPrice = false;
    return value;
  };

  for (let i = 0; i < pageLines.length; i += 1) {
    const line = pageLines[i] ?? "";
    const next = pageLines[i + 1] ?? "";
    const next2 = pageLines[i + 2] ?? "";
    const next3 = pageLines[i + 3] ?? "";

    if (/^medlemspris$/i.test(line)) {
      pendingMemberPrice = true;
      continue;
    }

    if (/^\d+\s*för$/i.test(line) && /^\d+k$/i.test(next)) {
      prices.push(withPrefix(`${line} ${next}`));
      i += 1;
      continue;
    }

    if (/^\d+k$/i.test(line)) {
      if (/^\/(kg|st|pack|l|liter)$/i.test(next)) {
        prices.push(withPrefix(`${line} ${next}`));
        i += 1;
      } else {
        prices.push(withPrefix(line));
      }
      continue;
    }

    if (/^\d+$/.test(line) && /^\d{2}$/.test(next)) {
      const unit = /^\/(kg|st|pack|l|liter)$/i.test(next2) ? ` ${next2}` : "";
      prices.push(withPrefix(`${line}:${next}${unit}`));
      i += unit ? 2 : 1;
      continue;
    }

    if (/^\d+$/.test(line) && /^\/(kg|st|pack|l|liter)$/i.test(next)) {
      prices.push(withPrefix(`${line}k ${next}`));
      i += 1;
      continue;
    }

    if (/^\d+\s*för$/i.test(line) && /^\d+$/.test(next) && /^\d{2}$/.test(next2)) {
      const unit = /^\/(kg|st|pack|l|liter)$/i.test(next3) ? ` ${next3}` : "";
      prices.push(withPrefix(`${line} ${next}:${next2}${unit}`));
      i += unit ? 3 : 2;
    }
  }
  return prices;
}

async function extractTextFromPdfBytes(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const pdfPage = await pdf.getPage(pageNumber);
      const content = await pdfPage.getTextContent();
      const text = content.items
        .map((item) => {
          if (typeof item === "object" && item !== null && "str" in item) {
            return String((item as { str: unknown }).str);
          }
          return "";
        })
        .join("\n");
      pageTexts.push(text);
    }
  } finally {
    await pdf.destroy();
  }

  return pageTexts.join("\n");
}

function parseCoopFlyerTextRows(text: string): Omit<ScrapedPromotion, "storeKey" | "sourceUrl">[] {
  const lines = normalizeLines(text).filter((line) => line.length <= 260);
  const structuredRows: Omit<ScrapedPromotion, "storeKey" | "sourceUrl">[] = [];

  for (const pageLines of splitCoopFlyerPages(lines)) {
    const products = collectCoopProductBlocks(pageLines);
    const prices = collectCoopOfferPrices(pageLines);
    const count = Math.min(products.length, prices.length);

    for (let i = 0; i < count; i += 1) {
      const product = products[i] ?? [];
      const priceHint = prices[i];
      const title = titleFromLines(product, product[0] ?? "");
      structuredRows.push({
        index: structuredRows.length,
        title,
        cardText: normalizeSpace([...product, priceHint].filter(Boolean).join(" ")),
        priceHint,
      });
    }
  }

  if (structuredRows.length >= 8) {
    return structuredRows;
  }

  const out: Omit<ScrapedPromotion, "storeKey" | "sourceUrl">[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i] ?? "";
    const next = lines[i + 1] ?? "";
    const next2 = lines[i + 2] ?? "";
    const priceish =
      looksLikePriceLine(current) ||
      (/^\d{1,4}$/.test(current) && /^(\d{1,2}|\/(?:kg|st|l|liter))$/i.test(next)) ||
      (/^\d{1,4}$/.test(current) && /^\/(?:kg|st|l|liter)$/i.test(next2));

    if (!priceish) {
      continue;
    }

    const windowLines = lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 5));
    const cardText = normalizeSpace(windowLines.join(" "));
    if (cardText.length < 25) {
      continue;
    }

    const before = lines.slice(Math.max(0, i - 4), i).reverse();
    const title = titleFromLines(before, windowLines[0] ?? cardText);
    out.push({
      index: out.length,
      title,
      cardText,
      priceHint: priceHintFromLines(windowLines),
    });
  }

  const seen = new Set<string>();
  return out.filter((row) => {
    const key = `${row.title.toLocaleLowerCase("sv-SE")}|${row.cardText
      .toLocaleLowerCase("sv-SE")
      .slice(0, 220)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function dismissCoopCookieWallIfPresent(page: Page): Promise<void> {
  const buttons = [
    page.getByRole("button", { name: /avvisa alla/i }).first(),
    page.getByRole("button", { name: /neka alla/i }).first(),
    page.getByRole("button", { name: /acceptera alla/i }).first(),
    page.getByRole("button", { name: /godkänn alla/i }).first(),
  ];

  for (const button of buttons) {
    if (await button.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await button.click();
      return;
    }
  }
}

async function findCoopFlyerUrl(page: Page): Promise<string | null> {
  const urls = await page.evaluate(() => {
    const candidates: string[] = [];
    for (const a of document.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href") ?? "";
      const text = (a.textContent ?? "").replace(/\s+/g, " ").trim();
      const aria = a.getAttribute("aria-label") ?? "";
      if (
        /dr\.coop\.se|reklamblad|erbjudanden|veckans|öppna/i.test(href) ||
        /veckans|reklamblad|öppna nu|erbjudanden/i.test(`${text} ${aria}`)
      ) {
        try {
          candidates.push(new URL(href, location.href).href);
        } catch {
          /* skip invalid hrefs */
        }
      }
    }
    return candidates;
  });

  return urls.find((url) => /dr\.coop\.se/i.test(url)) ?? null;
}

async function gotoCoopOffersPage(page: Page): Promise<void> {
  pageStoreKey.set(page, COOP_KALLHALL_STORE_KEY);
  const seenRequests = new Set<string>();
  page.on("request", (request) => {
    const url = request.url();
    if (/dr\.coop\.se|erbjud|reklamblad|butik/i.test(url)) {
      seenRequests.add(url);
    }
  });

  const response = await page.goto(COOP_KALLHALL_STORE_PAGE_URL, {
    waitUntil: "domcontentloaded",
  });
  if (!response?.ok()) {
    throw new Error(`Failed to load Coop store page: HTTP ${response?.status()}`);
  }
  await dismissCoopCookieWallIfPresent(page);

  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  const flyerUrl = await findCoopFlyerUrl(page);
  const targetUrl = flyerUrl ?? COOP_KALLHALL_DR_FALLBACK_URL;
  if (!flyerUrl) {
    console.warn(
      `[${COOP_KALLHALL_STORE_KEY}] Could not discover flyer link on store page; falling back to ${targetUrl}`,
    );
  } else {
    console.log(`[${COOP_KALLHALL_STORE_KEY}] Discovered Coop flyer URL: ${flyerUrl}`);
  }

  pageFlyerSourceUrl.set(page, targetUrl);

  const directResponse = await page.request.get(targetUrl);
  if (directResponse.ok()) {
    const contentType = directResponse.headers()["content-type"] ?? "";
    if (/application\/pdf/i.test(contentType)) {
      const pdfBytes = new Uint8Array(await directResponse.body());
      const pdfByteLength = pdfBytes.byteLength;
      const pdfText = await extractTextFromPdfBytes(pdfBytes);
      pageFlyerText.set(page, pdfText);
      console.log(
        `[${COOP_KALLHALL_STORE_KEY}] Downloaded Coop PDF flyer (${pdfByteLength} bytes, ${normalizeLines(pdfText).length} text lines)`,
      );
      return;
    }
  }

  const flyerResponse = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  if (!flyerResponse?.ok()) {
    throw new Error(`Failed to load Coop flyer: HTTP ${flyerResponse?.status()}`);
  }
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  if (seenRequests.size > 0) {
    console.log(
      `[${COOP_KALLHALL_STORE_KEY}] Coop discovery requests:\n${[...seenRequests]
        .slice(0, 20)
        .join("\n")}`,
    );
  }
}

async function scrapeStructuredCoopOfferElements(
  page: Page,
): Promise<Omit<ScrapedPromotion, "storeKey" | "sourceUrl">[]> {
  return page.evaluate(() => {
    const normalize = (s: string) =>
      s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const priceRx =
      /\d.*(kr|:-|för|\/kg|\/st|\/liter|\/l|rabatt|medlemspris|ord\.?\s*pris|jfr-pris|%)/i;

    function productImageFromCard(card: Element): string | undefined {
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
            return abs;
          }
        } catch {
          /* skip */
        }
      }
      return undefined;
    }

    const selectors = [
      "article",
      "li",
      '[class*="offer" i]',
      '[class*="deal" i]',
      '[class*="product" i]',
      '[class*="campaign" i]',
      '[data-testid*="offer" i]',
      '[data-testid*="product" i]',
    ].join(",");

    const out: {
      index: number;
      title: string;
      cardText: string;
      priceHint?: string;
      imageUrl?: string;
    }[] = [];
    const seen = new Set<string>();

    for (const node of document.querySelectorAll(selectors)) {
      const cardText = normalize(node.textContent ?? "");
      if (cardText.length < 30 || cardText.length > 1800 || !priceRx.test(cardText)) {
        continue;
      }
      const lines = cardText
        .split(/\r?\n/)
        .map(normalize)
        .filter(Boolean);
      const title =
        lines.find((line) => /[a-zåäö]/i.test(line) && !priceRx.test(line)) ??
        lines[0] ??
        cardText.slice(0, 140);
      const priceHint = lines.find((line) => priceRx.test(line));
      const key = `${title.toLocaleLowerCase("sv-SE")}|${cardText
        .toLocaleLowerCase("sv-SE")
        .slice(0, 220)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({
        index: out.length,
        title: title.slice(0, 160),
        cardText,
        priceHint,
        imageUrl: productImageFromCard(node),
      });
    }

    return out;
  });
}

async function extractCoopPromotions(page: Page): Promise<ScrapedPromotion[]> {
  const sourceUrl = pageFlyerSourceUrl.get(page) ?? page.url();
  const storeKey = storeKeyForPage(page);
  const downloadedFlyerText = pageFlyerText.get(page);
  const structuredRows = downloadedFlyerText
    ? []
    : await scrapeStructuredCoopOfferElements(page);
  const textRows =
    structuredRows.length > 0
      ? structuredRows
      : parseCoopFlyerTextRows(downloadedFlyerText ?? (await page.locator("body").innerText()));

  const seen = new Set<string>();
  const promotions: ScrapedPromotion[] = [];

  for (const row of textRows) {
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

export const coopKallhallStrategy: StorePromotionStrategy = {
  storeKey: COOP_KALLHALL_STORE_KEY,
  storeName: COOP_KALLHALL_STORE_NAME,
  defaultOffersUrl: COOP_KALLHALL_STORE_PAGE_URL,
  gotoOffersPage: gotoCoopOffersPage,
  extractPromotions: extractCoopPromotions,
};
