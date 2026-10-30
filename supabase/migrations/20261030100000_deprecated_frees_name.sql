-- Устаревший ключ не занимает имя. «Один ключ не может быть началом другого» нужно, чтобы в JSON-выгрузке
-- раздел не был одновременно строкой. Устаревшие ключи в выгрузку не попадают — и проверку не держат.
-- Иначе пробная строка app.farm.banner навсегда запрещала бы раздел app.farm.banner.*: удалять
-- и переименовывать ключи нельзя. Обратная сторона: устаревший ключ не вернуть, если его место занял новый.

-- Тот же триггер, что в 20261029220000_revert_to_approved; поменялась только проверка начала ключа
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
  v_restoring boolean := false;
begin
  if tg_op = 'UPDATE' and new.technical_key <> old.technical_key then
    raise exception 'Ключи пока нельзя переименовывать' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    v_error := public.l10n_key_error(new.technical_key);
    if v_error is not null then
      raise exception '%', v_error using errcode = 'P0001';
    end if;
    new.created_by := coalesce(new.created_by, public.hub_actor());
  else
    v_restoring := old.deprecated_at is not null and new.deprecated_at is null;
  end if;

  -- Один ключ не может быть началом другого среди действующих ключей: в JSON `continue` не может быть
  -- и строкой, и папкой. Проверяем новый ключ и возвращённый из устаревших.
  -- Блокировка не даёт двум параллельным вставкам разминуться.
  if new.technical_key not like 'legacy.%' and new.deprecated_at is null and (tg_op = 'INSERT' or v_restoring) then
    perform pg_advisory_xact_lock(hashtext('localizations.key_prefix'));
    select l.technical_key into v_conflict
      from public.localizations l
     where l.technical_key not like 'legacy.%'
       and l.deprecated_at is null
       and (starts_with(l.technical_key, new.technical_key || '.')
            or starts_with(new.technical_key, l.technical_key || '.'))
     limit 1;
    if v_conflict is not null and v_restoring then
      raise exception 'Ключ «%» не вернуть: его место занял «%» — один ключ не может быть началом другого',
        new.technical_key, v_conflict using errcode = 'P0001';
    elsif v_conflict is not null then
      raise exception 'Ключ «%» конфликтует с «%»: один ключ не может быть началом другого',
        new.technical_key, v_conflict using errcode = 'P0001';
    end if;
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
