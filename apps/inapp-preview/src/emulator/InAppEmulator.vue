<script setup lang="ts">
/**
 * Эмулятор InApp: слева экран в рамке устройства, справа — то, что делает приложение. Экран живёт в iframe и говорит
 * по настоящему протоколу InApp (uniwebview://, postMessage как в режиме hyper), поэтому проверяется ровно то, что
 * пойдёт в приложение. Всё состояние — в адресе: ссылкой можно поделиться, она откроет тот же сценарий.
 * Инструмент разработки, как Storybook: подписи по-русски, свой CSS, правила дизайн-системы на него не действуют.
 */
import type { PaywallData } from '@amaya/paywall-kit'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { ScreenPreset } from '../types'
import { screens } from '../variants'
import { DEVICES, findDevice, screenOf, type Orientation } from './devices'
import { createHost, type HostState, type LogEntry, type PayResult } from './inapp'

const LANGUAGES = ['en', 'ru', 'de', 'es', 'it', 'pt', 'fr', 'sv', 'nl']
const languageNames = new Intl.DisplayNames(['ru'], { type: 'language' })
const OUTCOMES = { ask: 'Спросить кнопками', success: 'Сама проходит', cancel: 'Сама отменяется', error: 'Сама с ошибкой' } as const
type Outcome = keyof typeof OUTCOMES
const PHASES: Record<HostState['phase'], string> = {
  loading: 'Экран грузится',
  loaded: 'Загружен, ждёт данных',
  data: 'Данные отправлены, ждём «готов»',
  ready: 'Готов, не открыт',
  open: 'Открыт',
  closed: 'Закрыт'
}

// Начальное состояние — из адреса
const query = new URLSearchParams(location.search)
const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(value ?? '') ? value as T : fallback
const screenId = ref(pick(query.get('screen'), screens.map(item => item.id), screens[0]!.id))
const presetName = ref(query.get('preset') ?? 'default')
const lang = ref(pick(query.get('lang'), LANGUAGES, 'en'))
const deviceId = ref(findDevice(query.get('device')).id)
const orientation = ref<Orientation>(query.get('orient') === 'portrait' ? 'portrait' : 'landscape')
const outcome = ref<Outcome>(pick(query.get('outcome'), Object.keys(OUTCOMES) as Outcome[], 'ask'))
const autoOpen = ref(query.get('open') !== '0')
const zones = ref(query.get('zones') !== '0')

const entry = computed(() => screens.find(item => item.id === screenId.value)!)
const presets = shallowRef<Record<string, ScreenPreset>>({})
const device = computed(() => findDevice(deviceId.value))
const screen = computed(() => screenOf(device.value, orientation.value))

// Данные приложения: пресет + язык из панели. Вариант — из пресета (у него бывает свой сегмент: wout1), иначе экрана
const presetData = computed<PaywallData | null>(() => {
  const preset = presets.value[presetName.value] ?? presets.value.default
  return preset ? { ...preset.data, variant: preset.data.variant ?? screenId.value, locale: lang.value } : null
})

const frame = ref<HTMLIFrameElement | null>(null)
const reloadKey = ref(0)
const log = shallowRef<LogEntry[]>([])
const state = shallowRef<HostState>({ phase: 'loading', purchasing: null, readyIn: null, shown: false })
const problems = computed(() => log.value.filter(item => item.problem).length)

const host = createHost({
  // Как InApp в режиме hyper: событие экрану — postMessage { eventName, data }
  send: (eventName, data) => frame.value?.contentWindow?.postMessage({ eventName, data }, '*'),
  onChange: (nextLog, nextState) => {
    log.value = nextLog
    state.value = nextState
  },
  autoOpen: () => autoOpen.value,
  autoPay: () => (outcome.value === 'ask' ? null : outcome.value)
})

/** Вебвью заново: экран грузится с нуля, приложение пришлёт данные после loaded. */
function reload() {
  if (!presetData.value) return
  host.reset(presetData.value)
  reloadKey.value++
}

const src = computed(() => `${location.pathname}?variant=${encodeURIComponent(screenId.value)}`)

watch(entry, async (current) => {
  presets.value = (await current.presets()).presets
  if (!presets.value[presetName.value]) presetName.value = 'default'
  reload()
}, { immediate: true })
watch(presetName, reload)
// Язык меняется в приложении — экран получает новые данные, как в InApp
watch(lang, () => {
  if (presetData.value && state.value.phase !== 'loading') host.sendData(presetData.value)
})

