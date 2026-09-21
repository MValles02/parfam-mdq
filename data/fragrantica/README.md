# Fragrantica reference data

This directory contains two versioned public Kaggle datasets scraped from Fragrantica. They are input for internal reference data, never public store copy.

| File             |   Rows | Delimiter | Main data                                                                              |
| ---------------- | -----: | --------- | -------------------------------------------------------------------------------------- |
| fra_cleaned.csv  | 24,063 | ;         | Top/middle/base notes, year, country, perfumers, five ordered accords, decimal commas. |
| fra_perfumes.csv | 69,948 | ,         | Full fragrance set, complete accord list, English description, rating.                 |

## Join key

PID is the final numeric part of the original URL, for example 70706 in /Afnan/9am-70706.html. fra_cleaned is a subset of fra_perfumes, so the importer joins records by PID.

## Import normalization

- Brand and product names are derived from the URL because CSV display fields can be malformed.
- Gender source values are normalized to the application enum.
- fra_cleaned ratings use decimal commas.
- fra_perfumes accords are stored as Python-style lists.
- The parser extracts note pyramids from Fragrantica's fixed English description pattern when available.

## Scope

Spanish translations, accord colors, and note grouping live in data/dictionaries/. Fragrantica descriptions and images are internal reference material only. Customer product descriptions are authored in Spanish; ratings only help rank panel search results and are not public.
