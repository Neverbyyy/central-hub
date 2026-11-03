# apps/inapp-preview — экраны пейволлов как варианты InApp

Папка экрана устроена как вариант InApp, чтобы потом её можно было перенести почти без изменений:
`src/variants/ios/as/<игра>/ds1/<экран>/`

```
index.vue    шаблон (Pw*) с конфигом; пропсы env (PaywallEnv), theme?, forcePurchasing? — как у pw-switch/index.vue
config.ts    тема, продукты по сегментам, ключи текстов, арт (imageSetFromFiles по папке art/)
presets.ts   данные приложения для проверки: default, wasTrial, noProduct, другой сегмент, евро
art/         картинки по конвенции <имя>-{small,medium,large}{,@2x}.{png,webp}
```

Общее для нескольких экранов игры (арт, пресеты, тексты Amaya Plus) — в `<игра>/ds1/common/` (так у Farm).

- Экран регистрируется в `src/variants/index.ts`: `id` — имя варианта как в InApp
  (`ios_as_farm_ds1_varb_ut1_pw_switch_v1`), `match` — шаблон имени, `load` и `presets` — ленивые импорты.
- История — `src/stories/<Экран>.stories.ts` через `screenStory` (одна история на экран, пресеты в панели):
  пейволлы — раздел «Пейволлы», онбординги — «Онбординги» (папка `onboarding/`, см. скилл `ds-new-paywall`).
- Запуск: `pnpm --filter @amaya/inapp-preview dev` (6020). Корень — эмулятор InApp (`src/emulator/`): экран в iframe
  по настоящему протоколу, панель (пресеты, язык, устройство, итог покупки), лог с подозрительным, ссылка на сценарий.
  `?variant=…&preset=default&lang=de` — только экран, без приложения, для проверки на телефоне.
- Сценарии ТЗ — `pnpm --filter @amaya/inapp-preview scenarios` (`scripts/scenarios.mjs`; новый экран — добавить
  в `SCREENS` скрипта). Метки для скрипта в разметке экрана: `data-pw="cta"` (главная кнопка), `data-pw="close"`.
- Эмулятор — инструмент, как Storybook: подписи по-русски и свой CSS; правила дизайн-системы — для `src/variants/`.
- Папки экранов — под правилами дизайн-системы: без текста, только токены, без `<img>`; Vue 3.3.
