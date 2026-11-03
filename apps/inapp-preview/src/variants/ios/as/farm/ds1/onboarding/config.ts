// Онбординг Farm «Onboarding B» (Figma 8:1348): два шага — награды и подписка Amaya Plus, после второго — пейволл.
// Шаблона Pw* под онбординг нет (PwPlusSplit — слайды и тарифы), поэтому экран собран из Ds* в index.vue,
// а здесь — то, что меняется от игры к игре: тема, ключи текстов и арт шагов
import { imageSetFromFiles, type DsImageSet, type DsTheme } from '@amaya/ui'

const files = import.meta.glob<string>('./art/*.{png,webp}', { eager: true, query: '?url', import: 'default' })
const art = (name: string) => imageSetFromFiles(files, `./art/${name}`)

export interface OnboardingStep {
  // Ключи заголовка и абзаца; в заголовок подставляется {count}
  title: string
  text: string
  // Арт левой половины: у каждого размера своё кадрирование из макета (667, 844, 1024)
  art: DsImageSet
}

export interface OnboardingConfig {
  theme: DsTheme
  // «Enjoy 25+ apps»: сколько приложений в подписке — как у пейволлов Farm
  appsCount: number
  steps: OnboardingStep[]
  texts: {
    continue: string
    terms: string
    privacy: string
    close: string
  }
}

export const config: OnboardingConfig = {
  theme: 'farm',
  appsCount: 25,
  steps: [
    { title: 'app.farm.onboarding.step_1.title', text: 'app.farm.onboarding.step_1.text', art: art('step-1') },
    { title: 'app.farm.onboarding.step_2.title', text: 'app.farm.onboarding.step_2.text', art: art('step-2') }
  ],
  // Общие строки — те же ключи, что у пейволлов
  texts: {
    continue: 'common.button.continue.default',
    terms: 'common.link.terms_of_use',
    privacy: 'common.link.privacy_policy',
    close: 'ds.close_button.aria.label'
  }
}
