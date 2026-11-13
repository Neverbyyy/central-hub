-- История ключа больше не пишет теги (решение владельца): каждая галочка в меню правого клика давала отдельную запись,
-- и история ключа тонула в «Теги: cars2, cta → cars2». Теги — разметка для поиска и выборок, а не содержимое строки:
-- кто и когда их ставил, знать не нужно. Прежние записи о тегах остаются (история только дополняется), панель их не
-- показывает (server/lib/history.ts). Остальное — как в 20261028000001_schema.sql.
create or replace function public.localizations_write_history()
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

  -- Свойства ключа; тегов здесь нет
  insert into public.history (technical_key, field, old_value, new_value, actor, source)
  select new.technical_key, f.field, f.old_value, f.new_value, v_actor, v_source
    from (values
      ('description', old.description, new.description),
      ('max_length', old.max_length::text, new.max_length::text),
      ('figma_url', old.figma_url, new.figma_url),
      ('deprecated',
        case when old.deprecated_at is not null then 'устарел' end,
        case when new.deprecated_at is not null then 'устарел' end)
    ) as f(field, old_value, new_value)
   where f.old_value is distinct from f.new_value;

  return null;
end;
$$;
