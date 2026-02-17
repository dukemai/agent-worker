# Project Specification: Dad-Ops Agent

## 1. Executive Summary
The **Dad-Ops Agent** is a personal executive assistant designed to offload the "mental load" of a busy senior developer and father in Stockholm. It consolidates fragmented information (school emails, BRF updates, seasonal gardening, and shopping deals) into a structured 3-column dashboard and a daily email digest. The system focuses on **Zero-Friction Capture** and **Context-Aware Reasoning**.

## 2. Core Technical Stack
*   **Infrastructure:** Cloudflare Workers (Serverless / ESM).
*   **Intelligence:** **Google Gemini 2.5 Flash** (via `@google/generative-ai`).
    *   Chosen for its massive context window, JSON mode, and high speed/low cost.
*   **Input Layer:** 
    *   **Passive:** Gmail Filters $\rightarrow$ Cloudflare Email Routing.
    *   **Active:** Gmail Label (`→ Agent`) $\rightarrow$ Google Apps Script $\rightarrow$ Forward to agent@domain (same as passive path).
*   **Persistence:** Supabase (PostgreSQL + JSONB).
*   **UI/Frontend:** Next.js + Shadcn/UI (Dashboard hosted on Vercel).
*   **Communications:** Resend or Postmark (SMTP/API for outbound daily digest).
*   **Environment:** Stockholm-specific (Timezone, Weather, Swedish context).

## 3. Intelligence Layer (Google AI Integration)
The system utilizes Gemini 2.5 Flash for three distinct reasoning tasks:
1.  **MIME Extraction:** Using `postal-mime` to clean email bodies, then passing text to Gemini to identify actionable tasks, dates, and shopping deals.
2.  **Temporal Resolution:** Gemini resolves relative dates (e.g., "next Tuesday") by injecting `new Date()` into the system prompt.
3.  **Bite-Sized Learning:** A daily "Curriculum" agent that generates 60-second technical lessons based on a learning profile and previous day's feedback.
4.  **JSON Enforcement:** All AI outputs use Gemini's `response_mime_type: "application/json"` to ensure direct compatibility with Supabase inserts.

## 4. System Workflows

### A. Ingestion Pipeline
1.  **Source:** An email is forwarded or a label is applied.
2.  **Processing (Cloudflare Worker):** 
    *   The worker receives the SMTP stream or POST request.
    *   `postal-mime` cleans the payload.
    *   **The Brain:** Gemini 2.5 Flash analyzes the text against "Dad-specific" rules (e.g., "If this is about school clothes, it's a high-priority task").
3.  **Storage:** Tasks are inserted into the appropriate Supabase table (`today_tasks`, `this_week_tasks`, or `later_tasks`) based on Gemini's classification.

### B. Daily Digest & Dashboard
1.  **Schedule:** Cloudflare Cron Trigger (Scheduled Event) runs daily at 06:30 Stockholm time.
2.  **Aggregation:** The worker fetches pending tasks, Stockholm weather (OpenWeather), and the next learning nugget.
3.  **Weather use:** Display today's weather; if rain forecast → remind "Tell kids to bring rain coat."
4.  **Narrative Generation:** Gemini generates a "Daily Briefing" that prioritizes items (weather-aware for rain reminder).
5.  **Delivery:** A single structured email is sent via Resend. The Dashboard displays the same data in a Trello-style 3-column view.

### C. Gardening / Watering
- **Watering:** Based on plants at home (from `family_context.plants_at_home`), not weather API.
- **Later:** UI to specify which plants you have at home.

## 5. Data Schema (Supabase)
*   **`tasks`**: `id, created_at, title, original_body, due_date, status, metadata(jsonb), source`.
*   **`today_tasks`**, **`this_week_tasks`**, **`later_tasks`**: Each stores only `task_id` (FK to `tasks.id`). Bucket tables indicate which column a task belongs to.
*   **`learning_profile`**: `id, topic, current_level, daily_goal, target_duration_minutes, status, curriculum_outline(jsonb), created_at, updated_at`. One row per learning topic.
*   **`learning_log`**: `id, profile_id` (FK), `content` (AI-generated lesson), `feedback` (1–5 or "Too easy" | "Too hard" | "Irrelevant"), `created_at`.
*   **`family_context`**: `id, key, value, last_updated`. Keys: `shoe_size`, `shopping_list`, `seasonal_interests`, `plants_at_home` (plants you have for watering reminders).

## 6. Implementation Roadmap

### Phase 1: Ingestion MVP (Completed/Current)
*   [] Cloudflare Worker setup with `email` and `fetch` handlers.
*   [] Email Routing from Gmail to Cloudflare verified.
*   [] MIME parsing via `postal-mime` integrated.
*   [] Local debugging via `wrangler tail` and `curl` verified.

### Phase 2: Intelligence & Persistence (Next)
*   [ ] Integrate `@google/generative-ai` SDK.
*   [ ] Design the **Master System Prompt** for task extraction.
*   [ ] Connect Supabase client to Worker and implement `POST /ingest` logic.

### Phase 3: Dashboard UI
*   [ ] Next.js app with 3-column layout.
*   [ ] "Done" button functionality (optimistic UI updates to Supabase).
*   [ ] "Source" view to see original email bodies for context verification.
*   [ ] Context UI: edit plants at home, shopping list, seasonal interests.

### Phase 4: The Daily Loop
*   [ ] Implement Cloudflare `scheduled` handler.
*   [ ] Integrate OpenWeather API (for digest: display weather, rain → remind rain coat).
*   [ ] Gardening/watering cron (based on `plants_at_home`, no weather dependency).
*   [ ] Build the "Learning Loop" logic with feedback webhooks.
*   [ ] Setup Resend for outbound email delivery.

---

**End of Specification.** 
*Note to planning AI: Focus on maintaining a stateless architecture in the Cloudflare Worker and ensuring Gemini’s prompt remains robust against messy school-related Swedish/English mixed-language emails.*