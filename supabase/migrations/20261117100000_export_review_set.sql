-- Порядок выгрузки в код: сначала дизайн-система, потом рабочие проекты.
-- review_set — набор, где тексты проверяют до выгрузки в этот: в дизайн-системе их видно в Storybook, PR мержат после
-- проверки. InApp и Pages Hub выгружаются, только когда общие с дизайн-системой ключи уже в её основной ветке
-- (окно «Выгрузка в код» и маршрут /api/export/<набор>/push). Ключи, которых в дизайн-системе нет (legacy.*), не держат.
alter table public.export_sets
  add column review_set text references public.export_sets (name),
  -- Набор не может проверять сам себя
  add constraint export_sets_review_set_not_self check (review_set is distinct from name);

update public.export_sets set review_set = 'ds' where name in ('inapp', 'pages_hub');

-- Срочная правка — «Выгрузить без проверки»: выгрузка проходит, а журнал помнит, кто обошёл проверку
alter table public.export_runs
  add column forced boolean not null default false;
