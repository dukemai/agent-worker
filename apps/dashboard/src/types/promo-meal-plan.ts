import type { PromoMealPlanResult } from "@agent/shared";

export type PromoMealPlanResponseMeta = {
  iso_week: number;
  promotion_count: number;
  store_key: string;
  generated_at: string;
  /** `promo_match_runs.id` used for this generation. */
  run_id: string;
};

export type PromoMealPlanApiResponse = {
  plan: PromoMealPlanResult;
  meta: PromoMealPlanResponseMeta;
};
