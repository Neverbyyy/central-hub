-- Схема сервиса локализации (этап 1).
-- Развивает таблицу прототипа localizations: языки и справочник в базе, статусы
-- переводов, история изменений. Правила ключей проверяет сама база, чтобы их
-- не обошли ни интерфейс, ни CLI, ни нейросеть. Те же правила — в packages/l10n-core.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Языки и справочник
-- ---------------------------------------------------------------------------

create table public.languages (
  code text primary key check (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$'),
  name text not null,
  dir text not null default 'ltr' check (dir in ('ltr', 'rtl')),
  is_source boolean not null default false,
  in_editor boolean not null default true,
  position integer not null default 0
);

-- Исходный язык ровно один: после его правки остальные переводы устаревают
create unique index languages_one_source on public.languages (is_source) where is_source;

create table public.registry (
  kind text not null check (kind in ('game', 'site', 'brand', 'test', 'project')),
  code text not null check (code ~ '^[a-z0-9_]+$'),
  title text not null,
  created_at timestamptz not null default now(),
  primary key (kind, code)
);

-- ---------------------------------------------------------------------------
-- Строки
-- ---------------------------------------------------------------------------

-- Текст для поиска по индексу: ключ и переводы на всех языках
create function public.l10n_search_text(p_key text, p_translations jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(p_key || ' ' || coalesce((select string_agg(e.value, ' ') from jsonb_each_text(p_translations) e), ''))
$$;

create table public.localizations (
  technical_key text primary key,
  -- { "en": "Continue", "ru": "Продолжить" }
  translations jsonb not null default '{}'::jsonb,
  -- { "ru": "draft" | "ai" | "approved" }
  status jsonb not null default '{}'::jsonb,
  -- { "ru": 3 } — версия исходного текста, с которой сделан перевод
  based_on jsonb not null default '{}'::jsonb,
  -- Растёт при каждой правке исходного языка; перевод с based_on < source_rev устарел
  source_rev integer not null default 1,
  description text,
  max_length integer check (max_length > 0),
  tags text[] not null default '{}',
  figma_url text,
  -- Строки не удаляются, а помечаются устаревшими
  deprecated_at timestamptz,
  -- Точный путь и порядок строки в исходном файле legacy-проекта (импорт, день 2)
  legacy_path jsonb,
  legacy_position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  search_text text generated always as (public.l10n_search_text(technical_key, translations)) stored,
  constraint localizations_translations_object check (jsonb_typeof(translations) = 'object'),
  constraint localizations_status_object check (jsonb_typeof(status) = 'object'),
  constraint localizations_based_on_object check (jsonb_typeof(based_on) = 'object'),
  -- У каждого нового ключа есть описание: где показывается и какие ограничения
  constraint localizations_description_required check (
    technical_key like 'legacy.%' or nullif(btrim(description), '') is not null
  )
);

create index localizations_search_trgm on public.localizations using gin (search_text extensions.gin_trgm_ops);
create index localizations_tags on public.localizations using gin (tags);
create index localizations_updated_at on public.localizations (updated_at desc);

-- ---------------------------------------------------------------------------
-- История: кто, что и когда поменял
-- ---------------------------------------------------------------------------

create table public.history (
  id bigint generated always as identity primary key,
  technical_key text not null,
  lang text,
  field text not null,
  old_value text,
  new_value text,
  actor text not null,
  -- ui | cli | mcp | figma | import | sql
  source text not null,
  created_at timestamptz not null default now()
);

create index history_key on public.history (technical_key, created_at desc);

-- ---------------------------------------------------------------------------
-- Правила имени ключа (зеркало packages/l10n-core/src/keys.ts)
-- ---------------------------------------------------------------------------

create function public.l10n_key_error(p_key text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_segments text[];
  v_root text;
  v_code text;
  v_kind text;
  v_bad text;
  v_inner text;
begin
  if p_key is null or p_key = '' then
    return 'Ключ пустой';
  end if;
  if length(p_key) > 200 then
    return 'Ключ длиннее 200 символов';
  end if;

  v_segments := string_to_array(p_key, '.');
  if '' = any (v_segments) then
    return 'В ключе пустая часть: две точки подряд или точка в начале или в конце';
  end if;

  v_root := v_segments[1];
  if v_root <> all (array['common', 'app', 'web', 'brand', 'ds', 'test', 'legacy']) then
    return 'Ключ начинается с common., app., web., brand., ds., test. или legacy.';
  end if;
  if cardinality(v_segments) < 3 then
    return 'Слишком короткий ключ: нужно минимум три части, например common.button.continue';
  end if;

  v_code := v_segments[2];
  v_kind := case v_root
    when 'app' then 'game'
    when 'web' then 'site'
    when 'brand' then 'brand'
    when 'test' then 'test'
    when 'legacy' then 'project'
  end;

  if v_kind is not null and not exists (
    select 1 from public.registry r where r.kind = v_kind and r.code = v_code
  ) then
    return format('Неизвестный код %s «%s» — его нет в справочнике',
      case v_kind when 'game' then 'игры' when 'site' then 'сайта' when 'brand' then 'бренда'
                  when 'test' then 'теста' else 'проекта' end,
      v_code);
  end if;

  -- Старые ключи InApp и Pages Hub импортируются как есть, под прежними именами
  if v_root = 'legacy' then
    return null;
  end if;

  select s into v_bad
    from unnest(v_segments) with ordinality as t(s, i)
   where s !~ '^[a-z0-9_]+$'
   order by i
   limit 1;
  if v_bad is not null then
    return format('Часть «%s»: только строчная латиница, цифры и _', v_bad);
  end if;

  if v_root = 'test' then
    v_inner := array_to_string(v_segments[3:], '.');
    if v_inner like 'test.%' or v_inner like 'legacy.%' then
      return 'После test.<тест>. идёт обычный ключ: common., app., web., brand. или ds.';
    end if;
    return public.l10n_key_error(v_inner);
  end if;

  -- Код из справочника (второй сегмент) не проверяем — его уже проверил справочник
  select s into v_bad
    from unnest(v_segments) with ordinality as t(s, i)
   where i >= case when v_kind is null then 2 else 3 end
     and exists (
       select 1 from public.languages l
        where s = l.code or right(s, length(l.code) + 1) = '_' || l.code
     )
   order by i
   limit 1;
  if v_bad is not null then
    return format('В ключе не должно быть языка: «%s»', v_bad);
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Триггеры localizations
-- ---------------------------------------------------------------------------

-- Автор и источник правки приходят из функций записи через set_config('hub.*', …, true)
create function public.hub_actor()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('hub.actor', true), ''), 'system')
$$;

create function public.hub_source()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('hub.source', true), ''), 'sql')
$$;

