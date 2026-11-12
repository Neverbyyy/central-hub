-- Страницы «Теги» больше нет (решение владельца): теги создают в фильтре «Все теги» над таблицей или правым кликом
-- по ключу. Меняется только текст отказа; проверка — та же, что в 20261112100000_tags

create or replace function public.localizations_check_tags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_missing text;
begin
  if cardinality(new.tags) > 20 then
    raise exception 'У ключа «%» уже 20 тегов — больше нельзя', new.technical_key using errcode = 'P0001';
  end if;

  select t into v_missing
    from unnest(new.tags) t
   where not exists (select 1 from public.tags g where g.name = t)
   limit 1;
  if v_missing is not null then
    raise exception 'Тега «%» нет — создайте его в «Все теги» над таблицей или правым кликом по ключу', v_missing using errcode = 'P0001';
  end if;

  return new;
end;
$$;
