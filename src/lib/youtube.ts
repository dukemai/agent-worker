/**
 * YouTube transcript fetching.
 *
 * Uses YouTube's internal Innertube API (undocumented, can change):
 * POST https://www.youtube.com/youtubei/v1/player with { context: { client: { clientName, clientVersion } }, videoId }
 * → response.captions.playerCaptionsTracklistRenderer.captionTracks[].baseUrl
 * Then GET baseUrl&fmt=json3 → JSON with .events[].segs[].utf8
 *
 * See: https://nadimtuhin.com/blog/ytranscript-how-it-works
 * Fallback: parse ytInitialPlayerResponse from watch page HTML (often empty for captions now).
 */
export interface YouTubeTranscriptResult {
  videoId: string;
  title: string | null;
  channel: string | null;
  transcript: string;
}

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
};

type PlayerResponse = {
  videoDetails?: {
    title?: string;
    author?: string;
    shortDescription?: string;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("\\u0026", "&")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

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

function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) {
    return null;
  }

  const english = tracks.find((track) => track.languageCode === "en" && track.kind !== "asr");
  if (english) {
    return english;
  }

  const swedish = tracks.find((track) => track.languageCode === "sv" && track.kind !== "asr");
  if (swedish) {
    return swedish;
  }

  const firstNonAsr = tracks.find((track) => track.kind !== "asr");
  return firstNonAsr ?? tracks[0] ?? null;
}

function parseCaptionJson(json: unknown): string {
  const events = Array.isArray((json as { events?: unknown[] })?.events)
    ? ((json as { events: Array<{ segs?: Array<{ utf8?: string }> }> }).events ?? [])
    : [];

  const chunks: string[] = [];
  for (const event of events) {
    const segs = Array.isArray(event.segs) ? event.segs : [];
    let line = "";
    for (const seg of segs) {
      if (typeof seg.utf8 === "string") {
        line += seg.utf8;
      }
    }

    const cleaned = decodeHtmlEntities(line).replace(/\s+/g, " ").trim();
    if (cleaned.length > 0) {
      chunks.push(cleaned);
    }
  }

  return chunks.join("\n");
}

const INNERTUBE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Fetch player data (including caption tracks) via Innertube API. More reliable than HTML scrape. */
async function fetchPlayerResponseFromInnertube(videoId: string): Promise<PlayerResponse | null> {
  const response = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
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
    }
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as PlayerResponse;
  return data ?? null;
}

export async function fetchYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
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
    throw new Error("Unable to get YouTube player response (tried Innertube API and watch page)");
  }

  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const selectedTrack = pickCaptionTrack(tracks);
  if (!selectedTrack?.baseUrl) {
    throw new Error("No captions available for this video");
  }

  const captionUrl = `${selectedTrack.baseUrl}&fmt=json3`;
  const captionResponse = await fetch(captionUrl, {
    headers: { "User-Agent": INNERTUBE_USER_AGENT },
  });
  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions (${captionResponse.status})`);
  }

  const captionText = await captionResponse.text();
  if (!captionText?.trim()) {
    throw new Error("Caption response is empty");
  }
  let captionJson: unknown;
  try {
    captionJson = JSON.parse(captionText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Caption response is not valid JSON: ${msg}`);
  }
  const transcript = parseCaptionJson(captionJson);
  if (!transcript) {
    throw new Error("Caption transcript is empty");
  }

  return {
    videoId,
    title: player.videoDetails?.title ?? null,
    channel: player.videoDetails?.author ?? null,
    transcript,
  };
}
