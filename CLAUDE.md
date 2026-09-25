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

- Git author: always commit as `geegobuilds <318375370+geegobuilds@users.noreply.github.com>`. Set `git config user.name` and `user.email` to that before the first commit. Never commit as Claude, so the work counts on the GitHub contribution graph.
