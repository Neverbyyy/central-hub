<script setup lang="ts">
import { descriptionError, escapeLike, MIN_DESCRIPTION_LENGTH, MIN_SEGMENTS, NEW_KEY_ROOTS, newKeyError, type KeyContext, type RegistryKind } from '@amaya/l10n-core'
import { addCodeLabel, findSimilarCodes, keySuggestions, newKeyRegistryKind, type KeySuggestion } from '~/utils/keySuggestions'
import type { RegistryEntry } from '~/composables/useLocalizations'

// Новый ключ: имя проверяется на лету теми же правилами, что и в базе (packages/l10n-core),
// а похожие строки показываются до создания — чтобы брать существующий ключ, а не плодить дубль.
// Схему не нужно помнить: под полем — подсказки к следующей части ключа.
const props = defineProps<{
  registry: RegistryEntry[]
  languages: string[]
  // Раздел, открытый в дереве (app.cars2), — с него начинается новый ключ
  prefix?: string
}>()

const emit = defineEmits<{
  created: [key: string]
  registryChanged: []
  // Открыть существующий ключ, с которым конфликтует новое имя
  open: [key: string]
}>()

const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const authRedirect = useAuthRedirect()
const notifyError = useNotifyError()

// Тексты и лимит длины в форме не спрашиваем: текст вписывают потом в гриде или через MCP, лимит — в панели ключа
const emptyForm = () => ({ key: '', description: '', tags: [] as string[] })
const form = reactive(emptyForm())
const pending = ref(false)
const serverError = ref('')

const context = computed<KeyContext>(() => {
  const registry: KeyContext['registry'] = {}
  for (const { kind, code } of props.registry) registry[kind] = [...(registry[kind] ?? []), code]
  return { registry, languages: props.languages }
})

const key = computed(() => form.key.trim())

// --- Ввод ключа с подсказками ---
const keyInput = useTemplateRef('keyInput')
const keyEl = () => keyInput.value?.inputRef as HTMLInputElement | null | undefined
const keyFocused = ref(false)
// Подсказки — только когда курсор в конце: правку в середине ключа они бы сбивали
const caretAtEnd = ref(true)
// Esc прячет подсказки до следующей буквы
const dismissed = ref(false)

const updateCaret = () => {
  const el = keyEl()
  caretAtEnd.value = !el || (el.selectionStart === el.value.length && el.selectionEnd === el.value.length)
}

// Пробелы, дефисы и заглавные сразу приводим к виду ключа: «Paywall Title» → paywall_title
const normalizeKey = (value: string) => value.toLowerCase().replace(/[\s-]/g, '_')

const onKeyInput = (value: string) => {
  const normalized = normalizeKey(value)
  form.key = normalized
  dismissed.value = false
  // Замены один к одному — курсор остаётся там, где печатали, а не прыгает в конец
  const el = keyEl()
  const pos = el?.selectionStart ?? normalized.length
  if (normalized !== value) nextTick(() => el?.setSelectionRange(pos, pos))
  updateCaret()
}

const focusKeyEnd = () => nextTick(() => {
  const el = keyEl()
  if (!el) return
  el.focus()
  el.setSelectionRange(el.value.length, el.value.length)
  caretAtEnd.value = true
})

// Разделы, которые уже есть, — общие с деревом слева (useKeyTree). Без них подсказки — только начала и справочник
const { tree, index: treeIndex, refresh: refreshTree } = useKeyTree({ immediate: false })

watch(open, (value) => {
  if (!value) return
  // Дерево обычно уже загружено для панели слева; панель скрыта или дерево не загрузилось — грузим сейчас
  if (!tree.value) refreshTree()
  // Стоите в дереве в app → cars2 — ключ начинается с app.cars2.; legacy новым ключам нельзя
  const prefix = props.prefix?.replace(/\.$/, '')
  if (!form.key && prefix && prefix.split('.')[0] !== 'legacy') form.key = `${prefix}.`
}, { immediate: true })

// Куда попадёт ключ: app. — только InApp, web. — только Pages Hub, common. — в оба
const { rules: exportRules, targetNames } = useExportRules()

