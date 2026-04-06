import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { test, expect } from "@playwright/test";
import { matchPromotionsToWatchlist } from "../src/match-promotions";
import { icaMaxiBarkarbystadenStrategy } from "../src/strategies/ica-maxi-barkarbystaden";
import { writePromoRunJson } from "./helpers/write-promo-run-output";

const watchlistJsonPath = path.join(__dirname, "..", "data", "promo-watchlist.json");

function readWatchlistInterests(): string[] {
  if (!existsSync(watchlistJsonPath)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(watchlistJsonPath, "utf8")) as {
      items?: unknown;
    };
    if (!Array.isArray(raw.items)) {
      return [];
    }
    return raw.items.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/**
 * End-to-end check for the per-store strategy: open URL → scrape promotion candidates.
 * Strategy modules hold ICA-specific selectors/levels; other stores get their own files.
 */
test.describe("ICA Maxi Barkarbystaden — extract promotions", () => {
  test("extracts promotion candidates via store strategy", async ({ page }) => {
    await icaMaxiBarkarbystadenStrategy.gotoOffersPage(page);

    const interests = readWatchlistInterests();
    const promotions = await icaMaxiBarkarbystadenStrategy.extractPromotions(
      page,
      interests.length > 0 ? { watchlistInterests: interests } : undefined,
    );

    expect(
      promotions.length,
      "expected at least one offer with Lägg i inköpslista",
    ).toBeGreaterThan(0);

    console.log(
      `[${icaMaxiBarkarbystadenStrategy.storeKey}] scraped ${promotions.length} promotion rows`,
    );
    console.log(
      "sample:",
      JSON.stringify(promotions.slice(0, 3), null, 2),
    );

    const scrapedPayload = {
      storeKey: icaMaxiBarkarbystadenStrategy.storeKey,
      count: promotions.length,
      promotions,
    };
    test.info().attach("scraped-promotions.json", {
      body: Buffer.from(JSON.stringify(scrapedPayload, null, 2)),
      contentType: "application/json",
    });

    const first = promotions[0];
    expect(first.title.length).toBeGreaterThan(2);
    expect(first.cardText.length).toBeGreaterThan(20);
    expect(first.storeKey).toBe(icaMaxiBarkarbystadenStrategy.storeKey);

    const withImage = promotions.filter(
      (p) => typeof p.imageUrl === "string" && /^https?:\/\//i.test(p.imageUrl),
    ).length;
    expect(
      withImage,
      "expected at least one tile with a product image URL",
    ).toBeGreaterThan(0);

    if (interests.length > 0) {
      const matches = matchPromotionsToWatchlist(promotions, interests, {
        minScore: 50,
      });
      const matchesPayload = {
        storeKey: icaMaxiBarkarbystadenStrategy.storeKey,
        watchlistItemCount: interests.length,
        promotionCount: promotions.length,
        matchCount: matches.length,
        matches: matches.map((m) => ({
          interest: m.interest,
          score: m.score,
          promotionIndex: m.promotion.index,
          title: m.promotion.title,
          priceHint: m.promotion.priceHint,
          imageUrl: m.promotion.imageUrl,
        })),
      };
      test.info().attach("watchlist-matches.json", {
        body: Buffer.from(JSON.stringify(matchesPayload, null, 2)),
        contentType: "application/json",
      });
      const matchesPath = writePromoRunJson("watchlist-matches.json", matchesPayload);
      if (matchesPath) {
        console.log(`[promo-run] wrote ${matchesPath}`);
      }

      const matchesOnlyPath = writePromoRunJson("watchlist-matches-only.json", {
        interests,
        matches,
      });
      if (matchesOnlyPath) {
        console.log(`[promo-run] wrote ${matchesOnlyPath}`);
      }

      console.log(
        `[${icaMaxiBarkarbystadenStrategy.storeKey}] watchlist matches: ${matches.length} (from ${interests.length} interests, ${promotions.length} promos)`,
      );
    }
  });

  test("ranks scraped promos against data/promo-watchlist.json when file exists", async ({
    page,
  }) => {
    test.skip(
      !existsSync(watchlistJsonPath),
      "Create data/promo-watchlist.json with pnpm promo:download-watchlist (dashboard + env).",
    );
    const interests = readWatchlistInterests();
    test.skip(
      interests.length === 0,
      "promo-watchlist.json has no items — add interests in the dashboard first.",
    );

    await icaMaxiBarkarbystadenStrategy.gotoOffersPage(page);
    const promotions = await icaMaxiBarkarbystadenStrategy.extractPromotions(
      page,
      { watchlistInterests: interests },
    );

    const matches = matchPromotionsToWatchlist(promotions, interests);
    expect(promotions.length).toBeGreaterThan(0);

    const rankPayload = { interests, matches };
    test.info().attach("watchlist-matches-only.json", {
      body: Buffer.from(JSON.stringify(rankPayload, null, 2)),
      contentType: "application/json",
    });
    const onlyPath = writePromoRunJson("watchlist-matches-only.json", rankPayload);
    if (onlyPath) {
      console.log(`[promo-run] wrote ${onlyPath}`);
    }
  });
});
