<script setup lang="ts">
/** Отзывы: карточки 286 px — одна колонка на телефоне, две от 640 px; кавычка, звёзды, текст и автор. */
import { DsIcon, DsRating } from '@amaya/ui'
import { useI18n } from 'vue-i18n'
import { useLanding } from '../useLanding'

const { config } = useLanding()
const { t } = useI18n()
</script>

<template>
  <section
    v-if="config.reviews"
    class="ds:flex ds:flex-wrap ds:items-start ds:justify-center ds:px-4"
  >
    <article
      v-for="(review, index) in config.reviews.items"
      :key="index"
      class="ds:mx-2 ds:mb-4 ds:flex ds:w-lp-card-w ds:flex-col ds:rounded-lp-card ds:px-3 ds:py-6 ds:surface-lp-card ds:shadow-(--ds-shadow-lp-card) ds:text-lp-text"
      data-review
    >
      <div class="ds:flex ds:items-center ds:justify-between">
        <span class="ds:inline-flex ds:h-lp-quote-h ds:w-lp-quote-w ds:text-lp-quote">
          <DsIcon
            name="quote"
            size="fill"
          />
        </span>
        <DsRating
          :value="review.rating"
          :label="t(config.reviews.ratingLabel, { rating: review.rating })"
        />
      </div>
      <p class="ds:m-0 ds:mt-4 ds:font-lp-body ds:text-lp-review">
        {{ t(review.text) }}
      </p>
      <p class="ds:m-0 ds:mt-4 ds:text-end ds:font-lp-body ds:text-lp-review-author">
        {{ t(review.author) }}
      </p>
    </article>
  </section>
</template>
