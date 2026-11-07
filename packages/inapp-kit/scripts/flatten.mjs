// Убирает @layer из готового CSS: стили InApp лежат вне слоёв и перебили бы любой класс дизайн-системы, а браузер старее
// Safari 15.4 отбросил бы блоки @layer целиком. Плагин заменяет слои повышением специфичности.
// Именно здесь, по всему файлу, а не в сборке Vite: там плагин видит файлы по одному, поднимает только правила слоёв, и сброс
// стилей начинает перебивать стили компонентов — порядок переворачивается
import { readFileSync, writeFileSync } from 'node:fs'
import postcssCascadeLayers from '@csstools/postcss-cascade-layers'
import postcss from 'postcss'

const file = new URL('../dist/style.css', import.meta.url)
const { css } = await postcss([postcssCascadeLayers()]).process(readFileSync(file, 'utf8'), { from: undefined })
writeFileSync(file, css)