// Как только понятно начало. null — начала ещё нет или наборы не загрузились
const keyTargets = computed(() => {
  const value = key.value
  const root = value.split('.')[0]!
  if (!exportRules.value.length || !value.includes('.') || !(NEW_KEY_ROOTS as readonly string[]).includes(root)) return null
  return targetNames(value.endsWith('.') ? value : `${value}.`)
})

// Подсказки к последней части ключа — utils/keySuggestions. Только когда поле в фокусе и курсор в конце
const suggestions = computed<KeySuggestion[]>(() => (keyFocused.value && caretAtEnd.value && !dismissed.value
  ? keySuggestions(form.key, { registry: props.registry, tree: treeIndex.value, targetNames })
  : []))

// Пока часть не начали набирать, ничего не выбрано: Enter и Tab работают как обычно
const active = ref(-1)
watch(suggestions, (list) => {
  active.value = list.length && form.key.split('.').at(-1) ? 0 : -1
})

const acceptSuggestion = (item: KeySuggestion) => {
  onKeyInput(item.value)
  if (item.add) nextTick(() => codeTitleInput.value?.inputRef?.select())
  else focusKeyEnd()
}

const onKeyKeydown = (event: KeyboardEvent) => {
  const list = suggestions.value
  if (!list.length || event.isComposing) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    active.value = active.value < 0 ? (step > 0 ? 0 : list.length - 1) : (active.value + step + list.length) % list.length
  } else if ((event.key === 'Enter' || event.key === 'Tab') && active.value >= 0 && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    acceptSuggestion(list[active.value]!)
  }
}

// Esc при открытых подсказках прячет их, а не закрывает всю панель
const onEscape = (event: KeyboardEvent) => {
  if (!suggestions.value.length) return
  event.preventDefault()
  dismissed.value = true
}

// --- Имя уже занято: проверяем сразу при вводе, а не после «Создать ключ» ---
// same — такой ключ есть; parent — начало нового ключа уже строка; inside — новый ключ стал бы началом существующего
interface Taken { for: string, key: string, kind: 'same' | 'parent' | 'inside', deprecated: boolean }
const taken = ref<Taken | null>(null)
const supabase = useSupabaseClient()

// Начала ключа, которые сами могут быть ключами (от трёх частей): app.cars2.paywall для app.cars2.paywall.title
const parentKeys = (value: string) => {
  const segments = value.split('.')
  return segments.slice(3).map((_, i) => segments.slice(0, i + 3).join('.'))
}

const nameError = computed(() => (key.value ? newKeyError(key.value, context.value) : null))

watchDebounced(key, async (value) => {
  if (!value || nameError.value) return
  const columns = 'technical_key, deprecated_at'
  // Устаревшие ключи имя раздела не занимают (в выгрузку не попадают) — как и в базе. Совпадение целиком — занимают
  const [same, inside] = await Promise.all([
    supabase.from('localizations').select(columns).in('technical_key', [value, ...parentKeys(value)]),
    supabase.from('localizations').select(columns).like('technical_key', `${escapeLike(value)}.%`).is('deprecated_at', null).limit(1)
  ])
  if (value !== key.value) return
  type Row = { technical_key: string, deprecated_at: string | null }
  const rows = (same.data ?? []) as Row[]
  const exact = rows.find(row => row.technical_key === value)
  const parent = rows.find(row => row.technical_key !== value && !row.deprecated_at)
  const row = exact ?? parent ?? (inside.data as Row[] | null)?.[0]
  taken.value = row
    ? { for: value, key: row.technical_key, kind: exact ? 'same' : parent ? 'parent' : 'inside', deprecated: !!row.deprecated_at }
    : null
}, { debounce: 250 })

// Ответ про прежнее имя не показываем — пока человек печатает, проверка догоняет
const takenNow = computed(() => (taken.value?.for === key.value ? taken.value : null))

const takenMessage = computed(() => {
  const t = takenNow.value
  if (!t) return null
  if (t.kind === 'same') {
    return t.deprecated
      ? `Ключ «${t.key}» уже есть, он помечен устаревшим — верните его вместо нового`
      : `Ключ «${t.key}» уже есть`
  }
  if (t.kind === 'parent') {
    return `«${t.key}» — уже строка, а не раздел: внутри неё ключ не создать. Если это раздел, пометьте строку устаревшей — имя освободится`
  }
  return `Уже есть ключ «${t.key}»: «${key.value}» — раздел, а не строка`
})

