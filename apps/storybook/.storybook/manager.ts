import { STORY_PREPARED } from 'storybook/internal/core-events'
import { addons } from 'storybook/manager-api'
import type { Parameters } from 'storybook/internal/types'

// Переехавшие истории: экраны одной игры собраны в её выпадающий список (Farm: On start и On click — один файл,
// лендинги Cars 2 и Cars 2 Go — один заголовок), и у них новые адреса. Ссылки, которые уже разослали, ведут на новые:
// адрес подменяется до того, как Storybook его прочтёт
const MOVED: Record<string, string> = {
  'пейволлы-farm-on-start--farm-on-start': 'пейволлы-farm--on-start',
  'пейволлы-farm-on-click--farm-on-click': 'пейволлы-farm--on-click',
  'лендинги-cars-2-go--cars-2-go': 'лендинги-cars-2--cars-2-go'
}
const url = new URL(window.location.href)
const path = url.searchParams.get('path') ?? ''
const moved = /^\/(?:story|docs)\/([^/?]+)/.exec(path)?.[1]
if (moved && MOVED[moved]) {
  url.searchParams.set('path', path.replace(moved, MOVED[moved]))
  window.history.replaceState(window.history.state, '', url)
}

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

// Ручки рамки: на каждое движение мыши Storybook 10 прокручивает область к краю рамки — scrollIntoView({ block: 'center',
// inline: 'center' }) у невидимой полосы вдоль края. Правая полоса — во всю высоту рамки и стоит под ней (без top),
// поэтому, если рамка выше окна (телефон 390×844), область прыгала вниз, стоило потянуть за правый край; у нижней полосы
// так же по горизонтали — у рамки шире окна (десктоп лендинга). Прокрутка нужна только вдоль оси, которую тянут:
// Storybook прокручивает как хочет, а по другой оси положение сразу возвращается — в том же кадре, прыжка не видно.
// Угол (both) — как в Storybook
const scrollIntoView = Element.prototype.scrollIntoView
Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
  const edge = this instanceof HTMLElement ? this.dataset.edge : undefined
  if (edge !== 'right' && edge !== 'bottom') return scrollIntoView.call(this, options)
  const keep: [Element, number][] = []
  for (let el = this.parentElement; el; el = el.parentElement) keep.push([el, edge === 'right' ? el.scrollTop : el.scrollLeft])
  scrollIntoView.call(this, options)
  for (const [el, value] of keep) {
    if (edge === 'right') el.scrollTop = value
    else el.scrollLeft = value
  }
}

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
