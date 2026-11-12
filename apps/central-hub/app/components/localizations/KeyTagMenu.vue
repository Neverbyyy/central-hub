<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'
import type { Localization } from '~/composables/useLocalizations'

// Правый клик по строке таблицы: «Добавить тег» — все теги галочками, поле «найти или создать» сверху и кнопка
// «Создать тег» внизу (с набранным именем — создаёт и сразу ставит, с пустым полем — окно «Новый тег»).
// Строка среди выделенных — тег ставится (снимается) у всех выделенных. С клавиатуры — клавиша меню или
// Shift+F10 на активной строке, на касании — долгое нажатие. Мимо строк — обычное меню браузера
const props = defineProps<{
  selectedKeys: Set<string>
  findRow: (key: string) => Localization | undefined
  // Поставить или снять тег в загруженных строках сразу; возвращает откат на случай отказа сервера
  applyTag: (keys: string[], tag: string, on: boolean) => () => void
  // Выборка устаревших ключей: их не правят, пока не вернут
  readonly?: boolean
}>()

const toast = useToast()
const notifyError = useNotifyError()
const { tags, load, create, setForKeys } = useTags()

const area = useTemplateRef<HTMLElement>('area')
// Для каких ключей меню: строка под курсором, а если она среди выделенных — все выделенные
const targets = ref<string[]>([])
const query = ref('')

const rowKey = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>('[data-key]')?.dataset.key : undefined

const pick = (key: string | undefined) => {
  targets.value = !key ? [] : props.selectedKeys.has(key) ? [...props.selectedKeys] : [key]
}

// Касание: меню откроет долгое нажатие — строку запоминаем уже при касании
const onPointerDown = (event: PointerEvent) => pick(rowKey(event.target))

const onContextMenu = (event: MouseEvent) => {
  const key = rowKey(event.target)
  if (key) {
    pick(key)
    return
  }
  // Не по строке — меню тегов не открываем (событие не дойдёт до меню, браузер покажет своё)
  event.stopPropagation()
  // Клавиша меню и Shift+F10 приходят в сам грид (button 0) — открываем меню у активной строки
  const cell = event.button === 2 ? null : area.value?.querySelector<HTMLElement>('.loc-row[data-active] .is-active')
  if (!cell) return
  event.preventDefault()
  const rect = cell.getBoundingClientRect()
  cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: rect.left + 16, clientY: rect.bottom - 4 }))
}

const onOpen = (open: boolean) => {
  if (!open) {
    // Меню закрыли ради окна «Новый тег» — открываем его, когда меню уже ушло (иначе они спорят за фокус)
    if (dialogPending) {
      dialogPending = false
      setTimeout(() => {
        dialogOpen.value = true
      }, 0)
    }
    return
  }
  query.value = ''
  // Коллега мог создать тег — список свежий к каждому открытию
  load()
}

// Теги выбранных ключей — для галочек и «2 из 5»
const lists = computed(() => targets.value.map(key => props.findRow(key)?.tags ?? []))
const exact = computed(() => findTag(tags.value, query.value))

// keys — по умолчанию ключи открытого меню; окну «Новый тег» — те, для которых его открыли
const toggle = async (tag: string, on: boolean, { quiet = false, keys = [...targets.value] } = {}) => {
  const undo = props.applyTag(keys, tag, on)
  try {
    const { count } = await setForKeys(keys, tag, on)
    if (!quiet && keys.length > 1 && count) {
      toast.add({
        title: on
          ? `Тег «${tag}» добавлен к ${count} ${plural(count, ['ключу', 'ключам', 'ключам'])}`
          : `Тег «${tag}» снят с ${count} ${plural(count, ['ключа', 'ключей', 'ключей'])}`,
        color: 'success'
      })
    }
    return true
  } catch (error) {
    undo()
    await notifyError(on ? 'Тег не добавился' : 'Тег не снялся', error)
    return false
  }
}

