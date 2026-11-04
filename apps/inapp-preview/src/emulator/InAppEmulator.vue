<script setup lang="ts">
/**
 * Эмулятор InApp: слева экран в рамке устройства, справа — то, что делает приложение. Экран живёт в iframe и говорит
 * по настоящему протоколу InApp (uniwebview://, postMessage как в режиме hyper), поэтому проверяется ровно то, что
 * пойдёт в приложение. Всё состояние — в адресе: ссылкой можно поделиться, она откроет тот же сценарий.
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

const { screenId, presetName, lang, deviceId, orientation, outcome, autoOpen, zones, scenarioUrl, screenOnlyUrl } = useScenario()

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
  ;(window as unknown as { __inapp?: typeof api }).__inapp = api
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <div class="emu">
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
              v-for="code in locales"
              :key="code"
              :value="code"
            >{{ languageLabel(code) }}</option>
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
</style>
