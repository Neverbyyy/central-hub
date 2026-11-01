-- Набор выгрузки ds — тексты для дизайн-системы и экранов в этом же монорепо: Storybook, пейволлы и лендинги
-- Cars 2 и Farm (этапы 2 и 3). `pnpm l10n pull` кладёт утверждённые тексты в packages/locales/src/<язык>.json,
-- продукты берут их при сборке и во время работы сервис не спрашивают.
-- Старых ключей у монорепо нет (legacy_prefix пустой), только новые: общие, компоненты, игры и лендинг Cars 2, бренды.

insert into public.registry (kind, code, title) values
  ('project', 'ds', 'Дизайн-система и экраны (монорепо)');

insert into public.export_sets (name, project, format, legacy_prefix, include_prefixes, languages, path_template, final_newline) values
  ('ds', 'ds', 'nested', null, '{common.,ds.,app.cars2.,app.farm.,web.lp_cars2.,brand.}', '{en,ru,de,es,it,pt,fr,sv,nl}', 'packages/locales/src/{lang}.json', true);
