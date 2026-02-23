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

export async function fetchYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const watchResponse = await fetch(watchUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9,sv;q=0.8",
    },
  });

  if (!watchResponse.ok) {
    throw new Error(`Failed to fetch YouTube page (${watchResponse.status})`);
  }

  const html = await watchResponse.text();
  const player = parsePlayerResponseFromHtml(html);
  if (!player) {
    throw new Error("Unable to parse YouTube player response");
  }

  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const selectedTrack = pickCaptionTrack(tracks);
  if (!selectedTrack?.baseUrl) {
    throw new Error("No captions available for this video");
  }

  const captionUrl = `${selectedTrack.baseUrl}&fmt=json3`;
  const captionResponse = await fetch(captionUrl);
  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions (${captionResponse.status})`);
  }

  const captionJson = (await captionResponse.json()) as unknown;
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
