import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { parsePlanningDaysImport } from "@/lib/planning-days-import";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("File must contain valid JSON");
  }
  const parsed = parsePlanningDaysImport(payload);
  if ("error" in parsed) return errorResponse(parsed.error);

  // Do not depend on an ON CONFLICT constraint: migration 060 may already exist in
  // deployed environments from before the composite unique key was introduced.
  const { data: existingRows, error: existingError } = await auth.supabase
    .from("planning_days")
    .select("id, title, category, starts_on");
  if (existingError) return errorResponse(existingError.message, 500);

  const keyFor = (row: { title: string; category: string; starts_on: string }) =>
    `${row.title}\u0000${row.category}\u0000${row.starts_on}`;
  const existingByKey = new Map(
    ((existingRows ?? []) as Array<{ id: string; title: string; category: string; starts_on: string }>).map((row) => [keyFor(row), row.id])
  );
  let created = 0;
  let updated = 0;

  for (const row of parsed.rows) {
    const existingId = existingByKey.get(keyFor(row));
    if (existingId) {
      const { error } = await auth.supabase.from("planning_days").update(row).eq("id", existingId);
      if (error) return errorResponse(error.message, 500);
      updated += 1;
    } else {
      const { data, error } = await auth.supabase.from("planning_days").insert(row).select("id").single();
      if (error) return errorResponse(error.message, 500);
      existingByKey.set(keyFor(row), data.id);
      created += 1;
    }
  }

  return NextResponse.json({ imported: created + updated, created, updated });
}
