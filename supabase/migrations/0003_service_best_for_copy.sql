-- Cheap copy fix, no schema change: append a "Best for: [models]" line to
-- each service's description, matching a pattern seen on a competitor site
-- (tier -> specific shoe models catches "how much to clean my Jordan 1s"
-- style searches). Idempotent by name so this is safe to re-run.

update services set description =
  'Full clean, deodorize, and wipe-down. Looking fresh. Best for: Air Force 1s, Jordans, Dunks, Vans and everyday sneakers.'
  where name = 'Sneaker Clean';

update services set description =
  'Deep clean, conditioning and restoration for your Clarks. Best for: Clarks Originals, Desert Boots and Wallabees.'
  where name = 'Clarks Clean';

update services set description =
  'Sole yellowing, oxidation removal and sole whitening. Best for: yellowed soles, oxidized AF1s and vintage Jordans.'
  where name = 'Sole Refresh';