const onMessage = (event: MessageEvent) => {
  if (!frame.value || event.source !== frame.value.contentWindow) return
  const message = event.data as { instance?: string, url?: unknown } | null
  if (message?.instance === 'inapp' && typeof message.url === 'string') host.receive(message.url)
}

// Экран — в логическом размере устройства, уменьшается под место (как DevTools)
const stage = ref<HTMLElement | null>(null)
const stageSize = ref({ width: 0, height: 0 })
const scale = computed(() => Math.min(1, (stageSize.value.width - 48) / screen.value.width, (stageSize.value.height - 48) / screen.value.height))
let observer: ResizeObserver | undefined

// Адрес = сценарий: экран, пресет, язык, устройство, итог покупки
const scenarioQuery = computed(() => new URLSearchParams({
  screen: screenId.value,
  preset: presetName.value,
  lang: lang.value,
  device: deviceId.value,
  orient: orientation.value,
  outcome: outcome.value,
  open: autoOpen.value ? '1' : '0',
  zones: zones.value ? '1' : '0'
}).toString())
watch(scenarioQuery, value => history.replaceState(null, '', `?${value}`), { immediate: true })
const scenarioUrl = () => `${location.origin}${location.pathname}?${scenarioQuery.value}`
const screenOnlyUrl = computed(() => `${location.origin}${location.pathname}?variant=${encodeURIComponent(screenId.value)}&preset=${encodeURIComponent(presetName.value)}&lang=${lang.value}`)

const copied = ref('')
async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = what
    setTimeout(() => {
      copied.value = ''
    }, 1500)
  } catch {
    copied.value = 'не удалось скопировать'
  }
}
const logText = () => log.value.map(item => `${item.at} мс ${item.dir === 'in' ? '→' : '←'} ${item.text}${item.problem ? `  [${item.problem}]` : ''}${item.note ? `  (${item.note})` : ''}`).join('\n')

