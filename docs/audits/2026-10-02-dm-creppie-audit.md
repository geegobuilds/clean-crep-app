# Instagram DM + Creppie audit (chats Aug 15 – Oct 2, 2026)

Full action plan with tick boxes: [`2026-10-02-dm-creppie-audit.pdf`](2026-10-02-dm-creppie-audit.pdf).
Source: Cowork read all 59 ManyChat threads plus the Instagram inbox (read only), and
those chats were checked against the live database. Chats after Oct 2 aren't included.

## Where we stood

- **Open pipeline:** J$82,500 quoted (about J$101,500 with estimates for chats that never got a quote).
- **Buckets:** 13 need a reply now · 14 warm but stalled · 8 waiting on the customer · 6 kit waitlist.
- **Dashboard gap:** only CC-0052 (Crissy) was logged. Titiman (3 Clarks, J$10,500) and
  carlosateam (about 7 pairs), both picked up Oct 2, were not logged.
- **Biggest leads:** Carline (10 pairs, J$20,000, asked for a bulk discount) and Meka (5 pairs, J$10,000).
- **Kit waitlist:** rolexqp, Mari, Kem, Matthew (Suede Revive); Dasher (Spanish Town, kit type not chosen);
  Hemp Organizzer and KIRK (Sole Refresh cream).

## Creppie findings

| Problem | Status |
|---|---|
| "Can't open" photos/videos; misquoted a photo it claimed to see | Fixed Oct 2 (n8n `Normalise Payload`) |
| Pitched kits while restocking | Fixed Oct 2 (`KITS_RESTOCKING`) |
| Asked for name/contact twice | Fixed Oct 2 (name asked early) |
| Zone prices differed between chats | Fixed Sep 30 (Supabase is the one price list) |
| **Holds back the shop address until it has a name** | **Open:** cost Chevion, 1mel_maddem, THICKAZ |
| **Re-greets after Geego replies by hand in ManyChat** | **Open:** manual replies never reach Creppie's history |
| Says "no discounts" while discounts are given in practice | **Needs a decision** (e.g. 10% off 5+ pairs) |
| "Team will follow up" handoffs go unanswered; WhatsApp line not responding | **Process issue** |
| Repeated and blank messages | Mostly before Sep 30; re-check |

## Decisions pending (Geego)

`fix address` · `bulk rate 10%` / `no discounts` · `investigate re-greet` · `add booking link` / `not yet`
