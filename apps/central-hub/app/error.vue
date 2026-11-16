<script setup lang="ts">
import type { NuxtError } from '#app'
import { ru } from '@nuxt/ui/locale'
import art from '~/assets/error/not-found-large.webp'
import art2x from '~/assets/error/not-found-large@2x.webp'

// Своя страница ошибки вместо стандартной английской Nuxt: 404 — «Страница не найдена», остальное — «Что-то сломалось».
// Заменяет app.vue целиком, поэтому UApp — свой; язык, иконка и запрет индексации — общие, в nuxt.config (app.head)
const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useSeoMeta({ title: () => `${notFound.value ? 'Страница не найдена' : 'Ошибка'} — Amaya Central Hub` })

// clearError сбрасывает ошибку и уводит по адресу — обычный переход внутри приложения
const goHome = () => clearError({ redirect: '/' })
// Сломалось при показе страницы — открыть её заново целиком
const reloadPage = () => window.location.reload()
</script>

<template>
  <UApp :locale="ru">
    <!-- Без сайдбара, на весь экран: из ошибки один путь — кнопка. Сцена тёмная в обеих темах: картинка нарисована
         под тёмный фон. Класс dark включает тёмные токены Nuxt UI только внутри сцены — кнопки и текст берут цвета
         тёмной темы -->
    <main class="dark error-scene relative isolate h-dvh overflow-y-auto text-highlighted">
      <div
        class="error-layout mx-auto flex min-h-full max-w-6xl flex-col-reverse items-center justify-center gap-6 px-6 py-10 lg:flex-row lg:justify-between lg:gap-10 lg:pl-16 lg:pr-8"
      >
        <!-- На 500 колонка шире: две кнопки встают в ряд -->
        <section
          class="error-text w-full max-w-md text-center lg:max-w-none lg:shrink-0 lg:text-left"
          :class="notFound ? 'lg:w-[22rem]' : 'lg:w-[26rem]'"
        >
          <p class="error-code relative inline-block text-8xl leading-none font-bold tracking-tighter tabular-nums lg:text-[9rem]">
            {{ error.statusCode }}
            <!-- Три штриха «бум» у угла цифр — как на макете -->
            <svg
              class="error-burst absolute -right-9 -top-3 size-10 origin-bottom-left text-primary lg:-right-12 lg:-top-4 lg:size-14"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              stroke-width="4.5"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M9 21 15 5" />
              <path d="M18 29 33 18" />
              <path d="M21 40h19" />
            </svg>
          </p>

          <h1 class="mt-5 text-2xl font-bold lg:mt-6 lg:text-[2rem] lg:leading-tight">
            {{ notFound ? 'Страница не найдена' : 'Что-то сломалось' }}
          </h1>
          <p class="mx-auto mt-3 max-w-xs text-base text-toned lg:mx-0 lg:text-lg">
            {{ notFound
              ? 'Возможно, она была удалена, переименована или вы перешли по неверной ссылке.'
              : 'Попробуйте обновить страницу. Не помогает — перешлите текст ниже тому, кто поддерживает сервис.' }}
          </p>
          <!-- Что именно сломалось — чтобы было что переслать -->
          <p
            v-if="!notFound && error.message"
            class="mt-4 break-words rounded-lg bg-white/5 px-3 py-2 text-left font-mono text-xs text-muted ring ring-white/10"
          >
            {{ error.message }}
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <UButton
              v-if="!notFound"
              size="xl"
              icon="i-lucide-rotate-cw"
              class="rounded-full px-5"
              @click="reloadPage"
            >
              Обновить страницу
            </UButton>
            <UButton
              size="xl"
              icon="i-lucide-arrow-left"
              :color="notFound ? 'primary' : 'neutral'"
              :variant="notFound ? 'solid' : 'outline'"
              class="rounded-full px-5"
              @click="goHome"
            >
              На главную
            </UButton>
          </div>
        </section>

        <!-- Размеры заданы: место под картинку есть до её загрузки, текст рядом не прыгает. sizes — ширина картинки
             на экране: телефону хватает 1x (320 / 448 px), 2x — экранам с плотностью 2 -->
        <div class="error-art w-full max-w-80 sm:max-w-md lg:max-w-[720px] lg:flex-1">
          <img
            :src="art"
            :srcset="`${art} 640w, ${art2x} 1260w`"
            sizes="(min-width: 1024px) 720px, (orientation: landscape) and (max-height: 32rem) 240px, (min-width: 640px) 448px, 320px"
            width="1260"
            height="720"
            alt=""
            draggable="false"
            class="error-float h-auto w-full select-none"
          >
        </div>
      </div>
    </main>
  </UApp>
</template>

<style scoped>
/* Глубокий синий с подсветкой из углов и за картинкой, как на макете. Цвета сцены свои: в токенах темы такого фона нет.
   color-scheme — полоса прокрутки тоже тёмная, и в светлой теме */
.error-scene {
  color-scheme: dark;
  background-color: #060a1f;
  background-image:
    radial-gradient(55% 50% at 100% 0%, rgb(56 78 255 / 0.32), transparent 70%),
    radial-gradient(45% 45% at 0% 100%, rgb(79 70 229 / 0.26), transparent 70%),
    radial-gradient(40% 45% at 72% 52%, rgb(37 99 235 / 0.2), transparent 70%);
}

/* Едва заметная сетка точек, к краям тает */
.error-scene::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1.5px);
  background-size: 28px 28px;
  mask-image: radial-gradient(65% 60% at 35% 40%, black, transparent);
}

/* Телефон лёжа: картинка сбоку и меньше, цифры мельче — кнопка видна сразу, без прокрутки */
@media (orientation: landscape) and (max-height: 32rem) and (max-width: 1023px) {
  .error-layout {
    flex-direction: row;
    gap: 1.5rem;
    padding-block: 1.5rem;
  }

  .error-code {
    font-size: 4rem;
  }

  .error-art {
    max-width: 15rem;
  }
}

/* Движение — только если человек его не отключил. Появление короткое и только transform / opacity: кнопку можно
   нажать сразу; картинка потом медленно парит — живее, чем статичная */
@media (prefers-reduced-motion: no-preference) {
  .error-text {
    animation: error-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .error-art {
    animation: error-appear 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.05s both;
  }

  .error-burst {
    animation: error-appear 0.35s cubic-bezier(0.3, 1.5, 0.5, 1) 0.25s both;
    --appear-from: 0.4;
  }

  .error-float {
    animation: error-float 6s ease-in-out 0.6s infinite alternate;
  }
}

@keyframes error-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes error-appear {
  from {
    opacity: 0;
    transform: scale(var(--appear-from, 0.96));
  }
}

@keyframes error-float {
  to {
    transform: translateY(-10px);
  }
}
</style>