// Для автопрогона сценариев (apps/inapp-preview/scripts/scenarios.mjs)
const api = {
  open: () => host.open(),
  close: () => host.close(),
  pay: (result: PayResult) => host.pay(result),
  sendData: () => presetData.value && host.sendData(presetData.value),
  reload,
  frame: () => frame.value,
  // Размер вебвью и поза Duo (зоны Island, камеры, safe area) — в координатах экрана
  get screen() {
    return screen.value
  },
  get log() {
    return log.value
  },
  get state() {
    return state.value
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  ;(window as unknown as { __inapp?: typeof api }).__inapp = api
  if (stage.value) {
    observer = new ResizeObserver(([item]) => {
      stageSize.value = { width: item!.contentRect.width, height: item!.contentRect.height }
    })
    observer.observe(stage.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  observer?.disconnect()
})

const radius = computed(() => screen.value.radii.map(value => `${value}px`).join(' '))
const pose = computed(() => (zones.value ? screen.value.duo : undefined))
</script>

<template>
  <div class="emu">
    <main
      ref="stage"
      class="emu-stage"
    >
      <div
        class="emu-device"
        :style="{ width: `${screen.width}px`, height: `${screen.height}px`, transform: `scale(${scale})`, borderRadius: radius }"
      >
        <iframe
          v-if="presetData"
          :key="reloadKey"
          ref="frame"
          class="emu-frame"
          :src="src"
          title="Экран InApp"
        />
        <svg
          v-if="pose"
          class="emu-zones"
          :viewBox="`0 0 ${pose.width} ${pose.height}`"
          aria-hidden="true"
        >
          <rect
            v-if="pose.insets.top"
            x="0"
            y="0"
            :width="pose.width"
            :height="pose.insets.top"
            class="emu-zone--inset"
          />
          <rect
            v-if="pose.insets.bottom"
            x="0"
            :y="pose.height - pose.insets.bottom"
            :width="pose.width"
            :height="pose.insets.bottom"
            class="emu-zone--inset"
          />
          <rect
            v-if="pose.insets.left"
            x="0"
            y="0"
            :width="pose.insets.left"
            :height="pose.height"
            class="emu-zone--inset"
          />
          <rect
            v-if="pose.insets.right"
            :x="pose.width - pose.insets.right"
            y="0"
            :width="pose.insets.right"
            :height="pose.height"
            class="emu-zone--inset"
          />
          <rect
            :x="pose.insets.left"
            :y="pose.insets.top"
            :width="pose.width - pose.insets.left - pose.insets.right"
            :height="pose.height - pose.insets.top - pose.insets.bottom"
            class="emu-zone--safe"
          />
          <rect
            :x="pose.island[0]"
            :y="pose.island[1]"
            :width="pose.island[2]"
            :height="pose.island[3]"
            class="emu-zone--system"
          />
          <rect
            v-if="pose.camera"
            :x="pose.camera[0]"
            :y="pose.camera[1]"
            :width="pose.camera[2]"
            :height="pose.camera[3]"
            rx="18"
            class="emu-zone--camera"
          />
          <rect
            v-if="pose.innerCamera"
            :x="pose.innerCamera[0]"
            :y="pose.innerCamera[1]"
            :width="pose.innerCamera[2]"
            :height="pose.innerCamera[3]"
            rx="12"
            class="emu-zone--system"
          />
        </svg>
        <div
          v-if="state.phase === 'closed'"
          class="emu-closed"
        >
          <p>Экран закрыт{{ state.shown ? '' : ' и не показывался' }}</p>
          <button
            type="button"
            @click="host.open()"
          >
            Открыть снова
          </button>
        </div>
      </div>
    </main>

    <aside class="emu-panel">
      <h1>Эмулятор InApp</h1>

      <label>Экран
        <select v-model="screenId">
          <option
            v-for="item in screens"
            :key="item.id"
            :value="item.id"
          >{{ item.title }}</option>
        </select>
      </label>
      <label>Данные приложения
        <select v-model="presetName">
          <option
            v-for="(preset, name) in presets"
            :key="name"
            :value="name"
          >{{ preset.name }}</option>
        </select>
      </label>
      <div class="emu-row">
        <label>Язык
          <select v-model="lang">
            <option
              v-for="code in LANGUAGES"
              :key="code"
              :value="code"
            >{{ code.toUpperCase() }} — {{ languageNames.of(code) }}</option>
          </select>
        </label>
        <label>Ориентация
          <select v-model="orientation">
            <option value="landscape">Альбомная</option>
            <option value="portrait">Портрет</option>
          </select>
        </label>
      </div>
      <label>Устройство
        <select v-model="deviceId">
          <option
            v-for="item in DEVICES"
            :key="item.id"
            :value="item.id"
          >{{ item.name }}</option>
        </select>
      </label>
      <label
        v-if="screen.duo"
        class="emu-check"
      >
        <input
          v-model="zones"
          type="checkbox"
        > Зоны Duo: зелёная — safe area, розовая — отступы, фиолетовая — Island и камера
      </label>

      <section class="emu-block">
        <p class="emu-status">
          <b>{{ PHASES[state.phase] }}</b>
          <span v-if="state.readyIn !== null"> · «готов» через {{ state.readyIn }} мс</span>
        </p>
        <div class="emu-buttons">
          <button
            type="button"
            @click="host.open()"
          >
            Открыть
          </button>
          <button
            type="button"
            @click="host.close()"
          >
            Закрыть
          </button>
          <button
            type="button"
            @click="api.sendData()"
          >
            Данные заново
          </button>
          <button
            type="button"
            @click="reload"
          >
            Перезагрузить
          </button>
        </div>
        <label class="emu-check">
          <input
            v-model="autoOpen"
            type="checkbox"
          > Открывать сразу после «готов», как приложение
        </label>
      </section>

      <section class="emu-block">
        <label>Итог покупки
          <select v-model="outcome">
            <option
              v-for="(title, key) in OUTCOMES"
              :key="key"
              :value="key"
            >{{ title }}</option>
          </select>
        </label>
        <div
          v-if="state.purchasing"
          class="emu-purchase"
        >
          <p>Идёт покупка <code>{{ state.purchasing }}</code></p>
          <div class="emu-buttons">
            <button
              type="button"
              class="emu-ok"
              @click="host.pay('success')"
            >
              Прошла
            </button>
            <button
              type="button"
              @click="host.pay('cancel')"
            >
              Отменена
            </button>
            <button
              type="button"
              @click="host.pay('error')"
            >
              Ошибка
            </button>
            <button
              type="button"
              @click="host.pay('none')"
            >
              Без итога
            </button>
          </div>
        </div>
      </section>

      <section class="emu-block">
        <div class="emu-buttons">
          <button
            type="button"
            @click="copy(scenarioUrl(), 'ссылка на сценарий')"
          >
            Ссылка на сценарий
          </button>
          <a
            :href="screenOnlyUrl"
            target="_blank"
          >Только экран — для телефона</a>
        </div>
        <p
          v-if="copied"
          class="emu-hint"
        >
          Скопировано: {{ copied }}
        </p>
      </section>

      <section class="emu-log">
        <header>
          <h2>Лог: что экран отправил бы в InApp</h2>
          <span
            v-if="problems"
            class="emu-bad"
          >подозрительно: {{ problems }}</span>
          <button
            type="button"
            @click="copy(logText(), 'лог')"
          >
            Копировать
          </button>
        </header>
        <ol>
          <li
            v-for="item in [...log].reverse()"
            :key="item.id"
            :class="[`emu-log--${item.dir}`, { 'emu-log--bad': item.problem }]"
          >
            <span class="emu-time">{{ item.at }}</span>
            <span>{{ item.dir === 'in' ? '→' : '←' }} {{ item.text }}</span>
            <small v-if="item.problem">{{ item.problem }}</small>
            <small
              v-else-if="item.note"
              class="emu-note"
            >{{ item.note }}</small>
          </li>
        </ol>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.emu {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #1f2328;
  background: #f6f7f9;
}

.emu-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #2a2d33;
}

.emu-device {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  /* Под вебвью — игра: экран InApp прозрачный, как в приложении */
  background: linear-gradient(160deg, #3b6f9e, #1e3348);
  box-shadow: 0 0 0 10px #0d0e10, 0 20px 60px rgb(0 0 0 / 0.5);
}

.emu-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}

.emu-zones {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.emu-zone--inset {
  fill: rgb(255 105 180 / 0.25);
}

.emu-zone--safe {
  fill: none;
  stroke: rgb(46 204 113 / 0.9);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.emu-zone--system {
  fill: rgb(142 68 173 / 0.55);
}

.emu-zone--camera {
  fill: rgb(20 20 20 / 0.9);
  stroke: rgb(142 68 173 / 0.9);
  stroke-width: 2;
}

.emu-closed {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: rgb(0 0 0 / 0.55);
}

.emu-closed p {
  margin: 0;
}

.emu-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 16px;
  overflow: auto;
  border-left: 1px solid #d8dbe0;
}

.emu-panel h1 {
  margin: 0;
  font-size: 18px;
}

.emu-panel label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: 600;
}

.emu-panel select {
  font: inherit;
  font-weight: 400;
  padding: 6px 8px;
  border: 1px solid #c4c8cf;
  border-radius: 6px;
  background: #fff;
}

.emu-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.emu-panel .emu-check {
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  font-weight: 400;
}

.emu-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #e3e5e9;
}

