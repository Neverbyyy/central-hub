<script setup lang="ts">
/**
 * Эмулятор InApp: слева экран в рамке устройства, справа — то, что делает приложение. Экран живёт в iframe и говорит
 * по настоящему протоколу InApp (uniwebview://, postMessage как в режиме hyper), поэтому проверяется ровно то, что
 * пойдёт в приложение. Всё состояние — в адресе: ссылкой можно поделиться, она откроет тот же сценарий.
 * На телефоне и планшете (compact) экран занимает всё место, панель открывается кнопкой: снизу в портрете, сбоку
 * в альбоме. Покупка спрашивает итог плашкой поверх экрана, панель для этого открывать не нужно.
 * Инструмент разработки, как Storybook: подписи по-русски, свой CSS, правила дизайн-системы на него не действуют.
 */
import { languageLabel, locales } from '@amaya/locales'
import type { PaywallData } from '@amaya/paywall-kit'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { ScreenPreset } from '../types'
import { screens } from '../variants'
import DeviceFrame from './DeviceFrame.vue'
import { DEVICES, findDevice, screenOf } from './devices'
import EmulatorLog from './EmulatorLog.vue'
import { createHost, type HostState, type LogEntry, type PayResult } from './inapp'
import { OUTCOMES, useScenario } from './useScenario'

const PHASES: Record<HostState['phase'], string> = {
  loading: 'Экран грузится',
  loaded: 'Загружен, ждёт данных',
  data: 'Данные отправлены, ждём «готов»',
  ready: 'Готов, не открыт',
  open: 'Открыт',
  closed: 'Закрыт'
}

// Палец вместо мыши или окно уже панели с экраном
const compactQuery = matchMedia('(pointer: coarse), (max-width: 760px)')
const compact = ref(compactQuery.matches)
const panelOpen = ref(false)
const onCompact = () => {
  compact.value = compactQuery.matches
}

const { screenId, presetName, lang, deviceId, orientation, outcome, autoOpen, zones, scenarioUrl, screenOnlyUrl } = useScenario(compact.value ? 'here' : undefined)

const entry = computed(() => screens.find(item => item.id === screenId.value)!)
const presets = shallowRef<Record<string, ScreenPreset>>({})
const screen = computed(() => screenOf(findDevice(deviceId.value), orientation.value))

// Данные приложения: пресет + язык из панели. Вариант — из пресета (у него бывает свой сегмент: wout1), иначе экрана
const presetData = computed<PaywallData | null>(() => {
  const preset = presets.value[presetName.value] ?? presets.value.default
  return preset ? { ...preset.data, variant: preset.data.variant ?? screenId.value, locale: lang.value } : null
})

const deviceFrame = ref<InstanceType<typeof DeviceFrame> | null>(null)
const frame = () => deviceFrame.value?.frame ?? null
const reloadKey = ref(0)
const log = shallowRef<LogEntry[]>([])
const state = shallowRef<HostState>({ phase: 'loading', purchasing: null, readyIn: null, shown: false })

const host = createHost({
  // Как InApp в режиме hyper: событие экрану — postMessage { eventName, data }
  send: (eventName, data) => frame()?.contentWindow?.postMessage({ eventName, data }, '*'),
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
  const current = frame()
  if (!current || event.source !== current.contentWindow) return
  const message = event.data as { instance?: string, url?: unknown } | null
  if (message?.instance === 'inapp' && typeof message.url === 'string') host.receive(message.url)
}

// Адресная строка съедает высоту, и экран уменьшается. На iPhone браузер этого не умеет: там — «На экран Домой»
const canFullscreen = computed(() => compact.value && document.fullscreenEnabled)
const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())

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

// Для автопрогона сценариев (apps/inapp-preview/scripts/scenarios.mjs)
const api = {
  open: () => host.open(),
  close: () => host.close(),
  pay: (result: PayResult) => host.pay(result),
  sendData: () => presetData.value && host.sendData(presetData.value),
  reload,
  frame,
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
  compactQuery.addEventListener('change', onCompact)
  ;(window as unknown as { __inapp?: typeof api }).__inapp = api
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  compactQuery.removeEventListener('change', onCompact)
})
</script>