create function public.localizations_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_error text;
  v_conflict text;
  v_bad_lang text;
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

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  new.updated_by := public.hub_actor();
  return new;
end;
$$;

create trigger localizations_before_write
  before insert or update on public.localizations
  for each row execute function public.localizations_before_write();

create function public.localizations_write_history()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor text := public.hub_actor();
  v_source text := public.hub_source();
begin
  if tg_op = 'INSERT' then
    insert into public.history (technical_key, field, new_value, actor, source)
    values (new.technical_key, 'created', new.description, v_actor, v_source);

    insert into public.history (technical_key, lang, field, new_value, actor, source)
    select new.technical_key, e.key, 'translation', e.value, v_actor, v_source
      from jsonb_each_text(new.translations) e;
    return null;
  end if;

  -- Тексты по языкам
  insert into public.history (technical_key, lang, field, old_value, new_value, actor, source)
  select new.technical_key, l.lang, 'translation', old.translations ->> l.lang, new.translations ->> l.lang, v_actor, v_source
    from (select jsonb_object_keys(old.translations) as lang
          union
          select jsonb_object_keys(new.translations)) l
   where (old.translations -> l.lang) is distinct from (new.translations -> l.lang);

  -- Статус без смены текста — например, перевод утвердили
  insert into public.history (technical_key, lang, field, old_value, new_value, actor, source)
  select new.technical_key, l.lang, 'status', old.status ->> l.lang, new.status ->> l.lang, v_actor, v_source
    from (select jsonb_object_keys(old.status) as lang
          union
          select jsonb_object_keys(new.status)) l
   where (old.status -> l.lang) is distinct from (new.status -> l.lang)
     and (old.translations -> l.lang) is not distinct from (new.translations -> l.lang);

  insert into public.history (technical_key, field, old_value, new_value, actor, source)
  select new.technical_key, f.field, f.old_value, f.new_value, v_actor, v_source
    from (values
      ('description', old.description, new.description),
      ('max_length', old.max_length::text, new.max_length::text),
      ('tags', array_to_string(old.tags, ', '), array_to_string(new.tags, ', ')),
      ('figma_url', old.figma_url, new.figma_url),
      ('deprecated',
        case when old.deprecated_at is not null then 'устарел' end,
        case when new.deprecated_at is not null then 'устарел' end)
    ) as f(field, old_value, new_value)
   where f.old_value is distinct from f.new_value;

  return null;
