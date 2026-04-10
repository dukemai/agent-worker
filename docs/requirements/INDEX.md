# Requirements Index

Doc routing for feature-specific specs. Use [GLOSSARY.md](../GLOSSARY.md) for domain terms and schema overview.

| Doc | Contains |
|-----|----------|
| [ingestion.md](ingestion.md) | Email pipeline, task extraction, bucketing |
| [daily-digest.md](daily-digest.md) | Morning email, sections, cron |
| [dashboard.md](dashboard.md) | App layout, sections, interactions |
| [renewals.md](renewals.md) | Dual-date, escalation, recurrence |
| [growing.md](growing.md) | Sources, windows, suggestions, profile |
| [growing-api.md](growing-api.md) | API contract for `/api/growing/*` routes |
| [promotions.md](promotions.md) | Deal extraction, matching |
| [promotions-find-strategy.md](promotions-find-strategy.md) | Playwright store strategies, ICA tile extraction, watchlist matching rules |
| [promo-watchlist.md](promo-watchlist.md) | Promo grocery watchlist UI (`/promo-grocery-watchlist`), `promo_watchlist`, scrape export |
| [promo-meal-plan.md](promo-meal-plan.md) | Deferred **7-day** AI meal sketch (Gemini, POST meal-plan); see meal-suggestions for near-term |
| [promo-meal-suggestions.md](promo-meal-suggestions.md) | **10 meal ideas** from promotions — target spec + UI mockup; API later |
| [ica-maxi-picker-catalog-source.md](ica-maxi-picker-catalog-source.md) | ICA Maxi Handla **category** tree from `ica-maxi-initial-state-raw.json`; regenerate via `scripts/build-ica-maxi-category-menu.mjs` |
| [ica-maxi-promo-picker-catalog.json](ica-maxi-promo-picker-catalog.json) | Generated picker catalog (`pnpm promo:picker-catalog`): `categories` + `items` with `watchlistText` for promo watchlist |
| [recipe-generator.md](recipe-generator.md) | Ingredients + cuisine → AI recipe suggestions; saved library with **tested** flag ([Phase 9](../phases/09-recipe-sources-sweden/SCOPE.md)) |
| [learning.md](learning.md) | Profiles, lessons, feedback (deferred items) |
