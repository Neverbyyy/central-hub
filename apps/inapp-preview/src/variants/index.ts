// Реестр экранов: имя варианта InApp → компонент и пресеты данных. Имя варианта, как у InApp, несёт сегмент цен:
// ios_as_cars2_ds1_varb_t1_pw_slider_v1 — по шаблону match находится экран, а сегмент (t1) экран берёт сам
import type { Component } from 'vue'
import type { ScreenPreset } from '../types'

export interface ScreenEntry {
  // Имя варианта по умолчанию
  id: string
  title: string
  match: RegExp
  load: () => Promise<{ default: Component }>
  presets: () => Promise<{ presets: Record<string, ScreenPreset> }>
}

export const screens: ScreenEntry[] = [
  {
    id: 'ios_as_cars2_ds1_varb_t1_pw_slider_v1',
    title: 'Cars 2 — пейволл',
    match: /^ios_as_cars2_ds1_.*pw_slider_v1$/,
    load: () => import('./ios/as/cars2/ds1/pw-slider/index.vue'),
    presets: () => import('./ios/as/cars2/ds1/pw-slider/presets')
  },
  {
    id: 'ios_as_farm_ds1_varb_ut1_pw_switch_v1',
    title: 'Farm — пейволл On start',
    match: /^ios_as_farm_ds1_.*pw_switch_v1$/,
    load: () => import('./ios/as/farm/ds1/pw-switch/index.vue'),
    presets: () => import('./ios/as/farm/ds1/pw-switch/presets')
  },
  {
    id: 'ios_as_farm_ds1_varb_ut1_pw_trio_v1',
    title: 'Farm — пейволл On click',
    match: /^ios_as_farm_ds1_.*pw_trio_v1$/,
    load: () => import('./ios/as/farm/ds1/pw-trio/index.vue'),
    presets: () => import('./ios/as/farm/ds1/pw-trio/presets')
  },
  {
    id: 'ios_as_farm_ds1_varb_ut1_onboarding_v1',
    title: 'Farm — онбординг B',
    match: /^ios_as_farm_ds1_.*onboarding_v1$/,
    load: () => import('./ios/as/farm/ds1/onboarding/index.vue'),
    presets: () => import('./ios/as/farm/ds1/onboarding/presets')
  }
]

export const findScreen = (variant: string) => screens.find(screen => screen.match.test(variant))
