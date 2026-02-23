/**
 * Extract YouTube video ID from common URL formats.
 * Supports youtu.be, youtube.com/watch, /shorts/, /embed/, and m.youtube.com.
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && id.length >= 6 ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        return id && id.length >= 6 ? id : null;
      }

      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2];
        return id && id.length >= 6 ? id : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}
