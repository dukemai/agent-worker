/**
 * Minimal Supabase Database type for worker tables used by growing-ingest.
 * Keeps table operations (update, insert, upsert) type-safe.
 */
export type GrowingSourceStatus = "queued" | "processing" | "done" | "failed";
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
          status: GrowingSourceStatus;
          error_message: string | null;
          tips_extracted: number;
          created_at: string;
          processed_at: string | null;
          transcript: string | null;
        };
        Insert: {
          id?: string;
          url: string;
          title?: string | null;
          channel?: string | null;
          description?: string | null;
          status?: GrowingSourceStatus;
          error_message?: string | null;
          tips_extracted?: number;
          created_at?: string;
          processed_at?: string | null;
          transcript?: string | null;
        };
        Update: {
          id?: string;
          url?: string;
          title?: string | null;
          channel?: string | null;
          description?: string | null;
          status?: GrowingSourceStatus;
          error_message?: string | null;
          tips_extracted?: number;
          created_at?: string;
          processed_at?: string | null;
          transcript?: string | null;
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
          created_at: string;
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
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["growing_knowledge"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
