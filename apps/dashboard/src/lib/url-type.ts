import { extractYouTubeVideoId } from "@/lib/youtube";

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

export function isBlogUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getSourceType(url: string): "youtube" | "blog" | null {
  if (isYouTubeUrl(url)) return "youtube";
  if (isBlogUrl(url)) return "blog";
  return null;
}

