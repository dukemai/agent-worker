import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
  type Schema,
} from "@google/generative-ai";

export interface TaskExtractionResult {
  email_type: "task" | "promotion";
  title: string;
  due_date: string | null;
  target_bucket: "today" | "this_week" | "later";
  priority: number;
  promotion_relevant: boolean;
  store?: string;
  deal_summary?: string;
  store_link?: string;
}

export interface GrowingActionableTip {
  item_key: string;
  item_name: string;
  suggestion_kind: "action";
  action_type: "seed" | "transplant" | "prune" | "harvest" | "protect" | "plan" | "inspire";
  start_month: number;
  end_month: number;
  priority: number;
  suggested_bucket: "today" | "this_week" | "later";
  stockholm_note: string;
  tags: string[];
}

export interface GrowingKnowledgeNugget {
  title: string;
  content: string;
  category:
    | "technique"
    | "plant-profile"
    | "soil"
    | "pest-control"
    | "companion-planting"
    | "preservation"
    | "general";
  tags: string[];
  season_relevance: Array<"spring" | "summer" | "autumn" | "winter">;
  stockholm_relevant: boolean;
  location_note?: string | null;
}

export interface GrowingKnowledgeExtractionResult {
  actionable_tips: GrowingActionableTip[];
  knowledge_nuggets: GrowingKnowledgeNugget[];
}

const TASK_EXTRACTION_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    email_type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["task", "promotion"],
      description: "Type of email",
    } as Schema,
    title: { type: SchemaType.STRING, description: "Short task title" } as Schema,
    due_date: {
      type: SchemaType.STRING,
      format: "date-time",
      nullable: true,
      description: "ISO8601 date or null",
    } as Schema,
    target_bucket: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["today", "this_week", "later"],
      description: "Which bucket to place the task in",
    } as Schema,
    priority: {
      type: SchemaType.INTEGER,
      description: "Priority 1-5",
    } as Schema,
    promotion_relevant: {
      type: SchemaType.BOOLEAN,
      description: "For promotions: true if email matches user interests",
    } as Schema,
    store: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Store name for promotion emails",
    } as Schema,
    deal_summary: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Short summary of promotion highlights",
    } as Schema,
    store_link: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Primary seller/deal link in the email",
    } as Schema,
  },
  required: ["email_type", "title", "target_bucket", "priority", "promotion_relevant"],
};

const GROWING_KNOWLEDGE_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    actionable_tips: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item_key: { type: SchemaType.STRING } as Schema,
          item_name: { type: SchemaType.STRING } as Schema,
          suggestion_kind: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["action"],
          } as Schema,
          action_type: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["seed", "transplant", "prune", "harvest", "protect", "plan", "inspire"],
          } as Schema,
          start_month: { type: SchemaType.INTEGER } as Schema,
          end_month: { type: SchemaType.INTEGER } as Schema,
          priority: { type: SchemaType.INTEGER } as Schema,
          suggested_bucket: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["today", "this_week", "later"],
          } as Schema,
          stockholm_note: { type: SchemaType.STRING } as Schema,
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
          } as Schema,
        },
        required: [
          "item_key",
          "item_name",
          "suggestion_kind",
          "action_type",
          "start_month",
          "end_month",
          "priority",
          "suggested_bucket",
          "stockholm_note",
          "tags",
        ],
      } as Schema,
    } as Schema,
    knowledge_nuggets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING } as Schema,
          content: { type: SchemaType.STRING } as Schema,
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [
              "technique",
              "plant-profile",
              "soil",
              "pest-control",
              "companion-planting",
              "preservation",
              "general",
            ],
          } as Schema,
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
          } as Schema,
          season_relevance: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["spring", "summer", "autumn", "winter"],
            } as Schema,
          } as Schema,
          stockholm_relevant: { type: SchemaType.BOOLEAN } as Schema,
          location_note: {
            type: SchemaType.STRING,
            nullable: true,
            description:
              "Which location/climate this applies to (e.g. Stockholm, Nordic, temperate, Mediterranean, general)",
          } as Schema,
        },
        required: ["title", "content", "category", "tags", "season_relevance", "stockholm_relevant"],
      } as Schema,
    } as Schema,
  },
  required: ["actionable_tips", "knowledge_nuggets"],
};

export async function getTaskExtractionFromEmail(
  apiKey: string,
  subject: string,
  body: string,
  from: string,
  systemPrompt: string
): Promise<TaskExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: TASK_EXTRACTION_SCHEMA,
    },
  });

  const userContent = `From: ${from}\nSubject: ${subject}\n\nBody:\n${body}`;
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userContent}`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  const parsed = JSON.parse(text) as TaskExtractionResult;

  if (!parsed.title || !parsed.target_bucket) {
    throw new Error("Invalid Gemini response: missing required fields");
  }

  if (!["today", "this_week", "later"].includes(parsed.target_bucket)) {
    parsed.target_bucket = "later";
  }

  if (!parsed.email_type) {
    parsed.email_type = "task";
  }

  if (parsed.email_type === "promotion" && parsed.promotion_relevant === undefined) {
    parsed.promotion_relevant = false;
  }

  if (parsed.email_type === "promotion") {
    if (typeof parsed.store !== "string") {
      parsed.store = "";
    }
    if (typeof parsed.deal_summary !== "string") {
      parsed.deal_summary = "";
    }
    if (typeof parsed.store_link !== "string") {
      parsed.store_link = "";
    }
  }

  return parsed;
}

export async function extractGrowingKnowledge(
  apiKey: string,
  fullPrompt: string
): Promise<GrowingKnowledgeExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GROWING_KNOWLEDGE_SCHEMA,
    },
  });

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty response");
  }
  let parsed: GrowingKnowledgeExtractionResult;
  try {
    parsed = JSON.parse(text) as GrowingKnowledgeExtractionResult;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid JSON: ${msg}. First 200 chars: ${text.slice(0, 200)}`);
  }

  const actionable_tips = (parsed.actionable_tips ?? [])
    .filter((tip) => tip && typeof tip.item_name === "string")
    .map((tip) => ({
      ...tip,
      suggestion_kind: "action" as const,
      start_month: Math.min(12, Math.max(1, Number(tip.start_month) || 1)),
      end_month: Math.min(12, Math.max(1, Number(tip.end_month) || 12)),
      priority: Math.min(10, Math.max(1, Number(tip.priority) || 5)),
      suggested_bucket:
        tip.suggested_bucket === "today" ||
        tip.suggested_bucket === "this_week" ||
        tip.suggested_bucket === "later"
          ? tip.suggested_bucket
          : "this_week",
      tags: Array.isArray(tip.tags) ? tip.tags.filter((tag) => typeof tag === "string").slice(0, 8) : [],
    }));

  const knowledge_nuggets = (parsed.knowledge_nuggets ?? [])
    .filter((nugget) => nugget && typeof nugget.title === "string" && typeof nugget.content === "string")
    .map((nugget) => ({
      ...nugget,
      tags: Array.isArray(nugget.tags) ? nugget.tags.filter((tag) => typeof tag === "string").slice(0, 10) : [],
      season_relevance: Array.isArray(nugget.season_relevance)
        ? nugget.season_relevance.filter((season) =>
            season === "spring" || season === "summer" || season === "autumn" || season === "winter"
          )
        : [],
      stockholm_relevant: Boolean(nugget.stockholm_relevant),
      location_note:
        typeof nugget.location_note === "string" && nugget.location_note.trim()
          ? nugget.location_note.trim().slice(0, 120)
          : null,
    }));

  return { actionable_tips, knowledge_nuggets };
}
