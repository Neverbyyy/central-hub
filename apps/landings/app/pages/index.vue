<script setup lang="ts">
// Оглавление стенда лендингов: какие лендинги есть и кнопка на каждый язык — чтобы не набирать адрес руками.
// Служебная страница для команды, не продукт (как эмулятор и Storybook): подписи по-русски, свой CSS, правила
// дизайн-системы на неё не действуют (eslint.config.mjs). Лендинги — реестр app/landings, языки — файлы текстов
// набора ds: новый лендинг или язык появится здесь сам. Закрыта от индексации, как и весь стенд
import { locales } from '@amaya/locales/lazy'
import { useI18n } from 'vue-i18n'
import { LANDINGS } from '~/landings'

const { t } = useI18n()
// Заголовок карточки — title лендинга из сервиса (на английском, как /cars2)
await useLocale('en')

// Порядок — как в сервисе локализации (английский — /cars2 без языка в пути); новый язык — в конец
const ORDER = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']
const languages = [...ORDER.filter(lang => locales.includes(lang)), ...locales.filter(lang => !ORDER.includes(lang))]
const nativeName = (lang: string) => {
  const name = new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang
  return name.charAt(0).toUpperCase() + name.slice(1)
}
const href = (landing: string, lang: string) => (lang === 'en' ? `/${landing}` : `/${landing}/${lang}`)

const landings = Object.entries(LANDINGS).map(([id, config]) => ({ id, config }))

useHead({ htmlAttrs: { lang: 'ru' }, title: 'Лендинги Amaya — стенд' })
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <main class="lp-index">
    <header class="lp-index__header">
      <h1>Лендинги Amaya</h1>
      <p>Стенд: страницы закрыты от поисковиков. Кнопка языка открывает лендинг — ссылку можно отправить.</p>
    </header>

    <ul class="lp-index__list">
      <li
        v-for="landing in landings"
        :key="landing.id"
        class="lp-index__card"
      >
        <a
          class="lp-index__art"
          :href="href(landing.id, 'en')"
          tabindex="-1"
          aria-hidden="true"
        >
          <DsImage
            class="lp-index__img"
            :set="landing.config.hero.art"
            alt=""
            fit="cover"
            position="right-bottom"
          />
        </a>
        <div class="lp-index__body">
          <h2>{{ t(landing.config.meta.title) }}</h2>
          <p class="lp-index__path">
            /{{ landing.id }}
          </p>
          <nav
            class="lp-index__langs"
            :aria-label="`Языки лендинга ${landing.id}`"
          >
            <a
              v-for="lang in languages"
              :key="lang"
              class="lp-index__lang"
              :href="href(landing.id, lang)"
              :hreflang="lang"
            >
              <b>{{ lang.toUpperCase() }}</b>
              <span>{{ nativeName(lang) }}</span>
            </a>
          </nav>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.lp-index {
  box-sizing: border-box;
  min-height: 100vh;
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px 48px;
  font: 15px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #1f2328;
}

.lp-index__header h1 {
  margin: 0;
  font-size: 26px;
}

.lp-index__header p {
  margin: 6px 0 24px;
  color: #57606a;
}

.lp-index__list {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lp-index__card {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #d8dbe0;
  border-radius: 14px;
  background: #fff;
}

.lp-index__art {
  position: relative;
  display: block;
  min-height: 160px;
  background: #e8f6fd;
}

/* Арт первого экрана — во всю левую колонку, какой бы высоты ни была карточка */
.lp-index__img {
  position: absolute;
  inset: 0;
}

.lp-index__body {
  padding: 16px 20px 20px;
}

.lp-index__body h2 {
  margin: 0;
  font-size: 18px;
}

.lp-index__path {
  margin: 2px 0 14px;
  color: #57606a;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
}

.lp-index__langs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 8px;
}

.lp-index__lang {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 10px;
  color: inherit;
  text-decoration: none;
  border: 1px solid #c4c8cf;
  border-radius: 8px;
  transition: transform 0.1s ease, background-color 0.1s ease;
}

.lp-index__lang:hover {
  background: #f3f5f8;
}

.lp-index__lang:active {
  transform: scale(0.97);
}

.lp-index__lang b {
  min-width: 22px;
  font-size: 13px;
}

.lp-index__lang span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Телефон: картинка сверху во всю ширину */
@media (max-width: 600px) {
  .lp-index__card {
    grid-template-columns: 1fr;
  }

  .lp-index__art {
    min-height: 140px;
  }
}
</style>
