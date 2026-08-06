export const PLANNING_DAYS_SCHEMA = "dad-ops.planning-days";
export const PLANNING_DAYS_SCHEMA_VERSION = 1;

const CATEGORIES = new Set(["red_day", "school", "family", "closure", "other"]);
const isoDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const optionalText = (value: unknown, max: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export type PlanningDayImportRow = {
  title: string;
  category: "red_day" | "school" | "family" | "closure" | "other";
  starts_on: string;
  ends_on: string | null;
  enabled: boolean;
  notes: string | null;
};

export function parsePlanningDaysImport(payload: unknown): { rows: PlanningDayImportRow[] } | { error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "JSON must be an object" };
  const wrapper = payload as Record<string, unknown>;
  if (wrapper.schema !== PLANNING_DAYS_SCHEMA) return { error: `schema must be ${PLANNING_DAYS_SCHEMA}` };
  if (wrapper.version !== PLANNING_DAYS_SCHEMA_VERSION) return { error: `version must be ${PLANNING_DAYS_SCHEMA_VERSION}` };
  if (!Array.isArray(wrapper.planning_days) || wrapper.planning_days.length === 0) return { error: "planning_days must be a non-empty array" };
  if (wrapper.planning_days.length > 100) return { error: "A maximum of 100 planning days can be imported at once" };

  const rows: PlanningDayImportRow[] = [];
  for (let index = 0; index < wrapper.planning_days.length; index += 1) {
    const value = wrapper.planning_days[index];
    if (!value || typeof value !== "object" || Array.isArray(value)) return { error: `planning_days[${index}] must be an object` };
    const row = value as Record<string, unknown>;
    const title = optionalText(row.title, 200);
    const category = typeof row.category === "string" && CATEGORIES.has(row.category) ? row.category as PlanningDayImportRow["category"] : null;
    const dateType = row.date_type === "single" || row.date_type === "period" ? row.date_type : null;
    if (!title) return { error: `planning_days[${index}].title is required` };
    if (!category) return { error: `planning_days[${index}].category is invalid` };
    if (!dateType) return { error: `planning_days[${index}].date_type must be single or period` };
    if (category === "red_day" && dateType !== "single") return { error: `planning_days[${index}] red days must use date_type single` };

    const startsOn = dateType === "single" ? isoDate(row.date) : isoDate(row.starts_on);
    const endsOn = dateType === "period" ? isoDate(row.ends_on) : null;
    if (!startsOn) return { error: `planning_days[${index}] has an invalid ${dateType === "single" ? "date" : "starts_on"}` };
    if (dateType === "period" && (!endsOn || endsOn < startsOn)) return { error: `planning_days[${index}].ends_on must be on or after starts_on` };

    rows.push({ title, category, starts_on: startsOn, ends_on: endsOn, enabled: row.enabled !== false, notes: optionalText(row.notes, 1000) });
  }
  return { rows };
}
