<script setup lang="ts">
// Залитые иконки страниц «Настройки» и «MCP», как в макетах: в lucide только контурные. Контуры шестерёнки, палитры,
// луны и щита — Material Icons (Apache 2.0); «Языки» — два облачка со знаками 文 и A, вырезанными маской (знаки — lucide
// languages). gradient — перелив: violet — иконки разделов, blue — шестерёнка в шапке; check — галочка выбранного варианта
const props = defineProps<{ name: 'gear' | 'palette' | 'languages' | 'moon' | 'shield' | 'check', gradient?: 'violet' | 'blue' }>()

const PATHS = {
  gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  palette: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z'
} as const

// Цвета перелива — шкалы Tailwind (violet-300 → violet-500 с уклоном в индиго, indigo-300 → blue-400): переменные
// Tailwind есть в CSS, только если такой класс где-то использован, поэтому — значениями
const GRADIENTS = { violet: ['#a99df9', '#7b68ee'], blue: ['#a5b4fc', '#6c8ef5'] } as const

// id градиента и маски — свои у каждой иконки: на странице их несколько
const id = useId()
const fill = computed(() => (props.gradient ? `url(#${id}-g)` : 'currentColor'))
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      v-if="name === 'check'"
      d="M5 12.5 10 17l9-10"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <template v-else>
      <defs>
        <linearGradient
          v-if="gradient"
          :id="`${id}-g`"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0"
            :stop-color="GRADIENTS[gradient][0]"
          />
          <stop
            offset="1"
            :stop-color="GRADIENTS[gradient][1]"
          />
        </linearGradient>
        <mask
          v-if="name === 'languages'"
          :id="`${id}-m`"
        >
          <g transform="translate(12 12) scale(0.84) translate(-12 -12)">
            <g fill="#fff">
              <circle
                cx="9.2"
                cy="9.2"
                r="8.4"
              />
              <circle
                cx="16.4"
                cy="16.2"
                r="6.4"
              />
              <path d="M19.6 20.4 23.6 23.4 20.6 18.6z" />
            </g>
            <g
              fill="none"
              stroke="#000"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <g transform="translate(9.2 9.6) scale(0.72) translate(-8 -8)">
                <path d="m5 8 6 6m-7 0 6-6 2-3M2 5h12M7 2h1" />
              </g>
              <g transform="translate(16.6 16.4) scale(0.72) translate(-17 -17)">
                <path d="m22 22-5-10-5 10m2-4h6" />
              </g>
            </g>
          </g>
        </mask>
      </defs>
      <rect
        v-if="name === 'languages'"
        width="24"
        height="24"
        :fill="fill"
        :mask="`url(#${id}-m)`"
      />
      <path
        v-else
        :d="PATHS[name]"
        :fill="fill"
      />
    </template>
  </svg>
</template>
