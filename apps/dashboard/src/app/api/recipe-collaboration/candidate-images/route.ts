import { NextResponse } from "next/server";
import { errorResponse, getAuthedSupabase } from "@/lib/api";
import { getUserHousehold } from "@/lib/household";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const BUCKET = "recipe-candidate-images";
const MAX_FILES = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeFileName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return clean || "recipe-image";
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error;
  }

  const household = await getUserHousehold(auth.supabase, auth.user.id);
  if (household.error) {
    return errorResponse(household.error.message, 500);
  }
  if (!household.household) {
    return errorResponse("No household found", 404);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Expected multipart form data", 400);
  }

  const files = form
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, MAX_FILES);

  if (files.length === 0) {
    return errorResponse("Upload at least one image", 400);
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse("Recipe images must be JPEG, PNG, WebP, or GIF", 400);
    }
    if (file.size > MAX_FILE_BYTES) {
      return errorResponse("Recipe images must be 5 MB or smaller", 400);
    }
  }

  const storage = createServiceRoleClient();
  if (!storage) {
    return errorResponse(
      "Recipe image upload needs SUPABASE_SERVICE_ROLE_KEY on the dashboard server.",
      503,
    );
  }

  const uploadedUrls: string[] = [];
  for (const file of files) {
    const path = `${household.household.id}/${auth.user.id}/${crypto.randomUUID()}-${safeFileName(
      file.name,
    )}`;
    const { error } = await storage.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return errorResponse(error.message, 500);
    }

    const { data } = storage.storage.from(BUCKET).getPublicUrl(path);
    uploadedUrls.push(data.publicUrl);
  }

  return NextResponse.json({ imageUrls: uploadedUrls });
}
