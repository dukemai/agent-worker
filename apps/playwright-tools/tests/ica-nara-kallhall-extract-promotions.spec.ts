import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { test, expect } from "@playwright/test";
import { matchPromotionsToWatchlist } from "../src/match-promotions";
import { icaNaraKallhallStrategy } from "../src/strategies/ica-maxi-barkarbystaden";
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

test.describe("ICA Nära Kallhäll — extract promotions", () => {
  test("extracts promotion candidates via ICA weekly offers strategy", async ({ page }) => {
    await icaNaraKallhallStrategy.gotoOffersPage(page);

    const promotions = await icaNaraKallhallStrategy.extractPromotions(page);

    expect(
      promotions.length,
      "expected at least one offer with Lägg i inköpslista",
    ).toBeGreaterThan(0);

    console.log(
      `[${icaNaraKallhallStrategy.storeKey}] scraped ${promotions.length} promotion rows`,
    );
    console.log("sample:", JSON.stringify(promotions.slice(0, 3), null, 2));

    const scrapedPayload = {
      storeKey: icaNaraKallhallStrategy.storeKey,
      storeName: icaNaraKallhallStrategy.storeName,
      count: promotions.length,
      promotions,
    };
    const scrapedFilename = `${icaNaraKallhallStrategy.storeKey}-scraped-promotions.json`;
    test.info().attach(scrapedFilename, {
      body: Buffer.from(JSON.stringify(scrapedPayload, null, 2)),
      contentType: "application/json",
    });
    const scrapedPath = writePromoRunJson(scrapedFilename, scrapedPayload);
    if (scrapedPath) {
      console.log(`[promo-run] wrote ${scrapedPath}`);
    }

    const first = promotions[0];
    expect(first.title.length).toBeGreaterThan(2);
    expect(first.cardText.length).toBeGreaterThan(20);
    expect(first.storeKey).toBe(icaNaraKallhallStrategy.storeKey);
  });

  test.skip("ranks scraped promos against data/promo-watchlist.json when file exists", async ({
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

    await icaNaraKallhallStrategy.gotoOffersPage(page);
    const promotions = await icaNaraKallhallStrategy.extractPromotions(page, {
      watchlistInterests: interests,
    });

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
