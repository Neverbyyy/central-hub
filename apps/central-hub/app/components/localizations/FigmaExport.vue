<script setup lang="ts">
import JSZip from 'jszip'

// Тексты в Figma. Основной путь — плагин «Amaya Hub — тексты» (packages/figma-plugin), он скачивается отсюда.
// Без плагина — выборка разделов (например, Cars 2 вместе с общими) архивом для встроенного импорта Figma:
// файл на каждый язык становится режимом коллекции, вложенные группы — именами через /.
interface TreeNode {
  path: string
  label: string
  keys: number
  children: TreeNode[]
}

interface Section {
  path: string
  label: string
  keys: number
  level: number
}

const props = defineProps<{
  // Раздел, выбранный в дереве слева, например app.cars2.
  prefix: string
  languages: string[]
}>()

const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const authRedirect = useAuthRedirect()

// Тот же запрос, что у дерева слева — Nuxt отдаст уже загруженные данные
const { data: tree } = useFetch<TreeNode[]>('/api/keys/tree', { server: false, lazy: true })

// Разделы двух верхних уровней: common, app → cars2, farm, legacy → inapp, pages_hub
const sections = computed<Section[]>(() => (tree.value ?? []).flatMap(node => [
  { path: node.path, label: node.label, keys: node.keys, level: 0 },
  ...node.children.map(child => ({ path: child.path, label: child.label, keys: child.keys, level: 1 }))
]))

const selected = ref(new Set<string>())
const chosenLanguages = ref<string[]>([])

const current = computed(() => props.prefix.replace(/\.$/, ''))

// Каждое открытие — от раздела, выбранного в дереве, плюс общие строки
watch(open, (value) => {
  if (!value) return
  selected.value = new Set(['common', ...(current.value ? [current.value] : [])])
  chosenLanguages.value = [...props.languages]
})

// Раздел внутри уже выбранного выбирать незачем — он и так попадёт в файл
const coveredBy = (path: string) => [...selected.value].find(other => other !== path && path.startsWith(`${other}.`))

const toggle = (path: string, value: boolean) => {
  const next = new Set(selected.value)
  if (value) next.add(path)
  else next.delete(path)
  selected.value = next
}

const findNode = (nodes: TreeNode[], path: string): TreeNode | undefined => {
  for (const node of nodes) {
    if (node.path === path) return node
    const found = findNode(node.children, path)
    if (found) return found
  }
}

// Раздел из дерева может быть глубже второго уровня (app.cars2.paywall) — показываем его отдельной строкой
const rows = computed<Section[]>(() => {
  const path = current.value
  if (!path || sections.value.some(s => s.path === path)) return sections.value
  return [{ path, label: path, keys: findNode(tree.value ?? [], path)?.keys ?? 0, level: 0 }, ...sections.value]
})

// В файл идут отмеченные разделы из списка; подраздел уже отмеченного не считается дважды
const chosen = computed(() => rows.value.filter(row => selected.value.has(row.path) && !coveredBy(row.path)))
const total = computed(() => chosen.value.reduce((sum, row) => sum + row.keys, 0))

const toggleLanguage = (lang: string) => {
  chosenLanguages.value = chosenLanguages.value.includes(lang)
    ? chosenLanguages.value.filter(l => l !== lang)
    : props.languages.filter(l => l === lang || chosenLanguages.value.includes(l))
}

const exporting = ref(false)
const canExport = computed(() => chosen.value.length > 0 && chosenLanguages.value.length > 0 && !exporting.value)

