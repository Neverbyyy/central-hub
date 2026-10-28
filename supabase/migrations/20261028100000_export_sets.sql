-- Наборы выгрузки и импорт старых файлов локалей (этап 1, день 2).
-- Набор описывает, какие ключи и языки кладутся в какие файлы проекта.
-- Импорт заносит файлы проекта как есть под legacy.<проект>. и сохраняет сами файлы
-- шаблонами: выгрузка правит в них только изменившиеся строки (packages/l10n-core/src/locale-file.ts).

create table public.export_sets (
  name text primary key check (name ~ '^[a-z0-9_]+$'),
  project_kind text not null default 'project' check (project_kind = 'project'),
  project text not null,
  -- nested — разделы вложенными объектами (InApp); flat — точки внутри имени ключа (Pages Hub)
  format text not null check (format in ('nested', 'flat')),
  -- Старые ключи проекта; при выгрузке префикс снимается — путь берётся из legacy_path
  legacy_prefix text check (legacy_prefix ~ '^legacy\.[a-z0-9_]+\.$'),
  -- Новые ключи, которые тоже кладутся в файлы проекта, например {app.cars2., common.}
  include_prefixes text[] not null default '{}',
  languages text[] not null,
  -- Путь файла в проекте, {lang} — код языка
  path_template text not null check (path_template like '%{lang}%'),
  -- Только для файлов без шаблона: у Pages Hub перевода строки в конце нет
  final_newline boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (project_kind, project) references public.registry (kind, code)
);

create table public.export_templates (
  set_name text not null references public.export_sets (name) on delete cascade,
  lang text not null references public.languages (code),
  content text not null,
  -- Откуда взят файл, например коммит проекта
  source_ref text,
  imported_at timestamptz not null default now(),
  primary key (set_name, lang)
);

insert into public.export_sets (name, project, format, legacy_prefix, languages, path_template, final_newline) values
  ('inapp', 'inapp', 'nested', 'legacy.inapp.', '{en,ru,de,es,it,pt,fr,sv,nl}', 'src/locales/{lang}.json', true),
  ('pages_hub', 'pages_hub', 'flat', 'legacy.pages_hub.', '{en,ru,de,es,it,pt,fr,sv,nl}', 'i18n/locales/{lang}.json', false);

-- Наборы и шаблоны — только серверу: права закрыты default privileges из миграции lockdown
alter table public.export_sets enable row level security;
alter table public.export_templates enable row level security;

