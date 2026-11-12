-- Теги — свой список. Раньше тег был только строкой в localizations.tags, и список для фильтра собирался из ключей:
-- тег без ключей не существовал, создать его можно было лишь в свойствах ключа. Теперь тег создаётся отдельно
-- (страница «Теги», правый клик по ключу), а у ключа могут быть только теги из списка — правило держит база,
-- поэтому его не обойти ни формой, ни нейросетью (как коды справочника).

create table public.tags (
  name text primary key,
  created_at timestamptz not null default now(),
  created_by text not null default public.hub_actor(),
  -- Без пробелов по краям, 1–40 символов, без запятой: через запятую теги идут в адресе фильтра (?tags=a,b)
  constraint tags_name_rule check (name = btrim(name) and char_length(name) between 1 and 40 and position(',' in name) = 0)
);

-- «Landing» и «landing» — один тег
create unique index tags_name_lower on public.tags (lower(name));

-- Браузер только читает: список нужен фильтру, меню и странице «Теги». Пишет — только сервер
alter table public.tags enable row level security;
create policy "anon читает теги" on public.tags for select to anon using (true);
grant select on public.tags to anon;

-- Теги, которые уже стоят у ключей (и у устаревших — их могут вернуть)
insert into public.tags (name, created_by)
select distinct t, 'миграция'
  from public.localizations l, unnest(l.tags) t
 where t = btrim(t) and char_length(t) between 1 and 40 and position(',' in t) = 0
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- У ключа — только теги из списка, не больше 20
-- ---------------------------------------------------------------------------

create function public.localizations_check_tags()
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
    raise exception 'Тега «%» нет — создайте его на странице «Теги»', v_missing using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger localizations_check_tags
  before insert or update of tags on public.localizations
  for each row execute function public.localizations_check_tags();

-- ---------------------------------------------------------------------------
-- Запись — только сервер (функции закрыты от anon правами по умолчанию, миграция lockdown).
-- Ключи меняются обычным update — историю «Теги: a → a, b» пишет триггер localizations_write_history
-- ---------------------------------------------------------------------------

create function public.create_tag(p_name text, p_actor text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
  v_existing text;
begin
  perform set_config('hub.actor', p_actor, true);

  select name into v_existing from public.tags where lower(name) = lower(v_name);
  if found then
    raise exception 'Тег «%» уже есть', v_existing using errcode = '23505';
  end if;

  insert into public.tags (name, created_by) values (v_name, p_actor);
  return v_name;
end;
$$;

-- Переименовать тег у всех ключей, и у устаревших. Сначала сам тег, потом ключи: так проверка ключей видит
-- новое имя, и смена одного регистра («Landing» → «landing») не упирается в уникальность
create function public.rename_tag(p_from text, p_to text, p_actor text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_to text := btrim(p_to);
  v_existing text;
  v_count integer;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', 'ui', true);

  if not exists (select 1 from public.tags where name = p_from) then
    raise exception 'Тега «%» нет — его могли удалить или переименовать', p_from using errcode = 'P0002';
  end if;
  if v_to = p_from then
    return 0;
  end if;

  select name into v_existing from public.tags where lower(name) = lower(v_to) and name <> p_from;
  if found then
    raise exception 'Тег «%» уже есть', v_existing using errcode = '23505';
  end if;

  update public.tags set name = v_to where name = p_from;
  update public.localizations set tags = array_replace(tags, p_from, v_to) where p_from = any (tags);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Удалить тег: он снимается со всех ключей (в их истории это остаётся), потом исчезает из списка
create function public.delete_tag(p_name text, p_actor text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', 'ui', true);

  if not exists (select 1 from public.tags where name = p_name) then
    raise exception 'Тега «%» нет — его могли удалить или переименовать', p_name using errcode = 'P0002';
  end if;

  update public.localizations set tags = array_remove(tags, p_name) where p_name = any (tags);
  get diagnostics v_count = row_count;
  delete from public.tags where name = p_name;
  return v_count;
end;
$$;

-- Поставить (p_on) или снять тег у ключей. Устаревшие не трогаем — как и их тексты, сначала их возвращают.
-- Обновляются только ключи, у которых что-то меняется: грид у коллег лишний раз не перечитывается
create function public.set_keys_tag(p_keys text[], p_tag text, p_on boolean, p_actor text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', 'ui', true);

  if not exists (select 1 from public.tags where name = p_tag) then
    raise exception 'Тега «%» нет — его могли удалить или переименовать', p_tag using errcode = 'P0002';
  end if;

  if p_on then
    update public.localizations set tags = tags || p_tag
     where technical_key = any (p_keys) and deprecated_at is null and not (p_tag = any (tags));
  else
    update public.localizations set tags = array_remove(tags, p_tag)
     where technical_key = any (p_keys) and deprecated_at is null and p_tag = any (tags);
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Чтение публичным ключом
-- ---------------------------------------------------------------------------

-- Фильтр и меню: весь список, и пустые теги тоже (раньше — только те, что стоят у действующих ключей).
-- Имя и права прежние
create or replace function public.get_unique_tags()
returns table (tag text)
language sql
stable
set search_path = ''
as $$
  select name from public.tags order by lower(name)
$$;

-- Страница «Теги»: у скольких действующих ключей стоит каждый тег
create function public.get_tags()
returns table (name text, keys integer)
language sql
stable
set search_path = ''
as $$
  select g.name, count(l.technical_key)::integer
    from public.tags g
    left join public.localizations l on g.name = any (l.tags) and l.deprecated_at is null
   group by g.name
   order by lower(g.name)
$$;

grant execute on function public.get_tags() to anon;
