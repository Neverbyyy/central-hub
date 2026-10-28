-- Создание ключей из интерфейса и нейросетью (MCP), черновые переводы ИИ, поиск похожих строк.
-- Правила имени, справочник, конфликт префиксов и обязательное описание по-прежнему держат
-- триггеры localizations — эти функции их не обходят. Вызывать может только сервер.

-- Новый ключ. p_status — 'draft' из интерфейса, 'ai' от нейросети.
-- Ключи legacy.* приходят только импортом файлов проекта.
create function public.create_key(
  p_key text,
  p_description text,
  p_translations jsonb,
  p_tags text[],
  p_max_length integer,
  p_status text,
  p_actor text,
  p_source text
)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_source_lang text;
  v_translations jsonb;
  v_created_at timestamptz;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', p_source, true);

  if p_status not in ('draft', 'ai', 'approved') then
    raise exception 'Неизвестный статус «%»', p_status using errcode = 'P0001';
  end if;
  if p_key like 'legacy.%' then
    raise exception 'Ключи legacy.* приходят только импортом файлов проекта' using errcode = 'P0001';
  end if;
  select code into v_source_lang from public.languages where is_source;

  -- Пустые значения — это отсутствие перевода
  select coalesce(jsonb_object_agg(e.key, e.value), '{}') into v_translations
    from jsonb_each(coalesce(p_translations, '{}')) e
   where e.value <> '""'::jsonb;

  insert into public.localizations (technical_key, description, translations, status, based_on, tags, max_length)
  values (
    p_key,
    nullif(btrim(p_description), ''),
    v_translations,
    coalesce((select jsonb_object_agg(k, p_status) from jsonb_object_keys(v_translations) k), '{}'),
    coalesce((select jsonb_object_agg(k, 1) from jsonb_object_keys(v_translations) k where k <> v_source_lang), '{}'),
    coalesce(p_tags, '{}'),
    p_max_length
  )
  returning created_at into v_created_at;

  return v_created_at;
end;
$$;

-- Черновой перевод от нейросети. Перезаписать текст, который написал человек, нельзя:
-- менять можно только пустой перевод или перевод со статусом 'ai'.
create function public.set_ai_translation(p_key text, p_lang text, p_value text, p_actor text)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_row public.localizations;
  v_source_lang text;
  v_updated_at timestamptz;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', 'mcp', true);

  if coalesce(p_value, '') = '' then
    raise exception 'Пустой перевод: нейросеть переводы не удаляет' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.languages where code = p_lang) then
    raise exception 'Неизвестный язык «%»', p_lang using errcode = 'P0001';
  end if;
  select code into v_source_lang from public.languages where is_source;

  select * into v_row from public.localizations where technical_key = p_key for update;
  if not found then
    raise exception 'Ключ «%» не найден', p_key using errcode = 'P0002';
  end if;
  if v_row.deprecated_at is not null then
    raise exception 'Ключ «%» устарел', p_key using errcode = 'P0001';
  end if;
  if coalesce(v_row.translations ->> p_lang, '') <> '' and coalesce(v_row.status ->> p_lang, '') <> 'ai' then
    raise exception 'Перевод «%» на «%» написал человек — нейросеть его не перезаписывает', p_key, p_lang
      using errcode = 'P0001';
  end if;
  if (v_row.translations ->> p_lang) is not distinct from p_value then
    return v_row.updated_at;
  end if;

  update public.localizations l set
    translations = jsonb_set(l.translations, array[p_lang], to_jsonb(p_value)),
    status = jsonb_set(l.status, array[p_lang], '"ai"'::jsonb),
    based_on = case when p_lang = v_source_lang then l.based_on - p_lang
                    else jsonb_set(l.based_on, array[p_lang], to_jsonb(l.source_rev)) end,
    source_rev = case when p_lang = v_source_lang then l.source_rev + 1 else l.source_rev end
  where l.technical_key = p_key
  returning l.updated_at into v_updated_at;

  return v_updated_at;
end;
$$;

-- Похожие строки: по английскому тексту и по имени ключа (у legacy — без префикса проекта).
-- Перед созданием ключа их обязательно смотрят — чтобы не плодить дубли вроде 18 «Continue» в InApp.
create function public.find_similar(p_text text, p_key text, p_limit integer default 8)
returns table (technical_key text, en text, score real, matched text)
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select l.technical_key,
           l.translations ->> 'en' as en,
           case when coalesce(p_text, '') = '' or l.translations ->> 'en' is null then 0
                else extensions.similarity(lower(l.translations ->> 'en'), lower(p_text)) end as text_score,
           case when coalesce(p_key, '') = '' then 0
                else extensions.similarity(regexp_replace(l.technical_key, '^legacy\.[a-z0-9_]+\.', ''), p_key) end as key_score
      from public.localizations l
     where l.deprecated_at is null
       and l.technical_key not like 'common.selftest.%'
  )
  select c.technical_key, c.en, greatest(c.text_score, c.key_score)::real, case when c.text_score >= c.key_score then 'text' else 'key' end
    from candidates c
   where greatest(c.text_score, c.key_score) >= 0.3
   order by 3 desc, 1
   limit least(greatest(coalesce(p_limit, 8), 1), 50)
$$;

-- Служебные ключи автотестов никогда не попадают в файлы проектов
alter table public.export_sets add column exclude_prefixes text[] not null default '{common.selftest.}';

-- Новые ключи, которые выгружаются в проекты вместе со старыми
update public.export_sets set include_prefixes = '{common.,app.,brand.,ds.,test.}' where name = 'inapp';
update public.export_sets set include_prefixes = '{common.,web.,brand.,ds.,test.}' where name = 'pages_hub';
