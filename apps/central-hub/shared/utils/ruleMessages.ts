import { createLocalizer, type MessageEntry } from './localizeMessage'

// Тексты правил из l10n-core (keys.ts, text-checks.ts) — l10n-core пишет их по-русски, он общий с MCP и CLI.
// Интерфейс показывает их на своём языке (ruleText), сервер — в своих ошибках. Меняя текст в l10n-core, поменяй и
// шаблон здесь: tests/unit/hub-i18n.test.ts проверяет, что каждое сообщение правил находит свой перевод
export const RULE_MESSAGES: readonly MessageEntry[] = [
  // Имя ключа — keyError, newKeyError
  ['Ключ пустой', 'The key is empty', 'Kalit bo‘sh'],
  ['Ключ длиннее {max} символов', 'The key is longer than {max} characters', 'Kalit {max} belgidan uzun'],
  [
    'В ключе пустая часть: две точки подряд или точка в начале или в конце',
    'The key has an empty part: two dots in a row, or a dot at the start or end',
    'Kalitda bo‘sh qism bor: ketma-ket ikki nuqta yoki boshida yoki oxirida nuqta'
  ],
  [
    'Ключ начинается с common., app., web., brand., ds., test. или legacy.',
    'A key starts with common., app., web., brand., ds., test. or legacy.',
    'Kalit common., app., web., brand., ds., test. yoki legacy. bilan boshlanadi'
  ],
  ['Ключ начинается с {roots}', 'A key starts with {roots}', 'Kalit {roots} bilan boshlanadi'],
  [
    'Слишком короткий ключ: нужно минимум три части, например common.button.continue',
    'The key is too short: it needs at least three parts, e.g. common.button.continue',
    'Kalit juda qisqa: kamida uch qism kerak, masalan common.button.continue'
  ],
  ['Неизвестный код игры «{code}» — его нет в справочнике', 'Unknown game code “{code}” — it’s not in the registry', 'Noma’lum o‘yin kodi «{code}» — u ma’lumotnomada yo‘q'],
  ['Неизвестный код сайта «{code}» — его нет в справочнике', 'Unknown site code “{code}” — it’s not in the registry', 'Noma’lum sayt kodi «{code}» — u ma’lumotnomada yo‘q'],
  ['Неизвестный код бренда «{code}» — его нет в справочнике', 'Unknown brand code “{code}” — it’s not in the registry', 'Noma’lum brend kodi «{code}» — u ma’lumotnomada yo‘q'],
  ['Неизвестный код теста «{code}» — его нет в справочнике', 'Unknown test code “{code}” — it’s not in the registry', 'Noma’lum test kodi «{code}» — u ma’lumotnomada yo‘q'],
  ['Неизвестный код проекта «{code}» — его нет в справочнике', 'Unknown project code “{code}” — it’s not in the registry', 'Noma’lum loyiha kodi «{code}» — u ma’lumotnomada yo‘q'],
  ['Часть «{part}»: только строчная латиница, цифры и _', 'Part “{part}”: only lowercase Latin letters, digits and _', '«{part}» qismi: faqat kichik lotin harflari, raqamlar va _'],
  [
    'После test.<тест>. идёт обычный ключ: common., app., web., brand. или ds.',
    'After test.<test>. comes a regular key: common., app., web., brand. or ds.',
    'test.<test>. dan keyin oddiy kalit keladi: common., app., web., brand. yoki ds.'
  ],
  ['В ключе не должно быть языка: «{part}»', 'The key must not contain a language: “{part}”', 'Kalitda til bo‘lmasligi kerak: «{part}»'],
  [
    'legacy.* — строки из файлов проектов, они приходят только импортом. Новый ключ — по новой схеме: common., app.<игра>., web.<сайт>. … Или возьмите существующую строку из похожих',
    'legacy.* are strings from project files, they only come by import. A new key follows the new scheme: common., app.<game>., web.<site>. … Or take an existing string from the similar ones',
    'legacy.* — loyiha fayllaridagi satrlar, ular faqat import orqali keladi. Yangi kalit — yangi sxema bo‘yicha: common., app.<o‘yin>., web.<sayt>. … Yoki o‘xshashlar ichidan mavjud satrni oling'
  ],
  // Описание и ссылка на макет — descriptionError, figmaUrlError
  [
    'Опишите, где показывается строка и какие у неё ограничения — от {min} символов (сейчас {length})',
    'Describe where the string is shown and its limits — at least {min} characters (now {length})',
    'Satr qayerda ko‘rsatilishini va uning cheklovlarini yozing — kamida {min} belgi (hozir {length})'
  ],
  ['Ссылка на Figma начинается с https://www.figma.com/', 'A Figma link starts with https://www.figma.com/', 'Figma havolasi https://www.figma.com/ bilan boshlanadi'],
  // Текст строки — checkText
  ['Длиннее лимита: {length} из {max} символов', 'Over the limit: {length} of {max} characters', 'Limitdan uzun: {length} / {max} belgi'],
  ['Нет подстановок из английского: {names}', 'Placeholders from English are missing: {names}', 'Inglizchadagi o‘rniga qo‘yishlar yo‘q: {names}'],
  ['Подстановок нет в английском: {names}', 'These placeholders aren’t in English: {names}', 'Bu o‘rniga qo‘yishlar inglizchada yo‘q: {names}'],
  [
    'Символ «{char}» нужно экранировать: {example} — иначе vue-i18n не разберёт строку',
    'The “{char}” character must be escaped: {example} — otherwise vue-i18n can’t parse the string',
    '«{char}» belgisini ekranlash kerak: {example} — aks holda vue-i18n satrni o‘qiy olmaydi'
  ],
  ['Символ «{char}» лучше экранировать: {example}', 'Better escape the “{char}” character: {example}', '«{char}» belgisini ekranlagan ma’qul: {example}'],
  [
    '«{char}» разделяет формы множественного числа; если нужен сам символ — {example}',
    '“{char}” separates plural forms; if you need the character itself — {example}',
    '«{char}» ko‘plik shakllarini ajratadi; belgining o‘zi kerak bo‘lsa — {example}'
  ],
  [
    'HTML в строках нельзя — ссылку или перенос делает компонент через подстановку',
    'No HTML in strings — a link or a line break is done by the component via a placeholder',
    'Satrlarda HTML bo‘lmaydi — havola yoki qator ko‘chirishni komponent o‘rniga qo‘yish orqali qiladi'
  ],
  [
    'Текст целиком капсом — пишем в обычном регистре, капс делает CSS',
    'The whole text is in caps — write in normal case, CSS does the caps',
    'Matn butunlay katta harflarda — oddiy registrda yozing, katta harflarni CSS qiladi'
  ],
  ['Пробелы в начале или в конце строки', 'Spaces at the start or end of the string', 'Satr boshida yoki oxirida bo‘sh joylar']
]

/** Текст правила из l10n-core на языке интерфейса. */
export const localizeRule = createLocalizer(RULE_MESSAGES)
