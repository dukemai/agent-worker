/**
 * Build task content from email extraction, with promotion-specific handling
 * (dropped vs relevant promotion, or normal task). Used by worker and dashboard.
 */

import type {
  BuiltEmailContent,
  EmailExtractionLike,
  EmailMetadata,
} from "../types";

export type { BuiltEmailContent, EmailExtractionLike, EmailMetadata, TargetBucket } from "../types";

/**
 * Resolves extraction to task content: handles promotion (dropped vs relevant)
 * or builds normal task from extraction.
 */
export function buildTaskContentFromExtraction(
  subject: string,
  body: string,
  extracted: EmailExtractionLike,
  baseMetadata: EmailMetadata = {}
): BuiltEmailContent {
  const metadata: EmailMetadata = { ...baseMetadata };

  if (extracted.email_type === "promotion" && !extracted.promotion_relevant) {
    metadata.email_type = "promotion";
    return {
      kind: "dropped",
      message: "Promotion dropped (not relevant)",
      metadata,
    };
  }

  if (extracted.email_type === "promotion" && extracted.promotion_relevant) {
    const store = (extracted.store ?? "").trim() || "Promotion";
    const summary = (extracted.deal_summary ?? "").trim() || extracted.title;
    const link = (extracted.store_link ?? "").trim() || "";
    const title = `${store}: ${summary}`.substring(0, 200);
    const bodyWithLink = `${summary}${link ? `\n\nSeller link: ${link}` : ""}`;

    metadata.email_type = "promotion";
    metadata.store = store;
    metadata.deal_summary = summary;
    metadata.store_link = link;

    return {
      kind: "task",
      title,
      body: bodyWithLink,
      dueDate: null,
      targetBucket: "today",
      metadata,
    };
  }

  const title =
    extracted.title.substring(0, 200) || subject.substring(0, 200) || "Untitled";

  metadata.email_type = extracted.email_type;

  return {
    kind: "task",
    title,
    body,
    dueDate: extracted.due_date,
    targetBucket: extracted.target_bucket,
    metadata,
  };
}

export function buildFallbackTaskContent(
  subject: string,
  body: string,
  baseMetadata: EmailMetadata = {}
): BuiltEmailContent {
  const title = subject ? subject.substring(0, 200) : "Untitled";

  return {
    kind: "task",
    title,
    body,
    dueDate: null,
    targetBucket: "later",
    metadata: { ...baseMetadata },
  };
}
