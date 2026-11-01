import { inject, type InjectionKey } from 'vue'

// Состояние окружения из тулбара Storybook: «экран открыт / закрыт», «идёт покупка».
// Со дня 2 по нему живут пейволлы: заглушка интерфейса окружения берёт состояние отсюда
export interface StoryEnv {
  screen: 'open' | 'closed'
  purchasing: boolean
}

export const STORY_ENV: InjectionKey<StoryEnv> = Symbol('story-env')

export const useStoryEnv = () => inject(STORY_ENV, { screen: 'open', purchasing: false })
