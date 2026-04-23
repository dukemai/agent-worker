# Phase 8.2: Birthday & Birthday Party Planning

## Goal
Integrate a birthday and event planning system into the existing dashboard. This involves creating a new database schema for birthdays, implementing API routes for management, and developing a new "Birthdays" tab within the task dashboard. 

Key goals include differentiating between recurring birthdays and one-time party events, providing countdowns, and enabling the conversion of birthday events into actionable planning tasks.

## Key Features
- **Birthday Library**: A dedicated tab in the Tasks Dashboard to manage family, friends, and kids' social circles.
- **Proximity Countdowns**: Real-time calculation of days remaining until the next birthday, including year-end wrap-around logic.
- **Actionable Events**: "Create Party Task" button to promote a birthday event into a standard planning task in the "This Week" bucket.
- **Categorization**:
  - `Family/Friends`: For recurring annual birthdays.
  - `Kids' Friends`: Often one-time parties, allowing for future auto-archiving.
- **Email Integration**: Upcoming birthdays (< 20 days away) are automatically included in the Daily Digest email with specific countdowns and category labels.
- **Briefing Narrative**: Intelligent text-based reminders in the morning briefing for birthdays within the next 7 days.

## Technology Stack
- **Database**: Supabase (PostgreSQL) with Row Level Security.
- **API**: Next.js App Router (Route Handlers).
- **Frontend**: React (shadcn/ui), TanStack Query.
- **Emails**: React Email (shared package).
- **Shared Logic**: Centralized countdown and fetching logic in `packages/shared`.
