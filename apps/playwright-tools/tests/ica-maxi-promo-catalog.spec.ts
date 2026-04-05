import { test, expect } from "@playwright/test";
import {
  loadIcaMaxiPromoPickerCatalog,
  mergeIcaMaxiWeeklyOffersDepartments,
  resolveIcaMaxiDepartmentsForInterests,
} from "../src/ica-maxi/promo-picker-catalog";
import { findChipLabelForDepartment } from "../src/strategies/ica-maxi-barkarbystaden";

test.describe("ICA Maxi promo picker catalog (local JSON)", () => {
  test("loads merged catalog from docs/requirements", () => {
    const cat = loadIcaMaxiPromoPickerCatalog();
    expect(cat.schemaVersion).toBe(1);
    expect(cat.categories.length).toBeGreaterThan(10);
    expect(cat.items.length).toBeGreaterThan(100);
  });

  test("maps picker interest to Frukt & Grönt department", () => {
    const cat = loadIcaMaxiPromoPickerCatalog();
    const depts = resolveIcaMaxiDepartmentsForInterests(["Banan"], cat);
    expect(depts.some((d) => /frukt/i.test(d) && /grönt/i.test(d))).toBeTruthy();
  });

  test("maps meat shelf interest to Kött, Chark & Fågel department", () => {
    const cat = loadIcaMaxiPromoPickerCatalog();
    const depts = resolveIcaMaxiDepartmentsForInterests(["Bacon & stekfläsk"], cat);
    expect(depts.some((d) => /kött/i.test(d) && /chark/i.test(d))).toBeTruthy();
  });

  test("merge adds weekly-offers-only departments (Färskvaror, Djupfryst)", () => {
    expect(mergeIcaMaxiWeeklyOffersDepartments([])).toEqual(
      ["Djupfryst", "Färskvaror"].sort((a, b) => a.localeCompare(b, "sv")),
    );
    const merged = mergeIcaMaxiWeeklyOffersDepartments(["Mejeri & Ost"]);
    expect(merged).toContain("Mejeri & Ost");
    expect(merged).toContain("Färskvaror");
    expect(merged).toContain("Djupfryst");
  });
});

test.describe("ICA Maxi offer chip resolution", () => {
  test("maps catalog department to legacy (N) chip labels", () => {
    const chips = ["Alla (180)", "Mejeri & Ost (5)", "Frukt & Grönt (12)"];
    expect(findChipLabelForDepartment(chips, "Frukt & Grönt")).toBe(
      "Frukt & Grönt (12)",
    );
    expect(findChipLabelForDepartment(chips, "Mejeri & Ost")).toBe("Mejeri & Ost (5)");
  });

  test("maps catalog department to ICA accessible name: Dept, N erbjudanden.", () => {
    const chips = [
      "Alla, 180 erbjudanden.",
      "Mejeri & Ost, 5 erbjudanden.",
      "Frukt & Grönt, 10 erbjudanden.",
    ];
    expect(findChipLabelForDepartment(chips, "Frukt & Grönt")).toBe(
      "Frukt & Grönt, 10 erbjudanden.",
    );
    expect(findChipLabelForDepartment(chips, "Mejeri & Ost")).toBe(
      "Mejeri & Ost, 5 erbjudanden.",
    );
  });

  test("returns null when department has no chip this week", () => {
    const chips = ["Alla (180)", "Mejeri & Ost (5)"];
    expect(findChipLabelForDepartment(chips, "Frukt & Grönt")).toBeNull();
  });

  test("ignores Alla when matching", () => {
    const chips = ["Alla (200)"];
    expect(findChipLabelForDepartment(chips, "Frukt & Grönt")).toBeNull();
  });

  test("ignores Alla erbjudanden row when matching", () => {
    const chips = ["Alla, 200 erbjudanden."];
    expect(findChipLabelForDepartment(chips, "Frukt & Grönt")).toBeNull();
  });
});