<template>
  <div
    class="emu"
    :class="{ 'emu--compact': compact, 'emu--open': compact && panelOpen }"
  >
    <DeviceFrame
      ref="deviceFrame"
      :screen="screen"
      :src="presetData ? src : null"
      :reload-key="reloadKey"
      :zones="zones"
      :closed="state.phase === 'closed'"
      :shown="state.shown"
      @open="host.open()"
    />

    <template v-if="compact">
      <button
        type="button"
        class="emu-menu"
        aria-label="Открыть панель эмулятора"
        @click="panelOpen = true"
      >
        ☰
      </button>
      <div
        class="emu-scrim"
        @click="panelOpen = false"
      />
    </template>

    <aside class="emu-panel">
      <header class="emu-head">
        <h1>Эмулятор InApp</h1>
        <button
          v-if="compact"
          type="button"
          aria-label="Скрыть панель"
          @click="panelOpen = false"
        >
          ✕
        </button>
      </header>

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
              v-for="code in locales"
              :key="code"
              :value="code"
            >{{ languageLabel(code) }}</option>
          </select>
        </label>
        <label v-if="!screen.fill">Ориентация
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
          <button
            v-if="canFullscreen"
            type="button"
            @click="toggleFullscreen"
          >
            На весь экран
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
        <!-- Панель скрыта — плашка поверх экрана, иначе итог покупки не выбрать -->
        <Teleport
          v-if="state.purchasing"
          to=".emu"
          :disabled="!compact || panelOpen"
        >
          <div class="emu-purchase">
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
        </Teleport>
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
          >Только экран, без эмулятора</a>
        </div>
        <p
          v-if="copied"
          class="emu-hint"
        >
          Скопировано: {{ copied }}
        </p>
      </section>

      <EmulatorLog
        :log="log"
        @copy="copy($event, 'лог')"
      />
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

.emu-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 16px;
  overflow: auto;
  border-left: 1px solid #d8dbe0;
}

.emu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.emu-row > :only-child {
  grid-column: 1 / -1;
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

/* Кнопки всего эмулятора, включая рамку устройства и лог */
.emu :deep(button),
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

.emu :deep(button:active) {
  background: #e8eaee;
}

.emu .emu-ok {
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

/* Телефон и планшет: экран на всё место, панель выезжает поверх. Поля под касание, 16 px — иначе iOS увеличивает
   страницу при выборе в списке */
.emu--compact {
  display: block;
  font-size: 16px;
}

.emu--compact .emu-panel,
.emu--compact > .emu-purchase {
  box-sizing: border-box;
}

.emu--compact .emu-stage {
  position: absolute;
  inset: 0;
}

.emu--compact :deep(button),
.emu--compact .emu-buttons a,
.emu--compact select {
  min-height: 44px;
  font-size: 16px;
}

.emu--compact .emu-buttons a,
.emu--compact select {
  padding-inline: 12px;
}

.emu--compact .emu-head button {
  width: 44px;
  padding: 0;
  border-radius: 50%;
}

/* Язычок у левого края: там пусто на всех экранах, а углы заняты логотипом, крестиком и документами */
.emu .emu-menu {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: env(safe-area-inset-left);
  width: 28px;
  min-height: 64px;
  padding: 0;
  color: #fff;
  border: 0;
  border-radius: 0 12px 12px 0;
  background: rgb(0 0 0 / 0.45);
  transform: translateY(-50%);
}

/* Зона касания 44 px при узком язычке */
.emu-menu::after {
  content: '';
  position: absolute;
  inset: 0 -16px 0 0;
}

.emu-scrim {
  position: absolute;
  z-index: 2;
  inset: 0;
  background: rgb(0 0 0 / 0.25);
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
}

.emu--open .emu-scrim {
  opacity: 1;
  pointer-events: auto;
}

.emu--compact .emu-panel {
  position: absolute;
  z-index: 3;
  inset: auto 0 0;
  max-height: 70%;
  padding: 0 calc(16px + env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left));
  border: 0;
  border-radius: 16px 16px 0 0;
  background: #f6f7f9;
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.35);
  overscroll-behavior: contain;
  transform: translateY(100%);
  visibility: hidden;
  transition: transform 220ms ease, visibility 220ms;
}

.emu--open .emu-panel {
  visibility: visible;
}

.emu--compact.emu--open .emu-panel {
  transform: none;
}

.emu--compact .emu-head {
  position: sticky;
  z-index: 1;
  top: 0;
  padding-block: 8px;
  background: #f6f7f9;
}

.emu--compact :deep(.emu-log) {
  flex: none;
}

.emu--compact :deep(.emu-log ol) {
  overflow: visible;
}

/* Плашка покупки поверх экрана: сверху, чтобы не закрывать кнопку с загрузкой */
.emu--compact > .emu-purchase {
  position: absolute;
  z-index: 1;
  top: calc(8px + env(safe-area-inset-top));
  left: 50%;
  width: min(420px, calc(100% - 16px));
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
  transform: translateX(-50%);
}

.emu--compact > .emu-purchase code {
  font-size: 12px;
  word-break: break-all;
}

.emu--compact > .emu-purchase button {
  flex: 1 1 auto;
  padding-inline: 8px;
}

@media (orientation: landscape) {
  .emu--compact .emu-panel {
    inset: 0 0 0 auto;
    width: min(360px, 70%);
    max-height: none;
    border-radius: 16px 0 0 16px;
    box-shadow: -8px 0 32px rgb(0 0 0 / 0.35);
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .emu--compact .emu-panel,
  .emu-scrim {
    transition: none;
  }
}
</style>
