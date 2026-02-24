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

type PlayerResponse = {
  videoDetails?: {
    title?: string;
    author?: string;
    shortDescription?: string;
  };
};

function parsePlayerResponseFromHtml(html: string): PlayerResponse | null {
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]*?});/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return JSON.parse(match[1]) as PlayerResponse;
  } catch {
    return null;
  }
}

const INNERTUBE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchPlayerResponseFromInnertube(videoId: string): Promise<PlayerResponse | null> {
  const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": INNERTUBE_USER_AGENT,
    },
    body: JSON.stringify({
      context: {
        client: { clientName: "WEB", clientVersion: "2.20240101.00.00" },
      },
      videoId,
    }),
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as PlayerResponse;
  return data ?? null;
}

export type YouTubeVideoInfo = {
  videoId: string;
  title: string | null;
  channel: string | null;
  description: string | null;
};

/** Fetch video metadata (title, channel, description) via Innertube API, fallback to watch page HTML. */
export async function fetchYouTubeVideoInfo(urlOrVideoId: string): Promise<YouTubeVideoInfo> {
  const videoId =
    urlOrVideoId.length === 11 && !urlOrVideoId.includes("/")
      ? urlOrVideoId
      : extractYouTubeVideoId(urlOrVideoId);
  if (!videoId) {
    throw new Error("Invalid YouTube URL or video ID");
  }

  let player: PlayerResponse | null = await fetchPlayerResponseFromInnertube(videoId);

  if (!player) {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const watchResponse = await fetch(watchUrl, {
      headers: {
        "user-agent": INNERTUBE_USER_AGENT,
        "accept-language": "en-US,en;q=0.9,sv;q=0.8",
      },
    });
    if (!watchResponse.ok) {
      throw new Error(`Failed to fetch YouTube page (${watchResponse.status})`);
    }
    const html = await watchResponse.text();
    player = parsePlayerResponseFromHtml(html);
  }

  if (!player) {
    throw new Error("Unable to get YouTube video info");
  }

  const vd = player.videoDetails ?? {};
  return {
    videoId,
    title: vd.title ?? null,
    channel: vd.author ?? null,
    description: vd.shortDescription ?? null,
  };
}
