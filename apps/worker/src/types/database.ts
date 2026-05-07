/**
 * Minimal Supabase Database type for worker tables used by growing-ingest.
 * Keeps table operations (update, insert, upsert) type-safe.
 */
export type GrowingSourceStatus = "queued" | "processing" | "done" | "failed";
export type RecipeImportQueueStatus = "pending" | "processing" | "completed" | "failed";
export type RecipeDifficulty = "easy" | "medium" | "hard";
export type GrowingKnowledgeCategory =
  | "technique"
  | "plant-profile"
  | "soil"
  | "pest-control"
  | "companion-planting"
  | "preservation"
  | "general";

export interface Database {
  public: {
    Tables: {
      growing_sources: {
        Row: {
          id: string;
          url: string;
          title: string | null;
          channel: string | null;
          description: string | null;
          source_type: string | null;
          status: GrowingSourceStatus;
          error_message: string | null;
          tips_extracted: number;
          created_at: string;
          processed_at: string | null;
          transcript: string | null;
          source_language: string | null;
        };
        Insert: {
          id?: string;
          url: string;
          title?: string | null;
          channel?: string | null;
          description?: string | null;
          source_type?: string | null;
          status?: GrowingSourceStatus;
          error_message?: string | null;
          tips_extracted?: number;
          created_at?: string;
          processed_at?: string | null;
          transcript?: string | null;
          source_language?: string | null;
        };
        Update: {
          id?: string;
          url?: string;
          title?: string | null;
          channel?: string | null;
          description?: string | null;
          source_type?: string | null;
          status?: GrowingSourceStatus;
          error_message?: string | null;
          tips_extracted?: number;
          created_at?: string;
          processed_at?: string | null;
          transcript?: string | null;
          source_language?: string | null;
        };
      };
      growing_windows: {
        Row: {
          id: string;
          source_id: string | null;
          item_key: string;
          item_name: string;
          suggestion_kind: string;
          action_type: string | null;
          start_month: number;
          end_month: number;
          priority: number;
          suggested_bucket: string;
          stockholm_note: string;
          tags: string[];
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id?: string | null;
          item_key: string;
          item_name: string;
          suggestion_kind: string;
          action_type?: string | null;
          start_month: number;
          end_month: number;
          priority?: number;
          suggested_bucket?: string;
          stockholm_note: string;
          tags?: string[];
          verified?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["growing_windows"]["Insert"]>;
      };
      growing_knowledge: {
        Row: {
          id: string;
          source_id: string;
          title: string;
          content: string;
          category: GrowingKnowledgeCategory;
          tags: string[];
          season_relevance: string[];
          stockholm_relevant: boolean;
          location_note: string | null;
          verified: boolean;
          created_at: string;
          language: string | null;
        };
        Insert: {
          id?: string;
          source_id: string;
          title: string;
          content: string;
          category: GrowingKnowledgeCategory;
          tags?: string[];
          season_relevance?: string[];
          stockholm_relevant?: boolean;
          location_note?: string | null;
          verified?: boolean;
          created_at?: string;
          language?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["growing_knowledge"]["Insert"]>;
      };
      recipe_import_queue: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          source_url: string;
          source_label: string;
          source_markdown: string;
          status: RecipeImportQueueStatus;
          attempts: number;
          last_error: string | null;
          run_after: string;
          processing_started_at: string | null;
          processed_at: string | null;
          created_recipe_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id?: string | null;
          source_url?: string;
          source_label?: string;
          source_markdown: string;
          status?: RecipeImportQueueStatus;
          attempts?: number;
          last_error?: string | null;
          run_after?: string;
          processing_started_at?: string | null;
          processed_at?: string | null;
          created_recipe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_import_queue"]["Insert"]>;
      };
      saved_recipes: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          title: string;
          title_en: string;
          title_vi: string;
          summary: string;
          meal_kind: string;
          ingredients: unknown;
          steps: unknown;
          food_type_id: string;
          vegetarian: boolean;
          ingredient_picks: unknown;
          tested: boolean;
          want_to_try: boolean;
          estimated_cook_time: string;
          difficulty: RecipeDifficulty;
          source: string;
          source_markdown: string | null;
          similar_recipe_url: string;
          i18n: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id?: string | null;
          title: string;
          title_en?: string;
          title_vi?: string;
          summary: string;
          meal_kind: string;
          ingredients: unknown;
          steps: unknown;
          food_type_id: string;
          vegetarian: boolean;
          ingredient_picks: unknown;
          tested?: boolean;
          want_to_try?: boolean;
          estimated_cook_time?: string;
          difficulty?: RecipeDifficulty;
          source?: string;
          source_markdown?: string | null;
          similar_recipe_url?: string;
          i18n?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_recipes"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
