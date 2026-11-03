// Блоки лендинга, которым нужен арт лендинга игры (постер и ролик, значки сторов): у каждой темы — своя игра.
// cars2 — лендинг Cars 2 (apps/landings), farm и base — лендинг Farm (палитра base — Amaya Plus, как у Farm).
// Тема колонки — атрибут data-ds-theme её корня (DsRoot): «Все три рядом» показывает каждую игру в своей теме.
// Остальные истории блоков — рядом с компонентами в packages/ui
import type { LandingConfig } from '@amaya/landing-kit'
import { DsStoreBadges, DsVideo, type DsStore } from '@amaya/ui'
import { useStoryTexts } from '@amaya/ui/stories'
import type { StoryObj } from '@storybook/vue3-vite'
import { computed, onMounted, ref } from 'vue'
import { cars2 } from '../../landings/app/landings/cars2/config'
import { farm } from './landings/farm/config'

export default {
  title: 'Блоки лендинга/Видео и сторы'
}

const LANDINGS: Record<string, LandingConfig> = { cars2, farm, base: farm }

/** Лендинг игры по теме колонки, в которой нарисована история. */
function useThemeLanding() {
  const box = ref<HTMLElement | null>(null)
  const theme = ref('base')
  onMounted(() => {
    theme.value = box.value?.closest('[data-ds-theme]')?.getAttribute('data-ds-theme') ?? 'base'
  })
  const landing = computed(() => LANDINGS[theme.value] ?? farm)
  return { box, landing }
}

// До нажатия — только постер, ролик не качается; по нажатию играет со звуком, ушло с экрана — пауза
export const Video: StoryObj = {
  name: 'Видео',
  render: () => ({
    components: { DsVideo },
    setup() {
      const { box, landing } = useThemeLanding()
      const plays = ref(0)
      return { box, video: computed(() => landing.value.video!), plays, ...useStoryTexts() }
    },
    template: `
      <div ref="box" class="ds:p-6" style="max-width: 720px">
        <DsVideo :key="video.src" :src="video.src" :poster="video.poster" :label="t(video.label)" data-testid="video" @play="plays++" />
        <p class="sb-note">Событий play: <b data-testid="plays">{{ plays }}</b></p>
      </div>
    `
  })
}

// Значки сторов первого экрана: ссылка, значок и подпись снаружи; событие click(store) — для track
export const Stores: StoryObj = {
  name: 'Значки сторов',
  render: () => ({
    components: { DsStoreBadges },
    setup() {
      const { t } = useStoryTexts()
      const { box, landing } = useThemeLanding()
      const clicked = ref<DsStore | ''>('')
      const badges = computed(() => ({
        appStore: { href: landing.value.stores.appStore, src: landing.value.badges.appStore, label: t(landing.value.badges.appStoreLabel) },
        googlePlay: { href: landing.value.stores.googlePlay, src: landing.value.badges.googlePlay, label: t(landing.value.badges.googlePlayLabel) }
      }))
      return { box, badges, clicked }
    },
    template: `
      <div ref="box" class="ds:p-6">
        <DsStoreBadges v-bind="badges" data-testid="stores" @click="store => clicked = store" />
        <p class="sb-note">Нажат: <b data-testid="clicked">{{ clicked || '—' }}</b></p>
      </div>
    `
  })
}
