/**
 * Static data for the 10-meal-suggestions UI mockup.
 * Shape matches target API — see docs/requirements/promo-meal-suggestions.md
 */

export type PromoMealSuggestionMealKind = "lunch" | "dinner" | "either" | "snack" | "other";

export type PromoMealSuggestion = {
  id: string;
  title: string;
  summary: string;
  meal_kind: PromoMealSuggestionMealKind;
  ingredients: string[];
  /** Offer titles from the import this idea builds on */
  uses_promotion_titles: string[];
};

export const PROMO_MEAL_SUGGESTIONS_SAMPLE: PromoMealSuggestion[] = [
  {
    id: "1",
    title: "Kycklingfilé med citron och timjan + sallad",
    summary:
      "Enkel ugnsrätt som lutar sig mot kampanjfilé; sallad med det du har hemma eller billiga tillbehör.",
    meal_kind: "dinner",
    ingredients: [
      "Färsk kycklingfilé",
      "Citron, timjan eller torkad timjan",
      "Olivolja, salt, peppar",
      "Sallad/grönt",
      "Ev. mini-tomater",
    ],
    uses_promotion_titles: ["Färsk kycklingfilé"],
  },
  {
    id: "2",
    title: "Tunnskivad fläsk, snabb lökgryta",
    summary: "Klassisk husman på 25 min — nyttja erbjudandet på tunnskuret och massa lök.",
    meal_kind: "dinner",
    ingredients: [
      "Tunnskivat fläsk",
      "3–4 gula lökar",
      "Smör eller olja",
      "Grädde eller mjölk",
      "Potatis eller makaroner till",
      "Soy/soja eller fond efter smak",
    ],
    uses_promotion_titles: ["Fläsk tunnskivat"],
  },
  {
    id: "3",
    title: "Lax i ugn med dillsmör",
    summary: "Låt ugnen göra jobbet; passar bra när laxen är veckans dragplåster.",
    meal_kind: "dinner",
    ingredients: [
      "Laxfilé",
      "Dill (färsk eller djupfryst)",
      "Smör",
      "Citron",
      "Salt, peppar",
      "Kokt potatis eller ris",
    ],
    uses_promotion_titles: ["Laxfilé"],
  },
  {
    id: "4",
    title: "Zucchini- och lökpasta (veg)",
    summary: "Snabb sås på stekt zucchini och rödlök; toppa med parmesan om du har.",
    meal_kind: "either",
    ingredients: [
      "Zucchini",
      "Rödlök",
      "Vitlök, olivolja",
      "Krossad tomat eller tomatpuré",
      "Pasta",
      "Salt, peppar, ev. chiliflakes",
    ],
    uses_promotion_titles: ["Zucchini", "Rödlök"],
  },
  {
    id: "5",
    title: "Helgburgare med ost och picklad gurka",
    summary: "Fredagsmys: formar egna burgare från kampanjfärs, rostar bröd kort.",
    meal_kind: "dinner",
    ingredients: [
      "Nötfärs",
      "Hamburgerbröd",
      "Ost skivad",
      "Sallad, tomat, gurka",
      "Salt, peppar",
      "Ketchup/senap",
    ],
    uses_promotion_titles: ["Nötfärs", "Hamburgerbröd"],
  },
  {
    id: "6",
    title: "Fläskkarrégryta med rotfrukter",
    summary: "Långkok i gryta — bra när karrén är bra pris; rester blir god lunch.",
    meal_kind: "dinner",
    ingredients: [
      "Fläskkarré i bitar",
      "Morot, palsternacka, lök",
      "Buljong eller vatten + fond",
      "Lagerblad, enbär eller pepperoni (valfritt)",
      "Salt, peppar",
    ],
    uses_promotion_titles: ["Fläskkarré"],
  },
  {
    id: "7",
    title: "Tacos på nötfärs",
    summary: "Enkel middag: krydda färsen, servera med tortilla och grönt.",
    meal_kind: "dinner",
    ingredients: [
      "Nötfärs",
      "Tortillas eller hårda skal",
      "Tacosås eller kryddmix + tomat",
      "Riven ost",
      "Sallad, tomat",
      "Gräddfil eller yoghurt",
    ],
    uses_promotion_titles: ["Nötfärs"],
  },
  {
    id: "8",
    title: "Wrap med kyckling rester",
    summary: "Dagens lunch: använd kall kyckling från gårdagens ugn i tortillawrap.",
    meal_kind: "lunch",
    ingredients: [
      "Tortillas",
      "Tillagad kyckling (rester)",
      "Sås: yoghurt + lime/honung (eller köpesås)",
      "Sallad, gurka",
      "Riven morot",
    ],
    uses_promotion_titles: ["Färsk kycklingfilé"],
  },
  {
    id: "9",
    title: "Enkel fiskgratäng med dill",
    summary: "Blanda lax med mild sås och potatis i form — ugnsbak för middag nästa dag.",
    meal_kind: "dinner",
    ingredients: [
      "Laxfilé eller annan fisk",
      "Matlagningsgrädde eller crème fraîche",
      "Dill",
      "Potatis skivad eller mos under",
      "Salt, peppar, citron",
    ],
    uses_promotion_titles: ["Laxfilé"],
  },
  {
    id: "10",
    title: "Rostade rotfrukter + yoghurt dip",
    summary: "Lätt mellanmål eller sidorätt när morot/zucchini är billigt — bra till grill.",
    meal_kind: "snack",
    ingredients: [
      "Morötter",
      "Zucchini eller squash",
      "Olivolja, salt, timjan",
      "Naturell yoghurt + vitlök/salt till dip",
    ],
    uses_promotion_titles: ["Morötter", "Zucchini"],
  },
];
