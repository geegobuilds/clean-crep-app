-- Security hardening from Supabase's database linter (live project, 2026-09-26).
-- No behaviour change.
--
-- 1. Pin search_path on the functions from 0001/0004 (lint 0011). A function
--    without a fixed search_path resolves table names through the caller's
--    path; for SECURITY DEFINER functions (handle_order_status_change,
--    is_staff) that is a privilege-escalation vector. They only touch
--    `public` objects (+ pg_catalog built-ins, always searched first; auth.*
--    calls are schema-qualified), so pinning to `public` is safe.
alter function generate_order_number() set search_path = public;
alter function set_updated_at() set search_path = public;
alter function handle_order_status_change() set search_path = public;
alter function is_staff() set search_path = public;
alter function resolve_service_id(text) set search_path = public;

-- 2. handle_order_status_change() is a trigger function but was also exposed
--    at /rest/v1/rpc/ (lint 0028/0029). Triggers don't need callers to hold
--    EXECUTE, so revoke it from the API roles.
--    is_staff() deliberately stays executable: RLS policies call it as the
--    requesting role, and it only answers "is the caller staff?".
revoke execute on function handle_order_status_change() from public, anon, authenticated;
