# Манифест компонентов

Собран скриптом `packages/ui/scripts/manifest.mjs` из кода — руками не правится (`pnpm --filter @amaya/ui manifest`).
Экран собирается только из этих компонентов. В Figma компонент называется так же без префикса: `PlanCard` ↔ `DsPlanCard`.
Тексты — ключами из сервиса, в компоненты приходят уже переведёнными (пропсы и слоты); цвета и размеры — только токены.

## Компоненты

### DsAccordion

`@amaya/ui` · Figma: Accordion · `packages/ui/src/components/DsAccordion.vue`

Аккордеон: вопросы и ответы (FAQ). Пункты — массивом { id, question, answer }, тексты — ключами из сервиса. Вопрос — кнопка с aria-expanded и aria-controls; ↑/↓, Home, End переводят фокус между вопросами (шаблон WAI-ARIA). Открыть можно несколько сразу. Высота меняется сразу, ответ проявляется через opacity и transform — анимируются только они. id — пространство имён для id вопросов и ответов (одинаковые на сервере и в браузере, без счётчиков). Когда использовать: FAQ на лендинге. Вид — карточки как у отзывов: surface.lp-card, shadow.lp-card, radius.lp-card.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `id` | `string` |  |  |
| `items` | `DsAccordionItem[]` |  |  |
| `headingLevel`? | `2 \| 3 \| 4` | `3` | Уровень заголовков вопросов в структуре страницы |
| `defaultOpen`? | `string[]` | `() => []` | Открытые с самого начала |

События: `toggle(id: string, open: boolean)`

### DsBackground

`@amaya/ui` · Figma: Background · `packages/ui/src/components/DsBackground.vue`

Фон экрана или блока по конвенции small/medium/large × 1x/2x × png/webp: картинка на всю площадь (cover) под содержимым. Когда использовать: арт за экраном или карточкой. Сделан картинкой <picture>, а не background-image: так работают ленивая загрузка и событие load (у пейволла «готов» — только когда арт загрузился).

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `set` | `DsImageSet` |  |  |
| `position`? | `'center' \| 'top' \| 'bottom'` | `'center'` |  |
| `loading`? | `'eager' \| 'lazy'` | `'eager'` |  |
| `priority`? | `'high' \| 'low' \| 'auto'` | `'auto'` |  |

События: `load()`; `error()`

Слоты: `default`

### DsBadge

`@amaya/ui` · Figma: Badge · `packages/ui/src/components/DsBadge.vue`

Плашка: «Best offer» на тарифе (accent — цвет color.badge.*, капс из темы case.badge) и цветные метки «coloring pages», «puzzles» на карточке Cars 2 (green, red, purple, blue, yellow — color.tag.*). Когда использовать: короткая пометка в одно-два слова. Текст — слотом, ключом из сервиса.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `tone`? | `'accent' \| 'green' \| 'red' \| 'purple' \| 'blue' \| 'yellow'` | `'accent'` |  |

Слоты: `default`

### DsBenefitList

`@amaya/ui` · Figma: BenefitList · `packages/ui/src/components/DsBenefitList.vue`

Список преимуществ: «25+ apps», «Play offline», «No ads». Маркер — точка (Farm) или галочка (Cars 2), цвет маркера color.bullet, текст — стиль text.list. Когда использовать: 2–4 коротких преимущества на пейволле. Тексты — массивом, уже переведённые экраном (ключи из сервиса).

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `items` | `string[]` |  |  |
| `marker`? | `'dot' \| 'check'` | `'dot'` |  |
| `tone`? | `'primary' \| 'secondary'` | `'secondary'` |  |

### DsBox

`@amaya/ui` · Figma: Box · `packages/ui/src/components/DsBox.vue`

Блок — контейнер с внутренним отступом из шкалы 4 px и, по желанию, подложкой карточки из токенов. Когда использовать: карточка, плашка, группа элементов с фоном. Для раскладки детей внутри — DsStack. Карточка (surface="card"): заливка surface.card (в Cars 2 — градиент), радиус radius.card, рамка line.card цвета color.card.border (тенью внутрь — вёрстка не сдвигается) и тень shadow.card.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `padding`? | `Padding` | `0` |  |
| `surface`? | `'none' \| 'card'` | `'none'` |  |
| `as`? | `'div' \| 'section' \| 'article' \| 'li' \| 'aside'` | `'div'` |  |

Слоты: `default`

### DsButton

`@amaya/ui` · Figma: Button · `packages/ui/src/components/DsButton.vue`

Главная кнопка экрана: «Продолжить», «Купить», «Попробовать бесплатно». Текст — слотом, ключом из сервиса. Когда использовать: основное действие (primary) или второстепенное (secondary — в Cars 2 оранжевая «Unlock for»); на лендинге — lp («Play for free!»: крупная, буквы градиентом). Для ссылки в тексте — DsLink. size="sm" — текст мельче (text.button-sm), высота та же; у lp size="lg" — кнопки ниже первого экрана (64 вместо 60). Вид — из темы: заливка surface.cta (в Cars 2 градиент), рамка line.cta, обводка букв line.cta-text, тень shadow.cta, капс case.button (Farm). Высота spacing.button (36 в Farm, 48 в Cars 2, на iPad 64 / 72); зона нажатия — не меньше 44. У lp — surface.cta-lp, буквы surface.cta-lp-text с тенью shadow.cta-lp-text, тени shadow.cta-lp, высота spacing.lp-cta-*. Поведение по ТЗ: «нажато» видно сразу на касании; зона нажатия не меньше 44×44; двойной тап не срабатывает дважды (800 мс); в loading нажатия не проходят, ширина не меняется. Анимируются только transform и opacity.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `variant`? | `'primary' \| 'secondary' \| 'lp'` | `'primary'` |  |
| `size`? | `'md' \| 'sm' \| 'lg'` | `'md'` |  |
| `block`? | `boolean` | `false` | Во всю ширину родителя |
| `loading`? | `boolean` | `false` |  |
| `disabled`? | `boolean` | `false` |  |
| `shine`? | `boolean` | `false` |  |
| `type`? | `'button' \| 'submit'` | `'button'` |  |
| `loadingLabel`? | `string` | `undefined` |  |

