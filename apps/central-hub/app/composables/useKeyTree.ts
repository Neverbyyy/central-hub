import { indexKeyTree, type KeyTreeNode } from '~/utils/keySuggestions'

/**
 * Разделы ключей — один запрос на страницу: дерево слева и подсказки «Новый ключ» читают одни данные.
 * Грузит дерево слева (immediate); форма подключается с immediate: false и догружает, только если дерева ещё нет
 * (панель скрыта). refresh — после создания ключа.
 */
export function useKeyTree({ immediate = true }: { immediate?: boolean } = {}) {
  const { data: tree, status, refresh } = useFetch<KeyTreeNode[]>('/api/keys/tree', { key: 'key-tree', server: false, lazy: true, immediate })
  const index = computed(() => indexKeyTree(tree.value ?? []))
  return { tree, index, status, refresh }
}
