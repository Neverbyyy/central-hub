import { breakpointsTailwind } from '@vueuse/core'

/**
 * Ширина экрана и касание — для того, что не решается CSS: колонка или шторка, правка в ячейке или в шторке.
 * Сервер ширины не знает и рисует десктоп. До монтирования здесь тоже десктоп и мышь, иначе гидрация разойдётся;
 * то, что видно сразу при загрузке (сайдбар, ширины колонок грида), переключается CSS, а не этим.
 */
export function useScreen() {
  const mounted = useMounted()
  const breakpoints = useBreakpoints(breakpointsTailwind)
  const lg = breakpoints.greaterOrEqual('lg')
  const xl = breakpoints.greaterOrEqual('xl')
  const coarse = useMediaQuery('(pointer: coarse)')

  return {
    // От 1024 px: сайдбар и дерево разделов — колонками, ниже — шторками
    lg: computed(() => !mounted.value || lg.value),
    // От 1280 px: панель ключа — колонкой справа, ниже — шторкой
    xl: computed(() => !mounted.value || xl.value),
    // Палец, а не мышь: строки грида выше, правка — в шторке снизу
    touch: computed(() => mounted.value && coarse.value)
  }
}