События: `click(event: MouseEvent)`

Слоты: `default`

### DsCarousel

`@amaya/ui` · Figma: Carousel · `packages/ui/src/components/DsCarousel.vue`

Ряд карточек с прокруткой пальцем: наборы машин «Unlock for $5.99» справа от главной карточки Cars 2. Карточки — слотом, промежуток между ними — полями (gap старые вебвью не знают). Прокрутка нативная, со щелчком к началу карточки. hint — при каждом новом resetKey ряд показывается с середины и плавно едет к началу: видно, что его можно листать (как в InApp). С prefers-reduced-motion — сразу в начале. Когда использовать: карточки разной ширины в ряд. По одному слайду на экран с точками — DsSlides.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `hint`? | `boolean` | `false` |  |
| `resetKey`? | `number \| string` | `undefined` |  |

Слоты: `default`

### DsCheckMark

`@amaya/ui` · Figma: CheckMark · `packages/ui/src/components/DsCheckMark.vue`

Круглая галочка «включено в подписку»: в углу карточек на обороте главной карточки Cars 2. Цвета color.check.bg / color.check.icon, размер — spacing.icon-sm. Украшение: скринридер её пропускает, смысл несёт текст карточки. Когда использовать: отметить, что карточка входит в покупку. Галочки списка — DsBenefitList.

### DsCloseButton

`@amaya/ui` · Figma: CloseButton · `packages/ui/src/components/DsCloseButton.vue`

Крестик, который появляется с задержкой — продуктовая логика пейволлов (в InApp 3 с), её не ломать. Когда использовать: закрыть пейволл или онбординг. Место на экране задаёт экран — сам крестик себя не позиционирует. active=true — экран показан, отсчёт задержки; active=false — крестик прячется и отсчёт сбрасывается, поэтому повторно открытый экран «как новый». До появления нажатие не работает; двойной тап — одно закрытие. Размер через min-width/min-height (грабли InApp: иначе анимация делает из круга овал), зона нажатия — 44×44. Вид из темы: квадрат spacing.close (Farm 32, Cars 2 40, на iPad 64 / 56), значок spacing.close-icon, цвет color.close.icon (Farm — светло-лавандовый на белом, Cars 2 — белый на затемнении), подложки нет.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `label` | `string` |  |  |
| `active`? | `boolean` | `true` |  |
| `delay`? | `number` | `3000` |  |
| `tone`? | `'default' \| 'alt'` | `'default'` | alt — на светлом попапе (color.close.icon-alt): в Cars 2 синий крестик попапа тарифов |

События: `close()`

### DsDots

`@amaya/ui` · Figma: Dots · `packages/ui/src/components/DsDots.vue`

Точки слайдов: сколько всего и какой показан. Цвета color.dot.default / color.dot.active. Когда использовать: под DsSlides. Нажатие на точку — событие select с номером (зона нажатия 44 по высоте). label — подпись для скринридера ключом из сервиса, номер слайда подставляет экран.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `count` | `number` |  |  |
| `active` | `number` |  |  |
| `label`? | `(index: number) => string` | `undefined` |  |

События: `select(index: number)`

### DsFit

`@amaya/ui` · Figma: Fit · `packages/ui/src/components/DsFit.vue`

Подгонка по высоте: содержимое раскладывается в своих размерах, как в макете, и если оно выше места — весь блок уменьшается целиком (transform: scale), вёрстка внутри не меняется и ничего не обрезается. Логическая ширина растёт обратно масштабу, так что после уменьшения блок ровно по месту. Хватает места — масштаб 1, ничего не делается. Когда использовать: экран без прокрутки (пейволл), который должен целиком помещаться и на низких экранах — iPhone SE в альбомной (568×320), вебвью в половину окна. Не для текста, который можно прокрутить. Сколько высоты нужно содержимому — по умолчанию его естественная высота (scrollHeight). Если содержимое само растягивается на всю высоту (ряд с прокруткой), нужную высоту даёт экран: проп measure. Пересчёт — при изменении размера блока и содержимого (смена языка, другие тарифы); до первой отрисовки. Сам блок — position: relative (ds:absolute снаружи его не перебьёт): чтобы поставить блок абсолютно, оберните его в позиционированный div и дайте DsFit ds:size-full. Высота блока должна быть задана — иначе подгонять не к чему.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `measure`? | `() => number` | `undefined` |  |
| `minScale`? | `number` | `0.6` | Меньше не уменьшаем: текст должен оставаться читаемым |

Слоты: `default`

### DsGameTitle

`@amaya/ui` · Figma: GameTitle · `packages/ui/src/components/DsGameTitle.vue`

