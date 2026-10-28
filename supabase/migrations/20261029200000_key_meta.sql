-- Свойства существующего ключа из панели: описание, теги, лимит длины, ссылка на Figma.
-- Ограничения держит таблица (описание у новых ключей, лимит > 0), историю пишет триггер.
-- Устаревший ключ не правится — как и его тексты в гриде, сначала его возвращают.
create function public.update_key_meta(
  p_key text,
  p_description text,
  p_tags text[],
  p_max_length integer,
  p_figma_url text,
  p_actor text
)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_row public.localizations;
  v_description text := nullif(btrim(p_description), '');
  v_tags text[] := coalesce(p_tags, '{}');
  v_figma_url text := nullif(btrim(p_figma_url), '');
begin
  perform set_config('hub.actor', p_actor, true);
  perform set_config('hub.source', 'ui', true);

  select * into v_row from public.localizations where technical_key = p_key for update;
  if not found then
    raise exception 'Ключ «%» не найден', p_key using errcode = 'P0002';
  end if;
  if v_row.deprecated_at is not null then
    raise exception 'Ключ «%» помечен устаревшим — сначала верните его', p_key using errcode = 'P0001';
  end if;

  -- Ничего не поменялось — не трогаем updated_at, чтобы не будить грид у коллег
  if v_row.description is not distinct from v_description
     and v_row.tags = v_tags
     and v_row.max_length is not distinct from p_max_length
     and v_row.figma_url is not distinct from v_figma_url then
    return v_row.updated_at;
  end if;

  update public.localizations
     set description = v_description,
         tags = v_tags,
         max_length = p_max_length,
         figma_url = v_figma_url
   where technical_key = p_key
  returning updated_at into v_row.updated_at;

  return v_row.updated_at;
end;
$$;
