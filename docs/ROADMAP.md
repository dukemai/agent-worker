# Dad-Ops Agent — Roadmap

### Phase 1: Ingestion MVP — done
- [x] Cloudflare Worker setup with `email` and `fetch` handlers
- [x] Email Routing from Gmail to Cloudflare verified
- [x] MIME parsing via `postal-mime` integrated
- [x] Local debugging via `wrangler tail` and `curl` verified

### Phase 2: Intelligence & Persistence — done
- [x] Integrate `@google/generative-ai` SDK
- [x] Design the master system prompt for task extraction
- [x] Connect Supabase client to Worker and implement ingestion logic

### Phase 3: Dashboard UI — done
- [x] Next.js app with 3-column layout
- [x] Mark done / move between buckets
- [x] Source view to see original email bodies
- [x] Context UI: edit family context key-value pairs

### Phase 4: Daily Loop — done
- [x] Implement Cloudflare `scheduled` handler (cron at 05:30 UTC)
- [x] Integrate OpenWeather API for Stockholm weather + rain alerts
- [x] Build learning loop (profile-based lesson generation via Gemini)
- [x] Setup Resend for outbound daily digest email
- [x] Promotion deal extraction and digest section

### Phase 5: Ops Extension — done
- [x] Mobile-first dashboard (tabs on mobile, grid on desktop)
- [x] Responsive header with hamburger menu
- [x] Category-based "surprise me" learning profiles
- [x] Renewal reminder flow (passport/subscriptions/memberships)
- [x] Renewal escalation (critical/urgent/soon groups)
- [x] Renewal recurrence (auto-create next on completion)
- [x] Daily digest section for upcoming renewals
- [x] Refactor all dashboards to TanStack Query
- [x] Growing season tracker (Stockholm seasonal windows)
- [x] Growing suggestions with one-tap task conversion
- [x] Daily digest section for garden this week
- [ ] Growing sources: blog URL support (extract from blog posts alongside YouTube) — deferred to a later phase

### Phase 6: Digest Preview in Dashboard — planned
- [ ] Backend endpoint to generate the next daily digest payload without sending email
- [ ] Dashboard UI to render a faithful preview of the digest email
- [ ] Reuse as much email template rendering logic as possible
- [ ] Show when the preview was generated and for which date

### Phase 7: Stability & Polish — done
- [x] Growing weekly: `week_number` model, migrations, API, digest, types
- [x] Weekly generation: rebuild, dedupe, dismissed + converted handling, supporting knowledge linkage
- [x] Dashboard/tasks/growing UX polish (dialogs, filters, sorts, layout)
- [x] Docs and contracts aligned (`growing-api`, weekly generation notes)

### Phase 8: Meal & Shopping Plan from Promotions — done
- [x] Promo grocery watchlist UI + `family_context.promo_watchlist` + machine export for Playwright
- [x] Manual import of matched weekly offers → `promo_match_*` + dashboard (latest run)
- [x] Meal plan API + UI (10 Swedish meal suggestions from a chosen import); follow-ons in `docs/phases/08-meal-shopping-from-promotions/TASKS.md`

### Phase 9: Recipe generator & library (Sweden-oriented) — in progress
- [x] Ingredients + food-type UI → Gemini structured recipes → add chosen rows to `saved_recipes` with **tested** toggle (`docs/phases/09-recipe-sources-sweden/SCOPE.md`, [`recipe-generator.md`](requirements/recipe-generator.md))
- [ ] Optional later: curated corpus / RAG grounding (same phase folder)

### Phase 10: Trip Ops — MVP implemented
- [x] Trip detail page for known logistics, participants, options, decisions, tasks, itinerary, and notes
- [x] Already visited / avoid list so repeat trips prioritize new places
- [x] Ranked option shortlist and loose itinerary blocks for a real four-day Gotland trip
- [x] Trip tasks integrated into normal task buckets (dedicated daily digest section remains follow-up; see `docs/phases/10-trip-ops/TASKS.md`)

### Phase 11: YouTube Knowledge Extraction — planned
- [ ] Reliable transcript/caption pipeline into `growing_knowledge`
- [ ] Enrichment (tags, titles) and Sources tab status/re-extract UX
- [ ] Guardrails for failures, length, and dedupe

### Phase 12: Learning Agent Specialization — planned
- [ ] Dedicated agents per topic (economy, deep AI, growing) with independent cadence
- [ ] Agent-specific progression memory and feedback / difficulty loops
- [ ] Prompt tuning and eval fixtures per agent as needed (see `docs/phases/12-learning-agents/SCOPE.md`)

### Phase 13: Summer Activities — paused after MVP
- [ ] Markdown activity source intake
- [ ] AI extraction into reusable local activities and seasonal activity instances
- [ ] `/activities` weekly dashboard and daily digest section

### Phase 13.1: Digest Countdown Polish — implemented
- [x] Show human-scale red-day countdowns in the digest, using days only when the date is close and weeks/months for longer lead times
- [x] Keep a later follow-up for a configurable public-days knowledge base beyond default red days

### Phase 14: Trip Ops Post-Use Improvements — planned after Summer Activities
- [ ] Fast access to current/relevant trips and a read-first trip run sheet
- [ ] Itinerary-aware digest behavior before and during trips
- [ ] Event-risk alerts, opening-hours validation, archive/knowledge capture, and weekend trip discovery

### Phase 15: Public Days Knowledge Base — planned
- [ ] Replace the hard-coded red-day countdown list with configurable public/planning days
- [ ] Default to Swedish red days and support family dates like kids back to school, sportlov, school breaks, bridge days, and local closure days
- [ ] Reuse the Phase 13.1 human-scale countdown behavior in the digest

### Deferred (not scheduled as numbered phases)
- **State tracker mobile app** (was `08-state-tracker`): resumable work/learning states—parked until reprioritized
