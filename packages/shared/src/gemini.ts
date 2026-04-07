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

/** One day in an AI meal plan tied to weekly grocery promotions (Swedish copy). */
export interface PromoMealPlanDay {
  day_label: string;
  /** Short breakfast idea (e.g. gröt, yoghurt, macka). */
  breakfast: string;
  /** Shopping-oriented ingredient lines for breakfast (Swedish; may be empty). */
  breakfast_ingredients: string[];
  lunch: string;
  lunch_ingredients: string[];
  dinner: string;
  dinner_ingredients: string[];
  /** Brief Swedish prep/cooking tips for lunch (may be empty if self-explanatory). */
  lunch_cooking_note: string;
  /** Brief Swedish prep/cooking tips for middag (ugn, panna, tid). */
  dinner_cooking_note: string;
  /** Which promotion `title` values this day mainly uses (may be empty). */
  uses_promotion_titles: string[];
}

const MEAL_PLAN_INGREDIENT_CAP = 16;

function sanitizeMealPlanIngredientList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 100 ? `${s.slice(0, 100)}…` : s))
    .slice(0, MEAL_PLAN_INGREDIENT_CAP);
}

export interface PromoMealPlanResult {
  intro: string;
  days: PromoMealPlanDay[];
  shopping_reminders: string[];
}

export type PromoMealPlanInputItem = {
  title: string;
  card_text?: string | null;
  price_hint?: string | null;
  matched_interest: string;
};

const PROMO_MEAL_PLAN_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: {
      type: SchemaType.STRING,
      description: "Short intro in Swedish (1–3 sentences).",
    } as Schema,
    days: {
      type: SchemaType.ARRAY,
      description: "Seven days, Monday–Sunday, Swedish day names in day_label.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day_label: { type: SchemaType.STRING } as Schema,
          breakfast: {
            type: SchemaType.STRING,
            description: "Brief breakfast suggestion in Swedish (one short phrase).",
          } as Schema,
          breakfast_ingredients: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description:
              "What to shop for frukosten: short Swedish lines (optionally with amounts, e.g. '2 dl havregryn', 'mjölk'). Empty array only if obvious from text.",
          } as Schema,
          lunch: { type: SchemaType.STRING } as Schema,
          lunch_ingredients: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description:
              "Ingredients to buy/prepare for lunch only (Swedish lines). Include staples if the meal needs them. Empty if rester/macka with no extras.",
          } as Schema,
          dinner: { type: SchemaType.STRING } as Schema,
          dinner_ingredients: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description:
              "Ingredients for middag (Swedish): main items from offers + needed sides (potatis, lök, etc.).",
          } as Schema,
          lunch_cooking_note: {
            type: SchemaType.STRING,
            description:
              "Short Swedish prep for lunch only (1–3 sentences, or empty string if obvious e.g. rester).",
          } as Schema,
          dinner_cooking_note: {
            type: SchemaType.STRING,
            description:
              "Short Swedish cooking steps for dinner (temps, order, rough time). 1–4 sentences.",
          } as Schema,
          uses_promotion_titles: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
          } as Schema,
        },
        required: [
          "day_label",
          "breakfast",
          "breakfast_ingredients",
          "lunch",
          "lunch_ingredients",
          "dinner",
          "dinner_ingredients",
          "lunch_cooking_note",
          "dinner_cooking_note",
          "uses_promotion_titles",
        ],
      } as Schema,
    } as Schema,
    shopping_reminders: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
  },
  required: ["intro", "days", "shopping_reminders"],
};

