<script setup lang="ts">
// «Все теги» над таблицей: фильтр по тегам и весь список тегов. Внизу — кнопка «Создать тег» (набрано новое имя —
// создаёт его сразу, поиск пуст — окно с полем); Enter в поиске без совпадений тоже создаёт. У тега — сколько у него
// ключей, при наведении ✎ (переименовать у всех ключей) и 🗑 (удалить: снимется со всех ключей, с подтверждением).
// Ключи в тег добавляются правым кликом по строке таблицы (KeyTagMenu)
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
// Выбранные в фильтре теги
const model = defineModel<string[]>({ required: true })

const toast = useToast()
const notifyError = useNotifyError()
const { tags, counts, state, load, create, rename, remove } = useTags()
const open = ref(false)
const search = ref('')

const keysWord = (n: number) => plural(n, ['ключа', 'ключей', 'ключей'])

// Выбран хоть один тег — поле подсвечено, как остальные включённые фильтры
const ui = computed(() => ({ ...(model.value.length ? ACTIVE_SELECT_UI : {}), content: 'min-w-64' }))

// Набранное в поиске имя, которого ещё нет, — его создаст кнопка внизу
const newName = computed(() => {
  const name = search.value.trim()
  return name && !findTag(tags.value, name) ? name : ''
})

/** Создать тег; true — получилось (ошибки — тостом). */
const createTag = async (name: string) => {
  const message = tagNameError(name)
  if (message) {
    toast.add({ title: message, color: 'warning' })
    return false
  }
  try {
    const tag = await create(name)
    toast.add({ title: `Тег «${tag}» создан`, description: 'Ключи в него — правым кликом по строке → «Добавить тег»', color: 'success' })
    return true
  } catch (error) {
    await notifyError('Тег не создался', error)
    return false
  }
}

// --- Окно с названием тега (TagNameModal): новый (поиск был пуст) или переименование. Поле внутри выпадающего
// списка спорило бы с его поиском и клавиатурой ---
// from: null — новый тег, строка — переименовать этот
const naming = ref<{ from: string | null } | null>(null)
const nameOpen = computed({
  get: () => !!naming.value,
  set: (value) => {
    if (!value) naming.value = null
  }
})

const openNaming = (from: string | null) => {
  open.value = false
  naming.value = { from }
}

// Кнопка внизу списка: набрано новое имя — создать сразу и остаться в списке; иначе — окно с полем
const onCreateClick = async () => {
  if (!newName.value) {
    openNaming(null)
    return
  }
  if (await createTag(newName.value)) search.value = ''
}

// Enter в поиске без совпадений — создать набранное (есть совпадения — Enter выбирает подсвеченный тег, как обычно)
const onSearchKey = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || !newName.value || filterTags(tags.value, search.value).length) return
  event.preventDefault()
  onCreateClick()
}
// Обработчик уходит в поле поиска вместе с пропсами (в типах InputProps его нет — поэтому не литералом)
const searchInput = { placeholder: 'Найти или создать тег…', onKeydown: onSearchKey }

// Что сделать с именем из окна: создать тег или переименовать; true — окно закрывается
const saveName = async (name: string) => {
  const from = naming.value?.from
  if (!from) return createTag(name)
  try {
    const { count } = await rename(from, name)
    // Тег был выбран в фильтре — выборка остаётся той же
    if (model.value.includes(from)) model.value = model.value.map(tag => (tag === from ? name : tag))
    toast.add({ title: `Тег «${from}» теперь «${name}»`, description: count ? `Обновлён у ${count} ${keysWord(count)}` : undefined, color: 'success' })
    return true
  } catch (error) {
    await notifyError('Тег не переименовался', error)
    return false
  }
}

// --- Удалить — с подтверждением: тег снимется со всех ключей (в их истории это останется) ---
const deleting = ref<string | null>(null)
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (value) => {
    if (!value) deleting.value = null
  }
})
const deletingKeys = computed(() => (deleting.value ? counts.value[deleting.value] ?? 0 : 0))

const startDelete = (tag: string) => {
  open.value = false
  deleting.value = tag
}

