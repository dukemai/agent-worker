import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/auth/callback",
    "/auth/confirm",
    "/api/:path*",
    "/cookbook/:path*",
    "/birthdays",
    "/birthdays/:path*",
    "/digest",
    "/digest/:path*",
    "/family",
    "/family/:path*",
    "/growing",
    "/growing/:path*",
    "/plan-to-cook",
    "/plan-to-cook/:path*",
    "/promo-grocery-watchlist",
    "/promo-grocery-watchlist/:path*",
    "/recipe-generator",
    "/recipe-generator/:path*",
    "/recipes",
    "/recipes/:path*",
    "/vietnamese-meals",
    "/vietnamese-meals/:path*",
    "/tasks",
    "/tasks/:path*",
    "/learning",
    "/learning/:path*",
    "/context",
    "/context/:path*",
  ],
};