Игровой заголовок: в Cars 2 — Nunito 900 с белой обводкой вокруг букв, в base/Farm — без обводки. Цвета color.title.fill / .accent / .stroke, толщина обводки line.display (display-*) и line.title (title-*). Когда использовать: крупный заголовок пейволла или лендинга в стиле игры. Обычный заголовок — DsText. Выделенные слова — тегом <em> внутри (цвет color.title.accent): «<em>All cars</em> and <em>20+ fun apps</em>». Текст с выделением собирается из ключей через <i18n-t> — склеивать строки в коде нельзя. Строки разного размера (крупная первая и мельче остальные, как на карточке Cars 2) — два заголовка подряд.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `variant`? | `Variant` | `'title-lg'` |  |
| `align`? | `'start' \| 'center' \| 'end'` | `'center'` |  |
| `as`? | `'h1' \| 'h2' \| 'h3' \| 'p' \| 'div'` | `'h1'` |  |

Слоты: `default`

### DsIcon

`@amaya/ui` · Figma: Icon · `packages/ui/src/components/DsIcon.vue`

Иконка из набора @amaya/icons. Цвет — цвет текста вокруг (currentColor), размер — токены spacing.icon-*. Когда использовать: любая иконка. Без label — украшение (скринридер её пропускает), с label — значимая картинка.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `name` | `DsIconName` |  |  |
| `size`? | `'sm' \| 'md' \| 'lg' \| 'fill'` | `'md'` | fill — во всю обёртку: размер задаёт обёртка (крестик берёт spacing.close-icon) |
| `label`? | `string` | `undefined` |  |

### DsIconButton

`@amaya/ui` · Figma: IconButton · `packages/ui/src/components/DsIconButton.vue`

Круглая кнопка со значком: «i» на главной карточке Cars 2 — перевернуть карточку и показать подробности. Заливка surface.info (в Cars 2 — синий градиент), рамка и значок color.info.*, тень shadow.info, размер spacing.icon-button (40, на iPad 56). Зона нажатия не меньше 44×44, «нажато» — сразу на касании. Когда использовать: второстепенное действие значком. Закрыть экран — DsCloseButton. label — ключом из сервиса.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `icon` | `DsIconName` |  |  |
| `label` | `string` |  |  |
| `pressedState`? | `boolean` | `undefined` | Состояние «включено» для скринридера: подробности открыты |

События: `click()`

### DsImage

`@amaya/ui` · Figma: Image · `packages/ui/src/components/DsImage.vue`

Картинка по конвенции small/medium/large × 1x/2x × png/webp: браузер сам берёт размер под экран (телефон от 844 px, iPad — от 844 px при высоте от 600), webp — где понимает, иначе png. Один файл (например, SVG значка) — проп src. Когда использовать: любая картинка — арт, иконка игры, значок стора. <img> напрямую не пишем. ratio занимает место до загрузки — экран не прыгает; событие load — для «готов» у пейволла.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `set`? | `DsImageSet` | `undefined` |  |
| `src`? | `string` | `undefined` |  |
| `alt` | `string` |  |  |
| `fit`? | `'contain' \| 'cover'` | `'contain'` |  |
| `position`? | `'center' \| 'top' \| 'bottom' \| 'right-bottom'` | `'center'` |  |
| `size`? | `'fill' \| 'intrinsic'` | `'fill'` |  |
| `ratio`? | `string` | `undefined` | «16 / 9»: место под картинку занято до загрузки |
| `loading`? | `'eager' \| 'lazy'` | `'eager'` |  |
| `priority`? | `'high' \| 'low' \| 'auto'` | `'auto'` |  |

События: `load()`; `error()`

### DsLegalLinks

`@amaya/ui` · Figma: LegalLinks · `packages/ui/src/components/DsLegalLinks.vue`

Строка документов внизу пейволла: Terms · Privacy · Restore. Тексты — пропсами, ключами из сервиса (common.link.terms_of_use, common.link.privacy_policy, common.button.restore); нет текста — нет ссылки. Когда использовать: низ пейволла и футер лендинга. Компонент только отдаёт события: адреса документов, родительский гейт и восстановление покупок — дело экрана (интерфейс окружения), он не знает про InApp. Вид по макетам Cars 2 и Farm: подчёркнутые ссылки стилем text.legal через промежуток, без точек. На узком экране строка переносится. Если ссылки стоят в разных углах экрана (Cars 2) — экран ставит DsLink сам.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `terms`? | `string` | `undefined` |  |
| `privacy`? | `string` | `undefined` |  |
| `restore`? | `string` | `undefined` |  |
| `tone`? | `'link' \| 'secondary' \| 'muted' \| 'inverse'` | `'link'` |  |
| `label`? | `string` | `undefined` | Подпись блока для скринридера |

События: `terms()`; `privacy()`; `restore()`

### DsLink

`@amaya/ui` · Figma: Link · `packages/ui/src/components/DsLink.vue`

Ссылка-текст. С href — обычная ссылка в новой вкладке; без href — кнопка с событием click (например, «Restore purchases»: что делать, решает экран). Когда использовать: ссылка внутри текста или в строке документов (DsLegalLinks). Основное действие — DsButton. Зона нажатия добирается до 44×44 невидимым слоем — строка текста не раздувается. Двойной тап — одно действие.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `href`? | `string` | `undefined` |  |
| `tone`? | `'link' \| 'primary' \| 'secondary' \| 'muted' \| 'inverse' \| 'inherit'` | `'link'` |  |
| `underline`? | `boolean` | `true` |  |

События: `click(event: MouseEvent)`

Слоты: `default`

### DsOutlineText

`@amaya/ui` · Figma: OutlineText · `packages/ui/src/components/DsOutlineText.vue`

