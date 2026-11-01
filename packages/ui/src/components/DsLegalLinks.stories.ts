import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import { DEMO_BADGES, useStoryTexts } from '../stories/useStoryTexts'
import DsLegalLinks from './DsLegalLinks.vue'
import DsLink from './DsLink.vue'
import DsStoreBadges from './DsStoreBadges.vue'

const meta = {
  title: 'Действия/DsLegalLinks, DsLink и DsStoreBadges',
  component: DsLegalLinks
} satisfies Meta<typeof DsLegalLinks>

export default meta

export const Legal: StoryObj = {
  name: 'Terms · Privacy · Restore',
  render: () => ({
    components: { DsLegalLinks },
    setup() {
      const last = ref('—')
      return { last, ...useStoryTexts() }
    },
    template: `
      <div class="ds:space-y-6 ds:p-6">
        <DsLegalLinks
          :terms="t('common.link.terms_of_use')"
          :privacy="t('common.link.privacy_policy')"
          :restore="t('common.button.restore')"
          data-testid="legal"
          @terms="last = 'terms'"
          @privacy="last = 'privacy'"
          @restore="last = 'restore'"
        />
        <DsLegalLinks :terms="t('common.link.terms_of_use')" :privacy="t('common.link.privacy_policy')" tone="secondary" />
        <div style="max-width: 240px; margin: 0 auto">
          <DsLegalLinks :terms="longest('common.link.terms_of_use')" :privacy="longest('common.link.privacy_policy')" :restore="longest('common.button.restore')" />
        </div>
        <p class="sb-note">Последнее событие: <b data-testid="legal-event">{{ last }}</b></p>
      </div>
    `
  })
}

export const Link: StoryObj = {
  name: 'Ссылка',
  render: () => ({
    components: { DsLink },
    setup: () => useStoryTexts(),
    template: `
      <div class="ds:space-y-3 ds:p-6 ds:font-body ds:text-body">
        <p><DsLink href="https://amayakids.com/privacy.html">{{ t('common.link.privacy_policy') }}</DsLink></p>
        <p><DsLink tone="secondary" :underline="false">{{ t('common.button.restore') }}</DsLink></p>
      </div>
    `
  })
}

export const StoreBadges: StoryObj = {
  name: 'Значки сторов',
  render: () => ({
    components: { DsStoreBadges },
    setup() {
      const { t } = useStoryTexts()
      const last = ref('—')
      // Адреса — заглушки сторов; на лендинге их собирает landing-kit вместе с UTM. computed — подпись меняется с языком
      const appStore = computed(() => ({ href: 'https://apps.apple.com/', src: DEMO_BADGES.appStore, label: t('ds.store_badges.app_store.label') }))
      const googlePlay = computed(() => ({ href: 'https://play.google.com/store', src: DEMO_BADGES.googlePlay, label: t('ds.store_badges.google_play.label') }))
      return { appStore, googlePlay, last }
    },
    template: `
      <div class="ds:space-y-4 ds:p-6">
        <DsStoreBadges :app-store="appStore" :google-play="googlePlay" data-testid="badges" @click="last = $event" />
        <DsStoreBadges :app-store="appStore" />
        <p class="sb-note">Последнее нажатие: <b data-testid="badge-event">{{ last }}</b></p>
      </div>
    `
  })
}
