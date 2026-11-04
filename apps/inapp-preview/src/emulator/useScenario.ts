import { locales } from '@amaya/locales'
import { computed, ref, watch } from 'vue'
import { screens } from '../variants'
import { findDevice, type Orientation } from './devices'

export const OUTCOMES = { ask: 'Спросить кнопками', success: 'Сама проходит', cancel: 'Сама отменяется', error: 'Сама с ошибкой' } as const
export type Outcome = keyof typeof OUTCOMES

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value ?? '') ? value as T : fallback

/**
 * Сценарий эмулятора живёт в адресе: ссылка открывает тот же экран, пресет, язык, устройство и итог покупки.
 * При каждом изменении адрес обновляется без новой записи в истории браузера.
 */
export function useScenario() {
  const query = new URLSearchParams(location.search)
  const screenId = ref(pick(query.get('screen'), screens.map(item => item.id), screens[0]!.id))
  const presetName = ref(query.get('preset') ?? 'default')
  const lang = ref(pick(query.get('lang'), locales, 'en'))
  const deviceId = ref(findDevice(query.get('device')).id)
  const orientation = ref<Orientation>(query.get('orient') === 'portrait' ? 'portrait' : 'landscape')
  const outcome = ref<Outcome>(pick(query.get('outcome'), Object.keys(OUTCOMES) as Outcome[], 'ask'))
  const autoOpen = ref(query.get('open') !== '0')
  const zones = ref(query.get('zones') !== '0')

  const search = computed(() => new URLSearchParams({
    screen: screenId.value,
    preset: presetName.value,
    lang: lang.value,
    device: deviceId.value,
    orient: orientation.value,
    outcome: outcome.value,
    open: autoOpen.value ? '1' : '0',
    zones: zones.value ? '1' : '0'
  }).toString())
  watch(search, value => history.replaceState(null, '', `?${value}`), { immediate: true })

  const base = () => `${location.origin}${location.pathname}`
  const scenarioUrl = () => `${base()}?${search.value}`
  const screenOnlyUrl = computed(() => `${base()}?variant=${encodeURIComponent(screenId.value)}&preset=${encodeURIComponent(presetName.value)}&lang=${lang.value}`)

  return { screenId, presetName, lang, deviceId, orientation, outcome, autoOpen, zones, scenarioUrl, screenOnlyUrl }
}
