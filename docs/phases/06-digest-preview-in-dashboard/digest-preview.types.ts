// Sample TypeScript types for the digest preview API.
// Task 2 should keep this file in sync with the actual implementation.

export type DigestPreviewQuery = {
  /**
   * ISO date (YYYY-MM-DD) to preview for.
   * If omitted, default to the **next day’s** digest in the server’s UTC logic
   * (i.e. “tomorrow’s” daily digest preview).
   */
  date?: string;

  /**
   * Optional comma-separated list of sections to include, e.g. "tasks,renewals,growing".
   * If omitted, include all sections.
   */
  sections?: string;
};

export interface DigestTaskPreviewItem {
  id: string;
  title: string;
  due_date: string | null;
  status: "pending" | "done";
  bucket: "today" | "this_week" | "later";
}

export interface DigestWeatherPreview {
  summary: string;
  rainForecast: boolean;
}

export interface DigestPreviewResponse {
  /** Date the digest is for (YYYY-MM-DD, same semantics as cron). */
  date: string;

  /** When this preview payload was generated (ISO timestamp). */
  generated_at: string;

  /** Full HTML email body, built via shared email template. */
  html: string;

  /** Weather block used in the digest. */
  weather: DigestWeatherPreview;

  /** Gemini-generated narrative used in "Today's Briefing". */
  narrative: string;

  /** Task sections (same buckets as the email). */
  tasks: {
    today: DigestTaskPreviewItem[];
    this_week: DigestTaskPreviewItem[];
    later: DigestTaskPreviewItem[];
  };

  /** Upcoming renewals. */
  renewals: unknown[]; // wire to RenewalDigestItem during implementation

  /** Growing-related content. */
  growing: {
    tasks: unknown[]; // GrowingTaskDigestItem[]
    suggestions: unknown[]; // GrowingSuggestionDigestItem[]
    recentKnowledge: unknown[]; // RecentGrowingKnowledgeItem[]
    recentWindows: unknown[]; // RecentGrowingWindowItem[]
  };

  /** Learning lessons for the day. */
  learning: unknown[]; // DigestLessonItem[]

  /** Promotion/deal items. */
  promotions: unknown[]; // PromotionDigestItem[]
}

