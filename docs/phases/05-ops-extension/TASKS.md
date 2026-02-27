# Phase 5: Ops Extension — Implementation Tasks (Blog Source Addition)

**Total estimate**: ~5h (includes investigation)

## Prerequisites

- [x] Phase 7 review completed
- [x] SCOPE.md read — Adjustments (2026-02-25) applied

## Scope for this task list

Growing Season Tracker — Blog source support:
- Add blog URLs as a source type alongside YouTube
- Fetch blog content (HTML → text extraction) for processing, or allow manual paste
- Reuse existing extraction pipeline (tips → growing_knowledge, growing_windows) for blog text
- UI: support blog URL input in Sources tab; detect source type (YouTube vs blog) and route accordingly

---

## Tasks

### Task 0: Investigate blog content fetching — 45 min

**Goal**: Decide how to fetch and extract article content from blog URLs. Document findings so implementation (Task 3) can proceed with confidence.

**Steps**:
1. Test a few real gardening/blog URLs — do they return HTML? Any paywalls or JS-only rendering?
2. Compare libraries: `cheerio` vs `@mozilla/readability` + `jsdom` — bundle size, API, extraction quality
3. Verify server-side fetch works from Next.js API route (no CORS, but check for blocks)
4. Document chosen approach and any gotchas in this task or in a brief `docs/notes/blog-fetch-investigation.md`

**Findings so far** (starting point for your investigation):

| Approach | Pros | Cons |
|----------|------|------|
| **cheerio** | Lightweight (~50KB), fast, jQuery-like API | Heuristics for "main content" can be brittle; need to implement ourselves |
| **@mozilla/readability** | Purpose-built for articles, good heuristics, battle-tested | Requires `jsdom` (~2MB), heavier; `new Readability(doc).parse()` |
| **Manual paste only** | Zero fetch logic, works for paywalled/JS sites | Extra user steps |
| **Hybrid (fetch + manual fallback)** | Best UX when fetch works | Slightly more logic |

**Extraction strategy (cheerio)**:
- Title: `<title>`, `og:title` meta
- Author: `meta[name="author"]`, `rel="author"` link, `.byline`, `.author` class
- Description: `meta[name="description"]`, `og:description`
- Main content: prefer `<article>` or `<main>`, else largest text block; strip `script`, `nav`, `footer`, `aside`

**Extraction strategy (Readability)**:
- `Readability.parse()` returns `{ title, byline, content }` (HTML); strip tags for plain text
- Handles varied layouts better than naive cheerio heuristics

**Edge cases to test**:
- Paywalled content (fetch fails or returns teaser only)
- JS-rendered SPA (fetch gets shell HTML, no article body)
- Rate limiting / 403 / 429
- Redirects (follow with `redirect: 'follow'`)
- Non-HTML (PDF, etc.) — reject or error
- Very long articles — consider truncation (e.g. 100k chars) before storage

**Where fetch runs**: Server-side in Next.js API route (`/api/growing/sources/[id]/fetch-info` or a dedicated route). Avoids CORS; use a browser-like User-Agent to reduce blocks.

**Done when**: You have a recommended approach (library + strategy), notes on edge cases, and any sample URLs that work/fail for reference.
---

### Task 1: Add URL type detection utility — 15 min

**Goal**: Provide a shared way to detect YouTube vs blog URLs so API and UI can route correctly.

**Steps**:
1. Create `dashboard/src/lib/url-type.ts`
2. Export `isYouTubeUrl(url: string): boolean` — use existing `extractYouTubeVideoId` from `@/lib/youtube`
3. Export `isBlogUrl(url: string): boolean` — returns true for http/https URLs that are NOT YouTube (reject youtu.be, youtube.com, m.youtube.com)
4. Export `getSourceType(url: string): 'youtube' | 'blog' | null` — returns null for invalid URLs

**Files**:
- `dashboard/src/lib/url-type.ts` (new)

**Done when**: `getSourceType('https://example.com/post')` returns `'blog'`, `getSourceType('https://youtube.com/watch?v=xxx')` returns `'youtube'`, invalid URLs return `null`.

---

### Task 2: Update POST /api/growing/sources to accept blog URLs — 30 min

**Goal**: Allow adding blog URLs to growing_sources alongside YouTube.

**Steps**:
1. In `dashboard/src/app/api/growing/sources/route.ts`, import `getSourceType` from `@/lib/url-type`
2. Replace the YouTube-only check: if `getSourceType(url) === null`, return `errorResponse("URL must be a valid YouTube or blog link")`
3. For both YouTube and blog: insert with `url`, `transcript` (optional), `status: 'queued'`
4. Update error message for duplicate: "This source is already in your list" (generic)

**Files**:
- `dashboard/src/app/api/growing/sources/route.ts`

**Done when**: `POST /api/growing/sources` with `{ url: "https://example.com/gardening-tips" }` returns 201 and creates a source; YouTube URLs still work.

---

### Task 3: Add blog content fetcher — 1h

**Goal**: Fetch a blog URL and extract title, author, description, and main article text.

**Prerequisite**: Complete Task 0 (investigation) and use its recommended approach.

