import type {
  TripDecision,
  TripItineraryItem,
  TripKnowledgeFavorite,
  TripOption,
  TripStatus,
} from "@/types/database";

export type TripShareLink = {
  id: string;
  public_slug: string;
  trip_id: string;
  title: string;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicTripShare = {
  id: string;
  slug: string;
  trip_id: string;
  title: string;
  created_at: string;
};

export type PublicTrip = {
  id: string;
  title: string;
  destination: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  adult_count: number;
  kid_count: number;
  kid_ages: number[];
  already_done: string | null;
  preferences: string | null;
  selected_preferences: string[];
  logistics_details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PublicTripSharePayload = {
  share: PublicTripShare;
  trip: PublicTrip;
  options: TripOption[];
  decisions: TripDecision[];
  itinerary: TripItineraryItem[];
  knowledge_favorites: TripKnowledgeFavorite[];
};
