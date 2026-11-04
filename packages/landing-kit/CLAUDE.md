# @amaya/landing-kit — лендинги

Новый лендинг — `LandingConfig` (`src/config.ts`) и арт, `LkPage` собирает страницу. Скилл `ds-new-landing`.

- Блоки `src/blocks/Lk*.vue`: `LkHeader`, `LkHero`, `LkFeatures`, `LkVideo`, `LkReviews`, `LkFaq`, `LkCta`, `LkFooter`,
  `LkStickyCta` (включается `stickyCta`), `LkInteractive` (обёртка интерактива). Блоки берут конфиг через
  `useLanding()` — вне `LkPage` они не работают.
- Главная кнопка — `useLanding().cta(source)`: iOS → App Store, Android → Google Play, компьютер — прокрутка к значкам.
  UTM из адреса — `storeLinks` (`src/store.ts`): App Store — `utm_*` и `ct`, Google Play — `referrer`.
- Все нажатия — через `track(event, props)` (`src/track.ts`); аналитику подключает `setTrackHandler`.
- Порядок загрузки: сначала картинка первого экрана. Картинки преимуществ, постер и Open Sans (он нужен только отзывам и
  футеру) ждут `heroLoaded` из `useLanding()`, иначе делят с ней сеть на мобильном интернете. Новый блок с тяжёлым
  содержимым ниже первого экрана ждёт так же; запасной выход — таймаут в `provideLanding`.
- Вторая раскладка — дорожная: поле `road` в конфиге, `LkPage` рисует `LkRoadLayout` (блоки `LkRoad*`, полосы `LkStripe`,
  вспышка `LkBurst`). Звук автомойки — `src/sound.ts`, синтезом и только из обработчика нажатия.
- Интерактив (Rive, GSAP) — только внутри `LkInteractive`: монтируется через 2,5 с после загрузки, на медленной сети
  не грузится; под ним всегда картинка.
- Вид — токены `lp.*` (`color.lp.*`, `surface.cta-lp`, `text.lp-*`, `spacing.lp-*`), раскладка от 640 px — `ds:wide:`.
  Новая игра меняет значения `lp.*` в своей теме, блоки не меняются.
- Тексты — ключи `web.<сайт>.*` (код сайта — из справочника сервиса) и общие `common.*`, `ds.*`.
