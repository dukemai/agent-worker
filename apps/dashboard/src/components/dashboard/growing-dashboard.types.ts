import type {
  GrowingActionKnowledgeLink,
  GrowingKnowledge,
  GrowingKnowledgeCategory,
  GrowingProfile,
  GrowingSource,
  GrowingSuggestion,
} from "@/types/database";

export type WeeklyGrowingResponse = {
  week_number: number;
  week_start_date: string;
  profile: GrowingProfile;
  actions: GrowingSuggestion[];
  supporting_knowledge: GrowingActionKnowledgeLink[];
};

export type GrowingKnowledgeSource = {
  url: string | null;
  title: string | null;
  channel: string | null;
};

export type GrowingKnowledgeItem = GrowingKnowledge & {
  source?: GrowingKnowledgeSource | null;
};

export type GrowingSourcesResponse = { sources: GrowingSource[] };

export type GrowingKnowledgeResponse = {
  knowledge: GrowingKnowledgeItem[];
  filters: {
    category: string | null;
    tags: string[];
    season_relevance: string[];
    location: string | null;
  };
};

export type GrowingProfileForm = {
  city: string;
  country_code: string;
  space_type: GrowingProfile["space_type"];
  experience_level: GrowingProfile["experience_level"];
  interestsStr: string;
};

export function toFormState(p: GrowingProfile): GrowingProfileForm {
  return {
    city: p.city,
    country_code: p.country_code,
    space_type: p.space_type,
    experience_level: p.experience_level,
    interestsStr: p.interests.join(", "),
  };
}