Текст с обводкой снаружи букв: игровой заголовок (DsGameTitle), надпись на кнопке Cars 2 (DsButton). Цвет и толщина — CSS-значениями из токенов (например var(--ds-color-title-stroke), var(--ds-line-title)): тема без обводки ставит толщину 0, и компонент выглядит как обычный текст. Когда использовать: внутри своих компонентов дизайн-системы; на экране — DsGameTitle или DsButton. Два слоя одного текста: снизу копия с обводкой двойной толщины, сверху заливка — обводка получается снаружи букв, как Outside stroke в Figma. Так работает во всех вебвью: paint-order для обычного текста старые Android (Chrome до 123) не понимают, а SVG-текст приходится мерить по ширине. Переносы у слоёв совпадают — текст один.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `color` | `string` |  | CSS-цвет обводки |
| `width` | `string` |  | CSS-толщина обводки снаружи букв |

Слоты: `default`

### DsPlanCard

`@amaya/ui` · Figma: PlanCard · `packages/ui/src/components/DsPlanCard.vue`

Карточка тарифа: название, цена, период, приписка («3 days free»), плашка («Best offer»). Когда использовать: только внутри DsPlanPicker — выбор, клавиатуру и блокировку на время покупки держит он. Две раскладки: split — название слева, цена справа (Farm, стиль Amaya Plus); stack — радиокнопка и строки столбиком (попап тарифов Cars 2). Вид из темы: фон и рамка color.plan.*, толщина рамки line.plan / line.plan-selected, поля spacing.plan-x / plan-y, радиус radius.plan. tint — свои цвета у тарифа (Farm On click): рамка всегда, фон у выбранного. emphasis — название и цена жирные (тариф с триалом, тарифы On click). Рамка нарисована тенью внутрь, а не border: у выбранной она толще, и вёрстка от этого не сдвигается.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `selected`? | `boolean` | `false` |  |
| `title`? | `string` | `undefined` |  |
| `subtitle`? | `string` | `undefined` |  |
| `price`? | `string` | `undefined` |  |
| `period`? | `string` | `undefined` |  |
| `note`? | `string` | `undefined` |  |
| `badge`? | `string` | `undefined` |  |
| `layout`? | `'split' \| 'stack'` | `'split'` |  |
| `indicator`? | `'radio' \| 'none'` | `'none'` |  |
| `tint`? | `'sky' \| 'violet' \| 'pink'` | `undefined` |  |
| `emphasis`? | `boolean` | `false` |  |
| `disabled`? | `boolean` | `false` |  |

События: `select()`

### DsPlanPicker

`@amaya/ui` · Figma: PlanPicker · `packages/ui/src/components/DsPlanPicker.vue`

Выбор тарифа: группа карточек DsPlanCard, выбран всегда один. Тарифы — массивом (тексты уже переведены экраном, цены — из стора). Когда использовать: любой список тарифов на пейволле — 2, 3 или больше. Как радиокнопки: стрелки переводят выбор, Tab попадает только в выбранную карточку. Выбор — на касании карточки. disabled — идёт покупка: карточки не нажимаются. Раскладка column — столбиком (Farm), row — в ряд (Cars 2). Ряд может не поместиться (телефон в портрете): тогда он внутри DsCarousel, и карточка, которой коснулись, выезжает к центру. Промежуток между карточками — полями, не gap (старые вебвью).

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `plans` | `DsPlan[]` |  |  |
| `modelValue` | `number` |  |  |
| `direction`? | `'column' \| 'row'` | `'column'` |  |
| `layout`? | `'split' \| 'stack'` | `'split'` |  |
| `indicator`? | `'radio' \| 'none'` | `'none'` |  |
| `disabled`? | `boolean` | `false` |  |
| `label`? | `string` | `undefined` |  |

События: `update:modelValue(index: number)`

### DsPopup

`@amaya/ui` · Figma: Popup · `packages/ui/src/components/DsPopup.vue`

Попап снизу поверх экрана: затемнение и панель, которая выезжает снизу (попап «More Plans» Cars 2). Содержимое и крестик — слотом: где крестик и как выглядит шапка, решает экран. Закрывается касанием затемнения и клавишей Esc — событие close. Если содержимое выше видимой панели (прижато к низу во всю высоту экрана) и его пустая часть пропускает касания (pointer-events: none), касание там тоже закрывает попап. Затемнение color.bg.backdrop; анимации — только opacity и transform. Когда использовать: дополнительный выбор поверх пейволла. Не для подтверждений и не для длинных текстов.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `open` | `boolean` |  |  |
| `label`? | `string` | `undefined` |  |

События: `close()`

Слоты: `default`

### DsPriceTag

`@amaya/ui` · Figma: PriceTag · `packages/ui/src/components/DsPriceTag.vue`

Цена на плашке и строка под ней: «$0.96 / week» на светлой плашке, ниже «Just $49.99/year» (главная карточка Cars 2). Когда использовать: крупная цена в шапке пейволла. Цены в карточках тарифов — DsPlanCard. Тексты уже собраны экраном из ключей (цена подставлена). Цвета color.price.*, стиль текста text.body / text.price.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `price` | `string` |  | Строка на плашке |
| `sub`? | `string` | `undefined` | Строка под плашкой |

### DsRating

`@amaya/ui` · Figma: Rating · `packages/ui/src/components/DsRating.vue`

