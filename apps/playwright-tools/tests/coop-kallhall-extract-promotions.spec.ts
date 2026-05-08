import { test, expect } from "@playwright/test";
import { coopKallhallStrategy } from "../src/strategies/coop-kallhall";
import { writePromoRunJson } from "./helpers/write-promo-run-output";

test.describe("Coop Kallhäll — extract promotions", () => {
  test("extracts promotion candidates via Coop flyer strategy", async ({ page }) => {
    await coopKallhallStrategy.gotoOffersPage(page);

    const promotions = await coopKallhallStrategy.extractPromotions(page);

    expect(
      promotions.length,
      "expected at least one Coop flyer offer candidate",
    ).toBeGreaterThan(0);

    console.log(
      `[${coopKallhallStrategy.storeKey}] scraped ${promotions.length} promotion rows`,
    );
    console.log("final flyer URL:", page.url());
    console.log("sample:", JSON.stringify(promotions.slice(0, 5), null, 2));

    const scrapedPayload = {
      storeKey: coopKallhallStrategy.storeKey,
      storeName: coopKallhallStrategy.storeName,
      count: promotions.length,
      promotions,
    };
    const scrapedFilename = `${coopKallhallStrategy.storeKey}-scraped-promotions.json`;
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
    expect(first.storeKey).toBe(coopKallhallStrategy.storeKey);
  });
});
