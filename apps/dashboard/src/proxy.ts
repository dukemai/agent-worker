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
    "/learning/:path*",
    "/context/:path*",
  ],
};
