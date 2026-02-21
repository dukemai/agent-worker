# Phase 4: Daily Loop — Retrospective

## What went well

- Cloudflare cron triggers are reliable and easy to configure in `wrangler.toml`.
- Resend API is minimal — single POST to send styled HTML email.
- Weather-aware narrative adds genuine value (rain coat reminders are actually useful).

## What could be better

- Email HTML template is inline strings — no templating engine. Works for now but harder to maintain as sections grow.
- Promotion filtering relies on exact retailer name matching; could miss new sources.

## Lessons for future phases

- When adding new digest sections (renewals, growing), keep the pattern: separate extract function → append to HTML builder.
- Consider extracting email template to a separate file if it grows beyond 200 lines.
