# ICA Maxi — online shop category menu

**Purpose:** Describe how ICA structures **product categories** in the online **Handla** navigation. Data comes from app state `data.categories` in [`ica-maxi-initial-state-raw.json`](./ica-maxi-initial-state-raw.json) (IDs, `fullURLPath`, parent/child links).

**Subcategory detail:** The block between markers is only the **navigation tree**. Finer splits live in [Category detail](#category-detail) and per-branch JSON snapshots under `docs/requirements/ica-maxi-catalog-*-raw.json`. Counts vary by store and time. **SKUs** and prices are not listed here.

**Generating a merged picker/catalog JSON:** Use [How to build `ica-maxi-picker-catalog.json`](#how-to-build-ica-maxi-picker-catalogjson) — same field names as ICA’s category API nodes so snapshots drop in without transformation.

Regenerate the **tree** block after updating `ica-maxi-initial-state-raw.json`:

`node scripts/build-ica-maxi-category-menu.mjs`

**Seasonal** top-level departments (e.g. **Påsk**) are omitted from the generated block; add names to `EXCLUDED_ROOT_NAMES` in that script if you filter out more campaign roots.

<!-- ICA_SHOP_CATEGORY_MENU_START -->

### Frukt & Grönt

- **fullURLPath:** `Frukt-Grönt`
- **id:** `f82845b1-7be6-4e08-8b5d-7f2c0f0a7d38`

- **Frukt** — `Frukt-Grönt/Frukt`
- **Färska bär** — `Frukt-Grönt/Färska-bär`
- **Grönsaker** — `Frukt-Grönt/Grönsaker`
- **Potatis** — `Frukt-Grönt/Potatis`
- **Lök** — `Frukt-Grönt/Lök`
- **Kål** — `Frukt-Grönt/Kål`
- **Rotfrukter** — `Frukt-Grönt/Rotfrukter`
- **Färska kryddor** — `Frukt-Grönt/Färska-kryddor`
- **Svamp** — `Frukt-Grönt/Svamp`

### Kött, Chark & Fågel

- **fullURLPath:** `Kött-Chark-Fågel`
- **id:** `c0a4a3ed-f97c-4b2f-81ca-dcc9a7e044f7`

- **Kött** — `Kött-Chark-Fågel/Kött`
- **Köttfärs** — `Kött-Chark-Fågel/Köttfärs`
- **Korv** — `Kött-Chark-Fågel/Korv`
- **Matchark** — `Kött-Chark-Fågel/Matchark`
- **Pålägg** — `Kött-Chark-Fågel/Pålägg`
- **Delikatesschark** — `Kött-Chark-Fågel/Delikatesschark`
- **Kyckling & Fågel** — `Kött-Chark-Fågel/Kyckling-Fågel`
- **Inälvsmat** — `Kött-Chark-Fågel/Inälvsmat`

### Fisk & Skaldjur

- **fullURLPath:** `Fisk-Skaldjur`
- **id:** `fc0292c5-c74d-4229-9577-ec302310430f`

- **Fisk** — `Fisk-Skaldjur/Fisk`
- **Färdiga fiskrätter** — `Fisk-Skaldjur/Färdiga-fiskrätter`
- **Skaldjur** — `Fisk-Skaldjur/Skaldjur`
- **Sill & Ansjovis** — `Fisk-Skaldjur/Sill-Ansjovis`
- **Kaviar & Rom** — `Fisk-Skaldjur/Kaviar-Rom`

### Mejeri & Ost

- **fullURLPath:** `Mejeri-Ost`
- **id:** `7aac2fb3-4bf5-4763-9610-fd2ad3ef930a`

- **Ost** — `Mejeri-Ost/Ost`
- **Mjölk** — `Mejeri-Ost/Mjölk`
- **Yoghurt** — `Mejeri-Ost/Yoghurt`
- **Filmjölk** — `Mejeri-Ost/Filmjölk`
- **Ägg & Jäst** — `Mejeri-Ost/Ägg-Jäst`
- **Grädde** — `Mejeri-Ost/Grädde`
- **Smör & Margarin** — `Mejeri-Ost/Smör-Margarin`
- **Crème fraiche** — `Mejeri-Ost/Crème-fraiche`
- **Gräddfil** — `Mejeri-Ost/Gräddfil`
- **Kvarg** — `Mejeri-Ost/Kvarg`
- **Cottage cheese** — `Mejeri-Ost/Cottage-cheese`
- **Kylda mellanmål & desserter** — `Mejeri-Ost/Kylda-mellanmål-desserter`
- **Juice & Fruktdryck** — `Dryck/Juice-Fruktdryck`

### Bröd & Kakor

- **fullURLPath:** `Bröd-Kakor`
- **id:** `a34eb6f1-7ef8-4bcb-b166-4373726c158f`

- **Matbröd** — `Bröd-Kakor/Matbröd`
- **Korvbröd, Hamburgerbröd & Maträttsbröd** — `Bröd-Kakor/Korvbröd-Hamburgerbröd-Maträttsbröd`
- **Kaffebröd** — `Bröd-Kakor/Kaffebröd`
- **Kex & kakor** — `Bröd-Kakor/Kex-kakor`
- **Knäckebröd & Skorpor** — `Bröd-Kakor/Knäckebröd-Skorpor`
- **Glutenfritt bröd & Kakor** — `Bröd-Kakor/Glutenfritt-bröd-Kakor`

### Vegetariskt

- **fullURLPath:** `Vegetariskt`
- **id:** `442f3f18-3b3a-484a-ae0d-700be34148ed`

- **Mjölkfritt mejeri** — `Vegetariskt/Mjölkfritt-mejeri`
- **Vegansk ost & pålägg** — `Vegetariskt/Vegansk-ost-pålägg`
- **Veganska såser & Röror** — `Vegetariskt/Veganska-såser-Röror`
- **Färsk vegetarisk färdigmat** — `Vegetariskt/Färsk-vegetarisk-färdigmat`
- **Fryst vegetarisk färdigmat** — `Fryst/Fryst-vegetarisk-färdigmat`
- **Veganskt godis & choklad** — `Vegetariskt/Veganskt-godis-choklad`
- **Vegansk glass** — `Vegetariskt/Vegansk-glass`

### Färdigmat

- **fullURLPath:** `Färdigmat`
- **id:** `5d7bd782-7db9-4fef-ab86-3b7c5e797ccb`

- **Portionsrätter** — `Färdigmat/Portionsrätter`
- **Smörgåsar, Smörgåstårta & Wraps** — `Färdigmat/Smörgåsar-Smörgåstårta-Wraps`
- **Gratäng & röror** — `Färdigmat/Gratäng-röror`
- **Kylda såser** — `Färdigmat/Kylda-såser`
- **Gröt & rullpack** — `Färdigmat/Gröt-rullpack`
- **Pizzakit & kylda degar** — `Färdigmat/Pizzakit-kylda-degar`
- **Färsk pasta** — `Färdigmat/Färsk-pasta`
- **Glutenfri Färdigmat** — `Färdigmat/Glutenfri-Färdigmat`

### Barn

- **fullURLPath:** `Barn`
- **id:** `ac8a89ea-5c01-476f-bbb8-3c05526780d7`

- **Blöjor & Tvättservetter** — `Barn/Blöjor-Tvättservetter`
- **Barnmat** — `Barn/Barnmat`
- **Barngröt & Välling** — `Barn/Barngröt-Välling`
- **Mjölkersättning** — `Barn/Mjölkersättning`
- **Mellanmål & Barndryck** — `Barn/Mellanmål-Barndryck`
- **Matning & Babytillbehör** — `Barn/Matning-Babytillbehör`
- **Barn- & Babyvård** — `Barn/Barn-Babyvård`
- **Barn & Ungdomsböcker** — `Barn/Barn-Ungdomsböcker`
- **Leksaker** — `Fritid/Leksaker`
- **Barnkläder** — `Kläder-Accessoarer/Barnkläder`
- **Babykläder** — `Kläder-Accessoarer/Babykläder`
- **Barnkalas** — `Barn/Barnkalas`

### Glass, Godis & Snacks

- **fullURLPath:** `Glass-Godis-Snacks`
- **id:** `bb534c25-3729-48bc-b9cc-c4516145879c`

- **Glass** — `Fryst/Glass`
- **Godis** — `Glass-Godis-Snacks/Godis`
- **Choklad** — `Glass-Godis-Snacks/Choklad`
- **Chips & snacks** — `Glass-Godis-Snacks/Chips-snacks`
- **Naturgodis, Nötter & Bars** — `Glass-Godis-Snacks/Naturgodis-Nötter-Bars`
- **Tuggummi** — `Glass-Godis-Snacks/Tuggummi`
- **Halstabletter** — `Glass-Godis-Snacks/Halstabletter`

### Dryck

- **fullURLPath:** `Dryck`
- **id:** `34948432-df3c-4468-991b-f0db32126003`

- **Vatten** — `Dryck/Vatten`
- **Läsk** — `Dryck/Läsk`
- **Stilldrink** — `Dryck/Stilldrink`
- **Energidryck & Sportdryck** — `Träning-Återhämtning/Energidryck-Sportdryck`
- **Öl, cider & must** — `Dryck/Öl-cider-must`
- **Vin** — `Dryck/Vin`
- **Kaffe, te & choklad** — `Skafferi/Kaffe-te-choklad`
- **Saft & Lightdryck** — `Dryck/Saft-Lightdryck`
- **Drinkmix & koncentrat** — `Dryck/Drinkmix-koncentrat`
- **Juice & Fruktdryck** — `Dryck/Juice-Fruktdryck`
- **Vätskeersättning** — `Träning-Återhämtning/Vätskeersättning`

### Skafferi

- **fullURLPath:** `Skafferi`
- **id:** `f4882652-d405-4cd1-876c-247667adc392`

- **Smaker från världen** — `Skafferi/Smaker-från-världen`
- **Mjöl & Bakning** — `Skafferi/Mjöl-Bakning`
- **Kryddor & smaksättare** — `Skafferi/Kryddor-smaksättare`
- **Pasta, ris & mos** — `Skafferi/Pasta-ris-mos`
- **Fisk & köttkonserver** — `Skafferi/Fisk-köttkonserver`
- **Grönsakskonserver** — `Skafferi/Grönsakskonserver`
- **Bönor, linser & fröer** — `Skafferi/Bönor-linser-fröer`
- **Flingor, müsli & gryner** — `Skafferi/Flingor-müsli-gryner`
- **Sylt, mos & marmelad** — `Skafferi/Sylt-mos-marmelad`
- **Desserter** — `Skafferi/Desserter`
- **Kaffe, te & choklad** — `Skafferi/Kaffe-te-choklad`

### Fryst

- **fullURLPath:** `Fryst`
- **id:** `360db808-e41c-463d-8cb1-ec80eb426b37`

- **Fryst färdigmat** — `Fryst/Fryst-färdigmat`
- **Fryst kött & burgare** — `Fryst/Fryst-kött-burgare`
- **Fryst fågel** — `Fryst/Fryst-fågel`
- **Fryst fisk & Skaldjur** — `Fryst/Fryst-fisk-Skaldjur`
- **Fryst vegetarisk färdigmat** — `Fryst/Fryst-vegetarisk-färdigmat`
- **Frysta grönsaker** — `Fryst/Frysta-grönsaker`
- **Fryst potatis** — `Fryst/Fryst-potatis`
- **Fryst frukt & bär** — `Fryst/Fryst-frukt-bär`
- **Fryst bröd & dessert** — `Fryst/Fryst-bröd-dessert`
- **Färdig is** — `Fryst/Färdig-is`
- **Glass** — `Fryst/Glass`

### Apotek, Hälsa & Skönhet

- **fullURLPath:** `Apotek-Hälsa-Skönhet`
- **id:** `70e47511-1892-45c5-8b0a-c5340ef8e518`

- **Receptfria läkemedel** — `Apotek-Hälsa-Skönhet/Receptfria-läkemedel`
- **Plåster & Sårvård** — `Apotek-Hälsa-Skönhet/Plåster-Sårvård`
- **Ögon & Öron** — `Apotek-Hälsa-Skönhet/Ögon-Öron`
- **Intimprodukter** — `Apotek-Hälsa-Skönhet/Intimprodukter`
- **Ansiktsvård** — `Apotek-Hälsa-Skönhet/Ansiktsvård`
- **Hudvård** — `Apotek-Hälsa-Skönhet/Hudvård`
- **Hårvård & Styling** — `Apotek-Hälsa-Skönhet/Hårvård-Styling`
- **Munvård** — `Apotek-Hälsa-Skönhet/Munvård`
- **Rakvård & Hårborttagning** — `Apotek-Hälsa-Skönhet/Rakvård-Hårborttagning`
- **Smink & Nagelvård** — `Apotek-Hälsa-Skönhet/Smink-Nagelvård`
- **Solskydd** — `Apotek-Hälsa-Skönhet/Solskydd`
- **Tvål, Dusch & Deodorant** — `Apotek-Hälsa-Skönhet/Tvål-Dusch-Deodorant`
- **Vitaminer & Hälsokost** — `Apotek-Hälsa-Skönhet/Vitaminer-Hälsokost`

### Träning & Återhämtning

- **fullURLPath:** `Träning-Återhämtning`
- **id:** `e128adca-fd5e-4b7e-a34e-a0badfe367ac`

- **Energi** — `Träning-Återhämtning/Energi`
- **Energidryck & Sportdryck** — `Träning-Återhämtning/Energidryck-Sportdryck`
- **Proteinbars** — `Träning-Återhämtning/Proteinbars`
- **Proteinpulver & Övriga tillskott** — `Träning-Återhämtning/Proteinpulver-Övriga-tillskott`
- **Färdig proteindryck** — `Träning-Återhämtning/Färdig-proteindryck`
- **Proteinmål** — `Träning-Återhämtning/Proteinmål`
- **Vätskeersättning** — `Träning-Återhämtning/Vätskeersättning`
- **Återhämtning** — `Träning-Återhämtning/Återhämtning`
- **Träningsredskap** — `Träning-Återhämtning/Träningsredskap`

### Djur

- **fullURLPath:** `Djur`
- **id:** `555f311d-70ca-4bd8-bd50-921545531f89`

- **Katt** — `Djur/Katt`
- **Hund** — `Djur/Hund`
- **Smådjur** — `Djur/Smådjur`
- **Fågelmat & Tillbehör** — `Djur/Fågelmat-Tillbehör`
- **Djurvård** — `Djur/Djurvård`

### Städ, Tvätt & Papper

- **fullURLPath:** `Städ-Tvätt-Papper`
- **id:** `563524de-aa3c-49b6-a9d0-27924320f035`

- **Städ** — `Städ-Tvätt-Papper/Städ`
- **Tvätt** — `Städ-Tvätt-Papper/Tvätt`
- **Disk** — `Städ-Tvätt-Papper/Disk`
- **Toalett & Hushållspapper** — `Städ-Tvätt-Papper/Toalett-Hushållspapper`

### Kök

- **fullURLPath:** `Kök`
- **id:** `a0bceaa9-e61a-470f-9566-d46aae9b5b74`

- **Duka & Servera** — `Kök/Duka-Servera`
- **Engångsartiklar** — `Kök/Engångsartiklar`
- **Matförvaring** — `Kök/Matförvaring`
- **Ugnsformar & Bakformar** — `Kök/Ugnsformar-Bakformar`
- **Husgeråd & Köksredskap** — `Kök/Husgeråd-Köksredskap`
- **Kastruller & Stekpannor** — `Kök/Kastruller-Stekpannor`
- **Kökstextil** — `Kök/Kökstextil`
- **Köksmaskiner** — `Kök/Köksmaskiner`
- **Äta ute** — `Kök/Äta-ute`

### Hem & Inredning

- **fullURLPath:** `Hem-Inredning`
- **id:** `898d465a-1c6b-487a-9be1-31fac1cc4014`

- **Inredningsdetaljer** — `Hem-Inredning/Inredningsdetaljer`
- **Belysning** — `Hem-Inredning/Belysning`
- **Hemtextil** — `Hem-Inredning/Hemtextil`
- **Sovrum** — `Hem-Inredning/Sovrum`
- **Badrum** — `Hem-Inredning/Badrum`
- **Förvaring** — `Hem-Inredning/Förvaring`
- **Brandsäkerhet** — `Hem-Inredning/Brandsäkerhet`
- **Övrig heminredning** — `Hem-Inredning/Övrig-heminredning`
- **Kontor, Hobby & Pyssel** — `Hem-Inredning/Kontor-Hobby-Pyssel`
- **Paketinslagning** — `Hem-Inredning/Paketinslagning`

### Fritid

- **fullURLPath:** `Fritid`
- **id:** `a45a055c-66e1-4edc-a02a-2098bb2e9e46`

- **Hemelektronik & Batterier** — `Fritid/Hemelektronik-Batterier`
- **Fixa** — `Fritid/Fixa`
- **Biltillbehör** — `Fritid/Biltillbehör`
- **Cykeltillbehör & Hjälmar** — `Fritid/Cykeltillbehör-Hjälmar`
- **Uteliv** — `Fritid/Uteliv`
- **Grill** — `Fritid/Grill`
- **Leksaker** — `Fritid/Leksaker`
- **Böcker & Tidningar** — `Fritid/Böcker-Tidningar`

### Blommor & Trädgård

- **fullURLPath:** `Blommor-Trädgård`
- **id:** `71542409-5f2e-4ae3-9ad7-6751e10afb38`

- **Snittblommor** — `Blommor-Trädgård/Snittblommor`
- **Krukväxter & Blomsterarrangemang** — `Blommor-Trädgård/Krukväxter-Blomsterarrangemang`
- **Utomhusväxter** — `Blommor-Trädgård/Utomhusväxter`
- **Konstgjorda Blommor & Växter** — `Blommor-Trädgård/Konstgjorda-Blommor-Växter`
- **Blomtillbehör** — `Blommor-Trädgård/Blomtillbehör`
- **Krukor & Vaser** — `Blommor-Trädgård/Krukor-Vaser`
- **Odla & Plantera** — `Blommor-Trädgård/Odla-Plantera`
- **Trädgårdsskötsel** — `Blommor-Trädgård/Trädgårdsskötsel`
- **Uteplats** — `Blommor-Trädgård/Uteplats`

### Kläder & Accessoarer

- **fullURLPath:** `Kläder-Accessoarer`
- **id:** `a6c5191e-77ac-4dae-a6e8-da5b0aba93e0`

- **Babykläder** — `Kläder-Accessoarer/Babykläder`
- **Barnkläder** — `Kläder-Accessoarer/Barnkläder`
- **Damkläder** — `Kläder-Accessoarer/Damkläder`
- **Herrkläder** — `Kläder-Accessoarer/Herrkläder`
- **Väskor & Accessoarer** — `Kläder-Accessoarer/Väskor-Accessoarer`
- **Skor & Skovård** — `Kläder-Accessoarer/Skor-Skovård`

### Tobak

- **fullURLPath:** `Tobak`
- **id:** `4d09b54a-c6f7-4898-8aac-b089712f7e76`

- **Cigaretter** — `Tobak/Cigaretter`
- **Snus** — `Tobak/Snus`
- **Snus utan tobak** — `Tobak/Snus-utan-tobak`
- **Snus utan nikotin** — `Tobak/Snus-utan-nikotin`
- **Rull- & piptobak** — `Tobak/Rull-piptobak`
- **Tändare & Tändstickor** — `Tobak/Tändare-Tändstickor`

### Grill

- **fullURLPath:** `Grill`
- **id:** `2461df2c-19e0-4435-84ef-210111f66562`

- **Grillar & Grillredskap** — `Grill/Grillar-Grillredskap`
- **Grilla Kött** — `Grill/Grilla-Kött`
- **Grilla Kyckling** — `Grill/Grilla-Kyckling`
- **Grilla Fisk, Skaldjur & Ost** — `Grill/Grilla-Fisk-Skaldjur-Ost`
- **Grilla Grönsaker & Vego** — `Grill/Grilla-Grönsaker-Vego`
- **Grilla Korv & Hamburgare** — `Grill/Grilla-Korv-Hamburgare`
- **Gott till grillat** — `Grill/Gott-till-grillat`
- **Grillnyheter** — `Grill/Grillnyheter`

<!-- ICA_SHOP_CATEGORY_MENU_END -->

## Generated promo picker catalog

**Command:** `pnpm promo:picker-catalog` (or `node scripts/build-ica-maxi-promo-picker-catalog.mjs`)

**Output:** [`ica-maxi-promo-picker-catalog.json`](./ica-maxi-promo-picker-catalog.json) (and a copy at `apps/dashboard/public/data/ica-maxi-promo-picker-catalog.json` for the dashboard static fetch) — `schemaVersion` **1**, retailer **`ica-maxi`**, plus:

| Key | Use |
|-----|-----|
| `categories` | Filter groups (nodes that have children): `id`, `name`, `fullURLPath`, `parentId`, `departmentId` (top-level department UUID). |
| `items` | Leaf pickables: `watchlistText` is the Swedish string to append to `promo_watchlist`; `labels.sv` / `labels.en` / `labels.vi` provide multilingual display/search labels for recipe ingredient sources; `parentCategoryId` / `departmentId` for filtering; `retailerCategoryId` / `productCount` when sourced from a snapshot. |

The build script preserves existing `items[].labels` by item id when
regenerating the catalog, so curated English/Vietnamese labels are not lost
when ICA source snapshots are rebuilt.

In `items`, each **`fullURLPath`** and each ICA category **`id`** appear **once**. ICA sometimes lists the same category id under two aisles (e.g. **Avokado** under both Frukt and Grönsaker); the merge keeps the first tree-walk occurrence so the watchlist picker does not show duplicate labels.

### How this relates to the merge design

Goal: one **committed JSON** the dashboard picker can load — built from the navigation tree plus optional detail snapshots, without hand-copying tables.

### ICA category node (leaf or branch)

Every node in a snapshot file uses the same shape ICA exposes for a category (array elements or `children` entries):

| Field | Type | Meaning |
|-------|------|--------|
| `id` | string (UUID) | Category id in ICA’s system |
| `name` | string | Swedish display label |
| `fullURLPath` | string | Slug path, e.g. `Frukt-Grönt/Frukt/Banan` (segments joined with `/`) |
| `retailerCategoryId` | string | Retailer-specific numeric id as string |
| `productCount` | number | Approx. SKU count for that snapshot (store/time dependent) |
| `children` | array | Same-shaped nodes; `[]` if leaf |

Nested levels: repeat the same object inside `children` (see **Exotisk frukt** in [`ica-maxi-catalog-frukt-raw.json`](./ica-maxi-catalog-frukt-raw.json)).

### Inputs

1. **Navigation tree** — Parse `data.categories` from [`ica-maxi-initial-state-raw.json`](./ica-maxi-initial-state-raw.json): `root` order, `categories[id].name`, `fullURLPath`, `id`, `children`. Apply the same exclusions as `scripts/build-ica-maxi-category-menu.mjs` (`EXCLUDED_ROOT_NAMES`).
2. **Detail snapshots** — JSON files in this folder, one array per **parent aisle** you have captured:

| Snapshot file | Parent `fullURLPath` (must match tree) |
|---------------|----------------------------------------|
| [`ica-maxi-catalog-frukt-raw.json`](./ica-maxi-catalog-frukt-raw.json) | `Frukt-Grönt/Frukt` |
| [`ica-maxi-catalog-farska-bar-raw.json`](./ica-maxi-catalog-farska-bar-raw.json) | `Frukt-Grönt/Färska-bär` |
| [`ica-maxi-catalog-farska-kryddor-raw.json`](./ica-maxi-catalog-farska-kryddor-raw.json) | `Frukt-Grönt/Färska-kryddor` |
| [`ica-maxi-catalog-vegetables-raw.json`](./ica-maxi-catalog-vegetables-raw.json) | `Frukt-Grönt/Grönsaker` |
| [`ica-maxi-catalog-kal-raw.json`](./ica-maxi-catalog-kal-raw.json) | `Frukt-Grönt/Kål` |
| [`ica-maxi-catalog-lok-raw.json`](./ica-maxi-catalog-lok-raw.json) | `Frukt-Grönt/Lök` |
| [`ica-maxi-catalog-potatis-raw.json`](./ica-maxi-catalog-potatis-raw.json) | `Frukt-Grönt/Potatis` |
| [`ica-maxi-catalog-rot-frukter-raw.json`](./ica-maxi-catalog-rot-frukter-raw.json) | `Frukt-Grönt/Rotfrukter` |
| [`ica-maxi-catalog-juice-fruktdryck-raw.json`](./ica-maxi-catalog-juice-fruktdryck-raw.json) | `Dryck/Juice-Fruktdryck` (linked under Mejeri in nav; path matches initial state) |
| [`ica-maxi-catalog-agg-jast-raw.json`](./ica-maxi-catalog-agg-jast-raw.json) | `Mejeri-Ost/Ägg-Jäst` |
| [`ica-maxi-catalog-mjolk-raw.json`](./ica-maxi-catalog-mjolk-raw.json) | `Mejeri-Ost/Mjölk` |
| [`ica-maxi-catalog-filmjolk-raw.json`](./ica-maxi-catalog-filmjolk-raw.json) | `Mejeri-Ost/Filmjölk` |
| [`ica-maxi-catalog-ost-raw.json`](./ica-maxi-catalog-ost-raw.json) | `Mejeri-Ost/Ost` |
| [`ica-maxi-catalog-gradde-raw.json`](./ica-maxi-catalog-gradde-raw.json) | `Mejeri-Ost/Grädde` |
| [`ica-maxi-catalog-smor-magarin-raw.json`](./ica-maxi-catalog-smor-magarin-raw.json) | `Mejeri-Ost/Smör-Margarin` |
| [`ica-maxi-catalog-creme-fraiche-raw.json`](./ica-maxi-catalog-creme-fraiche-raw.json) | `Mejeri-Ost/Crème-fraiche` |
| [`ica-maxi-catalog-graddfil-raw.json`](./ica-maxi-catalog-graddfil-raw.json) | `Mejeri-Ost/Gräddfil` |
| [`ica-maxi-catalog-kvarg-raw.json`](./ica-maxi-catalog-kvarg-raw.json) | `Mejeri-Ost/Kvarg` |
| [`ica-maxi-catalog-cottage-cheese-raw.json`](./ica-maxi-catalog-cottage-cheese-raw.json) | `Mejeri-Ost/Cottage-cheese` |
| [`ica-maxi-catalog-cottage-kylda-mellanmal-desserter-raw.json`](./ica-maxi-catalog-cottage-kylda-mellanmal-desserter-raw.json) | `Mejeri-Ost/Kylda-mellanmål-desserter` |
| [`ica-maxi-catalog-yoghurt-raw.json`](./ica-maxi-catalog-yoghurt-raw.json) | `Mejeri-Ost/Yoghurt` |
| [`ica-maxi-catalog-fisk-skaldjur-raw.json`](./ica-maxi-catalog-fisk-skaldjur-raw.json) | `Fisk-Skaldjur` |
| [`ica-maxi-catalog-brod-kakor-raw.json`](./ica-maxi-catalog-brod-kakor-raw.json) | `Bröd-Kakor` |
| [`ica-maxi-catalog-fageldelikatesschark-raw.json`](./ica-maxi-catalog-fageldelikatesschark-raw.json) | `Kött-Chark-Fågel/Delikatesschark` |
| [`ica-maxi-catalog-inalvsmat-raw.json`](./ica-maxi-catalog-inalvsmat-raw.json) | `Kött-Chark-Fågel/Inälvsmat` |
| [`ica-maxi-catalog-korv-raw.json`](./ica-maxi-catalog-korv-raw.json) | `Kött-Chark-Fågel/Korv` |
| [`ica-maxi-catalog-kott-raw.json`](./ica-maxi-catalog-kott-raw.json) | `Kött-Chark-Fågel/Kött` |
| [`ica-maxi-catalog-kott-fars-raw.json`](./ica-maxi-catalog-kott-fars-raw.json) | `Kött-Chark-Fågel/Köttfärs` |
| [`ica-maxi-catalog-kyckling-fagel-raw.json`](./ica-maxi-catalog-kyckling-fagel-raw.json) | `Kött-Chark-Fågel/Kyckling-Fågel` |
| [`ica-maxi-catalog-matchark-raw.json`](./ica-maxi-catalog-matchark-raw.json) | `Kött-Chark-Fågel/Matchark` |
| [`ica-maxi-catalog-palagg-raw.json`](./ica-maxi-catalog-palagg-raw.json) | `Kött-Chark-Fågel/Pålägg` |

Naming convention for new captures: `ica-maxi-catalog-<slug>-raw.json` where `<slug>` is a short kebab alias; document the parent path in [Category detail](#category-detail) and add a row here.

### Merge algorithm (for a generator script)

1. Build an in-memory tree from **initial state** `data.categories` (map by `id`, walk from `root`).
2. For each **snapshot file**, load the JSON array. Take the **parent path** from the table above (or from the common prefix of all `fullURLPath` values in the file). Find the node whose `fullURLPath` equals that parent.
3. Attach the snapshot as that node’s **`children`** (or replace `children` if the nav tree only had a placeholder). Preserve nested `children` inside snapshot items as-is.
4. **Validate:** every `fullURLPath` in the snapshot starts with `parentPath + "/"`; every snapshot `id` is unique in the merged tree if possible; log duplicate paths.
5. Emit **`ica-maxi-promo-picker-catalog.json`** under `docs/requirements/` with **`meta`**, flattened **`categories`** (branches) and **`items`** (leaves). **Keep ICA’s `id` / `fullURLPath` / `name`** so promos and URLs stay joinable. (Copy to `apps/dashboard/public/data/` later if the UI loads static JSON from the app.)

### Example merged shape (illustrative)

Top level is whatever your consumer needs; this pattern stays close to ICA:

```json
{
  "meta": {
    "generatedAt": "2026-04-03T12:00:00.000Z",
    "initialState": "ica-maxi-initial-state-raw.json",
    "snapshots": [
      "ica-maxi-catalog-frukt-raw.json",
      "ica-maxi-catalog-farska-bar-raw.json",
      "ica-maxi-catalog-farska-kryddor-raw.json",
      "ica-maxi-catalog-vegetables-raw.json",
      "ica-maxi-catalog-kal-raw.json",
      "ica-maxi-catalog-lok-raw.json",
      "ica-maxi-catalog-potatis-raw.json",
      "ica-maxi-catalog-rot-frukter-raw.json",
      "ica-maxi-catalog-juice-fruktdryck-raw.json",
      "ica-maxi-catalog-agg-jast-raw.json",
      "ica-maxi-catalog-mjolk-raw.json",
      "ica-maxi-catalog-filmjolk-raw.json",
      "ica-maxi-catalog-ost-raw.json",
      "ica-maxi-catalog-gradde-raw.json",
      "ica-maxi-catalog-smor-magarin-raw.json",
      "ica-maxi-catalog-creme-fraiche-raw.json",
      "ica-maxi-catalog-graddfil-raw.json",
      "ica-maxi-catalog-kvarg-raw.json",
      "ica-maxi-catalog-cottage-cheese-raw.json",
      "ica-maxi-catalog-cottage-kylda-mellanmal-desserter-raw.json",
      "ica-maxi-catalog-yoghurt-raw.json",
      "ica-maxi-catalog-fisk-skaldjur-raw.json",
      "ica-maxi-catalog-brod-kakor-raw.json",
      "ica-maxi-catalog-fageldelikatesschark-raw.json",
      "ica-maxi-catalog-inalvsmat-raw.json",
      "ica-maxi-catalog-korv-raw.json",
      "ica-maxi-catalog-kott-raw.json",
      "ica-maxi-catalog-kott-fars-raw.json",
      "ica-maxi-catalog-kyckling-fagel-raw.json",
      "ica-maxi-catalog-matchark-raw.json",
      "ica-maxi-catalog-palagg-raw.json"
    ]
  },
  "tree": [
    {
      "id": "f82845b1-7be6-4e08-8b5d-7f2c0f0a7d38",
      "name": "Frukt & Grönt",
      "fullURLPath": "Frukt-Grönt",
      "children": [
        {
          "name": "Frukt",
          "fullURLPath": "Frukt-Grönt/Frukt",
          "id": "<from-initial-state>",
          "children": []
        }
      ]
    }
  ]
}
```

Replace `"children": []` under **Frukt** with the array from `ica-maxi-catalog-frukt-raw.json` after merge. Interests / picker `items` can be a **separate** array keyed by `fullURLPath` or `retailerCategoryId` — generate in a second step from the same merged tree.

---

## Category detail

Tables duplicate what is already in the JSON snapshots so humans can read the doc without opening files; **generators should read the JSON**, not parse markdown tables.

Snapshots of ICA’s **next level** under a department (and sometimes one level deeper). Source files are JSON arrays of nodes with `name`, `fullURLPath`, `retailerCategoryId`, `id`, `productCount`, and optional `children`.

### Frukt & Grönt → Frukt

Source: [`ica-maxi-catalog-frukt-raw.json`](./ica-maxi-catalog-frukt-raw.json).

| Under **Frukt** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|-----------------|-------------|-------------------|---------------|--------------|
| Banan | `Frukt-Grönt/Frukt/Banan` | 675 | `f9c0d07e-86e2-4daa-bff8-0a5a9ee97c6d` | 4 |
| Äpple | `Frukt-Grönt/Frukt/Äpple` | 676 | `5f255f68-426a-4d1c-bb13-651aed5e2722` | 16 |
| Päron | `Frukt-Grönt/Frukt/Päron` | 677 | `7279128f-e13e-47af-b2e2-94567d72768f` | 6 |
| Citrusfrukt | `Frukt-Grönt/Frukt/Citrusfrukt` | 4917 | `a452d7a6-f1cc-4f9e-affa-49d6106a4c42` | 14 |
| Stenfrukt | `Frukt-Grönt/Frukt/Stenfrukt` | 4910 | `2c330185-7ae0-4044-b23c-13ff1f342d16` | 1 |
| Melon | `Frukt-Grönt/Frukt/Melon` | 4914 | `1afa0d24-5d93-4116-9ad7-0313fcc8ae9c` | 5 |
| Druvor | `Frukt-Grönt/Frukt/Druvor` | 682 | `e47d117a-8382-4cc4-8154-48ab2602806f` | 5 |
| Exotisk frukt | `Frukt-Grönt/Frukt/Exotisk-frukt` | 4885 | `83676072-0bbe-4b65-92ed-d09c14c452b9` | 34 |
| Avokado | `Frukt-Grönt/Frukt/Avokado` | 3415 | `3a1d2f8e-0c4d-4f3d-ad25-0719d64707ce` | 5 |
| Rabarber | `Frukt-Grönt/Frukt/Rabarber` | 4606 | `2ca7d26d-dac9-42f0-88d7-b8e1b1f57822` | 1 |
| Fruktpåsar | `Frukt-Grönt/Frukt/Fruktpåsar` | 2723 | `1fa527d7-4927-4c3e-8893-798929a6e967` | 10 |

#### Under **Exotisk frukt**

| Name | fullURLPath | retailerCategoryId | Category `id` | productCount |
|------|-------------|-------------------|---------------|--------------|
| Mango | `Frukt-Grönt/Frukt/Exotisk-frukt/Mango` | 4877 | `5b4d2271-0048-4448-819d-ae30c0226d52` | 1 |
| Ananas | `Frukt-Grönt/Frukt/Exotisk-frukt/Ananas` | 4878 | `171ad091-7747-448c-beef-5fc5c7a9988a` | 1 |
| Dadlar | `Frukt-Grönt/Frukt/Exotisk-frukt/Dadlar` | 4879 | `4bbc68fa-9d11-4780-bf86-0d4b7d1bdf77` | 19 |
| Kiwi | `Frukt-Grönt/Frukt/Exotisk-frukt/Kiwi` | 4880 | `2f5e5ac9-76bd-489f-a654-dc8b3c057116` | 5 |
| Passionsfrukt | `Frukt-Grönt/Frukt/Exotisk-frukt/Passionsfrukt` | 4881 | `19dddb0b-d1a0-4fb2-8c97-51dd59df4248` | 1 |
| Fikon | `Frukt-Grönt/Frukt/Exotisk-frukt/Fikon` | 4883 | `a1a2559b-a2b5-41e3-a5f4-f31a1f120766` | 1 |
| Papaya | `Frukt-Grönt/Frukt/Exotisk-frukt/Papaya` | 4884 | `9600890f-9bfb-4cd5-96b9-4012ec0c7d6d` | 1 |
| Övrig exotisk frukt | `Frukt-Grönt/Frukt/Exotisk-frukt/Övrig-exotisk-frukt` | 4882 | `93f3d0d1-3df8-4d8a-9204-6145d577d22d` | 5 |

### Frukt & Grönt → Färska bär

Source: [`ica-maxi-catalog-farska-bar-raw.json`](./ica-maxi-catalog-farska-bar-raw.json).

| Under **Färska bär** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|----------------------|-------------|-------------------|---------------|--------------|
| Jordgubbar | `Frukt-Grönt/Färska-bär/Jordgubbar` | 1375 | `4ce51888-a1fa-46f5-86b1-4ddbd54d8cff` | 4 |
| Hallon | `Frukt-Grönt/Färska-bär/Hallon` | 1376 | `a74f6d3b-3f1e-4ab2-9c24-5c740b0541b0` | 1 |
| Blåbär | `Frukt-Grönt/Färska-bär/Blåbär` | 1377 | `911f287b-a861-465e-8ed6-ed324be687aa` | 4 |

### Frukt & Grönt → Lök

Source: [`ica-maxi-catalog-lok-raw.json`](./ica-maxi-catalog-lok-raw.json).

| Under **Lök** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|-----------------|-------------|-------------------|---------------|--------------|
| Gul lök | `Frukt-Grönt/Lök/Gul-lök` | 1262 | `2c0eb3ea-f2e9-4b8d-8721-746089d258b3` | 3 |
| Rödlök | `Frukt-Grönt/Lök/Rödlök` | 1263 | `d8c8986d-2a56-4347-9490-aafe1a2a6f60` | 4 |
| Vitlök | `Frukt-Grönt/Lök/Vitlök` | 1264 | `fe0ff50e-9ece-4d53-96f1-30fc5b191ea4` | 6 |
| Schalottenlök | `Frukt-Grönt/Lök/Schalottenlök` | 4571 | `0bb55fbd-01db-46ea-9457-10e47886b385` | 3 |
| Salladslök | `Frukt-Grönt/Lök/Salladslök` | 4569 | `c9f26260-cb0f-4ff9-88a7-a755b307472c` | 1 |
| Purjolök | `Frukt-Grönt/Lök/Purjolök` | 4570 | `fceb7a20-be6d-4ddd-9745-c5563b897da0` | 2 |
| Ramslök | `Frukt-Grönt/Lök/Ramslök` | 4562 | `df2b1174-169d-4b7e-8da8-80d84007bd68` | 1 |
| Övrig lök | `Frukt-Grönt/Lök/Övrig-lök` | 4572 | `bae75f15-8a1e-4cee-8e2c-0ef94f5cf9a3` | 1 |

### Frukt & Grönt → Färska kryddor

Source: [`ica-maxi-catalog-farska-kryddor-raw.json`](./ica-maxi-catalog-farska-kryddor-raw.json).

| Under **Färska kryddor** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|--------------------------|-------------|-------------------|---------------|--------------|
| Gräslök | `Frukt-Grönt/Färska-kryddor/Gräslök` | 1071 | `a4bda5a2-68ab-41db-9008-1fd05c4e388a` | 2 |
| Dill | `Frukt-Grönt/Färska-kryddor/Dill` | 1072 | `18732480-dc49-48e3-824e-a65de9f2174b` | 2 |
| Persilja | `Frukt-Grönt/Färska-kryddor/Persilja` | 1073 | `c1e1259b-3809-4054-ac8b-74398c24b523` | 5 |
| Basilika | `Frukt-Grönt/Färska-kryddor/Basilika` | 1074 | `6a8362a7-859c-47f7-9737-800f8d81113a` | 4 |
| Timjan | `Frukt-Grönt/Färska-kryddor/Timjan` | 4553 | `76e80a41-7b91-4653-b35a-a716ccfad8ff` | 2 |
| Oregano | `Frukt-Grönt/Färska-kryddor/Oregano` | 4561 | `7c39b8db-bc15-4e82-b53e-571ead857fad` | 2 |
| Rosmarin | `Frukt-Grönt/Färska-kryddor/Rosmarin` | 4554 | `97645390-1910-4daa-8517-1e9073fdceae` | 1 |
| Koriander | `Frukt-Grönt/Färska-kryddor/Koriander` | 4555 | `49bcfaec-6c0e-48d5-8007-1fc659010521` | 2 |
| Mynta | `Frukt-Grönt/Färska-kryddor/Mynta` | 4556 | `096a82ae-71c4-498d-9976-b9e836a7ad3c` | 1 |
| Dragon | `Frukt-Grönt/Färska-kryddor/Dragon` | 4557 | `f15158b2-6d01-4b54-9fe2-0500c0b7cfa2` | 1 |
| Citronmeliss | `Frukt-Grönt/Färska-kryddor/Citronmeliss` | 4560 | `44f4c403-70ca-415a-97df-9cd8ad863dd0` | 2 |
| Färsk chilipeppar | `Frukt-Grönt/Färska-kryddor/Färsk-chilipeppar` | 1651 | `6ba2dde1-c8a5-4e3c-bfbb-d54feb33525b` | 6 |
| Ingefära | `Frukt-Grönt/Färska-kryddor/Ingefära` | 4552 | `3fee4ee6-7bc8-4599-aa04-2e266ab69bfa` | 2 |
| Övriga färska kryddor | `Frukt-Grönt/Färska-kryddor/Övriga-färska-kryddor` | 4559 | `eb38644f-ebd7-4814-8d3a-f7bcc404c2cb` | 3 |

### Frukt & Grönt → Grönsaker

Source: [`ica-maxi-catalog-vegetables-raw.json`](./ica-maxi-catalog-vegetables-raw.json).

| Under **Grönsaker** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|---------------------|-------------|-------------------|---------------|--------------|
| Sallad | `Frukt-Grönt/Grönsaker/Sallad` | 4587 | `da43879d-6b3c-4835-922e-098e8fde7833` | 34 |
| Gurka | `Frukt-Grönt/Grönsaker/Gurka` | 689 | `b84aa1c3-cb92-4f6b-8acc-bef946a04605` | 3 |
| Tomat | `Frukt-Grönt/Grönsaker/Tomat` | 686 | `1313449e-b92d-4664-b507-aa9738c57516` | 12 |
| Paprika | `Frukt-Grönt/Grönsaker/Paprika` | 688 | `c436bce4-1cc3-4b75-8610-9b5e8d6ed914` | 10 |
| Avokado | `Frukt-Grönt/Grönsaker/Avokado` | 3415 | `3a1d2f8e-0c4d-4f3d-ad25-0719d64707ce` | 5 |
| Aubergine | `Frukt-Grönt/Grönsaker/Aubergine` | 4530 | `9d32a56a-aad2-4c69-a8db-640657dc43b1` | 2 |
| Zucchini | `Frukt-Grönt/Grönsaker/Zucchini` | 4531 | `cfd8ba11-d731-4b74-8760-3d7e54ce368c` | 2 |
| Ärtor & Bönor | `Frukt-Grönt/Grönsaker/Ärtor-Bönor` | 4600 | `50d9fcf5-079a-4372-ae3e-4a75472b2127` | 3 |
| Groddar | `Frukt-Grönt/Grönsaker/Groddar` | 4581 | `8f88db23-7610-4f2e-b13d-207446efac3f` | 4 |
| Majs | `Frukt-Grönt/Grönsaker/Majs` | 4583 | `f83cb438-7298-4b9c-ac82-f72114a1ff55` | 2 |
| Rädisor | `Frukt-Grönt/Grönsaker/Rädisor` | 4584 | `1ae52516-747f-4570-ba2b-386cfef57867` | 3 |
| Sparris | `Frukt-Grönt/Grönsaker/Sparris` | 4585 | `fa51da84-b493-4037-b742-307342aca735` | 4 |
| Stjälkselleri | `Frukt-Grönt/Grönsaker/Stjälkselleri` | 4586 | `2851e059-7537-486f-bf75-1d15c417be2a` | 2 |
| Rabarber | `Frukt-Grönt/Grönsaker/Rabarber` | 4606 | `2ca7d26d-dac9-42f0-88d7-b8e1b1f57822` | 1 |

#### Under **Sallad** (within Grönsaker)

| Name | fullURLPath | retailerCategoryId | Category `id` | productCount |
|------|-------------|-------------------|---------------|--------------|
| Salladsmix | `Frukt-Grönt/Grönsaker/Sallad/Salladsmix` | 4591 | `1e1153f0-7111-49cb-92c5-60d526ba764b` | 18 |
| Spenat | `Frukt-Grönt/Grönsaker/Sallad/Spenat` | 4598 | `8fb30fc8-0888-4ce1-837e-20e0d3c23b9f` | 3 |
| Rucola | `Frukt-Grönt/Grönsaker/Sallad/Rucola` | 4597 | `e815f30d-9bd7-4bd5-8672-ad12807fb518` | 3 |
| Mache | `Frukt-Grönt/Grönsaker/Sallad/Mache` | 4595 | `5d9e36b6-c4ed-49c6-a279-b933fa92b3d8` | 1 |
| Isbergssallad | `Frukt-Grönt/Grönsaker/Sallad/Isbergssallad` | 4593 | `927d9590-557b-42ba-ba52-595f6c7cd6c1` | 1 |
| Romansallad | `Frukt-Grönt/Grönsaker/Sallad/Romansallad` | 4596 | `cbceb008-06bd-4050-89a4-90c576ba4832` | 2 |
| Hjärtsallad | `Frukt-Grönt/Grönsaker/Sallad/Hjärtsallad` | 4592 | `2d4add7f-caae-451b-b85f-e0bc71ef6561` | 1 |
| Krispsallad | `Frukt-Grönt/Grönsaker/Sallad/Krispsallad` | 4594 | `5bd19e61-4ff1-4ef3-a884-8024ddcd7805` | 1 |
| Cosmopolitan | `Frukt-Grönt/Grönsaker/Sallad/Cosmopolitan` | 4588 | `eadb0914-c274-4d75-854d-8432a50ceeff` | 1 |
| Crunchita | `Frukt-Grönt/Grönsaker/Sallad/Crunchita` | 4589 | `2d27612b-5109-4eef-b5bb-fcbbb4cbbc88` | 1 |
| Övrig sallad | `Frukt-Grönt/Grönsaker/Sallad/Övrig-sallad` | 4599 | `036f0bbc-6256-4290-bd77-1c9258c55c2b` | 3 |

### Frukt & Grönt → Kål

Source: [`ica-maxi-catalog-kal-raw.json`](./ica-maxi-catalog-kal-raw.json).

| Under **Kål** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|---------------|-------------|-------------------|---------------|--------------|
| Broccoli | `Frukt-Grönt/Kål/Broccoli` | 4529 | `a59d40b5-08f2-4fd4-859c-d85eb44e09d8` | 3 |
| Blomkål | `Frukt-Grönt/Kål/Blomkål` | 4528 | `04c39a8e-b793-4d76-b1e6-53b2018cfcaf` | 1 |
| Kålrot | `Frukt-Grönt/Kål/Kålrot` | 4538 | `2072b799-566c-4ba5-a72c-451ca86eec7d` | 1 |
| Vitkål | `Frukt-Grönt/Kål/Vitkål` | 4532 | `9539ffa9-5652-43d6-94ce-3d0e913e796c` | 3 |
| Rödkål | `Frukt-Grönt/Kål/Rödkål` | 4533 | `73bad600-c506-427b-ac3c-84d8f4f5f11a` | 2 |
| Spetskål | `Frukt-Grönt/Kål/Spetskål` | 4534 | `1d294748-7b93-44c2-83d7-4e6126996b39` | 2 |
| Grönkål | `Frukt-Grönt/Kål/Grönkål` | 4535 | `adb7da02-abb2-41fc-93d8-cc1d85035c51` | 2 |
| Fänkål | `Frukt-Grönt/Kål/Fänkål` | 4537 | `623575d3-4d06-463d-b5b2-d04035e58565` | 1 |
| Salladskål | `Frukt-Grönt/Kål/Salladskål` | 4540 | `2510b47b-59c2-4ebd-95dc-3ffece8768b9` | 1 |
| Surkål | `Frukt-Grönt/Kål/Surkål` | 4543 | `4ec92291-5b9b-4393-a86d-89939050eff5` | 7 |
| Övrig kål | `Frukt-Grönt/Kål/Övrig-kål` | 4539 | `493e8d0c-d737-408f-a1de-215c0e2faadd` | 5 |

### Frukt & Grönt → Potatis

Source: [`ica-maxi-catalog-potatis-raw.json`](./ica-maxi-catalog-potatis-raw.json).

| Under **Potatis** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|-------------------|-------------|-------------------|---------------|--------------|
| Fast potatis | `Frukt-Grönt/Potatis/Fast-potatis` | 4725 | `86358231-d741-4482-938f-440b74ec2c27` | 5 |
| Mjölig potatis | `Frukt-Grönt/Potatis/Mjölig-potatis` | 4726 | `f205e9b6-920f-4b41-8b86-8b0212c6c206` | 6 |
| Färskpotatis | `Frukt-Grönt/Potatis/Färskpotatis` | 4730 | `87426923-c15a-48c7-8427-4194f102aa73` | 1 |
| Delikatesspotatis | `Frukt-Grönt/Potatis/Delikatesspotatis` | 4727 | `04ec4754-e6ef-4941-b18a-c481eb43b9df` | 10 |
| Mandelpotatis | `Frukt-Grönt/Potatis/Mandelpotatis` | 4731 | `790d1646-9854-4fce-810b-ef521855056f` | 2 |
| Bakpotatis | `Frukt-Grönt/Potatis/Bakpotatis` | 4728 | `aa746c6e-6c53-4045-869c-b82e365fd6cd` | 2 |
| Sötpotatis | `Frukt-Grönt/Potatis/Sötpotatis` | 4729 | `0a6a9bdd-f4ef-4f1e-b382-0562e204e43c` | 2 |

### Frukt & Grönt → Rotfrukter

Source: [`ica-maxi-catalog-rot-frukter-raw.json`](./ica-maxi-catalog-rot-frukter-raw.json).

| Under **Rotfrukter** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|----------------------|-------------|-------------------|---------------|--------------|
| Betor | `Frukt-Grönt/Rotfrukter/Betor` | 4547 | `c69802f5-c51c-4c07-a2b7-02b9f52d7e2d` | 6 |
| Rotselleri | `Frukt-Grönt/Rotfrukter/Rotselleri` | 4545 | `ef503f56-bc49-4150-a659-833e7fafd351` | 1 |
| Kålrot | `Frukt-Grönt/Rotfrukter/Kålrot` | 4538 | `2072b799-566c-4ba5-a72c-451ca86eec7d` | 1 |
| Morötter | `Frukt-Grönt/Rotfrukter/Morötter` | 4548 | `438d4eb1-9d08-4baa-b5f7-5df5045325c0` | 8 |
| Palsternacka | `Frukt-Grönt/Rotfrukter/Palsternacka` | 4546 | `cfba5d0d-3481-489c-9b74-d660204924d2` | 2 |
| Pepparrot | `Frukt-Grönt/Rotfrukter/Pepparrot` | 4549 | `249e6219-0faa-4cb1-ad51-8d937ade999d` | 1 |
| Jordärtskocka | `Frukt-Grönt/Rotfrukter/Jordärtskocka` | 4550 | `03982a20-9f2c-4fa8-9996-e8c467d8cd3e` | 1 |
| Rättika | `Frukt-Grönt/Rotfrukter/Rättika` | 4568 | `f1346b41-d843-4d2f-98ba-84f113361e3c` | 1 |
| Övriga rotfrukter | `Frukt-Grönt/Rotfrukter/Övriga-rotfrukter` | 4551 | `54ea6b0a-beae-4a06-89d9-8401f5bce2ca` | 2 |

### Kött, Chark & Fågel → Delikatesschark

Source: [`ica-maxi-catalog-fageldelikatesschark-raw.json`](./ica-maxi-catalog-fageldelikatesschark-raw.json).

| Under **Delikatesschark** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|---------------------------|-------------|-------------------|---------------|--------------|
| Lufttorkad skinka | `Kött-Chark-Fågel/Delikatesschark/Lufttorkad-skinka` | 2624 | `cdc719c5-b8d5-4f82-b995-a6677c3ebea9` | 31 |
| Lufttorkad nöt | `Kött-Chark-Fågel/Delikatesschark/Lufttorkad-nöt` | 2625 | `7196cfb1-44d5-40d0-b9f2-726eb287b412` | 2 |
| Salami delikatess | `Kött-Chark-Fågel/Delikatesschark/Salami-delikatess` | 2626 | `52aa9e9f-9ee9-4eb7-b8f2-a8dc6d34c3fd` | 44 |
| Tapas & Antipasti | `Kött-Chark-Fågel/Delikatesschark/Tapas-Antipasti` | 2627 | `a90c3c76-666c-4a57-94db-fbd2efc7915d` | 34 |
| Medvurst & Mortadella | `Kött-Chark-Fågel/Delikatesschark/Medvurst-Mortadella` | 2628 | `2744c53e-5c88-4490-b4f3-eafbf7343adf` | 2 |
| Ölkorv | `Kött-Chark-Fågel/Delikatesschark/Ölkorv` | 2629 | `e70642a6-9ff4-429f-b28b-dc74d71eb022` | 36 |

### Kött, Chark & Fågel → Inälvsmat

Source: [`ica-maxi-catalog-inalvsmat-raw.json`](./ica-maxi-catalog-inalvsmat-raw.json).

| Under **Inälvsmat** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|---------------------|-------------|-------------------|---------------|--------------|
| Lever | `Kött-Chark-Fågel/Inälvsmat/Lever` | 4761 | `53c377bf-1f76-4ea3-9cfe-8abeb1f7e99a` | 2 |
| Övrig inälvsmat | `Kött-Chark-Fågel/Inälvsmat/Övrig-inälvsmat` | 4763 | `5b725488-8840-4ea9-b1d5-aa6cc783f121` | 1 |

### Kött, Chark & Fågel → Korv

Source: [`ica-maxi-catalog-korv-raw.json`](./ica-maxi-catalog-korv-raw.json).

| Under **Korv** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|----------------|-------------|-------------------|---------------|--------------|
| Falukorv | `Kött-Chark-Fågel/Korv/Falukorv` | 51 | `75a67bc0-3d07-44b8-b832-913dae584eaa` | 17 |
| Grillkorv | `Kött-Chark-Fågel/Korv/Grillkorv` | 52 | `f8cbdec5-f0c2-41e7-b73a-2dfc4d0815cb` | 30 |
| Frukostkorv | `Kött-Chark-Fågel/Korv/Frukostkorv` | 53 | `c7e1b13c-4d60-4f7c-9d50-af380a4c1100` | 2 |
| Varmkorv | `Kött-Chark-Fågel/Korv/Varmkorv` | 54 | `4b2e20ef-71bc-4dea-9129-bfa0b8909698` | 18 |
| Kryddkorv | `Kött-Chark-Fågel/Korv/Kryddkorv` | 55 | `1a48d8d3-4aea-404d-b147-27ace7dba3db` | 61 |
| Isterband | `Kött-Chark-Fågel/Korv/Isterband` | 57 | `20a61acd-acd6-4bf6-b15f-fe7d7cc3e6da` | 4 |
| Prinskorv | `Kött-Chark-Fågel/Korv/Prinskorv` | 58 | `a53e7ec0-074b-4059-ae1e-0ff486c87e31` | 5 |
| Fläskkorv | `Kött-Chark-Fågel/Korv/Fläskkorv` | 59 | `3eecc1af-85f5-4827-b72c-c88aba7ecab8` | 1 |
| Kycklingkorv | `Kött-Chark-Fågel/Korv/Kycklingkorv` | 61 | `7cf3caca-1679-4f6f-acf7-f1c01743d9b1` | 13 |
| Färsk korv | `Kött-Chark-Fågel/Korv/Färsk-korv` | 1558 | `d9919617-88ba-4b64-bf35-19c50a4e0702` | 11 |
| Glutenfri korv | `Kött-Chark-Fågel/Korv/Glutenfri-korv` | 2841 | `aeb2a596-972b-4728-952e-ad94b44edd02` | 23 |

### Kött, Chark & Fågel → Kött

Source: [`ica-maxi-catalog-kott-raw.json`](./ica-maxi-catalog-kott-raw.json).

**Nötkött** and **Fläsk** are split into subcategories; **Lamm** and **Vilt** are leaves at this level.

#### Under **Nötkött**

| Name | fullURLPath | retailerCategoryId | Category `id` | productCount |
|------|-------------|-------------------|---------------|--------------|
| Entrecôte | `Kött-Chark-Fågel/Kött/Nötkött/Entrecôte` | 4745 | `e4a73ce4-fa49-47a0-b22c-1570f3da88ed` | 8 |
| Oxfilé | `Kött-Chark-Fågel/Kött/Nötkött/Oxfilé` | 4754 | `bb37b6e6-8b46-4b6b-bcb2-a4a009e255d3` | 9 |
| Rostbiff | `Kött-Chark-Fågel/Kött/Nötkött/Rostbiff` | 4756 | `10273e34-15c3-4cf0-bc22-02e91310a265` | 3 |
| Rostas | `Kött-Chark-Fågel/Kött/Nötkött/Rostas` | 4755 | `152951ca-8209-4511-88ba-2c52fda98f3c` | 4 |
| Flankstek | `Kött-Chark-Fågel/Kött/Nötkött/Flankstek` | 4746 | `b2da019c-bb92-4ce9-9013-53174e9594d3` | 4 |
| Fransyska | `Kött-Chark-Fågel/Kött/Nötkött/Fransyska` | 4747 | `e6036a2a-c9ac-4300-8d25-a52f060300ee` | 2 |
| Ryggbiff | `Kött-Chark-Fågel/Kött/Nötkött/Ryggbiff` | 4757 | `c3b06355-2461-4a76-8fb3-1c1ce9d1cc8f` | 10 |
| Högrev | `Kött-Chark-Fågel/Kött/Nötkött/Högrev` | 4750 | `d9d3dd9c-b331-4310-94b8-8a65d55683a4` | 4 |
| Lövbiff | `Kött-Chark-Fågel/Kött/Nötkött/Lövbiff` | 4753 | `fdf6a923-2098-4ff4-b8f7-f8ffd5e17e05` | 7 |
| Kalvkött | `Kött-Chark-Fågel/Kött/Nötkött/Kalvkött` | 4752 | `d47fea14-3311-4156-934b-dcedd707613f` | 6 |
| Grytbitar & Strimlat nötkött | `Kött-Chark-Fågel/Kött/Nötkött/Grytbitar-Strimlat-nötkött` | 4749 | `913fa108-2f76-4926-8664-872d2f5a37c0` | 1 |
| Pepparbiff & Färdigkryddat nötkött | `Kött-Chark-Fågel/Kött/Nötkött/Pepparbiff-Färdigkryddat-nötkött` | 4748 | `f331eb80-2241-4a39-b439-d9cd7ccd9382` | 8 |
| Övrigt nötkött | `Kött-Chark-Fågel/Kött/Nötkött/Övrigt-nötkött` | 4758 | `4a0bc0b8-3610-4b41-be46-65a26348778a` | 6 |

#### Under **Fläsk**

| Name | fullURLPath | retailerCategoryId | Category `id` | productCount |
|------|-------------|-------------------|---------------|--------------|
| Fläskfilé | `Kött-Chark-Fågel/Kött/Fläsk/Fläskfilé` | 4953 | `d449840e-8fdb-498b-b14e-db8a47b551ca` | 4 |
| Fläskytterfilé | `Kött-Chark-Fågel/Kött/Fläsk/Fläskytterfilé` | 4958 | `4be58255-3f07-41a0-8fa4-1299a007cc72` | 6 |
| Fläskkarré | `Kött-Chark-Fågel/Kött/Fläsk/Fläskkarré` | 4954 | `c7f6f0b3-b566-4627-a88f-3b00572d46be` | 13 |
| Fläskkotlett | `Kött-Chark-Fågel/Kött/Fläsk/Fläskkotlett` | 4955 | `5c3a20b3-d854-4df9-a7ca-fcc89bfd5ac7` | 10 |
| Fläskfärs | `Kött-Chark-Fågel/Kött/Fläsk/Fläskfärs` | 1385 | `f755f624-efda-4a4c-8d10-05c7db515fdd` | 7 |
| Fläsklägg | `Kött-Chark-Fågel/Kött/Fläsk/Fläsklägg` | 4956 | `b1c41734-3295-443e-9f13-d6c04ceed998` | 2 |
| Fläskschnitzel | `Kött-Chark-Fågel/Kött/Fläsk/Fläskschnitzel` | 4957 | `20449f02-5cff-45a6-876c-298703234ce7` | 2 |
| Färdigkryddat fläskkött | `Kött-Chark-Fågel/Kött/Fläsk/Färdigkryddat-fläskkött` | 2120 | `4c8f1d41-2033-426c-81b6-a5dddd58b8e6` | 12 |
| Strimlat fläskkött | `Kött-Chark-Fågel/Kött/Fläsk/Strimlat-fläskkött` | 4964 | `bee7de0a-be1a-4b39-9535-894f9972f6f6` | 4 |
| Grytbitar fläsk | `Kött-Chark-Fågel/Kött/Fläsk/Grytbitar-fläsk` | 4959 | `13d2a2f7-a1ed-4bc5-96a2-dddcdd6cd6e1` | 1 |
| Kassler | `Kött-Chark-Fågel/Kött/Fläsk/Kassler` | 4960 | `6171e4b3-625c-4813-887c-f2c5e77d3853` | 5 |
| Picknickbog | `Kött-Chark-Fågel/Kött/Fläsk/Picknickbog` | 4961 | `e1a06bfe-6be1-4b05-ae27-8f6b93311849` | 2 |
| Revbensspjäll | `Kött-Chark-Fågel/Kött/Fläsk/Revbensspjäll` | 785 | `7d4bc393-7d52-44f2-aea6-46fd003c5bfc` | 8 |
| Sidfläsk | `Kött-Chark-Fågel/Kött/Fläsk/Sidfläsk` | 4962 | `f2140a6d-194a-46eb-ac85-34a92f1cf2b5` | 2 |
| Skinkstek | `Kött-Chark-Fågel/Kött/Fläsk/Skinkstek` | 4963 | `1866a668-3f81-4ad7-a755-b85e844d39b5` | 1 |
| Julskinka | `Kött-Chark-Fågel/Kött/Fläsk/Julskinka` | 1168 | `fd5f0df5-1f3a-41c3-a444-b328394183b2` | 4 |
| Övrigt fläskkött | `Kött-Chark-Fågel/Kött/Fläsk/Övrigt-fläskkött` | 4965 | `64e44810-2b76-4c57-adae-070a311be68c` | 2 |

*Note:* **Fläskfärs** under **Kött → Fläsk** shares an ICA `id` with **Köttfärs → Fläskfärs**; the merged catalog keeps **one** row (first path in the tree walk, here `Kött/Fläsk/Fläskfärs` before `Köttfärs/Fläskfärs`).

| Under **Kött** (direct leaves) | fullURLPath | retailerCategoryId | Category `id` | productCount |
|--------------------------------|-------------|-------------------|---------------|--------------|
| Lamm | `Kött-Chark-Fågel/Kött/Lamm` | 4924 | `65d862a4-f71d-437c-a480-1347be521958` | 14 |
| Vilt | `Kött-Chark-Fågel/Kött/Vilt` | 4934 | `55f2bab3-8593-47cb-a059-b44acb7721fd` | 11 |

### Kött, Chark & Fågel → Köttfärs

Source: [`ica-maxi-catalog-kott-fars-raw.json`](./ica-maxi-catalog-kott-fars-raw.json).

| Under **Köttfärs** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|--------------------|-------------|-------------------|---------------|--------------|
| Nötfärs | `Kött-Chark-Fågel/Köttfärs/Nötfärs` | 1384 | `a3dfd0bd-7d83-4d31-b820-4ed952bffba7` | 12 |
| Fläskfärs | `Kött-Chark-Fågel/Köttfärs/Fläskfärs` | 1385 | `f755f624-efda-4a4c-8d10-05c7db515fdd` | 7 |
| Blandfärs | `Kött-Chark-Fågel/Köttfärs/Blandfärs` | 1386 | `2eff4fd7-49bf-4803-b1ae-504e9bc5b4ad` | 8 |
| Lammfärs | `Kött-Chark-Fågel/Köttfärs/Lammfärs` | 4928 | `5cd193ec-5e70-4e96-99af-36ea112695ec` | 2 |
| Kycklingfärs | `Kött-Chark-Fågel/Köttfärs/Kycklingfärs` | 33 | `f160a06a-676c-4ac0-abac-d8b7c92233aa` | 3 |
| Kalkonfärs | `Kött-Chark-Fågel/Köttfärs/Kalkonfärs` | 4889 | `f1c63f30-af8b-4075-885e-4613a73cd042` | 2 |
| Viltfärs | `Kött-Chark-Fågel/Köttfärs/Viltfärs` | 4935 | `2d3b941a-588f-4f77-b10b-cadb9debd1c4` | 3 |

### Kött, Chark & Fågel → Kyckling & Fågel

Source: [`ica-maxi-catalog-kyckling-fagel-raw.json`](./ica-maxi-catalog-kyckling-fagel-raw.json).

| Under **Kyckling & Fågel** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|----------------------------|-------------|-------------------|---------------|--------------|
| Hel kyckling | `Kött-Chark-Fågel/Kyckling-Fågel/Hel-kyckling` | 30 | `c26df667-d884-4daf-94ae-45d0d58532f5` | 7 |
| Kycklingfilé | `Kött-Chark-Fågel/Kyckling-Fågel/Kycklingfilé` | 32 | `6840862f-f574-47b1-bbf4-1ddd08c74af3` | 44 |
| Kycklingdelar | `Kött-Chark-Fågel/Kyckling-Fågel/Kycklingdelar` | 31 | `11bc4dab-eda7-4ab5-aba5-f475de7ed402` | 29 |
| Kycklingfärs | `Kött-Chark-Fågel/Kyckling-Fågel/Kycklingfärs` | 33 | `f160a06a-676c-4ac0-abac-d8b7c92233aa` | 3 |
| Förberedd fågel | `Kött-Chark-Fågel/Kyckling-Fågel/Förberedd-fågel` | 1546 | `ad152300-323c-4b1d-aeeb-f143626b3590` | 29 |
| Anka & övrig fågel | `Kött-Chark-Fågel/Kyckling-Fågel/Anka-övrig-fågel` | 34 | `dffd1c20-4bb5-4121-a57f-bba5f316ab3d` | 12 |
| Kalkon | `Kött-Chark-Fågel/Kyckling-Fågel/Kalkon` | 4886 | `898d5458-9dd4-45d1-a196-084a8d81c71b` | 15 |

*Note:* **Kycklingfärs** shares the same ICA category `id` under **Köttfärs** and **Kyckling-Fågel**. In `data.categories`, **Köttfärs** is listed before **Kyckling & Fågel** under `Kött-Chark-Fågel`, so the merged picker keeps **`Kött-Chark-Fågel/Köttfärs/Kycklingfärs`** and drops the duplicate under `Kyckling-Fågel`.

### Kött, Chark & Fågel → Matchark

Source: [`ica-maxi-catalog-matchark-raw.json`](./ica-maxi-catalog-matchark-raw.json).

| Under **Matchark** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|--------------------|-------------|-------------------|---------------|--------------|
| Köttbullar & färsprodukter | `Kött-Chark-Fågel/Matchark/Köttbullar-färsprodukter` | 1381 | `92f7b193-614b-4197-a8d2-dda13c0bdc2a` | 25 |
| Hamburgare | `Kött-Chark-Fågel/Matchark/Hamburgare` | 2210 | `b8fbe466-4b2c-4f12-885f-bdac9bc9123a` | 19 |
| Bacon & stekfläsk | `Kött-Chark-Fågel/Matchark/Bacon-stekfläsk` | 1548 | `e69d38a9-b082-424e-93bb-a972009a32c1` | 36 |
| Blodpudding | `Kött-Chark-Fågel/Matchark/Blodpudding` | 1472 | `4ac4aa19-ab90-430c-8b60-4cd5cf692a54` | 4 |
| Sylta | `Kött-Chark-Fågel/Matchark/Sylta` | 4966 | `55be5423-b532-4420-b0a2-7dd7bfe55ead` | 3 |

### Kött, Chark & Fågel → Pålägg

Source: [`ica-maxi-catalog-palagg-raw.json`](./ica-maxi-catalog-palagg-raw.json).

| Under **Pålägg** | fullURLPath | retailerCategoryId | Category `id` | productCount |
|------------------|-------------|-------------------|---------------|--------------|
| Påläggskorv | `Kött-Chark-Fågel/Pålägg/Påläggskorv` | 42 | `cb0756d2-985b-45de-89af-bd068eb7de5a` | 26 |
| Salami | `Kött-Chark-Fågel/Pålägg/Salami` | 43 | `ecf70a00-ea5f-404b-bf3a-4ef5c68805f5` | 63 |
| Skinka | `Kött-Chark-Fågel/Pålägg/Skinka` | 44 | `f857880f-3617-4c15-b2c0-453c80c55508` | 57 |
| Rostbiff & pastrami | `Kött-Chark-Fågel/Pålägg/Rostbiff-pastrami` | 46 | `e233c2e5-67b7-4a4b-afd7-fab9c81c902f` | 4 |
| Hamburgerkött & vilt | `Kött-Chark-Fågel/Pålägg/Hamburgerkött-vilt` | 48 | `7c0f88c1-7ca3-4306-b0e1-a4d72639024b` | 2 |
| Pastej & paté | `Kött-Chark-Fågel/Pålägg/Pastej-paté` | 49 | `f54ac1da-b421-4d27-9f90-7c81c4333703` | 40 |
| Fågel | `Kött-Chark-Fågel/Pålägg/Fågel` | 45 | `c2122836-66fb-4f52-b9fd-a272c525a5f0` | 34 |
