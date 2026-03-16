import type { DigestPreviewResponse } from "@/../docs/phases/06-digest-preview-in-dashboard/digest-preview.types";

async function readApiError(response: Response, fallback: string): Promise<never> {
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(json.error ?? fallback);
}

export async function fetchDigestPreview(): Promise<DigestPreviewResponse> {
  const response = await fetch("/api/digest/preview", { cache: "no-store" });
  if (!response.ok) {
    await readApiError(response, "Failed to load digest preview");
  }
  return (await response.json()) as DigestPreviewResponse;
}

