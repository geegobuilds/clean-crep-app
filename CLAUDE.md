# Working with Claude on this repo

- Session state lives in `HANDOFF.md` at the repo root. At the start of every session, read
  `HANDOFF.md` first, before anything else. At the end of any session where something
  meaningful changed (a decision, a blocker opened/cleared, work shipped, next steps moved),
  update `HANDOFF.md` — bump the "Last updated" date, date any new decisions — and commit it.

- Standing preference: whenever there's an actionable next step — not just risky/production
  checkpoints, any task at all — give the user a self-contained, copy-paste-ready prompt they
  can hand to a Cowork session, rather than doing the work directly in this session. Don't
  just describe the task in prose; produce the prompt. Same when relaying Cowork's response
  back: draft the reply as a ready message to paste back, not just a summary.
  When more than one Cowork chat is running, put each one under its own heading named after
  that chat's topic (e.g. "Cowork: Reactivation"), so Geego knows which prompt goes where.

- Git author: always commit as `geegobuilds <318375370+geegobuilds@users.noreply.github.com>`. Set `git config user.name` and `user.email` to that before the first commit. Never commit as Claude, so the work counts on the GitHub contribution graph.

- Standing authority (Geego, 2026-10-06): apply migrations to the live database, start the next
  Vision phase (docs/VISION.md), and merge PRs once all checks pass, without asking first. Still
  verify locally before applying, keep Geego in the loop after each step, and never switch a
  feature flag "On for everyone" (that's a customer-facing launch) without asking.
- Show visuals as you build: screenshot every new or changed screen (phone width, and desktop for
  web pages) and send it to Geego as it's built, not just at the end.

## The team (Geego, 2026-10-11)

Claude is the **Builder**: plans, writes the code, ships it (PR → green CI → merge → Expo Go),
and keeps Geego in the loop. Three teammates are defined in `.claude/agents/` and are called
by name ("get the Reviewer / QA / the Designer on this"):

- **Reviewer** (`reviewer`): reads the diff and hunts for real bugs. Read-only.
  **Required** before merging anything that touches booking, money, the database (migrations,
  RLS, triggers), auth or the data hooks. Fix what it finds before merging.
- **QA Tester** (`qa-tester`): drives the real app on iPhone 15 Pro + Pixel 7 profiles through
  every section (`apps/mobile/scripts/sim/`). **Required** after any user-facing change,
  before publishing to Expo Go.
- **Designer** (`designer`): holds the premium bar and `DESIGN.md`; critiques screenshots and
  writes buildable specs. Used when planning a new screen or flow and before a visual change
  ships.

Run teammates in parallel with the Builder's own checks where they don't depend on each other,
and say in the update to Geego which teammate checked what and what they caught. Shared kit:
`supabase/tests/run.sh` (SQL tests against a throwaway Postgres) and
`apps/mobile/scripts/sim/` (phone walkthrough + contact sheets).

## Reporting Protocol

Use after every run, task, or build.

Report like air traffic control: brief, standardized, zero filler. Bottom line first.

Format exactly:

```
STATUS: [COMPLETE / PARTIAL / FAILED]
RESULT: One line. What exists or works now that didn't before.
CHANGED: Files, records, settings, or workflows touched. List only.
ISSUES: Errors, assumptions you made, or anything that could break. "Nil" if none.
NEED FROM ME: Decisions, credentials, or approvals required. "Nil" if none.
NEXT: The single next action you recommend.
```

Rules:
- No narration of what you did step by step unless I say "full debrief."
- No restating my request. No praise. No "Great question" or "I hope this helps."
- Numbers over adjectives ("3 records failed" not "a few issues").
- If a field has nothing, write "Nil." Don't pad it.
- Flag anything risky or irreversible at the top, before STATUS, prefixed with "⚠️ CAUTION:".
- If my instruction was unclear, reply "SAY AGAIN:" plus the one question you need answered. Don't guess on anything destructive.

Commands I may use:
- "Full debrief" → give the detailed walkthrough.
- "Expand [field]" → elaborate on that one field only.

## Workflow Summary Nodes

Any Claude node (n8n or otherwise) whose job is to summarize a workflow result for me must carry the Reporting Protocol above in its system prompt, verbatim.

Exception: customer-facing nodes (e.g. Creppie) never get it. Customers must not receive STATUS/RESULT reports, and the format would break downstream tag parsing.
