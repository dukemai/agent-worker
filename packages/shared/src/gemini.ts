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

/** Kind of meal suggestion (10-meal promo plan). */
export type PromoMealPlanMealKind = "lunch" | "dinner" | "either" | "snack" | "other";

/** One meal idea in the 10-meal promo plan (Swedish copy). */
export interface PromoMealPlanMeal {
  title: string;
  summary: string;
  meal_kind: PromoMealPlanMealKind;
  /** Shopping lines: Swedish; promotions may appear as only part of the list. */
  ingredients: string[];
  /** Short prep/cooking steps, or empty if obvious. */
  cooking_note: string;
  /** Which promotion titles this meal builds on (subset of import; may be empty). */
  uses_promotion_titles: string[];
  /** Cuisine / style echoing user interests, e.g. "vietnamesiskt", "svensk husman". */
  cuisine_style: string;
}

const MEAL_PLAN_INGREDIENT_CAP = 18;

function sanitizeMealPlanIngredientList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 100 ? `${s.slice(0, 100)}…` : s))
    .slice(0, MEAL_PLAN_INGREDIENT_CAP);
}

const MEAL_KINDS: PromoMealPlanMealKind[] = ["lunch", "dinner", "either", "snack", "other"];

function sanitizeMealKind(value: unknown): PromoMealPlanMealKind {
  return typeof value === "string" && MEAL_KINDS.includes(value as PromoMealPlanMealKind)
    ? (value as PromoMealPlanMealKind)
    : "other";
}

export interface PromoMealPlanResult {
  intro: string;
  /** Exactly 10 meal suggestions. */
  meals: PromoMealPlanMeal[];
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
    meals: {
      type: SchemaType.ARRAY,
      description:
        "Exactly 10 meal ideas. Leverage weekly promotions where sensible; vary cuisine using user interests.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Dish / meal name in Swedish.",
          } as Schema,
          summary: {
            type: SchemaType.STRING,
            description: "1–2 sentences in Swedish: what it is and how it uses offers or style.",
          } as Schema,
          meal_kind: {
            type: SchemaType.STRING,
            description: "One of: lunch, dinner, either, snack, other.",
          } as Schema,
          ingredients: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description:
              "Swedish shopping lines; ingredients available in Sweden; promotion products may be only part of the list.",
          } as Schema,
          cooking_note: {
            type: SchemaType.STRING,
            description: "Short Swedish prep/cook steps, or empty string.",
          } as Schema,
          uses_promotion_titles: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING } as Schema,
            description: "Promotion titles from the input list used in this meal (exact strings).",
          } as Schema,
          cuisine_style: {
            type: SchemaType.STRING,
            description:
              "Short tag in Swedish, e.g. italienskt, vietnamesiskt, svensk husman, asiatiskt — aligned with user interests.",
          } as Schema,
        },
        required: [
          "title",
          "summary",
          "meal_kind",
          "ingredients",
          "cooking_note",
          "uses_promotion_titles",
          "cuisine_style",
        ],
      } as Schema,
    } as Schema,
    shopping_reminders: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
  },
  required: ["intro", "meals", "shopping_reminders"],
};

