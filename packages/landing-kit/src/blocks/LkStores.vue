<script setup lang="ts">
/**
 * Значки App Store и Google Play лендинга: адреса с UTM из адреса страницы, нажатие уходит в track.
 * Когда использовать: везде, где на лендинге нужен вход в стор. source — какой блок, для аналитики.
 */
import { DsStoreBadges, type DsStore } from '@amaya/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const props = defineProps<{ source: string }>()

const { config, links, storeClick } = useLanding()
const { t } = useI18n()

const badges = computed(() => ({
  appStore: { href: links.value.appStore, src: config.badges.appStore, label: t(config.badges.appStoreLabel) },
  googlePlay: { href: links.value.googlePlay, src: config.badges.googlePlay, label: t(config.badges.googlePlayLabel) }
}))

const onClick = (store: DsStore) => storeClick(store, props.source)
</script>

<template>
  <DsStoreBadges
    v-bind="badges"
    @click="onClick"
  />
</template>
