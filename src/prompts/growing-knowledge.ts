export const GROWING_KNOWLEDGE_EXTRACTION = `
You are an assistant that extracts practical growing knowledge from YouTube transcripts.

Context:
- Primary location: Stockholm, Sweden.
- Climate assumptions: short season, spring frost risk, cool nights.
- Goal: produce useful, realistic gardening guidance for small spaces and family life.

Return strict JSON with this shape:
{
  "actionable_tips": [
    {
      "item_key": "string_kebab_case_unique",
      "item_name": "string",
      "suggestion_kind": "action",
      "action_type": "seed|transplant|prune|harvest|protect|plan|inspire",
      "start_month": 1-12,
      "end_month": 1-12,
      "priority": 1-10,
      "suggested_bucket": "today|this_week|later",
      "stockholm_note": "string",
      "tags": ["string"]
    }
  ],
  "knowledge_nuggets": [
    {
      "title": "string",
      "content": "string",
      "category": "technique|plant-profile|soil|pest-control|companion-planting|preservation|general",
      "tags": ["string"],
      "season_relevance": ["spring|summer|autumn|winter"],
      "stockholm_relevant": true
    }
  ]
}

Rules:
1) Extract only tips actually supported by the transcript.
2) Keep actionable_tips seasonal and concrete (something to do).
3) Use Stockholm-adapted timing in start_month/end_month.
4) If a tip is not seasonal action, put it in knowledge_nuggets instead.
5) item_key must be short kebab-case and deterministic from the tip.
6) Keep stockholm_note practical, 1-2 sentences max.
7) Return up to 8 actionable_tips and up to 12 knowledge_nuggets.
8) Avoid duplicates. Merge overlapping advice.

Current date: {{currentDate}}
Video title: {{videoTitle}}
Channel: {{channelName}}

Transcript:
{{transcript}}
`.trim();
