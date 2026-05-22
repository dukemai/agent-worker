export type RecipeFoodTypeOption = {
  id: string;
  label: string;
};

/** Keep in sync with apps/dashboard/public/data/recipe-food-types.json. */
export const RECIPE_FOOD_TYPE_OPTIONS: RecipeFoodTypeOption[] = [
  { id: "swedish-nordic", label: "Svensk / nordisk husman" },
  { id: "fish-seafood", label: "Fisk & skaldjur" },
  { id: "italian", label: "Italienskt" },
  { id: "asian-mixed", label: "Asiatiskt (blandat)" },
  { id: "thai", label: "Thailändskt" },
  { id: "vietnamese", label: "Vietnamesiskt" },
  { id: "japanese", label: "Japanskt" },
  { id: "korean", label: "Koreanskt" },
  { id: "indian", label: "Indiskt" },
  { id: "middle-eastern", label: "Mellanöstern / meze" },
  { id: "mexican", label: "Mexikanskt / tex-mex" },
  { id: "american-bbq", label: "Amerikanskt / BBQ" },
  { id: "french-mediterranean", label: "Fransk / medelhavs" },
  { id: "greek", label: "Grekiskt" },
  { id: "spanish-tapas", label: "Spanskt / tapas" },
  { id: "brunch-breakfast-light", label: "Brunch / frukost / lätt lunch" },
  { id: "soup-stew", label: "Soppa / gryta / mustigt" },
  { id: "fest-weekend", label: "Fest / helg" },
  { id: "grill-summer", label: "Grill / sommar" },
];
