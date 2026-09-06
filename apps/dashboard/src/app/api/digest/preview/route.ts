import { NextResponse } from "next/server";
import { addCalendarDays, buildDigestEmailHtml, loadDigestEmailContent, stockholmDate } from "@agent/shared";
import type {
  DigestLessonItem,
  GrowingSuggestionDigestItem,
  PromotionDigestItem,
  RecentGrowingKnowledgeItem,
  RecentGrowingWindowItem,
  RenewalDigestItem,
  BirthdayDigestItem,
  ActivityDigestItem,
  TripDigestItem,
  PlanningDayDigestItem,
  GrowingDigestMode,
} from "@agent/shared";
import { getAuthedSupabase } from "@/lib/api";
import type { Bucket } from "@/types/database";

type DigestTaskPreviewItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: "pending" | "done";
  bucket: Bucket;
};

type DigestWeatherPreview = {
  summary: string;
  rainForecast: boolean;
};

export type DigestPreviewResponse = {
  date: string;
  generated_at: string;
  should_send: boolean;
  weather: DigestWeatherPreview;
  narrative: string;
  html: string;
  tasks: {
    today: DigestTaskPreviewItem[];
    this_week: DigestTaskPreviewItem[];
    later: DigestTaskPreviewItem[];
  };
  renewals: RenewalDigestItem[];
  growing: {
    suggestions: GrowingSuggestionDigestItem[];
    recentKnowledge: RecentGrowingKnowledgeItem[];
    recentWindows: RecentGrowingWindowItem[];
    mode: GrowingDigestMode;
  };
  learning: DigestLessonItem[];
  promotions: PromotionDigestItem[];
  birthdays: BirthdayDigestItem[];
  trips: TripDigestItem[];
  activities: ActivityDigestItem[];
  planning_days: PlanningDayDigestItem[];
};

function getPreviewDate(): string {
  return addCalendarDays(stockholmDate(), 1);
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const supabase = auth.supabase;
  const previewDate = getPreviewDate();

  // Same digest payload as the worker cron (no weekly suggestion generation; no side effects).
  const weatherSummary = "Väderförhandsvisning: se faktiska detaljer i den skickade digesten.";
  const rainForecast = false;

  const content = await loadDigestEmailContent(supabase, {
    ensureWeeklySuggestionsWhenEmpty: false,
    weatherSummary,
    rainForecast,
    lessons: [],
    targetDate: previewDate,
  });

  const url = new URL(request.url);
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? url.origin;

  const html = await buildDigestEmailHtml(content, dashboardUrl);

  const mapTasks = (
    tasks: typeof content.todayTasks,
    bucket: Bucket
  ): DigestTaskPreviewItem[] =>
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      status: task.status === "done" ? "done" : "pending",
      bucket,
    }));

  const response: DigestPreviewResponse = {
    date: previewDate,
    generated_at: new Date().toISOString(),
    should_send: content.shouldSend,
    weather: {
      summary: content.weatherSummary,
      rainForecast: content.rainForecast,
    },
    narrative: content.narrative,
    html,
    tasks: {
      today: mapTasks(content.todayTasks, "today"),
      this_week: mapTasks(content.thisWeekTasks, "this_week"),
      later: mapTasks(content.laterTasks, "later"),
    },
    renewals: content.renewalItems,
    growing: {
      suggestions: content.growingSuggestions,
      recentKnowledge: content.recentGrowingKnowledge,
      recentWindows: content.recentGrowingWindows,
      mode: content.growingMode,
    },
    learning: content.lessons,
    promotions: content.promotionItems,
    birthdays: content.birthdayItems,
    trips: content.tripItems,
    activities: content.activityItems,
    planning_days: content.planningDayItems,
  };

  return NextResponse.json(response);
}
