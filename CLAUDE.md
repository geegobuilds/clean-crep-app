# Working with Claude on this repo

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

## Session Handoff

Chats are disposable. The repo is the memory. Every workstream keeps a handoff file so any new chat can take over with zero context loss.

- File: `HANDOFF.md` at the repo root. If the repo runs more than one workstream at once, use `handoff/<topic>.md`, one file per workstream.
- Start of every session: if a handoff file exists for this work, read it before anything else.
- Update it after every completed unit of work (a report, a feature, a fix), not just at the end, and commit and push it with that work. The container is ephemeral: anything not pushed is lost.
- Overwrite it to reflect the current state; don't append a diary.
- Hard cap: 150 lines. Move long reference material (detailed workflows, spec tables, history) into `docs/` and link it from the handoff file.
- If an existing handoff file breaks these rules (over 150 lines, missing a section, or no Resume prompt at the end), fix it on the next update.
- Required sections:
  - **Last updated:** date and branch
  - **Goal:** what this workstream delivers
  - **State:** done / in progress / queued, and what each queued item is waiting on
  - **How it works:** workflow steps, files, scripts, commands, templates, artifact links
  - **Decisions and gotchas:** dated, one line each
  - **Next:** the single next action
  - **Resume prompt:** always the last section. A copy-paste prompt for a new chat, naming the repo, the branch and this file

## Run Efficiency

- One chat = one workstream. A new topic gets a new chat.
- Switch to a new chat at a clean boundary (a unit just finished and pushed) when the chat is long: weeks old, dozens of completed units, or history getting heavy. Long chats re-read their whole history every turn, so they get slower and more expensive. When a switch is due, say so in ISSUES.
- To switch: update the handoff file, commit, push, and report. Geego then opens a new chat with the Resume prompt and archives the old chat once the new one confirms the state.
- Done it twice? Script it. Repeatable work lives in scripts and templates in the repo, not in chat memory.
- Ask for all inputs for the next batch up front (e.g. every datasheet for the next N jobs) and process them in one run instead of one at a time.
- Keep context lean: read only the parts of large files you need, and use subagents for bulk reading or checking so the main chat holds conclusions, not file dumps.
- Commit and push after every completed unit.
- Verify output before reporting COMPLETE. A wrong report costs more than a slow one.
