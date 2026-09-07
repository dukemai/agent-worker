export type DigestItemState = {
  item_key: string;
  content_hash: string;
  last_shown_on: string;
  show_count: number;
};

export type DigestDeliveryItem = {
  itemKey: string;
  contentHash: string;
};

export function stockholmDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function stockholmHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Stockholm",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
  );
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function nextMondayDate(fromYmd: string): string {
  const date = new Date(`${fromYmd}T12:00:00Z`);
  const day = date.getUTCDay();
  const daysAhead = day === 1 ? 7 : (8 - day) % 7;
  return addCalendarDays(fromYmd, daysAhead);
}

export function calendarDaysBetween(fromYmd: string, toYmd: string): number {
  const toUtc = Date.parse(`${toYmd}T00:00:00Z`);
  const fromUtc = Date.parse(`${fromYmd}T00:00:00Z`);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/** Stable, non-cryptographic hash used only to notice material content changes. */
export function digestContentHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function deliveryItem(itemKey: string, value: unknown): DigestDeliveryItem {
  return { itemKey, contentHash: digestContentHash(value) };
}

export function isNewOrChanged(
  item: DigestDeliveryItem,
  states: ReadonlyMap<string, DigestItemState>
): boolean {
  return states.get(item.itemKey)?.content_hash !== item.contentHash;
}

export function isReminderMilestone(daysLeft: number, milestones: readonly number[]): boolean {
  return milestones.includes(daysLeft);
}

export type SummerActivityPhase = "full" | "taper" | "essential_only" | "off";

export function resolveSummerActivityPhase(
  targetDate: string,
  schoolStartDate: string | null
): SummerActivityPhase {
  if (!schoolStartDate) return "full";
  const daysSinceSchoolStart = calendarDaysBetween(schoolStartDate, targetDate);
  if (daysSinceSchoolStart < 0) return "full";
  if (daysSinceSchoolStart <= 6) return "taper";
  if (daysSinceSchoolStart <= 20) return "essential_only";
  return "off";
}

export function isDigestSendWorthy(input: {
  rainForecast: boolean;
  todayTasks: number;
  thisWeekTasks: number;
  renewals: number;
  birthdays: number;
  trips: number;
  activities: number;
  planningDays: number;
  growingSuggestions: number;
  growingKnowledge: number;
  promotions: number;
  learningPrograms: number;
}): boolean {
  const { rainForecast, ...counts } = input;
  return rainForecast || Object.values(counts).some((value) => value > 0);
}