// Неизвестный код объясняет плашка «нет в справочнике» с кнопкой «Добавить» — второй раз красным не пишем
const keyMessage = computed(() => (missingCode.value ? null : nameError.value ?? takenMessage.value))

// Ключ ещё дописывают: точка в конце, есть подсказки к последней части или частей пока меньше трёх.
// Пока поле в фокусе, это не ошибка; красным — только то, что дописыванием не исправить
const unfinished = computed(() => {
  const value = key.value
  if (!value) return true
  const parts = value.split('.')
  // legacy — не «недописано»: такое начало новому ключу нельзя, объясняем сразу
  if (parts[0] === 'legacy') return false
  if (value.endsWith('.') || suggestions.value.length) return true
  return parts.length < MIN_SEGMENTS && parts.every(Boolean) && (NEW_KEY_ROOTS as readonly string[]).includes(parts[0]!)
})

const shownKeyMessage = computed(() => (keyFocused.value && unfinished.value ? null : keyMessage.value))

const openTaken = () => {
  if (!takenNow.value) return
  emit('open', takenNow.value.key)
  open.value = false
}
// Пока поле пустое, не ругаемся — об этом скажет подсказка у кнопки
const descriptionMessage = computed(() => (form.description.trim() ? descriptionError(form.description) : null))

// Код из справочника, которого ещё нет: app.<игра>, web.<сайт>, brand.<бренд>, test.<тест>
const KIND_NEW: Record<RegistryKind, string> = { game: 'новую игру', site: 'новый сайт', brand: 'новый бренд', test: 'новый тест', project: 'новый проект' }

// Предлагаем добавить код, только когда он дописан — после него уже есть точка.
// Иначе на полпути к app.cars2 форма предложит завести игру «car».
const missingCode = computed(() => {
  const [root, code, ...rest] = key.value.split('.')
  const kind = newKeyRegistryKind(root ?? '')
  if (!kind || !code || !rest.length || !/^[a-z0-9_]+$/.test(code) || context.value.registry[kind]?.includes(code)) return null
  return { kind, code }
})

// Существующие коды, похожие на набранный: опечатка или недописанный код (car → cars2)
const similarCodes = computed(() => (missingCode.value ? findSimilarCodes(missingCode.value, props.registry) : []))

const useCode = (code: string) => {
  const [root, , ...rest] = key.value.split('.')
  form.key = [root, code, ...rest].join('.')
}

const codeTitle = ref('')
const codeTitleInput = useTemplateRef('codeTitleInput')
const addingCode = ref(false)

// Название подставляем из кода — обычно остаётся только нажать Enter: dino → Dino
watch(() => missingCode.value?.code, (code) => {
  codeTitle.value = code ? code.charAt(0).toUpperCase() + code.slice(1).replaceAll('_', ' ') : ''
})

const addCode = async () => {
  const missing = missingCode.value
  if (!missing || !codeTitle.value.trim()) return
  addingCode.value = true
  try {
    await $fetch('/api/registry', { method: 'POST', body: { ...missing, title: codeTitle.value } })
    toast.add({ title: `Добавлено в справочник: ${missing.code}`, color: 'success' })
    codeTitle.value = ''
    emit('registryChanged')
    // Код есть — дальше раздел: курсор обратно в ключ, подсказки покажут типичные разделы
    focusKeyEnd()
  } catch (error) {
    await notifyError('Не добавилось', error)
  } finally {
    addingCode.value = false
  }
}

// --- Похожие строки: по ключу ---
const similar = ref<{ technical_key: string, en: string | null, score: number }[]>([])

watchDebounced(key, async (value) => {
  if (!value) {
    similar.value = []
    return
  }
  try {
    similar.value = await $fetch('/api/keys/similar', { query: { key: value } })
  } catch {
    similar.value = []
  }
}, { debounce: 300 })

const { copy } = useCopy()

