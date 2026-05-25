import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getTripShareBySlug } from "@/lib/trip-shares/public";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const result = await getTripShareBySlug(slug ?? "");

  if (!result.ok) {
    if (result.kind === "not_found") {
      return errorResponse("Share not found", 404);
    }
    return errorResponse(result.message, 500);
  }

  return NextResponse.json(result.payload);
}
