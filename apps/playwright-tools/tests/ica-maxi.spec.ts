import { test, expect, type Page } from "@playwright/test";
import {
  dismissIcaMaxiCookieWallIfPresent,
  listIcaMaxiOfferCategoryChips,
} from "../src/strategies/ica-maxi-barkarbystaden";

/** Maxi ICA Stormarknad Barkarbystaden — weekly offers (public page). */
const ICA_MAXI_BARKARBY_OFFERS =
  "https://www.ica.se/erbjudanden/maxi-ica-stormarknad-barkarbystaden-1003408/";

/** Chip shows offer count as `(N)` or `, N erbjudanden.` (current ICA accessible name). */
const CHIP_HAS_OFFER_COUNT = /\(\s*\d+\s*\)|\d+\s+erbjudanden/i;

/**
 * Reads visible weekly-offers category chips (prefer `.categoriesContainer`; fallback for older DOM).
 */
async function readOfferFilterChipLabels(page: Page): Promise<string[]> {
  await page
    .getByText(/Filter för erbjudanden/i)
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });

  try {
    const fromContainer = await listIcaMaxiOfferCategoryChips(page);
    if (fromContainer.length > 0) {
      return fromContainer;
    }
  } catch {
    /* layout without categoriesContainer */
  }

  const labels = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h2, h3")];
    const heading = headings.find((h) =>
      /Filter för erbjudanden/i.test(h.textContent ?? ""),
    );
    if (!heading) return [];

    let root: Element | null = heading;
    const out: string[] = [];
    for (let depth = 0; depth < 8 && root; depth++) {
      root = root.parentElement;
      if (!root) break;
      const candidates = root.querySelectorAll(
        'button, a[href*="erbjudanden"], [role="button"], a',
      );
      if (candidates.length >= 3) {
        for (const el of [...candidates]) {
          const t = el.textContent
            ?.trim()
            .replace(/\s+/g, " ")
            .replace(/\u00a0/g, " ");
          if (t && /\(\s*\d+\s*\)/.test(t) && t.length <= 120) {
            out.push(t);
          }
        }
        if (out.length > 0) return [...new Set(out)];
      }
    }
    return [];
  });

  return [...new Set(labels)];
}

/** Map user interests to ICA filter chip text (Barkarbystaden template). */
const INTEREST_CHECKS: ReadonlyArray<{
  id: string;
  match: (chip: string) => boolean;
}> = [
  { id: "Mejeri", match: (s) => /Mejeri/i.test(s) },
  { id: "Bröd", match: (s) => /\bBröd\b/i.test(s) },
  { id: "Färskvaror", match: (s) => /Färskvaror/i.test(s) },
  { id: "Djupfryst", match: (s) => /Djupfryst/i.test(s) },
  {
    id: "Frukt & Grönt",
    match: (s) => /Frukt/i.test(s) && /Grönt|Grön/i.test(s),
  },
];

test.describe("ICA Maxi Barkarbystaden offers page", () => {
  test("loads and shows offer hub content", async ({ page }) => {
    const response = await page.goto(ICA_MAXI_BARKARBY_OFFERS, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok(), `HTTP ${response?.status()}`).toBeTruthy();

    await dismissIcaMaxiCookieWallIfPresent(page);

    await expect(page).toHaveTitle(/Maxi ICA Stormarknad Barkarbystaden/i);

    await expect(
      page.getByRole("heading", {
        name: /erbjudanden/i,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });

    // Total row: legacy "Alla (180)" or accessible "Alla, N erbjudanden."
    await expect(
      page.getByText(/Alla\s*\(\s*\d+\s*\)|Alla,?\s*\d+\s+erbjudanden/i),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test("lists promotion filter categories; core food interests are present", async ({
    page,
  }) => {
    const response = await page.goto(ICA_MAXI_BARKARBY_OFFERS, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok(), `HTTP ${response?.status()}`).toBeTruthy();

    await dismissIcaMaxiCookieWallIfPresent(page);

    const chips = await readOfferFilterChipLabels(page);
    expect(
      chips.length,
      "expected at least one filter chip with a count",
    ).toBeGreaterThan(0);

    // Printed in `pnpm playwright:test` output for quick inspection.
    console.log("[ICA Maxi Barkarbystaden] filter chips:", chips);

    // Full category row (for debugging / docs); ICA may add or rename over time.
    test.info().attach("ica-filter-chips.json", {
      body: Buffer.from(JSON.stringify({ url: ICA_MAXI_BARKARBY_OFFERS, chips }, null, 2)),
      contentType: "application/json",
    });

    const allMatch = chips.some(
      (c) => /^Alla\s*\(\d+\)/i.test(c) || /^Alla,?\s*\d+\s+erbjudanden/i.test(c),
    );
    expect(
      allMatch,
      `expected an "Alla" total chip, got: ${chips.join(" | ")}`,
    ).toBe(true);

    for (const { id, match } of INTEREST_CHECKS) {
      const found = chips.some(match);
      expect(
        found,
        `interest "${id}" — no matching chip among: ${chips.join(" | ")}`,
      ).toBe(true);
    }

    // Sanity: every chip should expose a count one way or the other.
    for (const c of chips) {
      expect(c, `unexpected chip shape: ${c}`).toMatch(CHIP_HAS_OFFER_COUNT);
    }
  });
});
