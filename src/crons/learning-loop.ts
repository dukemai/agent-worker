import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LEARNING_LESSON } from "../prompts/learning-lesson";

type ProfileType = "topic" | "category";

interface LearningProfileRow {
  id: string;
  topic: string;
  profile_type: ProfileType;
  current_level: string | null;
  daily_goal: string | null;
  status: "active" | "paused";
}

interface LearningLogRow {
  id: string;
  profile_id: string;
  content: string;
  feedback: string | null;
  created_at: string;
}

export interface GeneratedLesson {
  id: string;
  profile_id: string;
  topic: string;
  profile_type: ProfileType;
  content: string;
  created_at: string;
}

async function generateLessonContent(
  apiKey: string,
  profile: LearningProfileRow,
  recentLogs: LearningLogRow[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const recentFeedback =
    recentLogs
      .filter((log) => log.feedback)
      .slice(0, 6)
      .map((log) => log.feedback)
      .join(", ") || "No feedback yet";

  const recentLessons =
    recentLogs
      .slice(0, 6)
      .map((log) => log.content.split("\n")[0]?.slice(0, 120) ?? "")
      .filter(Boolean)
      .join(" | ") || "None";

  const prompt = LEARNING_LESSON
    .replace("{{topic}}", profile.topic)
    .replace("{{profileType}}", profile.profile_type)
    .replace("{{currentLevel}}", profile.current_level ?? "Intermediate")
    .replace("{{dailyGoal}}", profile.daily_goal ?? "Bite-sized (2 min read)")
    .replace("{{recentFeedback}}", recentFeedback)
    .replace("{{recentLessons}}", recentLessons);

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function runLearningLoop(env: Env): Promise<GeneratedLesson[]> {
  if (!env.GEMINI_API_KEY) {
    return [];
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  let activeProfiles: LearningProfileRow[] = [];
  const withType = await supabase
    .from("learning_profile")
    .select("id, topic, profile_type, current_level, daily_goal, status")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (!withType.error) {
    activeProfiles = ((withType.data as LearningProfileRow[] | null) ?? []).map((profile) => ({
      ...profile,
      profile_type: profile.profile_type ?? "topic",
    }));
  } else {
    // Backward-compatible fallback before migration 004 is applied.
    const fallback = await supabase
      .from("learning_profile")
      .select("id, topic, current_level, daily_goal, status")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (fallback.error) {
      throw new Error(`Failed to fetch learning profiles: ${fallback.error.message}`);
    }

    activeProfiles = ((fallback.data as Omit<LearningProfileRow, "profile_type">[] | null) ?? []).map((profile) => ({
      ...profile,
      profile_type: "topic",
    }));
  }

  if (activeProfiles.length === 0) {
    return [];
  }

  const generated: GeneratedLesson[] = [];

  for (const profile of activeProfiles) {
    const { data: recentLogs, error: logError } = await supabase
      .from("learning_log")
      .select("id, profile_id, content, feedback, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (logError) {
      console.warn(`Skipping profile ${profile.id} due to log fetch error: ${logError.message}`);
      continue;
    }

    let content: string;
    try {
      content = await generateLessonContent(
        env.GEMINI_API_KEY,
        profile,
        ((recentLogs as LearningLogRow[] | null) ?? [])
      );
    } catch (error) {
      console.warn(`Lesson generation failed for profile ${profile.id}:`, error);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("learning_log")
      .insert({
        profile_id: profile.id,
        content,
        feedback: null,
      })
      .select("id, profile_id, content, created_at")
      .single();

    if (insertError || !inserted) {
      console.warn(`Failed to insert lesson for profile ${profile.id}: ${insertError?.message}`);
      continue;
    }

    generated.push({
      ...inserted,
      topic: profile.topic,
      profile_type: profile.profile_type,
    });
  }

  return generated;
}