function truncatePromoDetail(value: string | null | undefined, max: number): string {
  if (value == null) return "";
  const t = value.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * Build **10 meal suggestions** from matched promotion rows (ICA-style offers, Swedish output).
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

  const systemPreamble = `Du är en praktisk matplanerare för ett hushåll i **Sverige**.

## Uppgift
Föreslå **exakt 10 måltider** (inte en dag-för-dag-veckokalender) utifrån:
- **Kampanjer** i JSON:en (ICA-liknande veckorbjudanden). **Utnyttja kampanjerna aktivt** – de kan vara huvudingrediens, del av rätten (t.ex. kyckling på kampanj i en gryta med andra saker) eller tillbehör. Koppla tydligt i text och i **uses_promotion_titles** när det stämmer.
- **watchlist_interests** (användarens intressen): använd dem för **smak och stil** – t.ex. asiatiskt, **vietnamesiskt**, **svensk** husman, **italienskt**, eller andra matkulturer som användaren nämner. Variera gärna mellan rätter så olika intressen får plats.
- **Ingredienser** ska vara **realistiska att köpa i Sverige** (vanliga matbutiker som ICA, Willys, Hemköp, Coop; specialitet som finns i vanliga större städer eller väl utbudet närbutik – undvik obskyra varor som sällan finns här). Skriv inköpsrader på **svenska** med valfri mängd där det hjälper.

## Regler
- Varje måltid har **ingredients** (lista) – kampanjvaror kan vara **en del** av listan, inte alltid hela måltiden.
- **cuisine_style**: kort svensk etikett (t.ex. "italienskt", "vietnamesiskt", "svensk husman", "asiatiskt") som speglar intressen och rätten.
- **meal_kind**: lunch | dinner | either | snack | other.
- **cooking_note**: korta tillagningssteg på svenska, eller tom sträng om uppenbart.
- **uses_promotion_titles**: exakt de kampanjtitlar från listan som måltiden bygger på (tom array om ingen kampanj passar).
- **intro** och **shopping_reminders** på svenska.
- Håll tonen vardaglig; inga långa recept – bara förslag som går att laga hemma.

Returnera JSON enligt schemat: **intro**, **meals** (10 st), **shopping_reminders**.`;

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
  const mealsRaw = Array.isArray((parsed as { meals?: unknown }).meals)
    ? (parsed as { meals: unknown[] }).meals
    : [];
  const meals: PromoMealPlanMeal[] = mealsRaw
    .filter((m) => m && typeof m === "object")
    .slice(0, 10)
    .map((raw) => {
      const m = raw as Partial<PromoMealPlanMeal>;
      return {
        title: typeof m.title === "string" ? m.title.trim() : "",
        summary: typeof m.summary === "string" ? m.summary.trim() : "",
        meal_kind: sanitizeMealKind(m.meal_kind),
        ingredients: sanitizeMealPlanIngredientList(m.ingredients),
        cooking_note: typeof m.cooking_note === "string" ? m.cooking_note.trim() : "",
        uses_promotion_titles: Array.isArray(m.uses_promotion_titles)
          ? m.uses_promotion_titles.filter((t): t is string => typeof t === "string").slice(0, 12)
          : [],
        cuisine_style:
          typeof m.cuisine_style === "string" ? m.cuisine_style.trim().slice(0, 80) : "",
      };
    })
    .filter((m) => m.title.length > 0 && (m.summary.length > 0 || m.ingredients.length > 0));

  const shopping_reminders = Array.isArray(parsed.shopping_reminders)
    ? parsed.shopping_reminders
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (meals.length !== 10) {
    throw new Error(
      `Meal plan must contain exactly 10 meals; got ${meals.length}. Regenerate or adjust the model output.`,
    );
  }

  return {
    intro: intro || "Här är tio förslag baserat på veckans kampanjer och dina intressen.",
    meals,
    shopping_reminders,
  };
}

/** Structured ingredient line for recipe generator output (Swedish UI). */
export interface RecipeIngredient {
  text: string;
  ingredient_label: string;
  amount: string;
}

/** One AI-generated recipe suggestion (recipe generator). */
export interface RecipeGeneratorMeal {
  /** Dish name in Swedish (primary). */
  title: string;
  /** Same dish in English (for search/sharing). */
  title_en: string;
  /** Same dish in Vietnamese (family communication). */
  title_vi: string;
  summary: string;
  meal_kind: PromoMealPlanMealKind;
  /** Approx. active + light waiting time until serving, e.g. "ca 35 min" (Swedish). */
  estimated_cook_time: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  uses_ingredient_picks: string[];
}

export interface RecipeGenerateResult {
  intro: string;
  meals: RecipeGeneratorMeal[];
}

const RECIPE_GENERATOR_MAX_MEALS = 8;
const RECIPE_INGREDIENT_ROW_CAP = 24;
const RECIPE_STEP_CAP = 24;

/** Model id for dashboard recipe generator (`generateRecipeIdeasFromIngredients`). */
export const RECIPE_GENERATOR_MODEL_ID = "gemini-2.5-flash";

/** Stored on `saved_recipes.source` when saving from the recipe generator. */
export const RECIPE_GENERATOR_SOURCE_LABEL = "Gemini 2.5 Flash (AI recipe generator)";

