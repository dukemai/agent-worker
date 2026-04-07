import type { PromoMealPlanResult } from "@agent/shared";
import type { PromoMealPlanResponseMeta } from "@/types/promo-meal-plan";

/** Static copy for UI preview before hitting Gemini (Swedish, same shape as API). */
export const PROMO_MEAL_PLAN_SAMPLE: PromoMealPlanResult = {
  intro:
    "Här är ett exempel på hur en veckoplan kan se ut: korta frukostar, vardagsluncher och middagar som kan kopplas till kampanjer.",
  days: [
    {
      day_label: "Måndag",
      breakfast: "Havregrynsgröt med mjölk och kanel.",
      breakfast_ingredients: ["2 dl havregryn", "3 dl mjölk (eller mer efter tycke)", "Kanel", "Ev. salt"],
      lunch: "Rester eller macka med pålägg från helgen.",
      lunch_ingredients: ["Rester hemma", "Bröd och pålägg (om macka)"],
      dinner: "Kycklinggryta med rotfrukter — använd kampanj kycklingfilé.",
      dinner_ingredients: [
        "Färsk kycklingfilé (kampanj)",
        "Gul lök",
        "Morot, palsternacka el. rotfrukter du har",
        "Olja/smör till stekning",
        "Kycklingfond eller vatten",
        "Salt, peppar",
      ],
      lunch_cooking_note:
        "Värm rester i mikro eller stekpanna tills genomvarma, eller rosta bröd kort. Servera med det du har hemma.",
      dinner_cooking_note:
        "Stek kycklingen i bitar, tillsätt hackad lök och rotfrukter. Häll på fond eller vatten, puttra 25–30 min tills köttet är klart. Smaka av med salt och peppar.",
      uses_promotion_titles: ["Färsk kycklingfilé"],
    },
    {
      day_label: "Tisdag",
      breakfast: "Filmjölk, müsli och banan.",
      breakfast_ingredients: ["Filmjölk", "Müsli", "1 banan"],
      lunch: "Soppa från frysen + bröd.",
      lunch_ingredients: ["Frysoppa (1 portion)", "Bröd", "Ev. smör"],
      dinner: "Tunnskivad fläsk med löksås och potatis.",
      dinner_ingredients: [
        "Tunnskivat fläsk (kampanj)",
        "Gul lök",
        "Grädde eller mjölk till sås",
        "Potatis",
        "Smör eller olja",
        "Salt, peppar",
      ],
      lunch_cooking_note:
        "Tina och värm soppan enligt förpackning. Värm eller rosta bröd som tillbehör.",
      dinner_cooking_note:
        "Stek fläsket snabbt på medelvärme. Fräs lök mjuk i samma panna, vispa ner lite grädde eller mjölk. Servera med kokt potatis.",
      uses_promotion_titles: ["Fläsk tunnskivat"],
    },
    {
      day_label: "Onsdag",
      breakfast: "Rostat bröd med ost och gurka.",
      breakfast_ingredients: ["Bröd", "Ost", "Gurka", "Ev. smör"],
      lunch: "Sallad med kokt ägg och rödlök.",
      lunch_ingredients: [
        "Ägg",
        "Sallad/grönt",
        "Rödlök (kampanj)",
        "Olivolja + vinäger eller färdig dressing",
        "Salt, peppar",
      ],
      dinner: "Vegetarisk gryta med kikärtor; komplettera med kampanjgrönsaker.",
      dinner_ingredients: [
        "Kikärtor (konserverade)",
        "Zucchini m.m. (kampanj)",
        "Lök, vitlök",
        "Krossad tomat",
        "Olja",
        "Ris eller bröd till servering",
      ],
      lunch_cooking_note:
        "Koka ägg ca 6–7 min till mjukgula. Skär grönsaker, blanda dressing — snabb kall lunch.",
      dinner_cooking_note:
        "Fräs grönsaker och kryddor, tillsätt kikärtor och krossad tomat. Låt sjuda 15 min. Servera med ris eller bröd.",
      uses_promotion_titles: ["Zucchini", "Rödlök"],
    },
    {
      day_label: "Torsdag",
      breakfast: "Yoghurt och bär.",
      breakfast_ingredients: ["Naturell yoghurt", "Bär (frysta eller färska)", "Ev. honung"],
      lunch: "Wrap med feta och tomat.",
      lunch_ingredients: [
        "Tortillas",
        "Fetaost",
        "Tomat",
        "Sallad/spenat",
        "Olivolja, salt, peppar",
      ],
      dinner: "Ugnsbak lax med dill och citron, kokt potatis.",
      dinner_ingredients: [
        "Laxfilé (kampanj)",
        "Citron",
        "Färsk eller fryst dill",
        "Olivolja",
        "Potatis",
        "Salt, peppar",
      ],
      lunch_cooking_note:
        "Förvärm tortillan lätt i torr panna. Fyll med feta, tomat och sallad; rulla ihop.",
      dinner_cooking_note:
        "Ugnsgrad ca 200 °C. Lägg laxen i form med citron, olja och dill. Baka 12–15 min tills den flagnar. Kok potatis under tiden.",
      uses_promotion_titles: ["Laxfilé"],
    },
    {
      day_label: "Fredag",
      breakfast: "Macka med skinka och tomat.",
      breakfast_ingredients: ["Bröd", "Skinka", "Tomat", "Ev. smör och gurka"],
      lunch: "Filmjölk och müsli.",
      lunch_ingredients: ["Filmjölk", "Müsli"],
      dinner: "Fredagsmys: burgare med ost och sallad.",
      dinner_ingredients: [
        "Nötfärs (kampanj)",
        "Hamburgerbröd (kampanj)",
        "Ost skivad",
        "Sallad, tomat, gurka",
        "Ketchup/senap efter smak",
        "Salt, peppar",
      ],
      lunch_cooking_note: "",
      dinner_cooking_note:
        "Forma färs till burgare, salta. Stek eller grilla 3–4 min per sida. Lägg på ost sista minuten. Toast bröd kort.",
      uses_promotion_titles: ["Nötfärs", "Hamburgerbröd"],
    },
    {
      day_label: "Lördag",
      breakfast: "Pannkakor med sylt.",
      breakfast_ingredients: ["Ägg", "Mjölk", "Vetemjöl", "Smör till stekning", "Sylt"],
      lunch: "Wrap eller lätt sallad.",
      lunch_ingredients: [
        "Tortillas eller sallad",
        "Pålägg du har (skinka, ost, hummus)",
        "Grönsaker",
        "Dressing",
      ],
      dinner: "Långkok på fläskkarré med rotmos.",
      dinner_ingredients: [
        "Fläskkarré (kampanj)",
        "Lök",
        "Buljong eller vatten",
        "Potatis, morötter, palsternacka till mos",
        "Smör och mjölk till mos",
        "Salt, peppar",
      ],
      lunch_cooking_note:
        "Bygg wrap med kalla pålägg eller rester; sallad med vinägrett går snabbt.",
      dinner_cooking_note:
        "Brun köttet, tillsätt vätska och låt puttra 1–2 h tills mört. Koka rotfrukter mjuka, mos med smör och mjölk.",
      uses_promotion_titles: ["Fläskkarré"],
    },
    {
      day_label: "Söndag",
      breakfast: "Äggröra och rostat bröd.",
      breakfast_ingredients: ["Ägg", "Smör", "Mjölk", "Salt, peppar", "Bröd"],
      lunch: "Sill och potatis eller lätt sallad.",
      lunch_ingredients: [
        "Inlagd sill (om klassisk lunch)",
        "Färsk potatis eller normal potatis",
        "Gräddfil, lök, dill",
        "Eller: salladsingredienser du har",
      ],
      dinner: "Helgstek med ugnsgrönsaker — använd söndagskampanjer.",
      dinner_ingredients: [
        "Nötbog eller annan stek (kampanj)",
        "Morötter m.fl. (kampanj)",
        "Lök",
        "Olja/smör",
        "Salt, peppar",
        "Ev. sky/jus",
      ],
      lunch_cooking_note:
        "Koka potatis om du väljer sill. Annars: kall sallad eller macka — ingen värmning.",
      dinner_cooking_note:
        "Salta steken, bryn runt om. Ugnsgrad 125–150 °C med termometer till önskad innertemp. Lägg grönsaker i form sista 30–40 min.",
      uses_promotion_titles: ["Nötbog", "Morötter"],
    },
  ],
  shopping_reminders: [
    "Kolla vad som redan finns i skafferiet innan du handlar.",
    "Frys in en portion av grytan till nästa vecka.",
    "Byt ut fisk mot kyckling en dag om ni föredär det.",
  ],
};

export const PROMO_MEAL_PLAN_SAMPLE_META: PromoMealPlanResponseMeta = {
  iso_week: 14,
  promotion_count: 12,
  store_key: "ica-maxi-barkarbystaden",
  generated_at: "2026-04-01T10:00:00.000Z",
};
