-- 0023 — Clean Crep Club tiers (Geego, 2026-10-07): "Clean Crep Club" is the
-- umbrella; the tiers are Fresh, Sneakerhead and Household. Prices anchor on
-- the J$2,000 Sneaker Clean (1 credit; Clarks 2): the bigger the plan, the
-- bigger the saving, so customers trade up. Still not offered: switch a plan
-- on in Staff › Club once the `membership` flag launches.
--   Fresh        J$5,000  · 3 credits (J$6,000 of cleans, save 17%) · 1 rolls over
--   Sneakerhead  J$8,000  · 5 credits (J$10,000, save 20%)          · 2 roll over
--   Household    J$12,500 · 8 credits shared by 4 (J$16,000, save 22%) · 2 roll over

update membership_plans set slug = 'fresh', name = 'Fresh', price_cents = 500000, credits_per_month = 3, rollover_max = 1, max_household = 1,
  perks = '["3 cleans a month (Clarks use 2)", "1 unused clean rolls over", "10% off kits"]'
 where slug = 'club';

update membership_plans set name = 'Sneakerhead', price_cents = 800000, credits_per_month = 5, rollover_max = 2, max_household = 1,
  perks = '["5 cleans a month (Clarks use 2)", "Deep Clean upgrade half price", "Priority turnaround", "2 unused cleans roll over", "10% off kits"]'
 where slug = 'sneakerhead';

update membership_plans set name = 'Household', price_cents = 1250000, credits_per_month = 8, rollover_max = 2, max_household = 4,
  perks = '["8 cleans a month shared by up to 4 people", "Everyone gets their own Vault", "2 unused cleans roll over", "10% off kits"]'
 where slug = 'household';
