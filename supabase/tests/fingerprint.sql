-- Schema fingerprint of the public schema: one row per function, table and policy, with a
-- hash of its definition (function bodies ignore comments and whitespace: some live
-- copies were applied with comments stripped). Run it on the live project and on a database built from
-- supabase/migrations (supabase/tests/fingerprint.sh); any row that differs is drift.
select kind, name, hash from (
  select 'function' as kind,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name,
         md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))) as hash
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  union all
  select 'table', c.relname,
         md5(string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' order by a.attname))
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname = 'public' and c.relkind = 'r'
   group by c.relname
  union all
  select 'policy', tablename || '.' || policyname,
         md5(coalesce(qual, '') || '|' || coalesce(with_check, '') || '|' || cmd || '|' || array_to_string(roles, ','))
    from pg_policies where schemaname = 'public'
) f
order by kind, name;
