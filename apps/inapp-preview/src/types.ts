import type { PaywallData } from '@amaya/paywall-kit'

// Набор данных приложения для проверки экрана: в Storybook и эмуляторе — «пресет»
export interface ScreenPreset {
  name: string
  data: PaywallData
}
