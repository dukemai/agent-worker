import { GoogleGenerativeAI } from "@google/generative-ai";

export type BookCandidateForOrganization = {
  id: string;
  title: string;
  author: string | null;
  factual_summary: string | null;
  facts: Record<string, unknown>;
};

export type OrganizedBook = {
  candidate_id: string;
  rank: number;
  fit_reason: string;
  caveats: string | null;
  match_tags: string[];
};

export async function organizeBookCandidates(apiKey: string, intention: string, brief: unknown, candidates: BookCandidateForOrganization[]) {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
  const prompt = [
    'Return JSON only: {"shortlist":[{"candidate_id":"...","rank":1,"fit_reason":"...","caveats":null,"match_tags":["..."]}]}',
    "Rank the supplied book candidates for the reading intention and brief.",
    "Use only supplied facts. Do not invent plot, age guidance, availability, awards, or reading level.",
    "fit_reason is interpretation and should explain the match concisely. caveats should name missing or uncertain facts.",
    "Include every candidate once, strongest match first, with consecutive ranks.",
    `Intention: ${intention}`,
    `Brief JSON: ${JSON.stringify(brief)}`,
    `Candidate facts JSON: ${JSON.stringify(candidates)}`,
  ].join("\n\n");
  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text()) as { shortlist?: unknown[] };
  const allowed = new Set(candidates.map((candidate) => candidate.id));
  const seen = new Set<string>();
  return (Array.isArray(parsed.shortlist) ? parsed.shortlist : [])
    .map((value, index): OrganizedBook | null => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      const candidateId = typeof row.candidate_id === "string" ? row.candidate_id : "";
      const reason = typeof row.fit_reason === "string" ? row.fit_reason.trim().slice(0, 1000) : "";
      if (!allowed.has(candidateId) || seen.has(candidateId) || !reason) return null;
      seen.add(candidateId);
      return {
        candidate_id: candidateId,
        rank: index + 1,
        fit_reason: reason,
        caveats: typeof row.caveats === "string" && row.caveats.trim() ? row.caveats.trim().slice(0, 1000) : null,
        match_tags: Array.isArray(row.match_tags) ? row.match_tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 8) : [],
      };
    })
    .filter((row): row is OrganizedBook => row !== null);
}
