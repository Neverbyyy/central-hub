-- Языки и справочник — данные, без которых сервис не работает, поэтому они в миграции, а не в seed.

-- Те же 9 языков, что в прототипе. Исходный — английский.
insert into public.languages (code, name, dir, is_source, position) values
  ('en', 'English', 'ltr', true, 1),
  ('ru', 'Русский', 'ltr', false, 2),
  ('de', 'Deutsch', 'ltr', false, 3),
  ('es', 'Español', 'ltr', false, 4),
  ('it', 'Italiano', 'ltr', false, 5),
  ('pt', 'Português', 'ltr', false, 6),
  ('fr', 'Français', 'ltr', false, 7),
  ('sv', 'Svenska', 'ltr', false, 8),
  ('nl', 'Nederlands', 'ltr', false, 9);

-- Коды из примеров «Как называть ключи» и проекты, чьи строки импортируются под legacy.<проект>.
-- Остальные коды добавляются через сервис.
insert into public.registry (kind, code, title) values
  ('game', 'cars2', 'Cars 2'),
  ('game', 'farm', 'Farm'),
  ('site', 'lp_cars2', 'Лендинг Cars 2'),
  ('site', 'amayakids', 'amayakids.com'),
  ('brand', 'bandk', 'bandk'),
  ('test', 'tm12', 'tm12'),
  ('test', 'ua5', 'ua5'),
  ('project', 'inapp', 'InApp-WebView-Hub'),
  ('project', 'pages_hub', 'Pages Hub');
