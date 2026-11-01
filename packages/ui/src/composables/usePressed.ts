import { ref } from 'vue'

// «Нажато» — сразу на касании (pointerdown), а не после отпускания, как у click: правило отклика из ТЗ.
// :active в iOS Safari без обработчика касаний не срабатывает, поэтому состояние своё — атрибут data-pressed
export function usePressed() {
  const pressed = ref(false)
  const release = () => {
    pressed.value = false
  }

  const handlers = {
    pointerdown: (event: PointerEvent) => {
      // Правая кнопка мыши — не нажатие
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pressed.value = true
    },
    pointerup: release,
    pointercancel: release,
    pointerleave: release
  }

  return { pressed, handlers }
}