end;
$$;

create trigger localizations_write_history
  after insert or update on public.localizations
  for each row execute function public.localizations_write_history();

-- Удалять нельзя ни строки, ни историю. Сообщение — первый аргумент триггера.
create function public.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', tg_argv[0] using errcode = 'P0001';
end;
$$;

create trigger localizations_no_delete
  before delete on public.localizations
  for each row execute function public.forbid_change('Строки нельзя удалять — пометьте их устаревшими');

create trigger localizations_no_truncate
  before truncate on public.localizations
  for each statement execute function public.forbid_change('Строки нельзя удалять — пометьте их устаревшими');

create trigger history_append_only
  before update or delete on public.history
  for each row execute function public.forbid_change('История только дополняется');

create trigger history_no_truncate
  before truncate on public.history
  for each statement execute function public.forbid_change('История только дополняется');

-- ---------------------------------------------------------------------------
-- Запись — только через эти функции и только с сервера (права — в миграции lockdown)
-- ---------------------------------------------------------------------------

-- Меняет один язык, не трогая остальные: параллельные правки разных языков не затирают друг друга.
-- Пустое значение убирает перевод. Возвращает новое updated_at.
create function public.set_translation(p_key text, p_lang text, p_value text, p_actor text, p_source text)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_value text := nullif(p_value, '');
  v_source_lang text;
  v_row public.localizations;
  v_updated_at timestamptz;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', p_source, true);

  if not exists (select 1 from public.languages where code = p_lang) then
    raise exception 'Неизвестный язык «%»', p_lang using errcode = 'P0001';
  end if;
  select code into v_source_lang from public.languages where is_source;

  select * into v_row from public.localizations where technical_key = p_key for update;
  if not found then
    raise exception 'Ключ «%» не найден', p_key using errcode = 'P0002';
  end if;

  if (v_row.translations ->> p_lang) is not distinct from v_value then
    return v_row.updated_at;
  end if;

  update public.localizations l set
    translations = case when v_value is null then l.translations - p_lang
                        else jsonb_set(l.translations, array[p_lang], to_jsonb(v_value)) end,
    status = case when v_value is null then l.status - p_lang
                  else jsonb_set(l.status, array[p_lang], '"draft"'::jsonb) end,
    based_on = case when v_value is null or p_lang = v_source_lang then l.based_on - p_lang
                    else jsonb_set(l.based_on, array[p_lang], to_jsonb(l.source_rev)) end,
    source_rev = case when p_lang = v_source_lang then l.source_rev + 1 else l.source_rev end
  where l.technical_key = p_key
  returning l.updated_at into v_updated_at;

  return v_updated_at;
end;
$$;

create function public.deprecate_keys(p_keys text[], p_actor text, p_source text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', p_source, true);

  update public.localizations
     set deprecated_at = now()
   where technical_key = any (p_keys) and deprecated_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.restore_keys(p_keys text[], p_actor text, p_source text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', p_source, true);

  update public.localizations
     set deprecated_at = null
   where technical_key = any (p_keys) and deprecated_at is not null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Чтение
-- ---------------------------------------------------------------------------

create function public.get_unique_tags()
returns table (tag text)
language sql
stable
set search_path = ''
as $$
  select distinct t
    from public.localizations l, unnest(l.tags) t
   where l.deprecated_at is null
   order by 1
$$;

-- Live-обновления грида у всех, кто его открыл
alter publication supabase_realtime add table public.localizations;