-- Импорт файлов проекта как есть. p_rows: [{technical_key, legacy_path, translations}] по языкам набора,
-- p_templates: {lang: содержимое файла}. Повторный импорт тех же файлов ничего не меняет.
-- Строки уже в продакшене, поэтому импортированные переводы — approved.
-- Ключи проекта, которых больше нет в файлах, помечаются устаревшими (не удаляются).
create function public.import_legacy(
  p_set text,
  p_rows jsonb,
  p_templates jsonb,
  p_source_ref text,
  p_actor text,
  p_source text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_set public.export_sets;
  v_source_lang text;
  v_bad text;
  v_row record;
  v_changed_langs text[];
  v_lang text;
  v_rev integer;
  v_status jsonb;
  v_based jsonb;
  v_total integer;
  v_added integer;
  v_changed integer := 0;
  v_restored integer := 0;
  v_deprecated integer;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', p_source, true);

  select * into v_set from public.export_sets where name = p_set;
  if not found then
    raise exception 'Нет набора выгрузки «%»', p_set using errcode = 'P0002';
  end if;
  if v_set.legacy_prefix is null then
    raise exception 'У набора «%» нет префикса legacy — импортировать некуда', p_set using errcode = 'P0001';
  end if;
  select code into v_source_lang from public.languages where is_source;

  create temp table import_rows (
    technical_key text primary key,
    legacy_path jsonb not null,
    translations jsonb not null
  ) on commit drop;

  insert into import_rows
  select r.technical_key, r.legacy_path, r.translations
    from jsonb_to_recordset(p_rows) as r(technical_key text, legacy_path jsonb, translations jsonb);
  get diagnostics v_total = row_count;

  select technical_key into v_bad from import_rows where not starts_with(technical_key, v_set.legacy_prefix) limit 1;
  if v_bad is not null then
    raise exception 'Ключ «%» не начинается с %', v_bad, v_set.legacy_prefix using errcode = 'P0001';
  end if;

  select k into v_bad
    from import_rows, jsonb_object_keys(translations) k
   where k <> all (v_set.languages)
   limit 1;
  if v_bad is null then
    select k into v_bad from jsonb_object_keys(p_templates) k where k <> all (v_set.languages) limit 1;
  end if;
  if v_bad is not null then
    raise exception 'Язык «%» не входит в набор «%»', v_bad, p_set using errcode = 'P0001';
  end if;

  -- Языки вне набора у существующих строк не трогаем
  update import_rows i
     set translations = (l.translations - v_set.languages) || i.translations
    from public.localizations l
   where l.technical_key = i.technical_key;

  -- Новые строки
  insert into public.localizations (technical_key, translations, status, based_on, legacy_path)
  select i.technical_key,
         i.translations,
         coalesce((select jsonb_object_agg(k, 'approved'::text) from jsonb_object_keys(i.translations) k), '{}'),
         coalesce((select jsonb_object_agg(k, 1) from jsonb_object_keys(i.translations) k where k <> v_source_lang), '{}'),
         i.legacy_path
    from import_rows i
   where not exists (select 1 from public.localizations l where l.technical_key = i.technical_key);
  get diagnostics v_added = row_count;

  -- Изменившиеся, переехавшие и вернувшиеся строки
  for v_row in
    select i.technical_key, i.translations as new_tr, i.legacy_path as new_path,
           l.translations as old_tr, l.legacy_path as old_path, l.status, l.based_on, l.source_rev, l.deprecated_at
      from import_rows i
      join public.localizations l on l.technical_key = i.technical_key
     where l.translations is distinct from i.translations
        or l.legacy_path is distinct from i.legacy_path
        or l.deprecated_at is not null
  loop
    select coalesce(array_agg(k), '{}') into v_changed_langs
      from (select jsonb_object_keys(v_row.old_tr) k union select jsonb_object_keys(v_row.new_tr)) s
     where (v_row.old_tr -> k) is distinct from (v_row.new_tr -> k);

    -- Правка английского делает неизменившиеся переводы устаревшими
    v_rev := v_row.source_rev + case when v_source_lang = any (v_changed_langs) then 1 else 0 end;
    v_status := v_row.status;
    v_based := v_row.based_on;
    foreach v_lang in array v_changed_langs loop
      if v_row.new_tr ? v_lang then
        v_status := jsonb_set(v_status, array[v_lang], '"approved"');
        if v_lang <> v_source_lang then
          v_based := jsonb_set(v_based, array[v_lang], to_jsonb(v_rev));
        end if;
      else
        v_status := v_status - v_lang;
        v_based := v_based - v_lang;
      end if;
    end loop;

    update public.localizations
       set translations = v_row.new_tr,
           status = v_status,
           based_on = v_based,
           source_rev = v_rev,
           legacy_path = v_row.new_path,
           deprecated_at = null
     where technical_key = v_row.technical_key;

    if cardinality(v_changed_langs) > 0 or v_row.old_path is distinct from v_row.new_path then
      v_changed := v_changed + 1;
    end if;
    if v_row.deprecated_at is not null then
      v_restored := v_restored + 1;
    end if;
  end loop;

  -- Строки проекта, которых больше нет в файлах
  update public.localizations
     set deprecated_at = now()
   where starts_with(technical_key, v_set.legacy_prefix)
     and deprecated_at is null
     and not exists (select 1 from import_rows i where i.technical_key = localizations.technical_key);
  get diagnostics v_deprecated = row_count;

  insert into public.export_templates (set_name, lang, content, source_ref, imported_at)
  select p_set, t.key, t.value, p_source_ref, now()
    from jsonb_each_text(p_templates) t
  on conflict (set_name, lang) do update
     set content = excluded.content, source_ref = excluded.source_ref, imported_at = excluded.imported_at;

  return jsonb_build_object(
    'total', v_total,
    'added', v_added,
    'changed', v_changed,
    'restored', v_restored,
    'unchanged', v_total - v_added - v_changed,
    'deprecated', v_deprecated
  );
end;
$$;