const exportFile = async () => {
  if (!canExport.value) return
  exporting.value = true
  const prefixes = chosen.value.map(row => row.path)
  try {
    const result = await $fetch<{ keys: number, files: Record<string, unknown> }>('/api/figma/export', {
      query: { prefixes: prefixes.map(p => `${p}.`).join(','), langs: chosenLanguages.value.join(',') }
    })
    // Имя файла станет именем режима в Figma: en, ru, de…
    const zip = new JSZip()
    for (const [lang, tree] of Object.entries(result.files)) zip.file(`${lang}.json`, JSON.stringify(tree, null, 2))
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `figma-${prefixes.join('+')}.zip`)
    toast.add({ title: `Для Figma выгружено: ${result.keys} ${plural(result.keys, ['ключ', 'ключа', 'ключей'])}`, color: 'success' })
    open.value = false
  } catch (error) {
    if (!(await authRedirect(error))) toast.add({ title: 'Не выгрузилось', description: errorMessage(error), color: 'error' })
  } finally {
    exporting.value = false
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    exportFile()
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Тексты в Figma"
    description="Плагин берёт тексты прямо из сервиса и обновляет переменные в макете — по кнопке или вживую."
  >
    <template #body>
      <div
        class="space-y-4 text-sm"
        @keydown="onKeydown"
      >
        <section class="rounded-lg border border-gray-200 p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-gray-900">
                Плагин «Amaya Hub — тексты»
              </h3>
              <p class="mt-0.5 text-xs text-gray-500">
                Разделы и языки выбираются в плагине. Тексты правятся здесь, в сервисе: правка прямо в слое отвязывает его от переменной.
              </p>
            </div>
            <UButton
              to="/api/figma/plugin.zip"
              external
              download
              icon="i-lucide-download"
              size="sm"
              variant="soft"
              class="shrink-0"
            >
              Скачать плагин
            </UButton>
          </div>
          <ol class="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-gray-600">
            <li>Распакуйте архив.</li>
            <li>В приложении Figma для компьютера: Plugins → Development → Import plugin from manifest → <code>manifest.json</code>.</li>
            <li>Запустите плагин и вставьте токен — его выдаёт владелец сервиса.</li>
          </ol>
        </section>

        <p class="text-xs text-gray-500">
          Без плагина — архив для встроенного импорта: файл на каждый язык. Перетащите все файлы в окно Variables:
          каждый станет режимом, имена через / — деревом групп.
        </p>

        <section>
          <h3 class="mb-1.5 text-xs font-semibold text-gray-500">
            Разделы
          </h3>
          <div
            v-if="!tree"
            class="text-xs text-gray-400"
          >
            Загрузка разделов…
          </div>
          <ul
            v-else
            class="max-h-64 space-y-0.5 overflow-y-auto"
          >
            <li
              v-for="row in rows"
              :key="row.path"
              :style="{ paddingLeft: `${row.level * 20}px` }"
            >
              <UCheckbox
                :model-value="selected.has(row.path) || !!coveredBy(row.path)"
                :disabled="!!coveredBy(row.path)"
                @update:model-value="toggle(row.path, !!$event)"
              >
                <template #label>
                  <span class="font-mono text-xs">{{ row.label }}</span>
                  <span
                    v-if="row.keys"
                    class="ml-2 text-[10px] tabular-nums text-gray-400"
                  >{{ row.keys }}</span>
                </template>
              </UCheckbox>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="mb-1.5 text-xs font-semibold text-gray-500">
            Языки — режимы
          </h3>
          <div class="flex flex-wrap gap-1">
            <UButton
              v-for="lang in languages"
              :key="lang"
              size="xs"
              :color="chosenLanguages.includes(lang) ? 'primary' : 'neutral'"
              :variant="chosenLanguages.includes(lang) ? 'soft' : 'outline'"
              class="font-mono uppercase"
              @click="toggleLanguage(lang)"
            >
              {{ lang }}
            </UButton>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <span class="text-xs text-gray-500">
          {{ total }} {{ plural(total, ['ключ', 'ключа', 'ключей']) }} · {{ chosenLanguages.length }} {{ plural(chosenLanguages.length, ['режим', 'режима', 'режимов']) }}
        </span>
        <UButton
          icon="i-lucide-download"
          :loading="exporting"
          :disabled="!canExport"
          @click="exportFile"
        >
          Скачать ZIP
        </UButton>
      </div>
    </template>
  </UModal>
</template>
