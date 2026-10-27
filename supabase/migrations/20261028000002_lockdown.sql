-- Публичный ключ Supabase виден любому, кто откроет код страницы, поэтому роль
-- anon может только читать ключи, языки и справочник — это нужно гриду.
-- Все изменения идут через серверные маршруты Nuxt с секретным ключом (service_role).
-- В Postgres функции по умолчанию может вызвать кто угодно — это право тоже отбираем.
-- Проверка: tests/db/security.test.ts сверяет security_audit() с белым списком.

-- 1. Отбираем всё, что Supabase и Postgres раздают по умолчанию
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- 2. То же для объектов из будущих миграций: новые таблицы и функции закрыты, пока их не откроют явно
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;

-- 3. Сервер может всё; удаление и переименование ключей всё равно запрещают триггеры
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- 4. Публичному ключу — только чтение того, что нужно гриду
grant select on public.localizations, public.languages, public.registry to anon;
grant execute on function public.get_unique_tags() to anon;

-- 5. RLS на всех таблицах. service_role его обходит, у anon — только чтение.
--    У history политик нет: история доступна только серверу.
alter table public.localizations enable row level security;
alter table public.languages enable row level security;
alter table public.registry enable row level security;
alter table public.history enable row level security;

create policy "anon читает ключи" on public.localizations for select to anon using (true);
create policy "anon читает языки" on public.languages for select to anon using (true);
create policy "anon читает справочник" on public.registry for select to anon using (true);

-- 6. Всё, что могут роли anon и authenticated в схеме public, плюс таблицы без RLS.
--    Используется автотестом; вызвать может только сервер.
create function public.security_audit()
returns table (object_type text, object_name text, grantee text, privilege text)
language sql
stable
security definer
set search_path = ''
as $$
  -- Таблицы и представления: has_any_column_privilege ловит и права на отдельные колонки
  select 'table', c.relname::text, r.role, p.priv
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   cross join (values ('anon'), ('authenticated')) as r(role)
   cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as p(priv)
   where n.nspname = 'public'
     and c.relkind in ('r', 'p', 'v', 'm', 'f')
     and case when p.priv in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
              then pg_catalog.has_any_column_privilege(r.role, c.oid, p.priv)
              else pg_catalog.has_table_privilege(r.role, c.oid, p.priv) end
  union all
  select 'sequence', c.relname::text, r.role, p.priv
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   cross join (values ('anon'), ('authenticated')) as r(role)
   cross join (values ('USAGE'), ('SELECT'), ('UPDATE')) as p(priv)
   where n.nspname = 'public'
     and c.relkind = 'S'
     and pg_catalog.has_sequence_privilege(r.role, c.oid, p.priv)
  union all
  select 'function', p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')', r.role, 'EXECUTE'
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   cross join (values ('anon'), ('authenticated')) as r(role)
   where n.nspname = 'public'
     and pg_catalog.has_function_privilege(r.role, p.oid, 'EXECUTE')
  union all
  select 'rls_disabled', c.relname::text, null, null
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')
     and not c.relrowsecurity
  order by 1, 2, 3, 4
$$;

revoke all on function public.security_audit() from public, anon, authenticated;
grant execute on function public.security_audit() to service_role;
