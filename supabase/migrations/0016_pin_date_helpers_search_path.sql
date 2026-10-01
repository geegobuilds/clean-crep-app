-- Security advisor (function_search_path_mutable): pin search_path on the date
-- helpers added in 0013, like every other function here. No behaviour change.
alter function public.jm_today() set search_path = public;
alter function public.next_pickup_date(text) set search_path = public;
