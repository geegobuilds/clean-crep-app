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
