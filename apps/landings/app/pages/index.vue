<script setup lang="ts">
// Оглавление стенда лендингов: какие лендинги есть, выбор языка и кнопка «Открыть» — чтобы не набирать адрес руками.
// Язык выбирается списком, а переход — кнопкой: переход сразу по выбору уводил бы со страницы на каждой стрелке
// клавиатуры. «Открыть» — обычная ссылка: её можно открыть в новой вкладке или скопировать.
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
// Выбранный язык у каждого лендинга свой; по умолчанию английский (/cars2)
const selected = reactive<Record<string, string>>(Object.fromEntries(landings.map(({ id }) => [id, 'en'])))

useHead({ htmlAttrs: { lang: 'ru' }, title: 'Лендинги Amaya — стенд' })
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <main class="lp-index">
    <header class="lp-index__header">
      <h1>Лендинги Amaya</h1>
      <p>Стенд: страницы закрыты от поисковиков. Выберите язык и откройте лендинг — ссылку можно отправить.</p>
    </header>

    <ul class="lp-index__list">
      <li
        v-for="landing in landings"
        :key="landing.id"
        class="lp-index__card"
      >
        <a
          class="lp-index__art"
          :href="href(landing.id, selected[landing.id]!)"
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
            {{ href(landing.id, selected[landing.id]!) }}
          </p>
          <div class="lp-index__open">
            <label class="lp-index__select">
              <span class="lp-index__label">Язык</span>
              <select
                v-model="selected[landing.id]"
                :aria-label="`Язык лендинга ${landing.id}`"
              >
                <option
                  v-for="lang in languages"
                  :key="lang"
                  :value="lang"
                >
                  {{ nativeName(lang) }} · {{ lang.toUpperCase() }}
                </option>
              </select>
            </label>
            <a
              class="lp-index__go"
              :href="href(landing.id, selected[landing.id]!)"
              :hreflang="selected[landing.id]"
            >Открыть</a>
          </div>
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

/* Выбор языка и «Открыть» — в одну строку; на узком экране кнопка уходит под список */
.lp-index__open {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.lp-index__select {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 4px;
  max-width: 320px;
}

.lp-index__label {
  color: #57606a;
  font-size: 13px;
}

.lp-index__select select {
  min-height: 44px;
  padding: 0 36px 0 12px;
  font: inherit;
  color: inherit;
  border: 1px solid #c4c8cf;
  border-radius: 8px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%2357606a' stroke-width='1.6'/%3E%3C/svg%3E") no-repeat right 14px center;
  appearance: none;
  cursor: pointer;
}

.lp-index__select select:focus-visible,
.lp-index__go:focus-visible {
  outline: 2px solid #0969da;
  outline-offset: 2px;
}

.lp-index__go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 22px;
  font-weight: 600;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  background: #1f883d;
  transition: transform 0.1s ease, background-color 0.1s ease;
}

.lp-index__go:hover {
  background: #1a7f37;
}

.lp-index__go:active {
  transform: scale(0.97);
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
