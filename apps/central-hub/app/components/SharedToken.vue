<script setup lang="ts">
// Общий токен (плагина Figma или MCP): скрыт точками, «глаз» в поле показывает, «Скопировать» кладёт в буфер. Один на
// всех — вставить его можно сразу, не спрашивая владельца сервиса. Сервер отдаёт его только тем, кто вошёл.
// size: md — в окне выгрузки в Figma, lg — на странице MCP (крупное поле и кнопка в цвет индиго, как в макете)
const props = withDefaults(defineProps<{ kind: SharedTokenKind, size?: 'md' | 'lg' }>(), { size: 'md' })

const meta = SHARED_TOKENS[props.kind]
const { t } = useI18n()
const label = computed(() => t(`token.${props.kind}.label`))
const { token, missing } = useSharedToken(props.kind)
const { copy, copied } = useCopySecret()
const visible = ref(false)

// Скрытый — точками той же длины: при показе поле не меняет ширину
const shown = computed(() => (token.value ? (visible.value ? token.value : '•'.repeat(token.value.length)) : ''))
</script>

<template>
  <div>
    <p
      v-if="missing"
      class="text-xs text-warning"
    >
      {{ $t('token.missing', { env: meta.env }) }}
    </p>
    <div
      v-else
      class="flex gap-2"
    >
      <!-- Пока токен грузится — поле той же высоты, ничего не прыгает -->
      <div class="relative min-w-0 flex-1">
        <input
          :value="shown"
          readonly
          :aria-label="visible ? label : $t('token.hidden', { label })"
          class="w-full border font-mono text-highlighted outline-none focus:border-primary"
          :class="[
            size === 'lg'
              ? 'h-11 rounded-lg border-gray-200 bg-gray-50 pr-11 pl-3.5 text-sm dark:border-white/[0.07] dark:bg-gray-950/50'
              : 'h-8 rounded-md border-default bg-default pr-9 pl-2.5 text-xs',
            { 'tracking-wider': !visible }
          ]"
          @focus="visible && ($event.target as HTMLInputElement).select()"
        >
        <button
          type="button"
          class="absolute inset-y-0 right-0 grid place-items-center text-muted hover:text-highlighted disabled:opacity-50"
          :class="size === 'lg' ? 'w-11' : 'w-9'"
          :aria-label="$t(visible ? 'token.hide' : 'token.show')"
          :disabled="!token"
          @click="visible = !visible"
        >
          <UIcon
            :name="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            class="size-4"
          />
        </button>
      </div>
      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        :size="size === 'lg' ? 'lg' : 'sm'"
        :color="copied ? 'success' : size === 'lg' ? 'neutral' : 'primary'"
        :class="size === 'lg' && !copied ? 'h-11 bg-indigo-500 text-white ring-1 ring-indigo-300/40 hover:bg-indigo-600 active:bg-indigo-700 disabled:bg-indigo-500/50 dark:bg-indigo-500/80 dark:hover:bg-indigo-500 dark:active:bg-indigo-600' : size === 'lg' ? 'h-11' : ''"
        :disabled="!token"
        @click="token && copy(token, $t('token.copied'), $t(`token.${kind}.hint`))"
      >
        {{ $t(copied ? 'token.copiedShort' : 'token.copy') }}
      </UButton>
    </div>
  </div>
</template>