/** Создать тег и сразу поставить ключам; true — тег создан (поставить могло не выйти — об этом тост). */
const createAndApply = async (name: string, keys = [...targets.value]) => {
  const message = tagNameError(name)
  if (message) {
    toast.add({ title: message, color: 'warning' })
    return false
  }
  let tag: string
  try {
    tag = await create(name)
  } catch (error) {
    await notifyError('Тег не создался', error)
    return false
  }
  query.value = ''
  const n = keys.length
  if (await toggle(tag, true, { quiet: true, keys })) {
    toast.add({ title: `Тег «${tag}» создан`, description: n > 1 ? `Добавлен к ${n} ${plural(n, ['ключу', 'ключам', 'ключам'])}` : 'Добавлен к ключу', color: 'success' })
  }
  return true
}

// Поле сверху подменю: буквы — в поле, а не в поиск по пунктам меню; Enter — отметить найденный или создать;
// ↓ — в список; Esc закрывает меню, как обычно
const onSearchKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') return
  event.stopPropagation()
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    const menu = (event.target as HTMLElement).closest('[role="menu"]')
    menu?.querySelector<HTMLElement>('[role="menuitemcheckbox"], [role="menuitem"]')?.focus()
    return
  }
  if (event.key !== 'Enter') return
  event.preventDefault()
  const name = query.value.trim()
  if (!name) return
  const tag = exact.value
  if (tag) {
    toggle(tag, !tagCoverage(lists.value, tag).all)
    query.value = ''
  } else {
    createAndApply(name)
  }
}

// --- Кнопка «Создать тег» внизу подменю: набрано новое имя — создать и сразу поставить; поле пусто — окно
// «Новый тег», как в «Все теги»: тег из него ставится тем же ключам ---
const newName = computed(() => (query.value.trim() && !exact.value ? query.value.trim() : ''))
const newNameError = computed(() => (newName.value ? tagNameError(newName.value) : null))

const dialogOpen = ref(false)
// Для каких ключей открыли окно: меню к этому времени закрыто, а targets поменяет следующий правый клик
const dialogKeys = ref<string[]>([])
let dialogPending = false
const dialogDescription = computed(() => {
  const n = dialogKeys.value.length
  return n > 1
    ? `Тег применится сразу к ${n} ${plural(n, ['выделенному ключу', 'выделенным ключам', 'выделенным ключам'])}`
    : `Тег применится сразу к ключу «${dialogKeys.value[0] ?? ''}»`
})
const saveDialog = (name: string) => createAndApply(name, dialogKeys.value)

// Окно закрыли — фокус обратно в таблицу: стрелки и Enter работают сразу, без клика
watch(dialogOpen, (isOpen) => {
  if (!isOpen) nextTick(() => area.value?.querySelector<HTMLElement>('.loc-grid')?.focus({ preventScroll: true }))
})