Звёзды рейтинга: value из max (по умолчанию 5), целые — половинок в макетах нет. Цвет — color.lp.star, размер звезды — spacing.lp-star; незаполненные — та же звезда бледнее. Подпись для скринридера — снаружи, ключом из сервиса (ds.rating.aria.label с {rating}); сами звёзды — украшение. Когда использовать: отзывы на лендинге.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `value` | `number` |  |  |
| `max`? | `number` | `5` |  |
| `label` | `string` |  | «Оценка 5 из 5» для скринридера |

### DsRive

`@amaya/ui` · Figma: Rive · `packages/ui/src/components/DsRive.vue`

Rive-анимация из файла .riv: артборд и стейт-машина (по умолчанию — первые в файле, как в редакторе Rive). Сначала — постер (картинка по конвенции), анимация проявляется поверх, когда нарисован первый кадр; не загрузилась — постер остаётся. Рантайм грузится, только когда анимация подъезжает к экрану; за экраном она на паузе. Когда использовать: живой арт пейволла и лендинга (гонка на карточке Cars 2, шарики в попапе). Текстов в анимации нет — тексты рядом, ключами из сервиса. Нажатия внутри — Listeners файла; прокрутку страницы они не держат.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `src` | `string` |  | Адрес файла: import animation from './animation.riv?url' |
| `artboard`? | `string` | `undefined` |  |
| `stateMachine`? | `string` | `undefined` |  |
| `animations`? | `string[]` | `undefined` |  |
| `fit`? | `'contain' \| 'cover' \| 'fill' \| 'fitWidth' \| 'fitHeight' \| 'layout'` | `'contain'` |  |
| `alignment`? | `'center' \| 'topCenter' \| 'bottomCenter' \| 'centerLeft' \| 'centerRight'` | `'center'` |  |
| `poster`? | `DsImageSet` | `undefined` |  |
| `alt` | `string` |  |  |
| `ratio`? | `string` | `undefined` | «16 / 9»: место занято до загрузки — экран не прыгает |
| `autoplay`? | `boolean` | `true` | false — первый кадр без движения |
| `bindViewModel`? | `boolean` | `false` | Файл с data binding: привязать view model артборда. Без неё рантайм пишет ошибку в консоль — поэтому не всегда |

События: `load(rive: RiveInstance)` — Анимация загружена и запущена: экземпляр — чтобы экран управлял inputs и view model; `error(error: unknown)` — Не загрузился рантайм или файл: на месте остаётся постер; `event(name: string, data: unknown)` — Rive Event из файла: имя и данные

### DsRoot

`@amaya/ui` · Figma: Root · `packages/ui/src/components/DsRoot.vue`

Корень экрана дизайн-системы: внутри действуют сброс стилей и тема (атрибут data-ds-theme), снаружи — стили хоста (InApp, Pages Hub) не задеты. Новая игра — новая тема в @amaya/tokens, компоненты внутри не меняются. Когда использовать: один раз на экран — шаблоны пейволлов (Pw*) и LkPage ставят его сами.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `theme`? | `DsTheme` | `'base'` |  |
| `lang`? | `string` | `undefined` | Язык текстов внутри: переносы по словам и кавычки браузер берёт отсюда |

Слоты: `default`

### DsSlides

`@amaya/ui` · Figma: Slides · `packages/ui/src/components/DsSlides.vue`

Слайды по одному на экран с точками и автопрокруткой (левая половина пейволла Farm: «25+ Apps», «Play offline»…). Содержимое слайда — слотом #slide с номером. Листается пальцем (нативная прокрутка со щелчком на слайд), сам — раз в interval мс, только пока playing (экран открыт) и блок виден; пауза, пока палец на слайдах. С prefers-reduced-motion сам не листает. Новое значение resetKey — сразу на первый слайд (повторное открытие экрана). Событие change — номер показанного слайда (экран шлёт по нему аналитику). Когда использовать: несколько равноправных слайдов. Ряд карточек разной ширины — DsCarousel.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `count` | `number` |  |  |
| `playing`? | `boolean` | `true` |  |
| `interval`? | `number` | `6000` |  |
| `dots`? | `boolean` | `true` |  |
| `dotsOverlay`? | `boolean` | `false` |  |
| `resetKey`? | `number \| string` | `undefined` |  |
| `dotLabel`? | `(index: number) => string` | `undefined` | Подпись точки для скринридера: экран подставляет номер в ключ из сервиса |

События: `change(index: number)`

Слоты: `slide`

### DsSpinner

`@amaya/ui` · Figma: Spinner · `packages/ui/src/components/DsSpinner.vue`

Спиннер — вращение через transform. Цвет по умолчанию — цвет текста вокруг (в кнопке — цвет её текста). Когда использовать: идёт покупка или загрузка (DsButton с loading показывает его сам). label — ключом из сервиса.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `size`? | `'sm' \| 'md' \| 'lg'` | `'md'` |  |
| `tone`? | `'current' \| 'accent' \| 'inverse'` | `'current'` |  |
| `label`? | `string` | `undefined` |  |

### DsStack

`@amaya/ui` · Figma: Stack · `packages/ui/src/components/DsStack.vue`

Стек — колонка или строка с отступом между детьми из шкалы 4 px (gap 4 = 16 px). Когда использовать: любая раскладка «друг под другом» или «в ряд» внутри экрана. Отступ — margin (ds:space-*), а не gap: старые вебвью gap у flex не понимают (конвенции InApp).

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `direction`? | `'vertical' \| 'horizontal'` | `'vertical'` |  |
| `gap`? | `Gap` | `0` |  |
| `align`? | `'stretch' \| 'start' \| 'center' \| 'end'` | `'stretch'` | stretch по умолчанию: center сжимает детей по ширине (грабли InApp с клиентской шириной) |
| `justify`? | `'start' \| 'center' \| 'end' \| 'between'` | `'start'` |  |
| `as`? | `'div' \| 'section' \| 'ul' \| 'ol' \| 'nav' \| 'footer' \| 'header'` | `'div'` |  |

