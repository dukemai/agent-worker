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

export async function extractTaskFromEmail(
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
