# Module: Fragrantica reference data

## Responsibility

Import external fragrance records into internal reference tables and maintain Spanish note and accord dictionaries used by the panel and store labels.

## Files

| File                                | Responsibility                   |
| ----------------------------------- | -------------------------------- |
| scripts/import-fragrantica.ts       | Import command                   |
| scripts/lib/read-fragrantica-csv.ts | CSV loading                      |
| scripts/lib/fragrantica-parse.ts    | Parsing and normalization        |
| scripts/lib/dictionaries.ts         | Dictionary loading               |
| data/fragrantica/                   | Source CSV files                 |
| data/dictionaries/                  | Spanish translations and aliases |

## Rules

The importer normalizes brands, names, genders, ratings, accords, note pyramids, and perfumers before creating reference rows. CSV content and dictionary values are external data formats and must not be renamed casually. Fragrantica images and descriptions stay internal reference material; customer descriptions are entered in Spanish by the administrator.
