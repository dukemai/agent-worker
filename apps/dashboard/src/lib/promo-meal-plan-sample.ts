import type { PromoMealPlanResult } from "@agent/shared";
import type { PromoMealPlanResponseMeta } from "@/types/promo-meal-plan";

/** Static copy for UI preview before hitting Gemini (Swedish, same shape as API). */
export const PROMO_MEAL_PLAN_SAMPLE: PromoMealPlanResult = {
  intro:
    "Här är tio förslag som blandar veckans kampanjer med olika kök: svensk vardag, asiatiska smaker och italienskt — ingredienser du hittar i svenska butiker.",
  meals: [
    {
      title: "Kycklinggryta med rotfrukter",
      summary:
        "Ugnsvänlig gryta där kampanjfilén blir bas; rotfrukter och lök från skafferiet eller kampanj.",
      meal_kind: "dinner",
      cuisine_style: "svensk husman",
      ingredients: [
        "Färsk kycklingfilé (kampanj)",
        "Gul lök, vitlök",
        "Morot, palsternacka",
        "Olja eller smör",
        "Kycklingfond eller vatten",
        "Salt, peppar",
      ],
      cooking_note:
        "Stek kyckling i bitar, tillsätt lök och rotfrukter, späd med fond. Puttra 25–30 min.",
      uses_promotion_titles: ["Färsk kycklingfilé"],
    },
    {
      title: "Bun cha-inspirerad skål",
      summary:
        "Lätt vietnamesisk ton med örter och lime; använd kyckling eller fläsk från kampanj som protein.",
      meal_kind: "lunch",
      cuisine_style: "vietnamesiskt",
      ingredients: [
        "Kycklingfilé eller fläsk i tunna skivor",
        "Risnudlar eller jasminris",
        "Sallad, mynta, koriander",
        "Lime, fisksås, socker, vitlök",
        "Morot strimlad",
      ],
      cooking_note:
        "Grilla eller stek köttet. Servera över ris/nudlar med ört-sallad och en enkel dressing av lime och fisksås.",
      uses_promotion_titles: ["Färsk kycklingfilé"],
    },
    {
      title: "Tunnskivad fläsk med löksås",
      summary: "Klassisk svensk snabbmiddag med erbjudandet på tunnskuret.",
      meal_kind: "dinner",
      cuisine_style: "svensk husman",
      ingredients: [
        "Tunnskivat fläsk",
        "Gul lök",
        "Grädde eller mjölk",
        "Potatis",
        "Smör",
        "Salt, peppar",
      ],
      cooking_note: "Stek fläsket, fräs lök mjuk, vispa ner grädde. Kok potatis vid sidan av.",
      uses_promotion_titles: ["Fläsk tunnskivat"],
    },
    {
      title: "Tomat- och zucchinipasta",
      summary: "Italiensk vardagsrätt; zucchini från kampanj blir huvudgrönsak i såsen.",
      meal_kind: "either",
      cuisine_style: "italienskt",
      ingredients: [
        "Zucchini",
        "Rödlök, vitlök",
        "Krossad tomat",
        "Olivolja",
        "Pasta",
        "Parmesan eller riven ost",
        "Basilika torkad eller färsk",
      ],
      cooking_note: "Fräs grönsaker, tillsätt tomat, låt puttra 10 min. Blanda med al dente pasta.",
      uses_promotion_titles: ["Zucchini", "Rödlök"],
    },
    {
      title: "Ugnsbak lax med dill och citron",
      summary: "Enkel nordisk middag när laxen är veckans dragplåster.",
      meal_kind: "dinner",
      cuisine_style: "nordiskt",
      ingredients: [
        "Laxfilé",
        "Citron",
        "Dill",
        "Olivolja",
        "Potatis",
        "Salt, peppar",
      ],
      cooking_note: "Ugnsgrad ca 200 °C, baka lax 12–15 min med citron och dill. Kok potatis.",
      uses_promotion_titles: ["Laxfilé"],
    },
    {
      title: "Snabb wok med grönsaker och nötfärs",
      summary: "Asiatiskt kryddad wok; nötfärs från kampanj och frysta grönsaker funkar bra.",
      meal_kind: "dinner",
      cuisine_style: "asiatiskt",
      ingredients: [
        "Nötfärs",
        "Broccoli, paprika eller frys wokmix",
        "Soja, ingefära, vitlök",
        "Sesamolja",
        "Jasminris",
      ],
      cooking_note: "Hetta upp panna, stek färs, tillsätt grönsaker och soja. Servera med ris.",
      uses_promotion_titles: ["Nötfärs"],
    },
    {
      title: "Burgare med ost och sallad",
      summary: "Fredagsmys: kampanjfärs och hamburgerbröd — klassiskt amerikanskt i svensk butik.",
      meal_kind: "dinner",
      cuisine_style: "amerikanskt / grill",
      ingredients: [
        "Nötfärs",
        "Hamburgerbröd",
        "Ost skivad",
        "Sallad, tomat, gurka",
        "Salt, peppar",
      ],
      cooking_note: "Forma burgare, stek 3–4 min per sida. Lägg ost sista minuten.",
      uses_promotion_titles: ["Nötfärs", "Hamburgerbröd"],
    },
    {
      title: "Risotto med svamp och parmesan",
      summary: "Italiensk comfort food; utan svampkampanj använder du champinjon eller burk.",
      meal_kind: "dinner",
      cuisine_style: "italienskt",
      ingredients: [
        "Arborioris eller rundkornigt ris",
        "Champinjoner eller kantareller",
        "Gul lök, vitlök",
        "Vitt vin eller buljong",
        "Parmesan, smör",
      ],
      cooking_note: "Fräs ris och lök, späd med varm buljong omrörning. Rör ner ost sist.",
      uses_promotion_titles: [],
    },
    {
      title: "Kall nudelsallad med laxrester",
      summary: "Lunch: använd gårdagens lax i en lätt asiatisk sallad med sesam.",
      meal_kind: "lunch",
      cuisine_style: "asiatiskt",
      ingredients: [
        "Tillagad lax i bitar",
        "Risnudlar eller glasnudlar",
        "Morot, gurka, sallad",
        "Sesamolja, soja, lime",
        "Sesamfrön",
      ],
      cooking_note: "Koka nudlar, kyl snabbt. Blanda med lax och grönsaker, ringla dressing.",
      uses_promotion_titles: ["Laxfilé"],
    },
    {
      title: "Långkok på fläskkarré med rotmos",
      summary: "Söndagsmiddag: karrékampanj blir mört kött; rotfrukter till mos.",
      meal_kind: "dinner",
      cuisine_style: "svensk husman",
      ingredients: [
        "Fläskkarré",
        "Lök",
        "Buljong eller vatten + fond",
        "Potatis, morot till mos",
        "Smör, mjölk till mos",
      ],
      cooking_note: "Bruna köttet, puttra 1–2 h. Koka rotfrukter, mos med smör och mjölk.",
      uses_promotion_titles: ["Fläskkarré"],
    },
  ],
  shopping_reminders: [
    "Kolla vad som redan finns hemma innan du handlar.",
    "Frys in en portion om du lagar storkok.",
    "Byt protein enligt kampanj — samma recept funkar ofta med kyckling eller fläsk.",
  ],
};

export const PROMO_MEAL_PLAN_SAMPLE_META: PromoMealPlanResponseMeta = {
  iso_week: 14,
  promotion_count: 12,
  store_key: "ica-maxi-barkarbystaden",
  generated_at: "2026-04-01T10:00:00.000Z",
  run_id: "00000000-0000-4000-8000-000000000001",
};
