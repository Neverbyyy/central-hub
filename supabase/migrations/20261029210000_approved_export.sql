-- В проекты выгружается только утверждённое. У каждого языка хранится последний утверждённый текст:
-- правка ставит «черновик», а в выгрузке остаётся прежний текст, пока правку не утвердят.
-- Плюс массовое утверждение и журнал выгрузок в GitHub.

alter table public.localizations
  -- { "ru": "СКАЧАТЬ" } — текст на момент последнего утверждения языка
  add column approved jsonb not null default '{}'::jsonb,
  add constraint localizations_approved_object check (jsonb_typeof(approved) = 'object');

-- Тот же триггер плюс approved. Колонка считается только из статусов, поэтому напрямую её не поменять:
-- утверждение, импорт (импортированное утверждено) и create_key(..., 'approved') покрыты одним правилом.
create or replace function public.localizations_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_error text;
  v_conflict text;
  v_bad_lang text;
  v_approved jsonb;
begin
  if tg_op = 'UPDATE' and new.technical_key <> old.technical_key then
    raise exception 'Ключи пока нельзя переименовывать' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    v_error := public.l10n_key_error(new.technical_key);
    if v_error is not null then
      raise exception '%', v_error using errcode = 'P0001';
    end if;

    -- Один ключ не может быть началом другого: в JSON `continue` не может быть
    -- и строкой, и папкой. Блокировка не даёт двум параллельным вставкам разминуться.
    if new.technical_key not like 'legacy.%' then
      perform pg_advisory_xact_lock(hashtext('localizations.key_prefix'));
      select l.technical_key into v_conflict
        from public.localizations l
       where l.technical_key not like 'legacy.%'
         and (starts_with(l.technical_key, new.technical_key || '.')
              or starts_with(new.technical_key, l.technical_key || '.'))
       limit 1;
      if v_conflict is not null then
        raise exception 'Ключ «%» конфликтует с «%»: один ключ не может быть началом другого',
          new.technical_key, v_conflict using errcode = 'P0001';
      end if;
    end if;

    new.created_by := coalesce(new.created_by, public.hub_actor());
  end if;

  select k into v_bad_lang
    from jsonb_object_keys(new.translations) k
   where not exists (select 1 from public.languages l where l.code = k)
   limit 1;
  if v_bad_lang is not null then
    raise exception 'Неизвестный язык «%»', v_bad_lang using errcode = 'P0001';
  end if;

  -- null допустим только у legacy: так он лежит в исходных файлах, и выгрузка должна совпасть
  if exists (
    select 1 from jsonb_each(new.translations) e
     where jsonb_typeof(e.value) <> 'string'
       and not (new.technical_key like 'legacy.%' and jsonb_typeof(e.value) = 'null')
  ) then
    raise exception 'Перевод должен быть строкой' using errcode = 'P0001';
  end if;

  -- Последний утверждённый текст: у утверждённых языков — текущий, у остальных — прежний
  v_approved := case when tg_op = 'UPDATE' then old.approved else '{}'::jsonb end;
  if public.hub_source() = 'import' then
    -- Язык пропал из файла проекта — пропадает и из выгрузки
    v_approved := v_approved - array(select k from jsonb_object_keys(v_approved) k where not new.translations ? k);
  end if;
  new.approved := v_approved || coalesce(
    (select jsonb_object_agg(s.key, new.translations -> s.key)
       from jsonb_each_text(new.status) s
      where s.value = 'approved' and new.translations ? s.key),
    '{}'::jsonb
  );

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  new.updated_by := public.hub_actor();
  return new;
end;
$$;

-- Заполнение существующих строк. Триггеры выключены, чтобы не тронуть updated_at/updated_by и историю.
alter table public.localizations disable trigger user;

-- Утверждённые сейчас — текущий текст
update public.localizations l
   set approved = coalesce(
     (select jsonb_object_agg(s.key, l.translations -> s.key)
        from jsonb_each_text(l.status) s
       where s.value = 'approved' and l.translations ? s.key),
     '{}'::jsonb
   );

-- Отредактированные без утверждения — текст на момент последнего утверждения по истории:
-- событие «статус → утверждён» (текст — последняя правка перевода до него) или импорт перевода
with approvals as (
  select distinct on (h.technical_key, h.lang) h.technical_key, h.lang, h.id, h.field, h.new_value
    from public.history h
    join public.localizations l on l.technical_key = h.technical_key
   where h.lang is not null
     and coalesce(l.status ->> h.lang, '') <> 'approved'
     and ((h.field = 'status' and h.new_value = 'approved')
          or (h.field = 'translation' and h.source = 'import'))
   order by h.technical_key, h.lang, h.id desc
),
texts as (
  select a.technical_key,
         a.lang,
         case when a.field = 'translation' then a.new_value
              else (select t.new_value
                      from public.history t
                     where t.technical_key = a.technical_key
                       and t.lang = a.lang
                       and t.field = 'translation'
                       and t.id < a.id
                     order by t.id desc
                     limit 1)
         end as value
    from approvals a
)
update public.localizations l
   set approved = l.approved || x.patch
  from (select technical_key, jsonb_object_agg(lang, value) as patch from texts group by technical_key) x
 where l.technical_key = x.technical_key;

alter table public.localizations enable trigger user;

-- Утвердить ключи целиком: все языки, где есть текст
create function public.approve_keys(p_keys text[], p_actor text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_langs text[];
  v_key text;
  v_count integer := 0;
begin
  select array_agg(code order by code) into v_langs from public.languages;
  foreach v_key in array coalesce(p_keys, '{}') loop
    v_count := v_count + public.approve_translations(v_key, v_langs, p_actor);
  end loop;
  return v_count;
end;
$$;

-- Выгрузки в репозитории проектов: что ушло, в какой PR и кто нажал
create table public.export_runs (
  id bigint generated always as identity primary key,
  set_name text not null references public.export_sets (name) on delete cascade,
  -- created / updated — PR открыт или обновлён; closed — выгружать стало нечего, наш PR закрыт
  outcome text not null check (outcome in ('created', 'updated', 'closed')),
  revision text not null,
  pr_number integer,
  pr_url text,
  -- [{ "path": "src/locales/ru.json", "added": 0, "changed": 1, "removed": 0 }]
  changes jsonb not null default '[]'::jsonb,
  actor text not null,
  created_at timestamptz not null default now()
);

create index export_runs_set on public.export_runs (set_name, created_at desc);

-- Только серверу: права у anon закрыты default privileges из миграции lockdown
alter table public.export_runs enable row level security;
