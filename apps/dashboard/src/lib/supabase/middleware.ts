import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/api/auth/callback",
  "/api/public",
  "/cookbook",
  "/invite",
  "/wishlist",
];

const COLLABORATOR_ALLOWED_PATHS = [
  "/family",
  "/recipe-generator",
  "/plan-to-cook",
  "/cookbook",
  "/birthdays",
  "/shop",
  "/wishlist",
  "/invite",
  "/auth",
  "/login",
  "/api/household",
  "/api/recipe-collaboration",
  "/api/recipes",
  "/api/cook-plan",
  "/api/shared-shopping-lists",
  "/api/birthdays",
  "/api/public",
  "/api/auth",
];

function isAllowedForCollaborator(pathname: string): boolean {
  return COLLABORATOR_ALLOWED_PATHS.some((path) => pathname.startsWith(path));
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({ request });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseEnv());
  } catch (err) {
    console.error("[middleware] env error:", err);
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isScrapeApi = pathname.startsWith("/api/scrape");
  if (!user && !isPublicPath && !isScrapeApi) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && !isPublicPath && !isScrapeApi) {
    const { data: member, error: memberError } = await supabase
      .from("household_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "collaborator")
      .limit(1)
      .maybeSingle();

    if (!memberError && member?.role === "collaborator" && !isAllowedForCollaborator(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Collaborator access is limited." }, { status: 403 });
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/family/recipes";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