Слоты: `default`

### DsStoreBadges

`@amaya/ui` · Figma: StoreBadges · `packages/ui/src/components/DsStoreBadges.vue`

Значки App Store и Google Play со ссылками в сторы. Значок, адрес и подпись — снаружи: у Apple и Google значки свои для каждого языка, а UTM в адрес добавляет лендинг. Событие click(store) — для track(), сам компонент аналитику не шлёт. Когда использовать: первый экран, финальная кнопка и футер лендинга.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `appStore`? | `DsStoreBadge` | `undefined` |  |
| `googlePlay`? | `DsStoreBadge` | `undefined` |  |

События: `click(store: DsStore)`

### DsText

`@amaya/ui` · Figma: Text · `packages/ui/src/components/DsText.vue`

Текст в стиле токенов: размер сам меняется на 844 px и на iPad (от 844 × 600) и свой у каждой темы, шрифт и капс — из темы. Когда использовать: любой текст на экране. Сам текст приходит снаружи (слот) — ключом из сервиса, компонент не переводит. Игровой заголовок с обводкой — DsGameTitle.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `variant`? | `DsTextVariant` | `'body'` |  |
| `tone`? | `DsTextTone` | `'primary'` |  |
| `align`? | `'start' \| 'center' \| 'end'` | `undefined` |  |
| `as`? | `'p' \| 'span' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'label'` | `'p'` |  |

Слоты: `default`

### DsTrialToggle

`@amaya/ui` · Figma: TrialToggle · `packages/ui/src/components/DsTrialToggle.vue`

Переключатель триала: строка «Free trial» с тумблером, нажимается вся строка. v-model — modelValue. Когда использовать: пейволл, где триал включают отдельно от выбора тарифа (Farm On start). Текст — ключом из сервиса. Цвета color.switch.* (дорожка, включённая дорожка, бегунок), рамка строки — color.plan.border и line.plan. Высота строки — spacing.button (в Farm 36), зона нажатия — не меньше 44. Бегунок едет через transform; disabled — идёт покупка.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `modelValue` | `boolean` |  |  |
| `label` | `string` |  |  |
| `disabled`? | `boolean` | `false` |  |

События: `update:modelValue(value: boolean)`

### DsVideo

`@amaya/ui` · Figma: Video · `packages/ui/src/components/DsVideo.vue`

Видео с постером: до нажатия видна только картинка (DsImage) и кнопка «▶», ролик не качается (preload="none"). По нажатию — играет со звуком и с родными кнопками плеера: play() вызывается в самом обработчике нажатия, иначе iOS не даст включить звук. Ушло с экрана — пауза. Событие play — для track(), сам компонент аналитику не шлёт. Когда использовать: геймплей на лендинге. Подпись кнопки для скринридера — снаружи (ds.video.play.label). Вид: скругление radius.lp-video, тени shadow.lp-video, рамка color.lp.video-line, кнопка color.video.*.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `src` | `string` |  |  |
| `poster` | `DsImageSet` |  |  |
| `label` | `string` |  | Подпись кнопки «▶» |
| `loadPoster`? | `boolean` | `true` | false — постер пока не грузить: первому экрану нужна сеть. Место под видео уже занято |
| `ratio`? | `string` | `'16 / 9'` | Место под видео занято до загрузки — страница не прыгает |
| `type`? | `string` | `'video/mp4'` |  |

События: `play()`

### DsWipe

`@amaya/ui` · Figma: Wipe · `packages/ui/src/components/DsWipe.vue`

Картинка под слоем грязи: ведёшь пальцем — грязь стирается, как на автомойке в игре. Стёрто достаточно — слой уходит целиком, событие done. Без скрипта и пока блок не подъехал к экрану видна чистая картинка: ничего не ломается. Когда использовать: мини-интерактив на лендинге. Звук и похвала — снаружи, по событиям. label — подпись для скринридера. Вид: цвет грязи color.wipe.mud; грязь ложится только на непрозрачные части картинки. Палец: вертикальное движение прокручивает страницу как обычно, стирают движением вбок и наискосок (touch-action: pan-y). Клавиатура: Enter и пробел моют сразу.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `set` | `DsImageSet` |  |  |
| `label` | `string` |  |  |
| `ratio`? | `string` | `undefined` | «56 / 52»: место занято до загрузки |
| `threshold`? | `number` | `0.7` |  |
| `resetKey`? | `number \| string` | `undefined` | Смена значения снова пачкает картинку |

События: `start()` — Палец опустился: можно включать звук; `stroke(x: number, y: number)`; `stop()` — Палец поднялся или страницу начали прокручивать; `done()` — Картинка чистая

## Шаблоны пейволлов

### PwHeroSlider

`@amaya/paywall-kit` · Figma: HeroSlider · `packages/paywall-kit/src/templates/PwHeroSlider.vue`

