# @amaya/paywall-kit — пейволлы и онбординги

Новый пейволл — конфиг и папка экрана, а не вёрстка. Скилл `ds-new-paywall`.

- `PaywallEnv` (`src/env.ts`) — связь с окружением как у InApp: данные (язык, продукты с ценами, был ли триал),
  `open`/`close` от приложения; `ready`, `close`, `purchase` (обещание с итогом), `restore`, `openLegal`, `track`.
  Реализации: `createStubEnv` (Storybook, тесты), `createUniwebviewEnv` (протокол InApp `uniwebview://…`).
- `usePaywall` (`src/usePaywall.ts`) — общая логика: «готов» только после арта, шрифта и цен; нет продукта — экран
  закрывается без «готов»; покупка блокирует экран; номер показа `session` сбрасывает экран при повторном открытии.
- Шаблоны `src/templates/Pw*.vue` и их конфиги (`src/config.ts`): `PwHeroSlider` (Cars 2), `PwPlusSplit` (Farm,
  режимы `switch` и `trio`). Новый шаблон — только если раскладку не даёт ни один из существующих.
- Продукты — по сегментам InApp (`t1`, `u`, `ut1`, `wout1` из имени варианта: `resolveSegment`).
- Цена «в неделю» и скидки — `@amaya/pricing` (формат строки стора сохраняется).
- Шаблоны под правилами экранов: `<img>`/`<video>`/`<canvas>` запрещены — `DsImage`, `DsVideo`, `DsRive`.
