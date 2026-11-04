// Истории целых экранов: экран с заглушкой окружения. Одна история на экран — всё остальное в панели: данные
// приложения (пресет), итог покупки и лог вызовов; в тулбаре — язык, «экран открыт / закрыт» и «идёт покупка»
import { createStubEnv, type StubCall, type StubOutcome } from '@amaya/paywall-kit'
import { NO_THEME, useStoryEnv } from '@amaya/ui/stories'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Component } from 'vue'
import type { ScreenPreset } from '../types'

export interface ScreenArgs {
  preset: string
  outcome: StubOutcome
  log: boolean
}

const OUTCOMES: Record<StubOutcome, string> = {
  success: 'Покупка прошла',
  cancel: 'Покупку отменили',
  error: 'Ошибка покупки',
  pending: 'Покупка не заканчивается'
}

const format = (call: StubCall) => [call.name, ...call.args.filter(arg => arg !== undefined).map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))].join(' ')

/** Общее у историй экранов: итог покупки и лог в панели, без внешней темы (тему задаёт конфиг экрана), телефон 844×390. */
export const SCREENS_META: Omit<Meta<ScreenArgs>, 'title'> = {
  args: { preset: 'default', outcome: 'success', log: false },
  argTypes: {
    outcome: { name: 'Итог покупки', control: 'select', options: Object.keys(OUTCOMES), labels: OUTCOMES } as never,
    log: { name: 'Лог вызовов', control: 'boolean' }
  },
  parameters: { themes: false, layout: 'fullscreen' },
  // Макеты — телефон в альбомной 844×390; размер меняется переключателем в тулбаре
  globals: { viewport: { value: 'phoneLandscapeM', isRotated: false }, ...NO_THEME }
}

/**
 * История экрана: пресеты данных приложения — его собственные (выбор в панели), фон под экраном — «игра».
 * Заглушка окружения пересоздаётся при смене пресета; открытие и закрытие — из тулбара.
 */
export function screenStory(screen: Component, presets: Record<string, ScreenPreset>, backdrop: string): StoryObj<ScreenArgs> {
  return {
    argTypes: {
      preset: {
        name: 'Данные приложения',
        control: 'select',
        options: Object.keys(presets),
        labels: Object.fromEntries(Object.entries(presets).map(([key, preset]) => [key, preset.name]))
      } as never
    },
    render: storyArgs => ({
      components: { Screen: screen },
      setup() {
        const globals = useStoryEnv()
        const log = ref<string[]>([])
        const preset = computed(() => presets[storyArgs.preset] ?? presets.default!)

        const createEnv = () => createStubEnv({
          data: { ...preset.value.data, locale: globals.locale },
          outcome: storyArgs.outcome,
          onCall: call => log.value.unshift(format(call))
        })
        const env = shallowRef(createEnv())
        // Номер экземпляра окружения: новый — экран монтируется заново
        const version = ref(0)
        const open = () => {
          if (globals.screen === 'open') setTimeout(() => env.value.open(), 50)
        }

        // Новый пресет — экран с нуля, как новое открытие в приложении
        watch(preset, () => {
          log.value = []
          env.value = createEnv()
          version.value++
          open()
        })
        watch(() => storyArgs.outcome, outcome => env.value.setOutcome(outcome))
        watch(() => globals.locale, locale => env.value.setData({ ...env.value.data()!, locale }))
        watch(() => globals.screen, (state) => {
          if (state === 'open') env.value.open()
          else env.value.closeFromApp()
        })

        onMounted(open)
        onBeforeUnmount(() => {
          log.value = []
        })

        return { env, version, log, globals, args: storyArgs, backdrop }
      },
      template: `
        <div class="sb-screen" :style="{ background: backdrop }">
          <Screen :key="version" :env="env" :force-purchasing="globals.purchasing" />
          <ol v-if="args.log" class="sb-log" aria-label="Лог вызовов экрана">
            <li v-for="(line, index) in log" :key="log.length - index">{{ line }}</li>
          </ol>
        </div>
      `
    })
  }
}
