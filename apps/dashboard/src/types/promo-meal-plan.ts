import type { PromoMealPlanResult } from "@agent/shared";

export type PromoMealPlanResponseMeta = {
  iso_week: number;
  promotion_count: number;
  store_key: string;
  generated_at: string;
};

export type PromoMealPlanApiResponse = {
  plan: PromoMealPlanResult;
  meta: PromoMealPlanResponseMeta;
};
