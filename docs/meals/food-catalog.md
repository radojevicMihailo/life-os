# Serbian food catalog

The catalog contains 112 common foods with Serbian Latin names. Nutrition is per **100 g edible portion**, not per serving or per 100 ml. Raw and cooked foods are separate records; weigh the food in the condition named. Dry grains and legumes are not interchangeable with their cooked equivalents. Fish cans use drained solids; sardines include edible bones. Meat excludes bone; the names specify when skin or separable fat is included.

## Source and accuracy

All 448 energy/protein/carbohydrate/fat amounts were extracted directly from the official [USDA FoodData Central SR Legacy April 2018 CSV archive](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip), listed on the [USDA downloads page](https://fdc.nal.usda.gov/download-datasets/). This is the final SR Legacy release, not the latest branded-food database. The food.csv publication dates are 2019-04-01 (FoodData Central publication); this does not change the release identity.

Archive SHA-256: `b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0`.

`lib/foods/catalog.json` stores each FDC ID, original English description, individual USDA source link and the translated name. `lib/foods/usda-source-extract.json` preserves the corresponding selected CSV descriptions and unmodified nutrient amounts. USDA nutrient IDs used: 1008 energy (kcal), 1003 protein (g), 1005 carbohydrate by difference (g), and 1004 total lipid (g). Values retain source precision; they are not inferred from memory or recomputed with the 4/4/9 formula. Source energy can differ from that formula because of fiber and food-specific energy factors.

These are generic USDA foods used as practical estimates for foods commonly eaten in Serbia; they are not laboratory measurements of Serbian products. Brand, recipe, animal cut, water loss, and fat content vary. Six new entries use the searchable Serbian name “Juneće / goveđe meso” for raw/cooked lean ramstek filet, biftek and 15%-fat mince. Their source is USDA generic beef, which does not certify the animal age implied by Serbian “juneće”; these are beef nutrition estimates rather than measurements of a particular young animal. The extension also includes raw/cooked skinless turkey breast, lean pork tenderloin, and lean lamb leg (shank half). “Without separable fat” means visible fat was excluded, not that the meat contains zero fat. In particular, USDA ordinary yogurt and cultured sour cream are approximate counterparts of local jogurt and kisela pavlaka. Their actual source fat amounts are visible in the library. No generic values have been invented for regional mixed dishes such as burek, ćevapi or sarma. Use a package label or recipe for those.

The library links unchanged catalog entries to their exact USDA records. If a user edits the name or any nutrient amount, the source badge disappears so the new values are not represented as USDA values. Catalog provenance lives in the versioned JSON; the existing `manual`/`off` database enum remains unchanged and USDA entries do not occupy the OpenFoodFacts identifier field.

## Populate the database

Run `pnpm db:seed:foods` from the repository root after applying the meals migration. The package command loads `.env.local` and requires `DATABASE_URL`. Alternatively:

```sh
node --env-file-if-exists=.env.local scripts/seed-foods.mjs
```

Inspect validation without touching a database:

```sh
node scripts/seed-foods.mjs --dry-run
```

The seed uses a single transaction and deterministic UUIDv5 IDs derived from the source FDC ID. Repeated runs skip those IDs. Existing edits and archived foods are preserved; user-created records with other IDs are untouched, including similarly named foods. The seed never updates or deletes records and does not restore archived foods. An insertion error rolls back the entire run.

## Verify or refresh

`pnpm exec vitest run lib/foods/catalog.test.ts lib/foods/seed.test.ts` checks all selected source amounts, IDs, preparation labels, source attribution, transactional insertion, reruns and rollback behavior. Seed tests mock PostgreSQL; a successful actual seed is reported separately by its inserted/preserved counts.

For independent source verification, download the archive above, confirm its checksum, and join `food.csv` and `food_nutrient.csv` by `fdc_id`, selecting nutrient IDs 1008, 1003, 1005 and 1004. The 112 selected IDs are in the catalog. Confirm both source descriptions and all four amounts against the checked-in extract. Keep UUIDs unchanged when updating translations or nutrition; the seed deliberately preserves already-created database records rather than silently changing logged-food definitions.
