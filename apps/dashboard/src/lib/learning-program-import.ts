export const LEARNING_PROGRAM_SCHEMA = "dad-ops.learning-program";
export const LEARNING_PROGRAM_SCHEMA_VERSION = 1;
export type LearningProgramImportDay = { day_number: number; title: string; content: string; resources: string[] };
export type LearningProgramImport = { title: string; topic: string; total_days: number; days: LearningProgramImportDay[] };
const text = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;
export function parseLearningProgramImport(payload: unknown): { program: LearningProgramImport } | { error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "JSON must be an object" };
  const p = payload as Record<string, unknown>;
  if (p.schema !== LEARNING_PROGRAM_SCHEMA) return { error: `schema must be ${LEARNING_PROGRAM_SCHEMA}` };
  if (p.version !== LEARNING_PROGRAM_SCHEMA_VERSION) return { error: `version must be ${LEARNING_PROGRAM_SCHEMA_VERSION}` };
  const title = text(p.title, 200), topic = text(p.topic, 200);
  if (!title || !topic) return { error: "title and topic must be non-empty strings of at most 200 characters" };
  if (typeof p.total_days !== "number" || !Number.isInteger(p.total_days) || p.total_days < 1 || p.total_days > 365) return { error: "total_days must be an integer from 1 to 365" };
  if (!Array.isArray(p.days) || p.days.length !== p.total_days) return { error: "days must be an array with days.length equal to total_days (full curriculum required)" };
  const days: LearningProgramImportDay[] = [], seen = new Set<number>();
  for (let i = 0; i < p.days.length; i++) {
    const d = p.days[i];
    if (!d || typeof d !== "object" || Array.isArray(d)) return { error: `days[${i}] must be an object` };
    if (!Number.isInteger(d.day_number) || d.day_number < 1 || d.day_number > p.total_days) return { error: `days[${i}].day_number must be from 1 to ${p.total_days}` };
    if (seen.has(d.day_number)) return { error: `days[${i}]: duplicate day ${d.day_number}` };
    seen.add(d.day_number);
    const dayTitle = text(d.title, 200), content = text(d.content, 20000);
    if (!dayTitle) return { error: `days[${i}].title must contain 1–200 characters` };
    if (!content) return { error: `days[${i}].content must contain 1–20000 characters` };
    const resources = d.resources === undefined ? [] : d.resources;
    if (!Array.isArray(resources) || resources.length > 20 || resources.some((r: unknown) => !text(r, 500))) return { error: `days[${i}].resources must contain at most 20 non-empty strings of at most 500 characters` };
    days.push({ day_number: d.day_number, title: dayTitle, content, resources: resources.map((r: string) => r.trim()) });
  }
  for (let n = 1; n <= p.total_days; n++) if (!seen.has(n)) return { error: `Missing day ${n}` };
  return { program: { title, topic, total_days: p.total_days, days: days.sort((a, b) => a.day_number - b.day_number) } };
}
