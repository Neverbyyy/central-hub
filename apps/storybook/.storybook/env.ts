import { reactive, readonly } from 'vue'

// Состояние тулбара Storybook: тема, язык, «экран открыт / закрыт», «идёт покупка».
// Рендерер Vue при смене переключателя не пересоздаёт уже показанную историю, а только заново вызывает декораторы.
// Поэтому декоратор пишет состояние сюда, в reactive, и смонтированная история перерисовывается сама
export interface StoryGlobals {
  theme: string
  locale: string
  screen: 'open' | 'closed'
  purchasing: boolean
}

export const storyGlobals = reactive<StoryGlobals>({
  theme: 'base',
  locale: 'en',
  screen: 'open',
  purchasing: false
})

/** Для историй: «экран открыт / закрыт» и «идёт покупка» из тулбара. Со дня 2 по ним живут пейволлы. */
export const useStoryEnv = () => readonly(storyGlobals)
