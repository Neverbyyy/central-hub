import { onBeforeUnmount, onMounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Виден ли элемент на экране: onChange при входе и выходе, отписка — вместе с компонентом. Цель берётся после
 * монтирования, поэтому годится и функция с document. Там, где IntersectionObserver нет (старый вебвью), элемент
 * считается видимым: анимация играет, а не молча стоит.
 */
export function useInView(
  target: MaybeRefOrGetter<Element | null | undefined>,
  onChange: (visible: boolean) => void,
  options?: IntersectionObserverInit
) {
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    const element = toValue(target)
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      onChange(true)
      return
    }
    observer = new IntersectionObserver(([entry]) => onChange(!!entry?.isIntersecting), options)
    observer.observe(element)
  })

  onBeforeUnmount(() => observer?.disconnect())
}
