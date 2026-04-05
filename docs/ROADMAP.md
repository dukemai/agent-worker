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

### Phase 8: Meal & Shopping Plan from Promotions — planned
- [ ] Structured extraction from promotion emails / deal metadata toward meal + shopping outputs
- [ ] Family-context-aware suggestions with traceability to source promotions
- [ ] Dashboard and/or digest surface for the plan (scope TBD in `docs/phases/08-meal-shopping-from-promotions/SCOPE.md`)

### Phase 9: YouTube Knowledge Extraction — planned
- [ ] Reliable transcript/caption pipeline into `growing_knowledge`
- [ ] Enrichment (tags, titles) and Sources tab status/re-extract UX
- [ ] Guardrails for failures, length, and dedupe

### Phase 10: Learning Agent Specialization — planned
- [ ] Dedicated agents per topic (economy, deep AI, growing) with independent cadence
- [ ] Agent-specific progression memory and feedback / difficulty loops
- [ ] Prompt tuning and eval fixtures per agent as needed (see `docs/phases/10-learning-agents/SCOPE.md`)

### Deferred (not scheduled as numbered phases)
- **State tracker mobile app** (was `08-state-tracker`): resumable work/learning states—parked until reprioritized
