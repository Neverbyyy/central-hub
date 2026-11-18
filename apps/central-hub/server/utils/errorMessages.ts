import type { H3Event } from 'h3'
import { DEFAULT_HUB_LOCALE, HUB_LOCALE_COOKIE, isHubLocale, type HubLocale } from '../../shared/utils/hubLocale'
import { createLocalizer, type MessageEntry } from '../../shared/utils/localizeMessage'
import { RULE_MESSAGES } from '../../shared/utils/ruleMessages'

// Ошибки сервера и базы — на языке интерфейса того, кто прислал запрос (cookie hub-lang). Тексты в коде и в функциях
// базы остаются русскими: их же читают MCP и CLI, у которых cookie нет. Переводит defineHubHandler — по русскому
// шаблону из этого каталога и каталога правил (shared/utils/ruleMessages.ts). Шаблона нет — ошибка уходит по-русски.
// Новая ошибка, которую увидит человек в интерфейсе, — строка сюда
export const SERVER_MESSAGES: readonly MessageEntry[] = [
  // Ключи и тексты — server/lib/keys.ts
  ['Неизвестный язык «{lang}»', 'Unknown language “{lang}”', 'Noma’lum til «{lang}»'],
  ['Теги — список строк', 'Tags must be a list of strings', 'Teglar satrlar ro‘yxati bo‘lishi kerak'],
  ['Не больше {max} тегов', 'No more than {max} tags', '{max} tadan ko‘p teg bo‘lmaydi'],
  ['Лимит длины — целое число от 1 до 10 000', 'The length limit must be a whole number from 1 to 10,000', 'Uzunlik limiti 1 dan 10 000 gacha butun son bo‘lishi kerak'],
  ['Текст «{lang}» должен быть строкой', 'The “{lang}” text must be a string', '«{lang}» matni satr bo‘lishi kerak'],
  ['Текст «{lang}» длиннее {max} символов', 'The “{lang}” text is longer than {max} characters', '«{lang}» matni {max} belgidan uzun'],
  ['Текст длиннее {max} символов', 'The text is longer than {max} characters', 'Matn {max} belgidan uzun'],
  ['Ключ «{key}» уже есть', 'Key “{key}” already exists', '«{key}» kaliti allaqachon bor'],
  ['Ключ «{key}» не найден', 'Key “{key}” not found', '«{key}» kaliti topilmadi'],
  ['Нужен ключ', 'A key is required', 'Kalit kerak'],
  ['Описание — строка', 'The description must be a string', 'Tavsif satr bo‘lishi kerak'],
  ['Ссылка на Figma — строка', 'The Figma link must be a string', 'Figma havolasi satr bo‘lishi kerak'],
  ['Неизвестный раздел справочника «{kind}»', 'Unknown registry section “{kind}”', 'Ma’lumotnomaning noma’lum bo‘limi «{kind}»'],
  ['Проекты добавляются вместе с набором выгрузки, не из формы', 'Projects are added together with an export set, not from the form', 'Loyihalar formadan emas, eksport to‘plami bilan birga qo‘shiladi'],
  ['Код — строчная латиница, цифры и _', 'A code is lowercase Latin letters, digits and _', 'Kod — kichik lotin harflari, raqamlar va _'],
  ['Нужно название', 'A name is required', 'Nom kerak'],
  ['Код «{code}» уже есть в справочнике', 'Code “{code}” is already in the registry', '«{code}» kodi ma’lumotnomada allaqachon bor'],
  ['Английский — исходный язык, его не переводят', 'English is the source language, it isn’t translated', 'Ingliz tili — manba til, u tarjima qilinmaydi'],
  ['Перевод не сохранён: {issues}', 'The translation wasn’t saved: {issues}', 'Tarjima saqlanmadi: {issues}'],
  // Теги — shared/utils/tags.ts, server/lib/tags.ts
  ['Нужно название тега', 'A tag name is required', 'Teg nomi kerak'],
  ['Тег длиннее {max} символов', 'A tag is longer than {max} characters', 'Teg {max} belgidan uzun'],
  ['В названии тега не может быть запятой', 'A tag name can’t contain a comma', 'Teg nomida vergul bo‘lishi mumkin emas'],
  ['Нужен тег', 'A tag is required', 'Teg kerak'],
  ['Нужно on: true — поставить тег, false — снять', 'on is required: true sets the tag, false removes it', 'on kerak: true — tegni qo‘yish, false — olib tashlash'],
  // Проверка тела запроса — маршруты server/api
  ['Нужен key', 'key is required', 'key kerak'],
  ['Нужен lang', 'lang is required', 'lang kerak'],
  ['Нужен список языков', 'A list of languages is required', 'Tillar ro‘yxati kerak'],
  ['Нужен prefixes — разделы через запятую', 'prefixes is required — sections separated by commas', 'prefixes kerak — vergul bilan ajratilgan bo‘limlar'],
  ['Нужны key и description строками, en — строкой, если есть', 'key and description are required as strings, en as a string if present', 'key va description satr sifatida kerak, en — bor bo‘lsa, satr sifatida'],
  ['Нужны kind, code и title строками', 'kind, code and title are required as strings', 'kind, code va title satr sifatida kerak'],
  ['Нужны key, lang и value строками', 'key, lang and value are required as strings', 'key, lang va value satr sifatida kerak'],
  ['Нужен список ключей: от 1 до {max}', 'A list of keys is required: from 1 to {max}', 'Kalitlar ro‘yxati kerak: 1 dan {max} gacha'],
  ['Нужны files: { язык: содержимое файла }', 'files is required: { language: file contents }', 'files kerak: { til: fayl mazmuni }'],
  ['{env} не задан на сервере', '{env} isn’t set on the server', 'Serverda {env} berilmagan'],
  ['Неверный токен {label}', 'Invalid {label} token', '{label} tokeni noto‘g‘ri'],
  ['Нужен вход', 'Sign-in required', 'Kirish kerak'],
  ['Такого токена нет', 'No such token', 'Bunday token yo‘q'],
  ['Ошибка базы данных', 'Database error', 'Ma’lumotlar bazasi xatosi'],
  // Выгрузка — server/lib/sync.ts, server/lib/github.ts, server/utils/exportTarget.ts
  ['Нет набора выгрузки «{set}»', 'No export set “{set}”', '«{set}» eksport to‘plami yo‘q'],
  ['У набора «{set}» нет префикса legacy — импортировать некуда', 'Set “{set}” has no legacy prefix — nowhere to import', '«{set}» to‘plamida legacy prefiksi yo‘q — import qiladigan joy yo‘q'],
  ['Не хватает файлов языков: {langs}', 'Language files are missing: {langs}', 'Til fayllari yetishmaydi: {langs}'],
  ['Языки не из набора «{set}»: {langs}', 'Languages not in set “{set}”: {langs}', '«{set}» to‘plamiga kirmaydigan tillar: {langs}'],
  ['{lang}: в плоском формате вложенный ключ «{path}»', '{lang}: nested key “{path}” in a flat format', '{lang}: tekis formatda ichma-ich kalit «{path}»'],
  ['Разные пути «{a}» и «{b}» дают один ключ {key}', 'Different paths “{a}” and “{b}” give the same key {key}', 'Turli yo‘llar «{a}» va «{b}» bitta {key} kalitini beradi'],
  ['Набор «{set}» не подключён к GitHub: добавьте его в NUXT_EXPORT_REPOS', 'Set “{set}” isn’t connected to GitHub: add it to NUXT_EXPORT_REPOS', '«{set}» to‘plami GitHub ga ulanmagan: uni NUXT_EXPORT_REPOS ga qo‘shing'],
  ['GitHub не принял токен NUXT_GITHUB_TOKEN', 'GitHub rejected the NUXT_GITHUB_TOKEN token', 'GitHub NUXT_GITHUB_TOKEN tokenini qabul qilmadi'],
  [
    'У токена нет прав на {repo}: нужны Contents и Pull requests на запись ({details})',
    'The token has no access to {repo}: it needs write access to Contents and Pull requests ({details})',
    'Tokenda {repo} ga huquq yo‘q: Contents va Pull requests ga yozish huquqi kerak ({details})'
  ],
  ['Репозиторий {repo} не найден или токену он не доступен', 'Repository {repo} wasn’t found or the token can’t access it', '{repo} repozitoriysi topilmadi yoki token unga kira olmaydi'],
  ['Репозиторий {repo} пустой — сначала положите в него файлы проекта', 'Repository {repo} is empty — add the project files to it first', '{repo} repozitoriysi bo‘sh — avval unga loyiha fayllarini joylang'],
  ['GitHub ответил {status}: {details}', 'GitHub responded {status}: {details}', 'GitHub {status} javobini berdi: {details}'],
  ['Ветка {branch} — основная в {repo}, выгружать в неё нельзя', 'Branch {branch} is the main branch in {repo}, you can’t export into it', '{branch} shoxi {repo} da asosiy, unga eksport qilib bo‘lmaydi'],
  ['NUXT_EXPORT_REPOS: не понял «{part}», нужно набор=owner/repo[@ветка]', 'NUXT_EXPORT_REPOS: can’t parse “{part}”, expected set=owner/repo[@branch]', 'NUXT_EXPORT_REPOS: «{part}» tushunarsiz, kerak: to‘plam=owner/repo[@shox]'],
  [
    'Сначала — «{project}», но она не подключена к GitHub (NUXT_EXPORT_REPOS). Срочно — выгрузите без проверки',
    '“{project}” comes first, but it isn’t connected to GitHub (NUXT_EXPORT_REPOS). If it’s urgent, export without review',
    'Avval — «{project}», lekin u GitHub ga ulanmagan (NUXT_EXPORT_REPOS). Shoshilinch bo‘lsa — tekshiruvsiz eksport qiling'
  ],
  [
    'Сначала — «{project}»: {what} ещё не в её основной ветке. Смержите её PR или выгрузите без проверки',
    '“{project}” comes first: {what} not in its main branch yet. Merge its PR or export without review',
    'Avval — «{project}»: {what} hali uning asosiy shoxida yo‘q. Uning PR ini merge qiling yoki tekshiruvsiz eksport qiling'
  ],
  ['общие ключи ({count})', 'shared keys ({count}) are', 'umumiy kalitlar ({count})'],
  ['много изменений', 'many changes are', 'ko‘p o‘zgarishlar'],
  ['Дизайн-система', 'Design system', 'Dizayn tizimi'],
  // Figma — server/lib/figma.ts, l10n-core figma.ts
  ['Выберите хотя бы один раздел', 'Choose at least one section', 'Kamida bitta bo‘limni tanlang'],
  ['Не больше 50 разделов за раз', 'No more than 50 sections at a time', 'Bir vaqtda 50 tadan ko‘p bo‘lim bo‘lmaydi'],
  ['Неизвестные языки: {langs}', 'Unknown languages: {langs}', 'Noma’lum tillar: {langs}'],
  ['since — время в формате ISO 8601', 'since must be a time in ISO 8601 format', 'since ISO 8601 formatidagi vaqt bo‘lishi kerak'],
  ['Ключ «{key}» нельзя выгрузить в Figma: часть «{part}»', 'Key “{key}” can’t be exported to Figma: part “{part}”', '«{key}» kalitini Figma ga eksport qilib bo‘lmaydi: «{part}» qismi'],
  ['Ключ «{key}» встречается дважды', 'Key “{key}” appears twice', '«{key}» kaliti ikki marta uchraydi'],
  ['Ключ «{key}» вложен в строку «{outer}»', 'Key “{key}” is nested inside the string “{outer}”', '«{key}» kaliti «{outer}» satri ichida joylashgan'],
  // Файлы локалей — l10n-core json-cst.ts, locale-file.ts
  ['Неверный JSON: {message} (строка {line})', 'Invalid JSON: {message} (line {line})', 'Noto‘g‘ri JSON: {message} ({line}-qator)'],
  ['Значение «{path}» не строка: {value}', 'Value “{path}” isn’t a string: {value}', '«{path}» qiymati satr emas: {value}'],
  ['Конфликт путей: {list}', 'Path conflict: {list}', 'Yo‘llar ziddiyati: {list}'],
  // Функции и правила базы — supabase/migrations (raise exception)
  ['Ключ «{key}» конфликтует с «{other}»: один ключ не может быть началом другого', 'Key “{key}” conflicts with “{other}”: one key can’t be the start of another', '«{key}» kaliti «{other}» bilan ziddiyatda: bir kalit boshqasining boshlanishi bo‘la olmaydi'],
  [
    'Ключ «{key}» не вернуть: его место занял «{other}» — один ключ не может быть началом другого',
    'Key “{key}” can’t be restored: “{other}” has taken its place — one key can’t be the start of another',
    '«{key}» kalitini qaytarib bo‘lmaydi: uning o‘rnini «{other}» egallagan — bir kalit boshqasining boshlanishi bo‘la olmaydi'
  ],
  ['Ключ «{key}» не начинается с {prefix}', 'Key “{key}” doesn’t start with {prefix}', '«{key}» kaliti {prefix} bilan boshlanmaydi'],
  ['Ключ «{key}» помечен устаревшим — сначала верните его', 'Key “{key}” is deprecated — restore it first', '«{key}» kaliti eskirgan deb belgilangan — avval uni qaytaring'],
  ['Ключ «{key}» устарел', 'Key “{key}” is deprecated', '«{key}» kaliti eskirgan'],
  ['Ключи legacy.* приходят только импортом файлов проекта', 'legacy.* keys only come by importing project files', 'legacy.* kalitlari faqat loyiha fayllarini import qilish orqali keladi'],
  ['Ключи пока нельзя переименовывать', 'Keys can’t be renamed yet', 'Kalitlarni hozircha qayta nomlab bo‘lmaydi'],
  ['Неизвестный статус «{status}»', 'Unknown status “{status}”', 'Noma’lum maqom «{status}»'],
  ['Перевод должен быть строкой', 'The translation must be a string', 'Tarjima satr bo‘lishi kerak'],
  ['Пустой перевод: нейросеть переводы не удаляет', 'Empty translation: the AI doesn’t delete translations', 'Bo‘sh tarjima: neyrotarmoq tarjimalarni o‘chirmaydi'],
  [
    'Перевод «{key}» на «{lang}» написал человек — нейросеть его не перезаписывает',
    'The “{lang}” translation of “{key}” was written by a person — the AI doesn’t overwrite it',
    '«{key}» ning «{lang}» tiliga tarjimasini inson yozgan — neyrotarmoq uni qayta yozmaydi'
  ],
  ['Перевод уже изменили', 'The translation has already been changed', 'Tarjima allaqachon o‘zgartirilgan'],
  ['Тег «{tag}» уже есть', 'Tag “{tag}” already exists', '«{tag}» tegi allaqachon bor'],
  ['Тега «{tag}» нет — его могли удалить или переименовать', 'There’s no tag “{tag}” — it may have been deleted or renamed', '«{tag}» tegi yo‘q — u o‘chirilgan yoki qayta nomlangan bo‘lishi mumkin'],
  [
    'Тега «{tag}» нет — создайте его в «Все теги» над таблицей или правым кликом по ключу',
    'There’s no tag “{tag}” — create it in “All tags” above the table or by right-clicking a key',
    '«{tag}» tegi yo‘q — uni jadval ustidagi «Barcha teglar» da yoki kalitni o‘ng tugma bilan bosib yarating'
  ],
  ['У ключа «{key}» уже 20 тегов — больше нельзя', 'Key “{key}” already has 20 tags — no more allowed', '«{key}» kalitida allaqachon 20 ta teg bor — boshqa qo‘shib bo‘lmaydi'],
  ['Язык «{lang}» не входит в набор «{set}»', 'Language “{lang}” isn’t in set “{set}”', '«{lang}» tili «{set}» to‘plamiga kirmaydi'],
  ['Строки нельзя удалять — пометьте их устаревшими', 'Strings can’t be deleted — mark them as deprecated', 'Satrlarni o‘chirib bo‘lmaydi — ularni eskirgan deb belgilang'],
  ['История только дополняется', 'History can only be appended to', 'Tarixga faqat qo‘shiladi']
]

/** Текст ошибки сервера на языке интерфейса. */
export const localizeServerMessage = createLocalizer([...SERVER_MESSAGES, ...RULE_MESSAGES])

/** Язык интерфейса того, кто прислал запрос; без cookie (MCP, CLI, вебхук) — русский. */
export function requestLocale(event: H3Event): HubLocale {
  const value = getCookie(event, HUB_LOCALE_COOKIE)
  return isHubLocale(value) ? value : DEFAULT_HUB_LOCALE
}

/** Ошибка маршрута на языке интерфейса: меняет текст ошибки h3 на месте и возвращает её же. */
export function localizeError<T>(event: H3Event, error: T): T {
  const locale = requestLocale(event)
  if (locale !== DEFAULT_HUB_LOCALE && isError(error) && error.message) error.message = localizeServerMessage(error.message, locale)
  return error
}
