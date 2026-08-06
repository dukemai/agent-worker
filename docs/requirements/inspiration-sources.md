# Inspiration Sources

## Intent

Inspiration Sources provides a curated starting shelf for discovering books and, later, films. It helps the user decide what kind of title fits a current intention without first building and maintaining a permanent title library.

The implemented book workflow is:

`intention → discovery brief → trusted source search → captured candidates → organized shortlist`

## Initial Book Directory

The first version is a dashboard-only directory at `/inspirations`. It contains a small, curated set of sources with:

- source name and direct URL
- source role: inspiration or factual verification
- audience and the topics for which the source is useful
- health status and last-checked date
- a direct link for browsing the source

The page begins with a book inspiration launcher. The user describes a reading moment in natural language or selects a Swedish quick intention, then adds an editable discovery brief covering audience, mood, genre/themes, format, language, and constraints. Sessions persist and can be resumed from the recent-session picker.

Google search preserves the intention exactly as written. It does not combine English intentions with Swedish keywords or force the query through individual source domains. The curated sources remain separate browsing destinations.

Promising books are captured manually with title, author, source URL/name, and a factual summary copied or paraphrased from the source. The user can then organize two or more candidates with Gemini. Organization ranks only the supplied candidates and stores an interpretive fit reason, caveats for missing facts, and match tags. Re-running organization replaces the session shortlist while preserving candidates.

Initial sources are Huddinge bibliotek, Jönköpings bibliotek, Strängnäs bibliotek, Kulturrådets annual children’s and youth catalogue, Augustpriset, and Libris.

Barnens bibliotek is intentionally excluded from the recommended directory because its main “Alla boktips” listing remained stuck in a loading state when checked on 2026-07-02.

## Persistence

- `book_inspiration_sessions` stores the intention, editable JSON brief, lifecycle, and owner.
- `book_inspiration_candidates` stores source-grounded book facts and provenance.
- `book_inspiration_shortlist_entries` stores LLM interpretation separately from candidate facts.
- All tables use authenticated, owner-scoped RLS.

## Boundaries

- Candidate capture is manual; the application does not fetch or scrape Google results.
- Google is a navigation aid, not a factual source.
- Inspiration and verification remain distinct: recommendation pages suggest candidates; Libris confirms title, author, edition, ISBN, and holdings.
- The organizer must not invent plot, age guidance, availability, awards, or reading level.

Movies, editable source management, URL/bookmarklet extraction, and richer shortlist actions are later increments.
