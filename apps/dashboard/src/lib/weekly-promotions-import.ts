export type WeeklyPromotionImportItem = {
  storeKey: string;
  sourceUrl: string;
  index: number;
  title: string;
  cardText: string;
  imageUrl?: string;
  priceHint?: string;
  categoryKey?: string;
  categoryName?: string;
  raw: Record<string, unknown>;
};

export type WeeklyPromotionImportPayload = {
  storeKey: string;
  promotions: WeeklyPromotionImportItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parsePromotionItem(
  value: unknown,
  fallbackStoreKey: string | null,
  fallbackIndex: number,
): WeeklyPromotionImportItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const storeKey = optionalString(value.storeKey) ?? fallbackStoreKey;
  const sourceUrl = optionalString(value.sourceUrl);
  const title = optionalString(value.title);
  const cardText = typeof value.cardText === "string" ? value.cardText.trim() : "";
  if (!storeKey || !sourceUrl || !title) {
    return null;
  }

  const rawIndex = value.index;
  const index = typeof rawIndex === "number" && Number.isFinite(rawIndex) ? rawIndex : fallbackIndex;

  return {
    storeKey,
    sourceUrl,
    index,
    title,
    cardText,
    imageUrl: optionalString(value.imageUrl),
    priceHint: optionalString(value.priceHint),
    categoryKey: optionalString(value.categoryKey),
    categoryName: optionalString(value.categoryName),
    raw: value,
  };
}

export function makeWeeklyPromotionDedupeKey(item: WeeklyPromotionImportItem): string {
  return [
    item.storeKey,
    item.sourceUrl,
    item.title.toLocaleLowerCase("sv-SE"),
    item.priceHint?.toLocaleLowerCase("sv-SE") ?? "",
  ].join("|");
}

export function parseWeeklyPromotionsJson(raw: unknown):
  | { ok: true; data: WeeklyPromotionImportPayload }
  | { ok: false; error: string } {
  const rootPromotions = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.promotions)
      ? raw.promotions
      : null;

  if (!rootPromotions) {
    return {
      ok: false,
      error: "Expected an array of promotions or an object with a promotions array",
    };
  }

  const fallbackStoreKey = isRecord(raw) ? optionalString(raw.storeKey) ?? null : null;
  const parsed: WeeklyPromotionImportItem[] = [];
  for (let i = 0; i < rootPromotions.length; i++) {
    const item = parsePromotionItem(rootPromotions[i], fallbackStoreKey, i);
    if (!item) {
      return {
        ok: false,
        error:
          `promotions[${i}] must include storeKey, sourceUrl, title, and cardText-compatible text`,
      };
    }
    parsed.push(item);
  }

  if (parsed.length === 0) {
    return { ok: false, error: "Promotion upload must contain at least one promotion" };
  }

  const storeKeys = new Set(parsed.map((item) => item.storeKey));
  const storeKey = storeKeys.size === 1 ? parsed[0].storeKey : "mixed";

  return {
    ok: true,
    data: {
      storeKey,
      promotions: parsed,
    },
  };
}
