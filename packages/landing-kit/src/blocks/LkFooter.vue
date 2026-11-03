<script setup lang="ts">
/** Футер: копирайт и документы — столбиком на телефоне, в строку от 640 px. Документы открываются в новой вкладке. */
import { DsLink } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const { config } = useLanding()
const { t } = useI18n()
// Год — на момент сборки страницы
const year = new Date().getFullYear()
</script>

<template>
  <footer class="ds:bg-lp-footer ds:px-17 ds:py-13 ds:font-lp-body ds:text-lp-footnote ds:text-lp-on-section ds:wide:flex ds:wide:items-start ds:wide:justify-between">
    <div>
      <p class="ds:m-0">
        {{ t(config.footer.copyright, { year }) }}
      </p>
      <p class="ds:m-0 ds:mt-3">
        {{ t(config.footer.rights) }}
      </p>
    </div>
    <ul class="ds:m-0 ds:mt-9 ds:list-none ds:p-0 ds:wide:mt-0">
      <li
        v-for="(link, index) in config.footer.links"
        :key="link.href"
        :class="{ 'ds:mt-3': index > 0 }"
      >
        <DsLink
          :href="link.href"
          tone="inherit"
          underline
        >
          {{ t(link.label) }}
        </DsLink>
      </li>
    </ul>
  </footer>
</template>