// Что мешает создать ключ — показывается рядом с кнопкой, чтобы она не была выключена молча
const blockers = computed(() => {
  const list: string[] = []
  if (!key.value) list.push('ключ')
  else if (missingCode.value) list.push(addCodeLabel(missingCode.value.kind))
  else if (nameError.value) list.push(unfinished.value ? 'дописать ключ' : 'исправить ключ')
  else if (takenMessage.value) list.push('другое имя ключа')
  if (descriptionError(form.description)) list.push(`описание от ${MIN_DESCRIPTION_LENGTH} символов`)
  return list
})

const canSubmit = computed(() => !blockers.value.length && !pending.value)

// Ответ сервера относится к отправленной форме — после правки он уже неверен
watch(() => [form.key, form.description], () => {
  serverError.value = ''
})

const submit = async () => {
  if (!canSubmit.value) return
  pending.value = true
  serverError.value = ''
  try {
    const created = await $fetch('/api/keys', {
      method: 'POST',
      body: { key: key.value, description: form.description, tags: form.tags }
    })
    toast.add({ title: 'Ключ создан', description: created.key, color: 'success' })
    emit('created', created.key)
    Object.assign(form, emptyForm())
    open.value = false
  } catch (error) {
    if (!(await authRedirect(error))) serverError.value = errorMessage(error)
  } finally {
    pending.value = false
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Новый ключ"
    description="Имя по схеме «Как называть ключи», описание обязательно. Сначала посмотрите похожие строки."
    :ui="{ content: 'max-w-xl' }"
    :content="{ onEscapeKeyDown: onEscape }"
    @after:enter="focusKeyEnd"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
        @keydown="onKeydown"
      >
        <UFormField
          label="Ключ"
          required
          :error="shownKeyMessage ?? undefined"
        >
          <template #help>
            <span v-if="keyTargets === null">
              Начните вводить — подсказки покажут, что дальше. От общего к частному: app.cars2.paywall.title
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-git-pull-request"
                class="size-3.5 shrink-0"
              />
              {{ keyTargets ? `Выгрузка в код: ${keyTargets}` : 'В код не выгружается: такие ключи не входят ни в один проект' }}
            </span>
          </template>
          <div class="relative">
            <UInput
              ref="keyInput"
              :model-value="form.key"
              class="w-full"
              :ui="{ base: 'font-mono' }"
              placeholder="app.cars2.paywall.title"
              autofocus
              autocomplete="off"
              spellcheck="false"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="key-suggestions"
              :aria-expanded="suggestions.length > 0"
              :aria-activedescendant="active >= 0 ? `key-suggestion-${active}` : undefined"
              @update:model-value="onKeyInput"
              @keydown="onKeyKeydown"
              @keyup="updateCaret"
              @click="updateCaret"
              @focus="keyFocused = true; updateCaret()"
              @blur="keyFocused = false"
            />
            <!-- Подсказки к следующей части ключа: клик не уводит фокус из поля -->
            <div
              v-if="suggestions.length"
              class="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-default bg-default shadow-lg"
            >
              <ul
                id="key-suggestions"
                role="listbox"
                aria-label="Подсказки к ключу"
                class="max-h-64 overflow-y-auto p-1"
              >
                <li
                  v-for="(item, i) in suggestions"
                  :id="`key-suggestion-${i}`"
                  :key="`${item.value}${item.add ? '+' : ''}`"
                  role="option"
                  :aria-selected="i === active"
                  class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm"
                  :class="i === active ? 'bg-elevated' : ''"
                  @mousedown.prevent
                  @mousemove="active = i"
                  @click="acceptSuggestion(item)"
                >
                  <UIcon
                    v-if="item.add"
                    name="i-lucide-plus"
                    class="size-4 shrink-0 text-primary"
                  />
                  <span class="shrink-0 font-mono text-highlighted">{{ item.segment }}.</span>
                  <span
                    class="min-w-0 truncate text-xs"
                    :class="item.add ? 'text-primary' : 'text-muted'"
                  >{{ item.hint }}</span>
                  <span
                    v-if="item.targets"
                    class="ml-auto shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[11px] text-toned"
                    :title="`Выгрузка в код: ${item.targets}`"
                  >{{ item.targets }}</span>
                </li>
              </ul>
              <p class="border-t border-default px-3 py-1.5 text-[11px] text-muted">
                <UKbd>↑</UKbd> <UKbd>↓</UKbd> выбрать · <UKbd>Enter</UKbd> или <UKbd>Tab</UKbd> подставить · <UKbd>Esc</UKbd> скрыть
              </p>
            </div>
          </div>
          <!-- Слот — только при ошибке: объявленный всегда, он прятал подсказку под полем (UFormField рисует одно из двух) -->
          <template
            v-if="shownKeyMessage"
            #error="{ error }"
          >
            {{ error }}
            <button
              v-if="takenNow && !nameError"
              type="button"
              class="ml-1 font-medium underline underline-offset-2"
              @click="openTaken"
            >
              Открыть «{{ takenNow.key }}»
            </button>
          </template>
        </UFormField>

        <div
          v-if="missingCode"
          class="flex flex-col gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <span>Кода «{{ missingCode.code }}» нет в справочнике.</span>
          <div
            v-if="similarCodes.length"
            class="flex flex-wrap items-center gap-1"
          >
            <span>Возможно, вы имели в виду:</span>
            <UButton
              v-for="entry in similarCodes"
              :key="entry.code"
              size="xs"
              color="neutral"
              variant="outline"
              class="font-mono"
              @click="useCode(entry.code)"
            >
              {{ entry.code }} — {{ entry.title }}
            </UButton>
          </div>
          <span>{{ similarCodes.length ? 'Или добавить' : 'Добавить' }} в справочник как {{ KIND_NEW[missingCode.kind] }}:</span>
          <div class="flex gap-2">
            <UInput
              ref="codeTitleInput"
              v-model="codeTitle"
              size="sm"
              class="flex-1"
              placeholder="Название, например Cars 2"
              @keydown.enter.prevent="addCode"
            />
            <UButton
              size="sm"
              color="warning"
              :loading="addingCode"
              :disabled="!codeTitle.trim()"
              @click="addCode"
            >
              Добавить
            </UButton>
          </div>
        </div>

        <UFormField
          label="Описание"
          required
          :error="descriptionMessage ?? undefined"
          help="Где показывается строка и какие у неё ограничения"
        >
          <UTextarea
            v-model="form.description"
            class="w-full"
            :rows="2"
            autoresize
          />
        </UFormField>

        <UFormField label="Теги">
          <UInputTags
            v-model="form.tags"
            class="w-full"
            placeholder="Enter — добавить"
          />
        </UFormField>

        <section>
          <h3 class="mb-1 text-xs font-semibold text-muted">
            Похожие строки
          </h3>
          <p
            v-if="!similar.length"
            class="text-xs text-muted"
          >
            {{ form.key ? 'Похожих нет' : 'Появятся, когда начнёте вводить ключ' }}
          </p>
          <ul
            v-else
            class="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-default"
          >
            <li
              v-for="item in similar"
              :key="item.technical_key"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                :title="`Скопировать ${item.technical_key}`"
                @click="copy(item.technical_key, 'Ключ скопирован')"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-mono text-[11px] text-blue-600 dark:text-blue-400">{{ item.technical_key }}</span>
                  <span class="block truncate text-xs text-default">{{ item.en ?? '—' }}</span>
                </span>
                <span class="shrink-0 text-[11px] tabular-nums text-muted">{{ Math.round(item.score * 100) }}%</span>
              </button>
            </li>
          </ul>
        </section>
      </form>
    </template>

    <template #footer>
      <!-- Нижняя строка видна всегда, без прокрутки: ошибка сервера, чего не хватает или подсказка -->
      <div class="flex w-full items-center justify-between gap-3">
        <span
          v-if="serverError"
          class="text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          {{ serverError }}
        </span>
        <span
          v-else-if="blockers.length"
          class="text-xs text-amber-700 dark:text-amber-400"
          role="status"
        >
          Чтобы создать, нужно: {{ blockers.join(', ') }}
        </span>
        <span
          v-else
          class="text-xs text-muted"
        >
          <UKbd>Ctrl</UKbd> + <UKbd>Enter</UKbd> создать · <UKbd>Esc</UKbd> закрыть
        </span>
        <UButton
          class="shrink-0"
          :loading="pending"
          :disabled="!canSubmit"
          @click="submit"
        >
          Создать ключ
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