Шаблон пейволла «главная карточка и карусель наборов» (Cars 2; повторяет InApp cars2 tm11 pw-slider, вариант B). - Главная карточка: заголовок игры, цена в неделю на плашке и цена за год; касание карточки или кнопки — покупка года (с триалом, если его ещё не было). «i» переворачивает карточку: что входит в подписку. - «More Plans» — попап снизу с тремя тарифами (год с триалом, год, неделя с триалом). - Справа — наборы машин разовой покупкой; если подписка уже есть или куплено всё — только главная карточка. Логика экрана — usePaywall; тексты — ключи сервиса из конфига; цены — из стора.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `env` | `PaywallEnv` |  |  |
| `theme`? | `DsTheme` |  | Другая тема поверх конфига — для Storybook |
| `forcePurchasing`? | `boolean` |  | Для Storybook: показать «идёт покупка» |
| `config` | `HeroSliderConfig` |  |  |

### PwPlusSplit

`@amaya/paywall-kit` · Figma: PlusSplit · `packages/paywall-kit/src/templates/PwPlusSplit.vue`

Шаблон пейволла Amaya Plus: слева слайды с артом и точками, справа заголовок, тарифы, кнопка и документы. Два режима из конфига (повторяют InApp farm tm4, вариант B): - switch («On start»): преимущества, тумблер «Free trial», год без триала с плашкой и неделя; тумблер меняет неделю на неделю с триалом и выбирает её; - trio («On click»): неделя, месяц и год с триалом, у каждого свой цвет; под кнопкой — условия триала. Логика экрана — usePaywall; тексты — ключи сервиса (PLUS_TEXTS, конфиг может заменить); цены — из стора. Раскладка — две половины экрана (телефон в альбомной, iPad); в портретной — слайды сверху, тарифы снизу.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `env` | `PaywallEnv` |  |  |
| `theme`? | `DsTheme` |  | Другая тема поверх конфига — для Storybook |
| `forcePurchasing`? | `boolean` |  | Для Storybook: показать «идёт покупка» |
| `config` | `PlusConfig` |  |  |

## Блоки лендинга

### LkBurst

`@amaya/landing-kit` · Figma: Burst · `packages/landing-kit/src/blocks/LkBurst.vue`

Звёздочки разлетаются от точки нажатия: отклик интерактива на касании, только transform и opacity. Когда использовать: внутри блока с position: relative; запуск — fire(x, y) через ref, координаты в px от угла блока. Цвет — color.lp.sign, размер — spacing.lp-road-star.

### LkCta

`@amaya/landing-kit` · Figma: Cta · `packages/landing-kit/src/blocks/LkCta.vue`

Главная кнопка лендинга по центру: стор по платформе (useLanding().cta). Без config.cta блока нет: вход в стор значками.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `source` | `string` |  |  |

### LkFaq

`@amaya/landing-kit` · Figma: Faq · `packages/landing-kit/src/blocks/LkFaq.vue`

Вопросы и ответы: заголовок на цветной секции и аккордеон (DsAccordion) в карточках, как у отзывов.

### LkFeatures

`@amaya/landing-kit` · Figma: Features · `packages/landing-kit/src/blocks/LkFeatures.vue`

Преимущества: иллюстрация, заголовок и пояснение — две колонки (160 на телефоне, 300 от 640 px), под ними кнопка. Колонка — половина ряда минус поля, но не шире макета: где двум колонкам с полями тесно (телефон уже 360, ширина 640–663), они сужаются, а не переносятся по одной.

### LkFooter

`@amaya/landing-kit` · Figma: Footer · `packages/landing-kit/src/blocks/LkFooter.vue`

Футер: копирайт и документы — столбиком на телефоне, в строку от 640 px. Документы открываются в новой вкладке.

### LkHeader

`@amaya/landing-kit` · Figma: Header · `packages/landing-kit/src/blocks/LkHeader.vue`

Шапка лендинга: логотип на цветной секции.

### LkHero

`@amaya/landing-kit` · Figma: Hero · `packages/landing-kit/src/blocks/LkHero.vue`

Первый экран: арт (живой Rive — во весь арт — проявляется после загрузки страницы), голубая «капля» с заголовком, подзаголовком, строкой про сторы, главной кнопкой и значками сторов, и две цветные плашки-преимущества: на телефоне — внизу «капли», от 640 px — по её бокам, как в макете 768. «Капля» и плашки — фигуры из макета (Figma 38:174, 38:179, 38:182), цвет — из темы; длинный текст растягивает «каплю» вниз, плашки держатся за её низ (телефон) или верх (широкий экран).

### LkInteractive

`@amaya/landing-kit` · Figma: Interactive · `packages/landing-kit/src/blocks/LkInteractive.vue`

Обёртка интерактива лендинга (Rive, позже GSAP): содержимое монтируется, только когда страница уже загружена, первый экран отрисован и отвечает на нажатия — после load, паузы (delay, по умолчанию 2,5 с) и простоя браузера. Интерактив — украшение: его рантайм и файлы (у Rive — wasm 2,6 МБ и .riv) не должны спорить с первым экраном за сеть и процессор. С экономией трафика (Save-Data), на сети 2G/3G и без видеокарты не грузится вовсе; не потянул на деле (меньше 24 кадров в секунду) — снимается вместе с остальными интерактивами страницы. Под обёрткой должна лежать картинка: она видна до интерактива и остаётся, если тот не загрузился или выключен. Когда использовать: любой интерактив лендинга. Rive — DsRive внутри, его событие load передать в started из слота: с этого момента считаются кадры. GSAP — динамическим импортом внутри, когда понадобится.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `delay`? | `number` | `2500` |  |

Слоты: `default`

### LkPage

`@amaya/landing-kit` · Figma: Page · `packages/landing-kit/src/blocks/LkPage.vue`

