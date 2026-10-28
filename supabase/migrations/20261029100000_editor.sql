-- Редактор: фильтры по статусам и «устаревшим», утверждение переводов,
-- защита от одновременной правки одной ячейки.

-- PostgREST не умеет сравнивать две колонки (based_on < source_rev), поэтому «устаревшие»
-- и набор статусов строки считаются вычисляемыми колонками и фильтруются как массивы.
create function public.l10n_stale_langs(p_translations jsonb, p_based_on jsonb, p_source_rev integer)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(b.key order by b.key), '{}')
    from jsonb_each_text(p_based_on) b
   where b.value::integer < p_source_rev
     and coalesce(p_translations ->> b.key, '') <> ''
$$;

create function public.l10n_status_values(p_status jsonb)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(distinct s.value order by s.value), '{}') from jsonb_each_text(p_status) s
$$;

alter table public.localizations
  add column stale_langs text[] generated always as (public.l10n_stale_langs(translations, based_on, source_rev)) stored,
  add column status_values text[] generated always as (public.l10n_status_values(status)) stored;

create index localizations_stale_langs on public.localizations using gin (stale_langs);
create index localizations_status_values on public.localizations using gin (status_values);

-- Утверждение переводов человеком. Утверждённый перевод считается сверенным с текущим
-- английским, поэтому «устарел» снимается. Языки без текста пропускаются.
create function public.approve_translations(p_key text, p_langs text[], p_actor text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_row public.localizations;
  v_source_lang text;
  v_status jsonb;
  v_based jsonb;
  v_lang text;
  v_count integer := 0;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', 'ui', true);
  select code into v_source_lang from public.languages where is_source;

  select * into v_row from public.localizations where technical_key = p_key for update;
  if not found then
    raise exception 'Ключ «%» не найден', p_key using errcode = 'P0002';
  end if;

  v_status := v_row.status;
  v_based := v_row.based_on;
  foreach v_lang in array coalesce(p_langs, '{}') loop
    continue when coalesce(v_row.translations ->> v_lang, '') = '';
    if coalesce(v_status ->> v_lang, '') <> 'approved'
       or (v_lang <> v_source_lang and coalesce((v_based ->> v_lang)::integer, 0) < v_row.source_rev) then
      v_status := jsonb_set(v_status, array[v_lang], '"approved"'::jsonb);
      if v_lang <> v_source_lang then
        v_based := jsonb_set(v_based, array[v_lang], to_jsonb(v_row.source_rev));
      end if;
      v_count := v_count + 1;
    end if;
  end loop;

  if v_count > 0 then
    update public.localizations set status = v_status, based_on = v_based where technical_key = p_key;
  end if;
  return v_count;
end;
$$;

-- set_translation с проверкой «никто не изменил ячейку, пока я её правил»: p_expected — значение,
-- от которого человек начинал правку. Если сейчас там другое — ошибка HB409 с текущим значением
-- и автором, интерфейс предлагает выбрать. Без p_expected (MCP, импорт, тесты) — как раньше.
drop function public.set_translation(text, text, text, text, text);

create function public.set_translation(
  p_key text,
  p_lang text,
  p_value text,
  p_actor text,
  p_source text,
  p_expected text default null
)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_value text := nullif(p_value, '');
  v_source_lang text;
  v_row public.localizations;
  v_actor text;
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

  -- Если там уже ровно наш текст, конфликта нет
  if (v_row.translations ->> p_lang) is not distinct from v_value then
    return v_row.updated_at;
  end if;

  if p_expected is not null and coalesce(v_row.translations ->> p_lang, '') <> p_expected then
    select h.actor into v_actor
      from public.history h
     where h.technical_key = p_key and h.lang = p_lang and h.field = 'translation'
     order by h.id desc
     limit 1;
    raise exception 'Перевод уже изменили'
      using errcode = 'HB409',
            detail = jsonb_build_object(
              'current', v_row.translations ->> p_lang,
              'actor', coalesce(v_actor, v_row.updated_by),
              'updated_at', v_row.updated_at
            )::text;
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
