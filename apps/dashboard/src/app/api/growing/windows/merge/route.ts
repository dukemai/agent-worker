import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const { primaryId, secondaryIds } = (await request.json()) as {
    primaryId: string;
    secondaryIds: string[];
  };

  if (!primaryId || !secondaryIds || !Array.isArray(secondaryIds) || secondaryIds.length === 0) {
    return errorResponse("primaryId and secondaryIds (array) are required");
  }

  // 1) Fetch windows to merge tags/notes
  const { data: windows, error: fetchError } = await auth.supabase
    .from("growing_windows")
    .select("*")
    .in("id", [primaryId, ...secondaryIds]);

  if (fetchError) return errorResponse(fetchError.message, 500);

  const primary = windows.find((w) => w.id === primaryId);
  if (!primary) return errorResponse("Primary window not found", 404);

  const secondaries = windows.filter((w) => secondaryIds.includes(w.id));

  // 2) Collect merged tags and notes
  const allTags = new Set(primary.tags || []);
  let mergedNote = primary.stockholm_note || "";

  for (const s of secondaries) {
    (s.tags || []).forEach((t: string) => allTags.add(t));
    if (s.stockholm_note && !mergedNote.includes(s.stockholm_note)) {
      mergedNote += `\n\n[Merged from ${s.item_name}]: ${s.stockholm_note}`;
    }
  }

  // 3) Update primary window
  const { error: updateError } = await auth.supabase
    .from("growing_windows")
    .update({
      tags: Array.from(allTags),
      stockholm_note: mergedNote,
    })
    .eq("id", primaryId);

  if (updateError) return errorResponse(updateError.message, 500);

  // 4) Re-assign suggestions (handling conflicts)
  // Fetch existing primary suggestions to avoid unique constraint (week_number, window_id) violation
  const { data: existingPrimarySugs } = await auth.supabase
    .from("growing_suggestions_log")
    .select("week_number")
    .eq("window_id", primaryId);

  const existingWeeks = new Set(existingPrimarySugs?.map((s) => s.week_number) || []);
  
  if (existingWeeks.size > 0) {
    // Delete secondary suggestions that would conflict
    await auth.supabase
      .from("growing_suggestions_log")
      .delete()
      .in("window_id", secondaryIds)
      .in("week_number", Array.from(existingWeeks));
  }

  // Re-assign remaining secondary suggestions
  const { error: sugError } = await auth.supabase
    .from("growing_suggestions_log")
    .update({ window_id: primaryId })
    .in("window_id", secondaryIds);

  if (sugError) return errorResponse(sugError.message, 500);

  // 5) Re-assign tasks
  const { error: taskError } = await auth.supabase
    .from("tasks")
    .update({ window_id: primaryId })
    .in("window_id", secondaryIds);

  if (taskError) return errorResponse(taskError.message, 500);

  // 6) Delete secondaries
  const { error: deleteError } = await auth.supabase
    .from("growing_windows")
    .delete()
    .in("id", secondaryIds);

  if (deleteError) return errorResponse(deleteError.message, 500);

  return NextResponse.json({ success: true });
}
