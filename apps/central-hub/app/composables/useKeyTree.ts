import { indexKeyTree, type KeyTreeNode } from '~/utils/keySuggestions'

/**
 * Разделы ключей — один запрос на страницу: дерево слева, подсказки «Новый ключ» и окно «Тексты в Figma» читают
 * одни данные. Грузит дерево слева (immediate); форма и окно подключаются с immediate: false и догружают, только если
 * дерева ещё нет (панель скрыта). refresh — когда ключи появились или пропали.
 */
export function useKeyTree({ immediate = true }: { immediate?: boolean } = {}) {
  const { data: tree, status, refresh } = useFetch<KeyTreeNode[]>('/api/keys/tree', { key: 'key-tree', server: false, lazy: true, immediate })
  const index = computed(() => indexKeyTree(tree.value ?? []))
  return { tree, index, status, refresh }
}
