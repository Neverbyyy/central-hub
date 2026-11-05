import { STORY_PREPARED } from 'storybook/internal/core-events'
import { addons } from 'storybook/manager-api'
import type { Parameters } from 'storybook/internal/types'

// Размер экрана по умолчанию — `parameters.viewport.initial`. `globals.viewport` в истории для этого не годится: Storybook
// закрепляет такое значение, и тулбар, поля W/H и ручки рамки перестают на него влиять. Здесь размер выставляется при входе
// в раздел с другим размером по умолчанию; внутри раздела он остаётся таким, как выбрал пользователь. Размер из адреса страницы
// важнее умолчания. Без размера — при первом открытии и после полной перезагрузки превью (она сбрасывает globals) — умолчание
addons.register('amaya/viewport', (api) => {
  let sectionSize: string | undefined
  let opened = false

  api.on(STORY_PREPARED, ({ parameters }: { parameters?: Parameters }) => {
    const initial: string | undefined = parameters?.viewport?.initial
    const enteredSection = opened && initial !== sectionSize
    sectionSize = initial
    opened = true
    if (enteredSection || (initial && !api.getGlobals().viewport?.value)) {
      api.updateGlobals({ viewport: { value: initial, isRotated: false } })
    }
  })
})

// Поля W/H: Storybook обновляет их, только когда отпустили кнопку мыши, а во время перетаскивания меняет рамку и подпись
// на ручке напрямую, мимо React. Подпись — уже готовое число с учётом масштаба, её и показываем в полях. Пишем прямо в DOM:
// `resize()` на каждое движение мыши перерисовывал бы историю и менял адрес, а итог всё равно запишет сам Storybook.
// Только пока тянут: иначе значение подставлялось бы и в поле, в которое сейчас вводят число
new MutationObserver((records) => {
  for (const { target } of records) {
    const handle = target as HTMLElement
    if (!handle.closest('[data-dragging]:not([data-dragging="none"])')) continue
    const field = document.querySelector<HTMLInputElement>(`[data-size-input="${handle.dataset.side === 'right' ? 'width' : 'height'}"]`)
    if (!field) continue
    // Поле в фокусе Storybook не обновляет — после перетаскивания в нём осталось бы старое значение
    field.blur()
    field.value = `${handle.dataset.value}px`
  }
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-value'] })
