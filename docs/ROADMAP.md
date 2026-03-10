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

### Phase 5: Ops Extension — in progress
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
- [ ] Growing sources: blog URL support (extract from blog posts alongside YouTube)

### Phase 6: Digest Preview in Dashboard — planned
- [ ] Backend endpoint to generate the next daily digest payload without sending email
- [ ] Dashboard UI to render a faithful preview of the digest email
- [ ] Reuse as much email template rendering logic as possible
- [ ] Show when the preview was generated and for which date

### Phase 7: State Tracker App — planned
- [ ] Separate mobile app for recording and resuming work/learning states
- [ ] Optimized for fragmented mobile access while looking after kids

### Phase 8: Learning Agent Specialization — deferred
- [ ] Economy learning agent
- [ ] Deep AI learning agent
- [ ] Growing-things learning agent
- [ ] Agent-specific cadence and progression memory
