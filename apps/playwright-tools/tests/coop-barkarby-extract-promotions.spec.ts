import { test, expect } from "@playwright/test";
import { coopBarkarbyStrategy } from "../src/strategies/coop-kallhall";
import { writePromoRunJson } from "./helpers/write-promo-run-output";

test.describe("Stora Coop Barkarby — extract promotions", () => {
  test("extracts promotion candidates via Coop HTML strategy", async ({ page }) => {
    await coopBarkarbyStrategy.gotoOffersPage(page);

    const promotions = await coopBarkarbyStrategy.extractPromotions(page);

    expect(
      promotions.length,
      "expected at least one Coop HTML offer candidate",
    ).toBeGreaterThan(0);

    console.log(
      `[${coopBarkarbyStrategy.storeKey}] scraped ${promotions.length} promotion rows`,
    );
    console.log("final offer URL:", page.url());
    console.log("sample:", JSON.stringify(promotions.slice(0, 5), null, 2));

    const scrapedPayload = {
      storeKey: coopBarkarbyStrategy.storeKey,
      storeName: coopBarkarbyStrategy.storeName,
      count: promotions.length,
      promotions,
    };
    const scrapedFilename = `${coopBarkarbyStrategy.storeKey}-scraped-promotions.json`;
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
    expect(first.storeKey).toBe(coopBarkarbyStrategy.storeKey);
  });
});