function truncatePromoDetail(value: string | null | undefined, max: number): string {
  if (value == null) return "";
  const t = value.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Build a 7-day meal sketch from matched promotion rows (ICA-style offers, Swedish output).
 */
export async function generatePromoMealPlanForWeek(
  apiKey: string,
  input: {
    isoWeek: number;
    storeKey: string;
    interests: string[];
    promotions: PromoMealPlanInputItem[];
  },
): Promise<PromoMealPlanResult> {
  const promosPayload = input.promotions.map((p) => ({
    title: p.title,
    detail: truncatePromoDetail(p.card_text, 220),
    price_hint: truncatePromoDetail(p.price_hint, 80),
    watchlist_match: p.matched_interest,
  }));

  const systemPreamble = `Du är en praktisk matplanerare för ett hushåll i Sverige.
Du får en lista med veckans kampanjer från en matbutik (ICA-liknande). Din uppgift är att föreslå en realistisk veckoplan (måndag–söndag) som gärna utnyttjar erbjudandena där det är rimligt.
För varje dag ska du inkludera en **kort** frukost (ett kort fras, t.ex. havregrynsgröt med mjölk, fil och müsli, rostat bröd och pålägg), samt lunch och middag.
För **varje måltid** (frukost, lunch, middag): fyll i **breakfast_ingredients**, **lunch_ingredients**, **dinner_ingredients** — korta inköpsrader på svenska (gärna med ungefärlig mängd där det hjälper). Användaren ska se vad som behöver köpas. Prioritera det som följer av kampanjlistan; lägg till rimliga basvaror (mjölk, lök, potatis) när måltiden kräver det. Tom array för en måltid bara om inget extra behöver köpas (t.ex. rester utan tillbehör).
Lägg till **lunch_cooking_note**: korta tillagnings-/prepsteg som bara gäller **lunchen** (tom sträng om lunchen är uppenbar, t.ex. rester/macka).
Lägg till **dinner_cooking_note**: korta steg som bara gäller **middagen** (ugnstemperatur, ordning i panna, tid). Max 2–4 meningar, inga långa recept.
Skriv intro, måltidsförslag och påminnelser på svenska. Håll förslagen korta och vardagliga.
Sätt uses_promotion_titles till de kampanjtitlar (exakt som i listan) som i första hand används den dagen — tom array om ingen passar.
Gissa inte nya produkter som inte följer av kampanjlistan; komplettera med neutrala basvaror (potatis, ris, sallad) när det behövs.
Returnera JSON enligt schemat.`;

  const body = {
    iso_week: input.isoWeek,
    store_key: input.storeKey,
    watchlist_interests: input.interests,
    promotions: promosPayload,
  };

  const userContent = JSON.stringify(body, null, 0);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: PROMO_MEAL_PLAN_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n\n---\n\n${userContent}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty meal plan response");
  }

  let parsed: PromoMealPlanResult;
  try {
    parsed = JSON.parse(text) as PromoMealPlanResult;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid meal plan JSON: ${msg}. Snippet: ${text.slice(0, 160)}`);
  }

  const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";
  const daysRaw = Array.isArray(parsed.days) ? parsed.days : [];
  const days: PromoMealPlanDay[] = daysRaw
    .filter((d) => d && typeof d.day_label === "string")
    .slice(0, 7)
    .map((raw) => {
      const d = raw as Partial<PromoMealPlanDay> & { cooking_note?: string };
      let lunchCook =
        typeof d.lunch_cooking_note === "string" ? d.lunch_cooking_note.trim() : "";
      let dinnerCook =
        typeof d.dinner_cooking_note === "string" ? d.dinner_cooking_note.trim() : "";
      if (!dinnerCook && typeof d.cooking_note === "string") {
        dinnerCook = d.cooking_note.trim();
      }
      return {
        day_label: typeof d.day_label === "string" ? d.day_label.trim() : "",
        breakfast: typeof d.breakfast === "string" ? d.breakfast.trim() : "",
        breakfast_ingredients: sanitizeMealPlanIngredientList(d.breakfast_ingredients),
        lunch: typeof d.lunch === "string" ? d.lunch.trim() : "",
        lunch_ingredients: sanitizeMealPlanIngredientList(d.lunch_ingredients),
        dinner: typeof d.dinner === "string" ? d.dinner.trim() : "",
        dinner_ingredients: sanitizeMealPlanIngredientList(d.dinner_ingredients),
        lunch_cooking_note: lunchCook,
        dinner_cooking_note: dinnerCook,
        uses_promotion_titles: Array.isArray(d.uses_promotion_titles)
          ? d.uses_promotion_titles.filter((t): t is string => typeof t === "string").slice(0, 12)
          : [],
      };
    })
    .filter(
      (d) =>
        d.day_label.length > 0 &&
        (d.breakfast.length > 0 || d.lunch.length > 0 || d.dinner.length > 0),
    );

  const shopping_reminders = Array.isArray(parsed.shopping_reminders)
    ? parsed.shopping_reminders
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (days.length === 0) {
    throw new Error("Meal plan contained no valid days");
  }

  return {
    intro: intro || "Här är ett förslag baserat på veckans kampanjer.",
    days,
    shopping_reminders,
  };
}