const onCreateClick = () => {
  if (newName.value) {
    createAndApply(newName.value)
    return
  }
  // Меню Reka не закрыть снаружи, но Esc закрывает его целиком (и подменю) — окно откроется в onOpen(false)
  dialogKeys.value = [...targets.value]
  dialogPending = true
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

// Пункты собираются на лету, поэтому типы слотов Nuxt UI их не знают — поле пункта берём явно
const field = (item: unknown, name: 'label' | 'partial') => String((item as Record<string, unknown>)[name] ?? '')

const items = computed<ContextMenuItem[][]>(() => {
  const n = targets.value.length
  if (!n) return [[{ type: 'label', label: 'Теги ставятся правым кликом по строке' }]]
  // Один ключ — его имя моноширинным, как в таблице; несколько — обычной подписью
  const title: ContextMenuItem = n > 1 ? { type: 'label', label: `Выделено: ${keysCount(n)}` } : { type: 'label', label: targets.value[0], slot: 'key' }
  if (props.readonly) {
    return [[title], [{ label: 'Добавить тег', icon: 'i-lucide-tag', disabled: true, description: 'Ключ устарел — сначала верните его' }]]
  }

  const children: ContextMenuItem[] = filterTags(tags.value, query.value).map((tag) => {
    const { count, all } = tagCoverage(lists.value, tag)
    return {
      type: 'checkbox',
      label: tag,
      checked: all,
      slot: 'tag',
      // У части выделенных — «2 из 5»; клик ставит тег всем
      partial: count && !all ? `${count} из ${n}` : '',
      // Меню остаётся открытым: можно отметить несколько тегов подряд
      onSelect: (event: Event) => event.preventDefault(),
      onUpdateChecked: (on: boolean) => toggle(tag, on)
    }
  })
  // Создаёт кнопка внизу (content-bottom), не пункт списка. Пустое подменю Nuxt UI не рисует — нужна хотя бы подпись
  if (!children.length) {
    // Обычным приглушённым текстом, не заголовком: что создать, говорит кнопка внизу
    children.push({ type: 'label', label: query.value.trim() ? 'Совпадений нет' : 'Тегов пока нет', class: 'font-normal text-muted' })
  }

  // На телефоне подменю ложится поверх меню, но целиком на экране
  return [[title], [{ label: 'Добавить тег', icon: 'i-lucide-tag', children, content: { class: 'w-64 max-w-[calc(100vw-1rem)]', prioritizePosition: true } }]]
})
</script>

<template>
  <!-- prioritizePosition: на узком экране меню сдвигается в пределы экрана, а не уезжает за край.
       viewport — список тегов: не выше ~10 строк, дальше прокрутка; поле сверху и «Создать тег» снизу остаются на месте -->
  <UContextMenu
    :items="items"
    :content="{ prioritizePosition: true }"
    :ui="{ viewport: 'max-h-80' }"
    @update:open="onOpen"
  >
    <div
      ref="area"
      class="flex min-h-0 min-w-0 flex-1"
      @pointerdown.capture="onPointerDown"
      @contextmenu.capture="onContextMenu"
    >
      <slot />
    </div>

    <template #key-label="{ item }">
      <span
        class="block max-w-[min(18rem,calc(100vw-4rem))] truncate font-mono"
        :title="field(item, 'label')"
      >{{ field(item, 'label') }}</span>
    </template>

    <template #tag-trailing="{ item }">
      <span
        v-if="field(item, 'partial')"
        class="text-xs tabular-nums text-muted"
      >{{ field(item, 'partial') }}</span>
    </template>

    <template #content-top="{ sub }">
      <div
        v-if="sub"
        class="border-b border-default p-1"
      >
        <UInput
          v-model="query"
          autofocus
          size="sm"
          variant="none"
          icon="i-lucide-search"
          placeholder="Найти или создать тег"
          class="w-full"
          aria-label="Найти или создать тег"
          @keydown="onSearchKey"
        />
      </div>
    </template>

    <!-- Создать тег — всегда внизу подменю, под списком -->
    <template #content-bottom="{ sub }">
      <div
        v-if="sub"
        class="border-t border-default p-1"
      >
        <UButton
          block
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-plus"
          class="justify-start"
          :disabled="!!newNameError"
          @click="onCreateClick"
        >
          <span class="truncate">{{ newName ? `Создать тег «${newName}»` : 'Создать тег' }}</span>
        </UButton>
        <p
          v-if="newNameError"
          class="px-2 pb-1 text-xs text-red-600 dark:text-red-400"
        >
          {{ newNameError }}
        </p>
      </div>
    </template>
  </UContextMenu>

  <!-- «Создать тег» с пустым полем — то же окно, что в «Все теги»; новый тег сразу ставится этим ключам -->
  <LocalizationsTagNameModal
    v-model:open="dialogOpen"
    :description="dialogDescription"
    :save="saveDialog"
  />
</template>
