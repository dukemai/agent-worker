import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { normalizeActivitySourceDomain } from "@/lib/activity-source-classifier";

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) return auth.error;

  const sourceUrl = new URL(request.url).searchParams.get("url");
  if (!sourceUrl) return errorResponse("url is required");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return errorResponse("url must be valid");
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) return errorResponse("url must use http or https");
  const domain = normalizeActivitySourceDomain(sourceUrl);
  if (!domain) return errorResponse("url must contain a valid domain");

  const { data, error } = await auth.supabase
    .from("activity_capture_templates")
    .select("id, source_domain, path_pattern, name, capture_mode, content_selector, remove_selectors, version")
    .eq("enabled", true);
  if (error) return errorResponse(error.message, 500);

  const template = (data ?? [])
    .filter((item) => domain === item.source_domain || domain.endsWith(`.${item.source_domain}`))
    .filter((item) => parsedUrl.pathname.startsWith(item.path_pattern))
    .sort((a, b) => b.path_pattern.length - a.path_pattern.length)[0] ?? null;

  return NextResponse.json({ template });
}
