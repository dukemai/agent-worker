import { test, expect } from "@playwright/test";
import {
  matchPromotionsToWatchlist,
  scoreInterestAgainstPromotion,
} from "../src/match-promotions";
import type { ScrapedPromotion } from "../src/promotion-types";

const samplePromo = (overrides: Partial<ScrapedPromotion> = {}): ScrapedPromotion => ({
  storeKey: "ica-maxi-barkarbystaden",
  sourceUrl: "https://example.com/offers",
  index: 0,
  title: "ICA Kycklingfilé",
  cardText:
    "ICA. ca 900 g. Kycklingfilé. 85 kr/kg. Jmfpris 94.44 kr/kg. Ord.pris 110.95 kr. Max 5 st/person.",
  priceHint: "85 kr/kg",
  ...overrides,
});

test.describe("match-promotions (watchlist)", () => {
  test("substring interest matches title", () => {
    const p = samplePromo();
    expect(scoreInterestAgainstPromotion(p, "kycklingfilé")).toBe(100);
    expect(scoreInterestAgainstPromotion(p, "Kycklingfilé")).toBe(100);
  });

  test("multi-token interest requires all tokens", () => {
    const p = samplePromo({
      title: "Arla Smör 500g",
      cardText: "Arla. Smör. 49.90 kr/st.",
    });
    expect(scoreInterestAgainstPromotion(p, "Arla smör")).toBeGreaterThanOrEqual(90);
    expect(scoreInterestAgainstPromotion(p, "Valio smör")).toBe(0);
  });

  test("long non-dictionary terms can match grocery compounds", () => {
    const p = samplePromo({
      title: "Kycklingfilé",
      cardText: "Färsk kycklingfilé. 900 g.",
    });
    expect(scoreInterestAgainstPromotion(p, "kyckling")).toBe(100);
  });

  test("no match when phrase missing", () => {
    const p = samplePromo();
    expect(scoreInterestAgainstPromotion(p, "laxfilé")).toBe(0);
  });

  test("does not match ägg inside unrelated compounds", () => {
    const p = samplePromo({
      title: "Väggslangvinda",
      cardText: "Praktisk slangvinda för vägg. 199 kr/st.",
      categoryName: "Hem & fritid",
    });
    expect(scoreInterestAgainstPromotion(p, "ägg")).toBe(0);
  });

  test("matches ägg as a catalog token", () => {
    const p = samplePromo({
      title: "Ägg 12-pack",
      cardText: "Frigående höns. 12-pack. 29.90 kr/st.",
      categoryName: "Mejeri & Ost",
    });
    expect(scoreInterestAgainstPromotion(p, "ägg")).toBe(100);
  });

  test("does not match svamp inside cleaning products", () => {
    const p = samplePromo({
      title: "Rengöringssvamp",
      cardText: "Rengöringssvamp 10-pack. 19.90 kr/st.",
      categoryName: "Hem & städ",
    });
    expect(scoreInterestAgainstPromotion(p, "svamp")).toBe(0);
  });

  test("matches svamp using catalog-backed aliases", () => {
    const p = samplePromo({
      title: "Champinjoner",
      cardText: "Färska champinjoner i ask. 250 g.",
      categoryName: "Frukt & Grönt",
    });
    expect(scoreInterestAgainstPromotion(p, "svamp")).toBe(100);
  });

  test("matches catalog aliases inside grocery compounds", () => {
    const p = samplePromo({
      title: "Förkokta majskolvar 2-pack",
      cardText: "Majskolvar. Förkokta. 2-pack.",
      categoryName: "Frukt & Grönt",
    });
    expect(scoreInterestAgainstPromotion(p, "majs")).toBe(100);
  });

  test("matchPromotionsToWatchlist returns sorted hits", () => {
    const promotions: ScrapedPromotion[] = [
      samplePromo({ index: 0, title: "Gräddfilé", cardText: "Gräddfilé 500g" }),
      samplePromo({
        index: 1,
        title: "ICA Kycklingfilé",
        cardText: "Kycklingfilé 900g",
      }),
    ];
    const matches = matchPromotionsToWatchlist(promotions, ["kycklingfilé", "gräddfilé"]);
    expect(matches.length).toBe(2);
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
    const ints = matches.map((m) => m.interest);
    expect(ints).toContain("kycklingfilé");
    expect(ints).toContain("gräddfilé");
  });

  test("minScore filters weak matches", () => {
    const promotions = [samplePromo()];
    const matches = matchPromotionsToWatchlist(promotions, ["kycklingfilé"], {
      minScore: 100,
    });
    expect(matches.length).toBe(1);
    const none = matchPromotionsToWatchlist(promotions, ["lax"], { minScore: 100 });
    expect(none.length).toBe(0);
  });
});
