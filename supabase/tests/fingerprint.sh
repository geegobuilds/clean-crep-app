#!/usr/bin/env bash
# Live-vs-repo drift check for the Closer.
#   supabase/tests/fingerprint.sh            # repo fingerprint (kind, name, hash), tab-separated
#   supabase/tests/fingerprint.sh --drift    # a SQL query to run on the LIVE project: it returns
#                                            # every function/table/policy that is live-only,
#                                            # repo-only, or differs. No rows = no drift.
# Builds a throwaway database the same way run.sh does (stubs, then every migration) and
# reads supabase/tests/fingerprint.sql. Needs a local Postgres (set PGPORT/PGHOST).
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -U ${PGUSER:-postgres} -q -v ON_ERROR_STOP=1"
$P -c "drop database if exists cc_fingerprint" -c "create database cc_fingerprint" >/dev/null 2>&1
$P -d cc_fingerprint -f supabase/tests/_stubs.sql >/dev/null 2>&1
for m in supabase/migrations/*.sql; do
  grep -viE "create extension( if not exists)? (pg_cron|pg_net)" "$m" | $P -d cc_fingerprint -f - >/dev/null 2>&1 || { echo "migration failed: $m" >&2; exit 1; }
done
rows=$($P -d cc_fingerprint -At -F $'\t' -f supabase/tests/fingerprint.sql)
if [ "${1:-}" != "--drift" ]; then echo "$rows"; exit 0; fi
python3 - "$rows" <<'EOF'
import sys
rows = [l.split('\t') for l in sys.argv[1].splitlines() if l.strip()]
q = lambda s: "'" + s.replace("'", "''") + "'"
vals = ",\n".join("(%s, %s, %s)" % tuple(q(x) for x in r) for r in rows)
fp = open('supabase/tests/fingerprint.sql').read()
fp = fp[fp.index('select kind'):].rstrip().rstrip(';')
print(f"""with live as (
{fp}
), repo(kind, name, hash) as (values
{vals})
select coalesce(l.kind, r.kind) as kind, coalesce(l.name, r.name) as name,
       case when r.name is null then 'live only' when l.name is null then 'repo only' else 'differs' end as drift
  from live l full join repo r on r.kind = l.kind and r.name = l.name
 where l.hash is distinct from r.hash
 order by 1, 2;""")
EOF
