#!/usr/bin/env bash
# Run the SQL tests against a throwaway Postgres 16 (no Docker needed).
#   supabase/tests/run.sh                 # every test
#   supabase/tests/run.sh vault_match     # one test
# Each test gets a fresh database: Supabase stubs (_stubs.sql), then every
# migration in order (pg_cron/pg_net extensions are stubbed), then the test.
# Tests print "PASS: ..." per check and stop at the first "FAIL: ...".
# Needs a local Postgres; set PGPORT/PGHOST if it isn't on the default socket.
#   e.g. pg_ctl -D /var/tmp/pg -o '-p 55432 -k /tmp' start; PGHOST=/tmp PGPORT=55432 supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -U ${PGUSER:-postgres} -q -v ON_ERROR_STOP=1"
tests=("${@:-}")
[ -z "${tests[0]}" ] && tests=($(ls supabase/tests/*.sql | xargs -n1 basename | grep -v '^_' | sed 's/\.sql$//'))
fail=0
for t in "${tests[@]}"; do
  $P -c "drop database if exists cc_test" -c "create database cc_test" >/dev/null 2>&1
  $P -d cc_test -f supabase/tests/_stubs.sql >/dev/null 2>&1
  for m in supabase/migrations/*.sql; do
    grep -viE "create extension( if not exists)? (pg_cron|pg_net)" "$m" | $P -d cc_test -f - >/dev/null 2>&1 || { echo "migration failed: $m"; exit 1; }
  done
  out=$($P -d cc_test -f "supabase/tests/$t.sql" 2>&1) || true
  pass=$(grep -c 'PASS:' <<<"$out" || true)
  if grep -qE 'FAIL:|ERROR:' <<<"$out"; then
    fail=1; echo "✗ $t ($pass passed)"; grep -E 'FAIL:|ERROR:' <<<"$out" | head -3
  else
    echo "✓ $t ($pass checks)"
  fi
done
exit $fail
