-- Чтения без лишних запросов (DECISIONS.md, «Скорость»). При ~2,7 тыс. ключей сам SQL быстрый — время уходит на
-- запросы Vercel → Supabase и чтение всех строк ради пары сотен цифр. Новые функции — только для сервера: права у
-- public и anon по умолчанию сняты миграцией lockdown.

-- 1. Разделы для дерева слева, окна «Тексты в Figma» и подсказок «Новый ключ»: подсчёт в базе одним запросом вместо
-- чтения всех ключей страницами по 1000 (server/lib/keys.ts keyTreeNested). Правила прежние: последний сегмент —
-- сама строка, устаревшие не считаются, глубина — не больше p_max_depth
create function public.key_sections(p_max_depth integer default 4)
returns table (path text, keys bigint)
language sql
stable
set search_path = ''
as $$
  select array_to_string(s.parts[1:d.depth], '.'), count(*)
    from (select string_to_array(l.technical_key, '.') as parts
            from public.localizations l
           where l.deprecated_at is null) s
    cross join lateral generate_series(1, least(cardinality(s.parts) - 1, p_max_depth)) as d(depth)
   group by 1
$$;

-- 2. Счётчики «Очереди перевода» по всем языкам перевода одним запросом (было два запроса на язык и ещё один за
-- списком языков). Условия — как у очереди (server/lib/keys.ts queueRequest): ключ действующий, английский не
-- пустой; missing — перевода нет или он пустой, stale — перевод есть, но устарел после правки английского. Раздел —
-- начало ключа, без шаблонов LIKE. Переводы ключа разбираются за один проход (jsonb_each_text): доставать каждый
-- язык из JSON отдельно вдвое медленнее. missing = подходящие ключи − ключи с непустым переводом
create function public.queue_counts(p_prefix text default null)
returns table (lang text, missing bigint, stale bigint)
language sql
stable
set search_path = ''
as $$
  with keys as (
    select l.translations, l.stale_langs
      from public.localizations l
     where l.deprecated_at is null
       and coalesce(l.translations ->> 'en', '') <> ''
       and (coalesce(p_prefix, '') = '' or starts_with(l.technical_key, p_prefix))
  ),
  translated as (
    select e.key as lang, count(*) as present, count(*) filter (where e.key = any(k.stale_langs)) as stale
      from keys k
      cross join lateral jsonb_each_text(k.translations) as e
     where e.value <> ''
     group by e.key
  )
  select g.code, (select count(*) from keys) - coalesce(t.present, 0), coalesce(t.stale, 0)
    from public.languages g
    left join translated t on t.lang = g.code
   where g.code <> 'en'
   order by g.position
$$;

-- 3. История ключа действиями, одной страницей: раньше сервер читал все строки истории ключа (у служебных — тысячи),
-- чтобы показать 10 действий. Действие — строки одной правки: одно время (now() транзакции), автор и источник;
-- id действия — первая строка. Записи о тегах не показываем — история их больше не пишет (20261113100000).
-- Потолок размера страницы ставит маршрут (/api/keys/history)
create function public.key_history(p_key text, p_offset integer default 0, p_limit integer default 10)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with actions as (
    select min(h.id) as id, h.created_at, h.actor, h.source,
           jsonb_agg(jsonb_build_object('lang', h.lang, 'field', h.field, 'old_value', h.old_value, 'new_value', h.new_value)
                     order by h.id) as entries
      from public.history h
     where h.technical_key = p_key
       and h.field <> 'tags'
     group by h.created_at, h.actor, h.source
  )
  select jsonb_build_object(
    'total', (select count(*) from actions),
    'actions', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'created_at', a.created_at, 'actor', a.actor, 'source', a.source, 'entries', a.entries)
                       order by a.created_at desc, a.id)
        from (select * from actions
               order by created_at desc, id
              offset greatest(coalesce(p_offset, 0), 0)
               limit greatest(coalesce(p_limit, 10), 1)) a
    ), '[]'::jsonb)
  )
$$;

-- 4. Похожие строки (перед созданием ключа — в форме при наборе и в каждом create_key нейросети): было ~57 мс на
-- 2,7 тыс. ключей — similarity() по каждой строке. Теперь кандидатов находят trgm-индексы оператором %, а оценка
-- считается только для них. Порог тот же — 0,3: % сравнивает с pg_trgm.similarity_threshold, он задан у функции.
-- Ответ прежний (проверено на наборе запросов до и после)
create index localizations_en_trgm on public.localizations
  using gin (lower(translations ->> 'en') extensions.gin_trgm_ops);
create index localizations_key_trgm on public.localizations
  using gin (regexp_replace(technical_key, '^legacy\.[a-z0-9_]+\.', '') extensions.gin_trgm_ops);

create or replace function public.find_similar(p_text text, p_key text, p_limit integer default 8)
returns table (technical_key text, en text, score real, matched text)
language sql
stable
set search_path = ''
set pg_trgm.similarity_threshold = 0.3
as $$
  with found as (
    select l.technical_key
      from public.localizations l
     where coalesce(p_text, '') <> ''
       and lower(l.translations ->> 'en') operator(extensions.%) lower(p_text)
    union
    select l.technical_key
      from public.localizations l
     where coalesce(p_key, '') <> ''
       and regexp_replace(l.technical_key, '^legacy\.[a-z0-9_]+\.', '') operator(extensions.%) p_key
  ),
  candidates as (
    select l.technical_key,
           l.translations ->> 'en' as en,
           case when coalesce(p_text, '') = '' or l.translations ->> 'en' is null then 0
                else extensions.similarity(lower(l.translations ->> 'en'), lower(p_text)) end as text_score,
           case when coalesce(p_key, '') = '' then 0
                else extensions.similarity(regexp_replace(l.technical_key, '^legacy\.[a-z0-9_]+\.', ''), p_key) end as key_score
      from public.localizations l
      join found f on f.technical_key = l.technical_key
     where l.deprecated_at is null
       and l.technical_key not like 'common.selftest.%'
  )
  select c.technical_key, c.en, greatest(c.text_score, c.key_score)::real, case when c.text_score >= c.key_score then 'text' else 'key' end
    from candidates c
   where greatest(c.text_score, c.key_score) >= 0.3
   order by 3 desc, 1
   limit least(greatest(coalesce(p_limit, 8), 1), 50)
$$;