.emu-status {
  margin: 0;
}

.emu-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.emu-panel button,
.emu-closed button,
.emu-buttons a {
  min-height: 32px;
  padding: 4px 12px;
  font: inherit;
  color: #1f2328;
  text-decoration: none;
  border: 1px solid #c4c8cf;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.emu-buttons a {
  display: inline-flex;
  align-items: center;
}

.emu-panel button:active,
.emu-closed button:active {
  background: #e8eaee;
}

.emu-panel .emu-ok {
  color: #fff;
  border-color: #1f883d;
  background: #1f883d;
}

.emu-purchase {
  padding: 8px;
  border-radius: 6px;
  background: #fff8c5;
}

.emu-purchase p {
  margin: 0 0 6px;
}

.emu-hint {
  margin: 0;
  color: #57606a;
}

.emu-log {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 160px;
  border-top: 1px solid #e3e5e9;
  padding-top: 10px;
}

.emu-log header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emu-log h2 {
  flex: 1;
  margin: 0;
  font-size: 14px;
}

.emu-bad {
  color: #cf222e;
  font-weight: 600;
}

.emu-log ol {
  flex: 1;
  margin: 8px 0 0;
  padding: 0;
  overflow: auto;
  font: 12px/1.5 ui-monospace, 'Cascadia Mono', Consolas, monospace;
  list-style: none;
}

.emu-log li {
  display: grid;
  grid-template-columns: 52px 1fr;
  column-gap: 6px;
  padding: 2px 4px;
  border-radius: 4px;
  word-break: break-all;
}

.emu-log small {
  grid-column: 2;
  color: #cf222e;
}

.emu-log .emu-note {
  color: #57606a;
}

.emu-time {
  color: #8c959f;
  text-align: right;
}

.emu-log--out {
  color: #0550ae;
}

.emu-log--bad {
  background: #ffebe9;
}
</style>
