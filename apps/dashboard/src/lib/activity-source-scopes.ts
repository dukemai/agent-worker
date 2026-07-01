export const ACTIVITY_SOURCE_SCOPE_OPTIONS = [
  { value: "stockholm_city", label: "Stockholm city" },
  { value: "stockholm_county", label: "Stockholm county" },
  { value: "jarfalla", label: "Järfälla" },
  { value: "solna", label: "Solna" },
  { value: "sundbyberg", label: "Sundbyberg" },
  { value: "sollentuna", label: "Sollentuna" },
  { value: "upplands_bro", label: "Upplands-Bro" },
  { value: "upplands_vasby", label: "Upplands Väsby" },
  { value: "taby", label: "Täby" },
  { value: "danderyd", label: "Danderyd" },
  { value: "lidingo", label: "Lidingö" },
  { value: "nacka", label: "Nacka" },
  { value: "huddinge", label: "Huddinge" },
  { value: "haninge", label: "Haninge" },
  { value: "botkyrka", label: "Botkyrka" },
  { value: "ekero", label: "Ekerö" },
  { value: "unknown", label: "Unknown" },
] as const;

export const ACTIVITY_SOURCE_SCOPE_VALUES = new Set(ACTIVITY_SOURCE_SCOPE_OPTIONS.map((scope) => scope.value));

export type ActivitySourceScope = (typeof ACTIVITY_SOURCE_SCOPE_OPTIONS)[number]["value"];

export function isActivitySourceScope(value: string): value is ActivitySourceScope {
  return ACTIVITY_SOURCE_SCOPE_VALUES.has(value as ActivitySourceScope);
}