const RECIPE_INGREDIENT_ITEM_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    text: {
      type: SchemaType.STRING,
      description: "Full display line in Swedish, e.g. Kycklingfilé ca 400 g, tärnad",
    } as Schema,
    ingredient_label: {
      type: SchemaType.STRING,
      description: "Short label for the ingredient (often matches a picked ICA label).",
    } as Schema,
    amount: {
      type: SchemaType.STRING,
      description: "Amount only, e.g. 400 g, 2 dl, 1 st, efter smak",
    } as Schema,
  },
  required: ["text", "ingredient_label", "amount"],
};

const RECIPE_GENERATOR_MEAL_ITEM_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Dish name in Swedish" } as Schema,
    title_en: {
      type: SchemaType.STRING,
      description: "Same dish name in natural English (not a literal word-for-word translation if awkward)",
    } as Schema,
    title_vi: {
      type: SchemaType.STRING,
      description: "Same dish name in Vietnamese (natural phrasing)",
    } as Schema,
    summary: {
      type: SchemaType.STRING,
      description: "1–2 sentences in Swedish: what it is and how it uses the ingredients.",
    } as Schema,
    meal_kind: {
      type: SchemaType.STRING,
      description: "One of: lunch, dinner, either, snack, other",
    } as Schema,
    ingredients: {
      type: SchemaType.ARRAY,
      description: "Structured ingredient rows",
      items: RECIPE_INGREDIENT_ITEM_SCHEMA,
    } as Schema,
    steps: {
      type: SchemaType.ARRAY,
      description: "Ordered cooking steps in Swedish, one short sentence per item",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    uses_ingredient_picks: {
      type: SchemaType.ARRAY,
      description: "Subset of user ingredient texts this meal uses",
      items: { type: SchemaType.STRING } as Schema,
    } as Schema,
    estimated_cook_time: {
      type: SchemaType.STRING,
      description:
        "Ungefärlig tid till servering (aktiv + lite väntetid), t.ex. ca 35 min eller 25–40 min",
    } as Schema,
  },
  required: [
    "title",
    "title_en",
    "title_vi",
    "summary",
    "meal_kind",
    "ingredients",
    "steps",
    "uses_ingredient_picks",
    "estimated_cook_time",
  ],
};

const RECIPE_GENERATOR_RESULT_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: {
      type: SchemaType.STRING,
      description: "Short Swedish intro (1–3 sentences) or empty string",
    } as Schema,
    meals: {
      type: SchemaType.ARRAY,
      description: `At most ${RECIPE_GENERATOR_MAX_MEALS} meal ideas`,
      items: RECIPE_GENERATOR_MEAL_ITEM_SCHEMA,
    } as Schema,
  },
  required: ["intro", "meals"],
};

function sanitizeRecipeIngredientRow(value: unknown): RecipeIngredient | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.replace(/\s+/g, " ").trim().slice(0, 220) : "";
  const ingredient_label =
    typeof o.ingredient_label === "string"
      ? o.ingredient_label.replace(/\s+/g, " ").trim().slice(0, 120)
      : "";
  const amount =
    typeof o.amount === "string" ? o.amount.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (!text || !ingredient_label || !amount) return null;
  return { text, ingredient_label, amount };
}

function sanitizeRecipeGeneratorMeal(raw: unknown): RecipeGeneratorMeal | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const title = typeof m.title === "string" ? m.title.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  const title_en =
    typeof m.title_en === "string" ? m.title_en.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  const title_vi =
    typeof m.title_vi === "string" ? m.title_vi.replace(/\s+/g, " ").trim().slice(0, 160) : "";
  const summary =
    typeof m.summary === "string" ? m.summary.replace(/\s+/g, " ").trim().slice(0, 600) : "";
  if (!title || !summary) return null;

  const ingRaw = Array.isArray(m.ingredients) ? m.ingredients : [];
  const ingredients: RecipeIngredient[] = [];
  for (const row of ingRaw) {
    const s = sanitizeRecipeIngredientRow(row);
    if (s) ingredients.push(s);
    if (ingredients.length >= RECIPE_INGREDIENT_ROW_CAP) break;
  }
  if (ingredients.length === 0) return null;

  const stepsRaw = Array.isArray(m.steps) ? m.steps : [];
  const steps = stepsRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((s) => (s.length > 800 ? `${s.slice(0, 800)}…` : s))
    .slice(0, RECIPE_STEP_CAP);

  if (steps.length === 0) return null;

  const estimated_cook_time =
    typeof m.estimated_cook_time === "string"
      ? m.estimated_cook_time.replace(/\s+/g, " ").trim().slice(0, 80)
      : "";

  const uses = Array.isArray(m.uses_ingredient_picks)
    ? m.uses_ingredient_picks
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  return {
    title,
    title_en,
    title_vi,
    summary,
    meal_kind: sanitizeMealKind(m.meal_kind),
    estimated_cook_time,
    ingredients,
    steps,
    uses_ingredient_picks: uses,
  };
}