**Steps**:
1. Add dependency per Task 0 findings
2. Create `dashboard/src/lib/blog.ts`
3. Implement `fetchBlogContent(url: string): Promise<{ title: string | null; author: string | null; description: string | null; content: string }>` using the approach from Task 0
4. Handle fetch errors and non-HTML responses gracefully

**Files**:
- `dashboard/src/lib/blog.ts` (new)
- `dashboard/package.json` (add chosen dependency)

**Done when**: `fetchBlogContent('https://example.com/post')` returns `{ title, author, description, content }` with extracted text; invalid URLs throw or return error.

---

### Task 4: Extend fetch-info route to support blog URLs — 30 min

**Goal**: "Fetch video info" becomes "Fetch info" — works for both YouTube and blog sources.

**Steps**:
1. In `dashboard/src/app/api/growing/sources/[id]/fetch-info/route.ts`, import `getSourceType` and `fetchBlogContent`
2. After loading source, check `getSourceType(source.url)`
3. If `'youtube'`: keep existing logic (extractYouTubeVideoId, fetchYouTubeVideoInfo)
4. If `'blog'`: call `fetchBlogContent(source.url)`, then update `growing_sources` with `title`, `channel` (author), `description`, and `transcript` (content)
5. If `null`: return `errorResponse("Source URL is not a valid YouTube or blog URL")`

**Files**:
- `dashboard/src/app/api/growing/sources/[id]/fetch-info/route.ts`

**Done when**: POST to fetch-info for a blog source updates the source with title, author, description, and transcript (article content); YouTube sources still work.

---

### Task 5: Update Worker growing-ingest for blog item_key — 30 min

**Goal**: Blog sources need a different `item_key` prefix so they don't collide with YouTube. The Worker must generate `blog_` keys for blog URLs.

**Steps**:
1. In `src/crons/growing-ingest.ts`, add `toItemKeyBlog(url: string, rawKey: string): string` — derive a short slug from the URL path (e.g. last path segment, sanitized) and return `blog_${slug}_${safeKey}`
2. In `processOneSource`, replace `const videoId = extractYouTubeVideoId(source.url) ?? source.id.slice(0, 11)` with logic: if `extractYouTubeVideoId(source.url)` exists, use `toItemKey(videoId, tip.item_key)`; else use `toItemKeyBlog(source.url, tip.item_key)`

**Files**:
- `src/crons/growing-ingest.ts`

**Done when**: Processing a blog source produces `item_key` values like `blog_gardening-tips_seed-tomatoes`; YouTube sources still produce `yt_xxx_tip`.

---

### Task 6: Update extraction prompt for blog context — 15 min

**Goal**: The Gemini prompt says "YouTube videos" — make it work for articles too.

**Steps**:
1. In `src/prompts/growing-knowledge.ts`, change the intro from "YouTube videos" to "videos or articles"
2. Replace `{{videoTitle}}` / `{{channelName}}` usage with generic terms — the prompt already uses these placeholders; ensure they make sense for blogs (title = article title, channel = author/site)
3. Optionally add a line: "For articles, the transcript is the article body."

**Files**:
- `src/prompts/growing-knowledge.ts`

**Done when**: Prompt reads naturally for both video transcripts and article text; extraction still returns valid JSON.

---

### Task 7: Update UI — Sources tab for blog support — 1h

**Goal**: Users can add blog URLs and fetch content; UI reflects both source types.

**Steps**:
1. In `dashboard/src/components/dashboard/growing-sources-tab.tsx`, update the "Get transcript from a video" card:
   - Change title to "Add a source (YouTube or blog)"
   - Update placeholder to "https://youtube.com/watch?v=... or https://example.com/article"
   - Keep transcript textarea for manual paste (works for both)
2. In `dashboard/src/components/dashboard/growing-dashboard.tsx`, ensure `addSource` passes URL to API without YouTube-only validation (API now handles both)
3. For each source card: change "Fetch video info" button label to "Fetch info" (or show "Fetch info" for both, "Fetch video info" only for YouTube — simpler: always "Fetch info")
4. Optionally: show a badge or icon for source type (YouTube vs blog) based on URL — low priority, can skip for v1

**Files**:
- `dashboard/src/components/dashboard/growing-sources-tab.tsx`
- `dashboard/src/components/dashboard/growing-dashboard.tsx`

**Done when**: User can paste a blog URL, click "Add", then "Fetch info" to populate title/author/content; "Extract now" works for blog sources with content in transcript.

---

## Order

Tasks are ordered by dependency. Execute in sequence.

| Task | Depends on |
|------|------------|
| 0. Investigate blog fetching | — |
| 1. URL type detection | — |
| 2. POST sources accept blog | 1 |
| 3. Blog content fetcher | 0 |
| 4. fetch-info for blogs | 1, 3 |
| 5. Worker item_key for blogs | — |
| 6. Extraction prompt | — |
| 7. UI updates | 2, 4 |

Do Task 0 first. Tasks 1, 5, 6 can run in parallel. Task 3 depends on Task 0 findings. Task 7 should be last.