Лендинг целиком по конфигу: шапка, первый экран, преимущества, видео, синий блок (отзывы, FAQ, финальная кнопка), футер. Колонка шириной до 768 (spacing.lp-column): на телефоне и планшете — во весь экран, на широком — белая карточка со скруглением на фоне color.lp.page, как кадр в макете. Тема — из конфига, язык — у vue-i18n приложения. Когда использовать: страница лендинга (apps/landings) и её история в Storybook. Новый лендинг — новый конфиг.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `config` | `LandingConfig` |  |  |

### LkReviews

`@amaya/landing-kit` · Figma: Reviews · `packages/landing-kit/src/blocks/LkReviews.vue`

Отзывы: карточки 286 px — одна колонка на телефоне, две от 640 px; кавычка, звёзды, текст и автор.

### LkRoadFeatures

`@amaya/landing-kit` · Figma: RoadFeatures · `packages/landing-kit/src/blocks/LkRoadFeatures.vue`

Преимущества на дороге: заголовок для родителей и карточки-таблички вдоль разметки, картинки ждут первый экран. Когда использовать: лендинг с config.road. Цвета — color.lp.section, surface.lp-card.

### LkRoadFinish

`@amaya/landing-kit` · Figma: RoadFinish · `packages/landing-kit/src/blocks/LkRoadFinish.vue`

Финиш внизу страницы: команда на старт и значки сторов, по бокам шарики. Шарики — картинка, поверх проявляется Rive (LkInteractive); вне экрана анимация стоит, не загрузилась — остаётся картинка. Когда использовать: лендинг с config.road. Цвета — color.lp.sign, размер шариков — spacing.lp-road-balloons-w.

### LkRoadHero

`@amaya/landing-kit` · Figma: RoadHero · `packages/landing-kit/src/blocks/LkRoadHero.vue`

Первый экран дорожного лендинга: сверху логотип и заголовок на небе, под ними живая сцена, внизу на асфальте значки сторов — они видны и нажимаются сразу. Сцена — картинка (кадр той же анимации, она же LCP), поверх неё через LkInteractive проявляется Rive из той же позы и играет постоянно; вне экрана стоит, не загрузился — остаётся картинка. На телефоне сцена видна целиком, поэтому высота блока — по содержимому. На экране шире сцена заполняет его за текстом. Когда использовать: первый экран лендинга с config.road. Цвета — color.lp.sky, color.lp.section.

### LkRoadLayout

`@amaya/landing-kit` · Figma: RoadLayout · `packages/landing-kit/src/blocks/LkRoadLayout.vue`

Дорожная раскладка лендинга: страница как поездка — живой первый экран, автомойка, миры, преимущества, видео, отзывы, FAQ и финиш. Блоки во всю ширину, между ними дорожные полосы. Вход в стор — значки; закреплённая кнопка — по stickyCta. Когда использовать: включается сама, если в конфиге есть road; LkPage выбирает раскладку.

### LkRoadWash

`@amaya/landing-kit` · Figma: RoadWash · `packages/landing-kit/src/blocks/LkRoadWash.vue`

Мини-автомойка: грязная машина, которую ребёнок моет пальцем (DsWipe) — пена, шум воды, а когда чисто, машина радостно подпрыгивает. Интерактив не перекрывает значки сторов: это отдельный блок. Вне экрана подсказка стоит, звук только после касания. Когда использовать: лендинг с config.road. Цвета — color.lp.sign, color.lp.on-sign; размер — spacing.lp-road-truck-w.

### LkRoadWorlds

`@amaya/landing-kit` · Figma: RoadWorlds · `packages/landing-kit/src/blocks/LkRoadWorlds.vue`

Миры игры: заголовок и ряд ярких карточек с наборами машин. На телефоне и планшете ряд листается пальцем (DsCarousel) и намекает на это сам, на компьютере листать мышью неудобно: все карточки стоят в ряд по центру. Когда использовать: лендинг с config.road. Цвета — color.lp.section, размеры — spacing.lp-road-world-*.

### LkStickyCta

`@amaya/landing-kit` · Figma: StickyCta · `packages/landing-kit/src/blocks/LkStickyCta.vue`

Закреплённая кнопка внизу экрана телефона: выезжает, когда первый экран ушёл из вида, и прячется, когда он вернулся. Только transform. От 640 px не показывается. Включается в конфиге (stickyCta) — у Cars 2 выключена.

### LkStores

`@amaya/landing-kit` · Figma: Stores · `packages/landing-kit/src/blocks/LkStores.vue`

Значки App Store и Google Play лендинга: адреса с UTM из адреса страницы, нажатие уходит в track. Когда использовать: везде, где на лендинге нужен вход в стор. source — какой блок, для аналитики.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `source` | `string` |  |  |

### LkStripe

`@amaya/landing-kit` · Figma: Stripe · `packages/landing-kit/src/blocks/LkStripe.vue`

Дорожная полоса между блоками: шевроны ограждения, клетки финиша или прерывистая разметка посреди асфальта. Когда использовать: граница секций дорожного лендинга. Цвета — color.lp.sign, color.lp.section, высота spacing.lp-road-stripe-h.

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `kind`? | `'chevron' \| 'checker' \| 'dashes'` | `'chevron'` |  |

### LkVideo

`@amaya/landing-kit` · Figma: Video · `packages/landing-kit/src/blocks/LkVideo.vue`

Видео геймплея над синим блоком отзывов: до нажатия — постер, ролик не качается (DsVideo).

| Проп | Тип | По умолчанию | Пояснение |
| --- | --- | --- | --- |
| `plain`? | `boolean` | `false` | Без отступа сверху и заезда на блок снизу: заголовок и фон — у раскладки |
