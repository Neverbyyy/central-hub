-- Правку вернули как было — меток нет. Раньше откат текста к прежнему оставлял «черновик»,
-- а откат английского — «перевод устарел» у всех переводов, хотя по факту ничего не изменилось.
--  1. Текст языка совпал с последним утверждённым — язык снова утверждён.
--  2. «Перевод устарел» сравнивает тексты, а не номера ревизий: перевод устарел, только если английский
--     сейчас другой, чем тот, с которого переводили. Для этого база помнит английский по ревизиям,
--     на которые ссылаются переводы (source_texts).

alter table public.localizations
  -- { "1": "Here's a gift for you!", "3": "Here's a gift for you!" } — английский по ревизиям
  add column source_texts jsonb not null default '{}'::jsonb,
  add constraint localizations_source_texts_object check (jsonb_typeof(source_texts) = 'object');

-- Вычисляемая колонка зависит от функции — меняем её вместе с колонкой (индекс уходит вместе с колонкой)
alter table public.localizations drop column stale_langs;
drop function public.l10n_stale_langs(jsonb, jsonb, integer);

create function public.l10n_stale_langs(p_translations jsonb, p_based_on jsonb, p_source_rev integer, p_source_texts jsonb)
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
     -- Английский вернули к тому, с которого переводили, — перевод снова актуален.
     -- Текст старой ревизии неизвестен — считаем устаревшим, как раньше
     and not (p_source_texts ? b.value
              and p_source_texts ? p_source_rev::text
              and p_source_texts -> b.value = p_source_texts -> p_source_rev::text)
$$;

-- Тот же триггер плюс два правила: возврат к утверждённому тексту и английский по ревизиям
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
  v_source_lang text;
  v_texts jsonb;
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

  -- Текст вернули к последнему утверждённому — правки по факту нет, язык снова утверждён
  if tg_op = 'UPDATE' then
    new.status := new.status || coalesce(
      (select jsonb_object_agg(s.key, 'approved')
         from jsonb_each_text(new.status) s
        where s.value <> 'approved'
          and old.approved ? s.key
          and (old.approved -> s.key) = (new.translations -> s.key)),
      '{}'::jsonb
    );
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

  -- Английский текущей ревизии и тех, с которых сделаны переводы; остальные ревизии не нужны
  select code into v_source_lang from public.languages where is_source;
  v_texts := case when tg_op = 'UPDATE' then old.source_texts else '{}'::jsonb end
    || jsonb_build_object(new.source_rev::text, new.translations -> v_source_lang);
  new.source_texts := coalesce(
    (select jsonb_object_agg(t.key, t.value)
       from jsonb_each(v_texts) t
      where t.key = new.source_rev::text
         or t.key in (select b.value from jsonb_each_text(new.based_on) b)),
    '{}'::jsonb
  );

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  new.updated_by := public.hub_actor();
  return new;
end;
$$;

-- Существующие строки. Триггеры выключены, чтобы не тронуть updated_at/updated_by и историю.
alter table public.localizations disable trigger user;

-- Уже возвращённые к утверждённому тексту черновики — снова утверждены
update public.localizations l
   set status = l.status || x.patch
  from (select r.technical_key, jsonb_object_agg(s.key, 'approved') as patch
          from public.localizations r, jsonb_each_text(r.status) s
         where s.value <> 'approved'
           and r.approved ? s.key
           and (r.approved -> s.key) = (r.translations -> s.key)
         group by r.technical_key) x
 where l.technical_key = x.technical_key;

-- Английский текущей ревизии — у всех
update public.localizations l
   set source_texts = jsonb_build_object(l.source_rev::text, l.translations -> (select code from public.languages where is_source));

-- Прошлые ревизии — по истории: первая запись английского — ревизия 1, каждая следующая правка — +1.
-- Берём, только если нумерация сошлась с ревизией строки и последняя версия — текущий английский.
with versions as (
  select h.technical_key,
         row_number() over (partition by h.technical_key order by h.id)::integer as rev,
         h.new_value
    from public.history h
   where h.field = 'translation'
     and h.lang = (select code from public.languages where is_source)
),
texts as (
  select v.technical_key, jsonb_object_agg(v.rev::text, to_jsonb(v.new_value)) as texts, max(v.rev) as last
    from versions v
   group by v.technical_key
)
update public.localizations l
   set source_texts = coalesce(
     (select jsonb_object_agg(t.key, t.value)
        from jsonb_each(x.texts) t
       where t.key = l.source_rev::text
          or t.key in (select b.value from jsonb_each_text(l.based_on) b)),
     '{}'::jsonb
   )
  from texts x
 where x.technical_key = l.technical_key
   and x.last = l.source_rev
   and (x.texts -> l.source_rev::text) is not distinct from (l.translations -> (select code from public.languages where is_source));

alter table public.localizations enable trigger user;

alter table public.localizations
  add column stale_langs text[] generated always as (public.l10n_stale_langs(translations, based_on, source_rev, source_texts)) stored;

create index localizations_stale_langs on public.localizations using gin (stale_langs);