/**
 * Generate up to **8** meal ideas from ICA ingredient picks + food type + optional vegetarian/excludes.
 */
export async function generateRecipeIdeasFromIngredients(
  apiKey: string,
  input: {
    ingredientTexts: string[];
    foodTypeLabelSv: string;
    vegetarian: boolean;
    excludeMealTitles: string[];
  },
): Promise<RecipeGenerateResult> {
  const picks = input.ingredientTexts
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 24);

  const exclude = input.excludeMealTitles
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 40);

  const excludeBlock =
    exclude.length > 0
      ? `\n## Undvik dessa rätter (titlar)\nAnvändaren vill **inte** ha dessa eller nästan identiska varianter:\n${exclude.map((t) => `- ${t}`).join("\n")}\n`
      : "";

  const vegBlock = input.vegetarian
    ? `\n## Vegetariskt\n- Föreslå **endast vegetariska** rätter: **ingen** kött, fisk, skaldjur, gelatin eller djur löpe.\n- Ägg och mejeri är tillåtet om det passar.\n`
    : "";

  const systemPreamble = `Du är en praktisk kockassistent för ett hushåll i **Sverige**.

## Uppgift
Föreslå **högst ${RECIPE_GENERATOR_MAX_MEALS}** måltider (receptidéer) utifrån användarens **valda ingredienser** (ICA-liknande etiketter) och vald **matstil**.

## Regler
- **Svenska** som huvudspråk för **title**, **summary**, **ingredients**, **steps**. Ingredienser i **realistiska svenska butiksmängder** (g, kg, dl, ml, st, krm) där det passar.
- **title_en**: samma rätt på **engelska** (naturligt namn).
- **title_vi**: samma rätt på **vietnamesiska** (naturligt namn för familjekommunikation).
- **ingredients**: varje rad har **text** (full rad), **ingredient_label** (kort namn, gärna nära användarens val), **amount** (mängd eller "efter smak").
- **steps**: numrerad logik som korta meningar; en punkt per steg.
- **meal_kind**: lunch | dinner | either | snack | other.
- **estimated_cook_time**: ungefärlig tid till servering (kort svensk text, t.ex. "ca 30 min", "25–40 min").
- **uses_ingredient_picks**: lista vilka av användarens ingredienser som är centrala (exakta strängar från listan när möjligt).
${vegBlock}${excludeBlock}
`;

  const body = {
    ingredient_picks: picks,
    food_type: input.foodTypeLabelSv,
    vegetarian: input.vegetarian,
  };

  const userContent = JSON.stringify(body, null, 0);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: RECIPE_GENERATOR_MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_GENERATOR_RESULT_SCHEMA,
    },
  });

  const fullPrompt = `${systemPreamble}\n\n---\n\n${userContent}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned empty recipe generator response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini returned invalid recipe JSON: ${msg}. Snippet: ${text.slice(0, 160)}`);
  }

  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const intro =
    typeof root.intro === "string" ? root.intro.replace(/\s+/g, " ").trim().slice(0, 800) : "";

  const mealsRaw = Array.isArray(root.meals) ? root.meals : [];
  const meals: RecipeGeneratorMeal[] = mealsRaw
    .map((m) => sanitizeRecipeGeneratorMeal(m))
    .filter((m): m is RecipeGeneratorMeal => m !== null)
    .slice(0, RECIPE_GENERATOR_MAX_MEALS);

  if (meals.length === 0) {
    throw new Error("Recipe generator returned no usable meals after validation.");
  }

  return {
    intro: intro || "Här är förslag baserat på dina ingredienser och valda matstil.",
    meals,
  };
}
