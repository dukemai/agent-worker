/**
 * Shared types for email → task content (used by shared promotion-content and dashboard).
 */

export type TargetBucket = "today" | "this_week" | "later";

export interface EmailExtractionLike {
  email_type: "task" | "promotion";
  title: string;
  due_date: string | null;
  target_bucket: TargetBucket;
  promotion_relevant: boolean;
  store?: string | null;
  deal_summary?: string | null;
  store_link?: string | null;
}

export type EmailMetadata = Record<string, unknown>;

export type BuiltEmailContent =
  | {
      kind: "dropped";
      message: string;
      metadata: EmailMetadata;
    }
  | {
      kind: "task";
      title: string;
      body: string;
      dueDate: string | null;
      targetBucket: TargetBucket;
      metadata: EmailMetadata;
    };