const removing = ref(false)
const confirmDelete = async () => {
  const tag = deleting.value
  if (!tag || removing.value) return
  removing.value = true
  try {
    const { count } = await remove(tag)
    if (model.value.includes(tag)) model.value = model.value.filter(t => t !== tag)
    deleting.value = null
    toast.add({ title: `Тег «${tag}» удалён`, description: count ? `Снят с ${count} ${keysWord(count)}` : undefined, color: 'success' })
  } catch (error) {
    await notifyError('Тег не удалился', error)
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <USelectMenu
    v-model="model"
    v-model:open="open"
    v-model:search-term="search"
    v-bind="$attrs"
    :items="tags"
    multiple
    placeholder="Все теги"
    :size="size"
    :search-input="searchInput"
    :ui="ui"
    @update:open="(value: boolean) => value && load()"
  >
    <template #item-trailing="{ item }">
      <!-- Сколько ключей; при наведении (и всегда на касании) вместо числа — ✎ и 🗑. Число и кнопки лежат в одной
           ячейке и меняются только прозрачностью: место под кнопки занято заранее, кнопки не выше строки — пункт
           не меняет размер и ничего не прыгает. Нажатие на кнопки не выбирает тег в фильтре -->
      <span class="grid h-5 w-11 items-center justify-items-end">
        <span
          class="col-start-1 row-start-1 text-xs tabular-nums text-muted transition-opacity duration-150 group-data-highlighted:opacity-0 pointer-coarse:opacity-0"
        >{{ counts[String(item)] ?? '' }}</span>
        <span
          class="pointer-events-none col-start-1 row-start-1 flex gap-0.5 opacity-0 transition-opacity duration-150 group-data-highlighted:pointer-events-auto group-data-highlighted:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100"
        >
          <button
            type="button"
            tabindex="-1"
            class="flex size-5 items-center justify-center rounded text-muted transition-colors hover:bg-accented hover:text-highlighted"
            :aria-label="`Переименовать тег ${item}`"
            title="Переименовать"
            @pointerdown.stop.prevent
            @click.stop.prevent="openNaming(String(item))"
          >
            <UIcon
              name="i-lucide-pencil"
              class="size-3.5"
            />
          </button>
          <button
            type="button"
            tabindex="-1"
            class="flex size-5 items-center justify-center rounded text-muted transition-colors hover:bg-accented hover:text-highlighted"
            :aria-label="`Удалить тег ${item}`"
            title="Удалить"
            @pointerdown.stop.prevent
            @click.stop.prevent="startDelete(String(item))"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="size-3.5"
            />
          </button>
        </span>
      </span>
    </template>

    <template #empty>
      <p class="text-center text-sm text-muted">
        <template v-if="newName">
          Тега «{{ newName }}» нет — Enter создаст его
        </template>
        <template v-else-if="state === 'loading'">
          Загружаю теги…
        </template>
        <template v-else-if="state === 'error'">
          Теги не загрузились — обновите страницу
        </template>
        <template v-else>
          Тегов пока нет
        </template>
      </p>
    </template>

    <!-- Создать тег — всегда внизу, под списком -->
    <template #content-bottom>
      <div class="border-t border-default p-1">
        <UButton
          block
          color="neutral"
          variant="ghost"
          icon="i-lucide-plus"
          class="justify-start"
          @click="onCreateClick"
        >
          <span class="truncate">{{ newName ? `Создать тег «${newName}»` : 'Создать тег' }}</span>
        </UButton>
      </div>
    </template>
  </USelectMenu>

  <LocalizationsTagNameModal
    v-model:open="nameOpen"
    :from="naming?.from"
    :save="saveName"
  />

  <UModal
    v-model:open="deleteOpen"
    :title="deleting ? `Удалить тег «${deleting}»?` : ''"
    :description="deletingKeys ? `Тег снимется с ${deletingKeys} ${keysWord(deletingKeys)}.` : 'У тега нет ключей.'"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="deleting = null"
        >
          Отмена
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          :loading="removing"
          @click="confirmDelete"
        >
          Удалить
        </UButton>
      </div>
    </template>
  </UModal>
</template>
