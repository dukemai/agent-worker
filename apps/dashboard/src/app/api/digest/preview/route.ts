import { NextResponse } from "next/server";
import {
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
import { errorResponse, getAuthedSupabase } from "@/lib/api";
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

type DigestPreviewResponse = {
  date: string;
  generated_at: string;
  weather: DigestWeatherPreview;
  narrative: string;
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

export async function GET() {
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

  const dayOfWeek = new Date().getUTCDay();
  const includeGrowing = dayOfWeek === 1 || dayOfWeek === 5;

  const growingTasks = includeGrowing ? extractGrowingTaskItems(allTasks) : [];
  const growingSuggestions = includeGrowing ? await fetchPendingGrowingSuggestions(supabase) : [];
  const recentGrowing = includeGrowing ? await fetchRecentGrowingKnowledge(supabase) : { knowledge: [], windows: [] };

  // For preview, keep weather simple and avoid external API calls for now.
  const weatherSummary = "Preview: weather will be included in the actual email.";
  const rainForecast = false;

  // Generate narrative with Gemini if configured; otherwise use a fallback.
  let narrative = "Preview of your daily briefing. Weather and AI narrative will be included in the actual email.";
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      narrative = await generateBriefingNarrative(
        apiKey,
        weatherSummary,
        todayTasks,
        thisWeekTasks,
        laterTasks,
        rainForecast
      );
    } catch (err) {
      console.warn("Digest preview: Gemini briefing failed, using fallback:", err);
    }
  }

  const mapTasks = (tasks: DigestTask[], bucket: Bucket): DigestTaskPreviewItem[] =>
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
    weather: {
      summary: weatherSummary,
      rainForecast,
    },
    narrative,
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

