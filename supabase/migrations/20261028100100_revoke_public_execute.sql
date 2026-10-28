-- Исправление lockdown: новые функции получали EXECUTE для PUBLIC, а значит и для anon.
-- В Postgres право «PUBLIC может выполнять функцию» — глобальное значение по умолчанию.
-- ALTER DEFAULT PRIVILEGES … IN SCHEMA только добавляет права к глобальным и отозвать его не может,
-- поэтому отзываем глобально для функций, которые создают миграции (роль postgres).
-- Нашёл tests/db/security.test.ts: import_legacy оказалась в списке прав anon.

alter default privileges for role postgres revoke execute on functions from public;

-- То же для уже созданных функций; anon оставляем только get_unique_tags
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.get_unique_tags() to anon;
