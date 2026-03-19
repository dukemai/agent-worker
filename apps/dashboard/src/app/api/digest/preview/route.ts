import { NextResponse } from "next/server";
import {
  buildEmailHtml,
  extractGrowingTaskItems,
  extractPromotionItems,
  extractRenewalItems,
  fetchPendingGrowingSuggestions,
  fetchPendingTasksForBucket,
  fetchRecentGrowingKnowledge,
  generateBriefingNarrative,
} from "@agent/shared";
import type {
  DigestLessonItem,
  GrowingSuggestionDigestItem,
  GrowingTaskDigestItem,
  PromotionDigestItem,
  RecentGrowingKnowledgeItem,
  RecentGrowingWindowItem,
  RenewalDigestItem,
  Task as DigestTask,
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
    tasks: GrowingTaskDigestItem[];
    suggestions: GrowingSuggestionDigestItem[];
    recentKnowledge: RecentGrowingKnowledgeItem[];
    recentWindows: RecentGrowingWindowItem[];
  };
  learning: DigestLessonItem[];
  promotions: PromotionDigestItem[];
};

function getPreviewDate(): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.supabase) {
    return auth.error;
  }

  const supabase = auth.supabase;
  const previewDate = getPreviewDate();

  // Fetch tasks from all buckets in parallel using shared helper.
  const [todayTasks, thisWeekTasks, laterTasks] = await Promise.all([
    fetchPendingTasksForBucket(supabase, "today_tasks"),
    fetchPendingTasksForBucket(supabase, "this_week_tasks"),
    fetchPendingTasksForBucket(supabase, "later_tasks"),
  ]);

  const allTasks: DigestTask[] = [...todayTasks, ...thisWeekTasks, ...laterTasks];
  const promotionItems = extractPromotionItems(allTasks);
  const renewalItems = extractRenewalItems(allTasks);

  // For preview, always include the growing section so the user can see
  // how "Growing this week" and "Inspirations for growing this week" will look,
  // regardless of which weekday they open the dashboard.
  const growingTasks = extractGrowingTaskItems(allTasks);
  const growingSuggestions = await fetchPendingGrowingSuggestions(supabase);
  const recentGrowing = await fetchRecentGrowingKnowledge(supabase);

  // For preview, keep weather simple and avoid external API calls.
  const weatherSummary = "Väderförhandsvisning: se faktiska detaljer i den skickade digesten.";
  const rainForecast = false;

  // Generate narrative using shared template-based implementation (no AI).
  let narrative =
    "Förhandsvisning av dagens briefing. Vädret och uppgifterna nedan speglar hur e-postdigesten kommer se ut.";
  try {
    narrative = await generateBriefingNarrative(
      "",
      weatherSummary,
      todayTasks,
      thisWeekTasks,
      laterTasks,
      rainForecast
    );
  } catch (err) {
    console.warn("Digest preview: narrative generation failed, using fallback:", err);
  }

  const mapTasks = (tasks: DigestTask[], bucket: Bucket): DigestTaskPreviewItem[] =>
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      status: task.status === "done" ? "done" : "pending",
      bucket,
    }));

  const url = new URL(request.url);
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? url.origin;

  const html = await buildEmailHtml(
    weatherSummary,
    rainForecast,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    [], // lessons omitted in preview
    promotionItems,
    renewalItems,
    growingSuggestions,
    recentGrowing.knowledge,
    recentGrowing.windows,
    narrative,
    dashboardUrl
  );

  const response: DigestPreviewResponse = {
    date: previewDate,
    generated_at: new Date().toISOString(),
    weather: {
      summary: weatherSummary,
      rainForecast,
    },
    narrative,
    html,
    tasks: {
      today: mapTasks(todayTasks, "today"),
      this_week: mapTasks(thisWeekTasks, "this_week"),
      later: mapTasks(laterTasks, "later"),
    },
    renewals: renewalItems,
    growing: {
      tasks: growingTasks,
      suggestions: growingSuggestions,
      recentKnowledge: recentGrowing.knowledge,
      recentWindows: recentGrowing.windows,
    },
    // For preview, omit learning generation to avoid side effects; can be filled in later.
    learning: [],
    promotions: promotionItems,
  };

  return NextResponse.json(response);
}

