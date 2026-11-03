-- Набор выгрузки ds: все лендинги одним началом web.lp_ вместо отдельного префикса на каждый сайт.
-- Коды сайтов-лендингов в справочнике — lp_<игра> (lp_cars2, lp_farm…): новый лендинг попадает в packages/locales
-- без правки набора. Сравнение — «ключ начинается с»: выгрузка выбирает like с экранированным _ и проверяет
-- keyInExportSet (@amaya/l10n-core), поэтому web.lp_ не захватит ни web.amayakids., ни web.lpx.
update public.export_sets
set include_prefixes = array_append(array_remove(include_prefixes, 'web.lp_cars2.'), 'web.lp_')
where name = 'ds' and not ('web.lp_' = any(include_prefixes));
