<script setup lang="ts">
// Теги ключа в формах (новый ключ, свойства ключа): только из списка «Теги» — так проверяет и база.
// Нужного нет — «Создать тег» прямо в поиске: тег попадает в список и сразу выбран
withDefaults(defineProps<{ size?: 'xs' | 'sm' | 'md' }>(), { size: 'md' })
const model = defineModel<string[]>({ required: true })

const toast = useToast()
const notifyError = useNotifyError()
const { tags, load, create } = useTags()
onMounted(load)

const add = (tag: string) => {
  if (!model.value.includes(tag)) model.value = [...model.value, tag]
}

const onCreate = async (name: string) => {
  // «Landing» при «landing» в списке — это он и есть
  const existing = findTag(tags.value, name)
  if (existing) {
    add(existing)
    return
  }
  const message = tagNameError(name)
  if (message) {
    toast.add({ title: message, color: 'warning' })
    return
  }
  try {
    add(await create(name))
  } catch (error) {
    await notifyError('Тег не создался', error)
  }
}
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="tags"
    multiple
    :size="size"
    create-item="always"
    placeholder="Выберите теги"
    :search-input="{ placeholder: 'Найти или создать тег…' }"
    class="w-full"
    @create="onCreate"
    @update:open="(open: boolean) => open && load()"
  >
    <template #create-item-label="{ item }">
      Создать тег «{{ item }}»
    </template>
    <template #empty>
      <p class="text-center text-sm text-muted">
        Тегов пока нет — введите название
      </p>
    </template>
  </USelectMenu>
</template>
