-- Milestone 9c: seed achievement rows. Idempotent via `on conflict (slug)`.
-- Slugs must stay in sync with lib/domain/achievements.ts.
-- `icon` is legacy: the UI renders SVG glyphs keyed by slug
-- (components/ui/BadgeGlyph); no surface reads this column anymore.

insert into public.achievements (slug, title, description, icon, criteria) values
  ('first_workout',  'First Workout',   'Complete your first workout.',              '🎉', '{"type":"workouts_finished","gte":1}'::jsonb),
  ('ten_workouts',   'Ten Workouts',    'Finish 10 workouts.',                       '🔟', '{"type":"workouts_finished","gte":10}'::jsonb),
  ('fifty_workouts', 'Fifty Workouts',  'Finish 50 workouts.',                       '🏆', '{"type":"workouts_finished","gte":50}'::jsonb),
  ('streak_week',    'Seven-Day Streak','Train 7 days in a row.',                    '🔥', '{"type":"streak_days","gte":7}'::jsonb),
  ('first_pr',       'First PR',        'Set any personal record.',                  '⭐', '{"type":"pr_count","gte":1}'::jsonb),
  ('ten_prs',        'Ten PRs',         'Set 10 personal records.',                  '💫', '{"type":"pr_count","gte":10}'::jsonb),
  ('full_body_week', 'Full Body Week',  'Hit all 6 muscle groups in one week.',      '💪', '{"type":"muscle_groups_this_week","gte":6}'::jsonb),
  ('volume_10k',     '10,000 kg Club',  'Lift 10,000 kg of total lifetime volume.', '🏋️', '{"type":"lifetime_volume","gte":10000}'::jsonb)
on conflict (slug) do update set
  title       = excluded.title,
  description = excluded.description,
  icon        = excluded.icon,
  criteria    = excluded.criteria;
