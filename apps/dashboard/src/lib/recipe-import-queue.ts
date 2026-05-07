export const RECIPE_IMPORT_QUEUE_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type RecipeImportQueueStatus = (typeof RECIPE_IMPORT_QUEUE_STATUSES)[number];

export type RecipeImportQueueRow = {
  id: string;
  user_id: string;
  household_id: string | null;
  source_url: string;
  source_label: string;
  source_markdown?: string;
  source_markdown_preview?: string;
  status: RecipeImportQueueStatus;
  attempts: number;
  last_error: string | null;
  run_after: string;
  processing_started_at: string | null;
  processed_at: string | null;
  created_recipe_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateRecipeImportQueueBody = {
  source_url: string;
  source_label: string;
  source_markdown: string;
};

export const RECIPE_IMPORT_QUEUE_SELECT =
  "id, user_id, household_id, source_url, source_label, source_markdown, status, attempts, last_error, run_after, processing_started_at, processed_at, created_recipe_id, created_at, updated_at";

export const MAX_RECIPE_IMPORT_SOURCE_URL = 2000;
export const MAX_RECIPE_IMPORT_SOURCE_LABEL = 200;
export const MAX_RECIPE_IMPORT_MARKDOWN = 120_000;
export const RECIPE_IMPORT_MARKDOWN_PREVIEW_LENGTH = 500;

export function previewRecipeImportMarkdown(markdown: string): string {
  const trimmed = markdown.trim();
  if (trimmed.length <= RECIPE_IMPORT_MARKDOWN_PREVIEW_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, RECIPE_IMPORT_MARKDOWN_PREVIEW_LENGTH)}...`;
}

export function parseCreateRecipeImportQueueBody(
  body: unknown,
): CreateRecipeImportQueueBody | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected JSON body" };
  }

  const o = body as Record<string, unknown>;
  const sourceUrl = typeof o.source_url === "string" ? o.source_url.trim() : "";
  const sourceLabel =
    typeof o.source_label === "string"
      ? o.source_label.replace(/\s+/g, " ").trim().slice(0, MAX_RECIPE_IMPORT_SOURCE_LABEL)
      : "";
  const sourceMarkdown =
    typeof o.source_markdown === "string"
      ? o.source_markdown.trim()
      : "";

  if (sourceUrl.length > MAX_RECIPE_IMPORT_SOURCE_URL) {
    return { error: "source_url is too long" };
  }
  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "source_url must be an http(s) URL" };
      }
    } catch {
      return { error: "source_url must be a valid URL" };
    }
  }
  if (!sourceMarkdown) {
    return { error: "source_markdown must be a non-empty string" };
  }
  if (sourceMarkdown.length > MAX_RECIPE_IMPORT_MARKDOWN) {
    return {
      error: `source_markdown is too long (max ${MAX_RECIPE_IMPORT_MARKDOWN} characters)`,
    };
  }

  return {
    source_url: sourceUrl,
    source_label: sourceLabel,
    source_markdown: sourceMarkdown,
  };
}

export function withRecipeImportMarkdownPreview(row: RecipeImportQueueRow): RecipeImportQueueRow {
  return {
    ...row,
    source_markdown_preview: previewRecipeImportMarkdown(row.source_markdown ?? ""),
    source_markdown: undefined,
  };
}
