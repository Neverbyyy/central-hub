// Rive-анимации. Новая анимация — положить .riv в apps/storybook/rive: она сама появится в списке «Файл».
// Анимации, которые уже взял экран или лендинг, лежат у его арта (как в InApp) — они в списке тоже, с путём.
// Артборды и стейт-машины читаются из файла; inputs стейт-машины и свойства view model — кнопками справа,
// Rive Events и смена состояний — в лог. Рисует тот же DsRive, что и экраны
import { DsRive, loadRive, type RiveInstance } from '@amaya/ui'
import { GAME_BACKDROP, WHITE_BACKDROP, NO_LOCALE, NO_SCREEN_STATE, NO_THEME } from '@amaya/ui/stories'
import type { StoryObj } from '@storybook/vue3-vite'
import { computed, ref, shallowRef, watch } from 'vue'

const OWNERS = ['../../inapp-preview/src/variants/', '../../landings/app/landings/']
const FILES = import.meta.glob<string>(['../rive/*.riv', '../../inapp-preview/src/variants/**/*.riv', '../../landings/app/landings/**/*.riv'], { query: '?url', import: 'default', eager: true })
// Имя в списке: файл из apps/storybook/rive — просто имя, файл экрана или лендинга — путь от его папки
const label = (path: string) => {
  const owner = OWNERS.find(prefix => path.startsWith(prefix))
  return (owner ? path.slice(owner.length) : path.split('/').pop()!).replace(/\.riv$/, '')
}
const URLS: Record<string, string> = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [label(path), url]))
const NAMES = Object.keys(URLS).sort()

const FITS = { contain: 'Целиком (contain)', cover: 'Заполнить (cover)', fill: 'Растянуть (fill)', layout: 'Раскладка файла (layout)' }
const BACKDROPS = { white: WHITE_BACKDROP, game: GAME_BACKDROP }

interface Args {
  file: string
  fit: keyof typeof FITS
  backdrop: keyof typeof BACKDROPS
}

export default {
  title: 'Анимации/Rive',
  args: { file: NAMES[0] ?? '', fit: 'contain', backdrop: 'white' },
  argTypes: {
    file: { name: 'Файл', control: 'select', options: NAMES },
    fit: { name: 'Вписать', control: 'select', options: Object.keys(FITS), labels: FITS },
    backdrop: { name: 'Фон', control: 'inline-radio', options: Object.keys(BACKDROPS), labels: { white: 'Белый', game: 'Игра' } }
  },
  parameters: { layout: 'fullscreen', themes: false },
  globals: { ...NO_THEME, ...NO_LOCALE, ...NO_SCREEN_STATE }
}

// Строка панели: input стейт-машины или свойство view model
interface Control {
  name: string
  kind: 'boolean' | 'number' | 'string' | 'enum' | 'trigger' | 'other'
  value: unknown
  options?: string[]
  set: (value: unknown) => void
}

// Типы inputs стейт-машины в рантайме: 56 — число, 58 — триггер, 59 — флаг
const INPUT_KIND: Record<number, Control['kind']> = { 56: 'number', 58: 'trigger', 59: 'boolean' }

function inputControls(rive: RiveInstance, machine: string): Control[] {
  return rive.stateMachineInputs(machine).map((input) => {
    const kind = INPUT_KIND[input.type] ?? 'other'
    return {
      name: input.name,
      kind,
      value: kind === 'trigger' ? undefined : input.value,
      set: (value) => {
        if (kind === 'trigger') input.fire()
        else input.value = value as number | boolean
      }
    }
  })
}

function viewModelControls(rive: RiveInstance): Control[] {
  const vm = rive.viewModelInstance
  if (!vm) return []
  return vm.properties.map(({ name, type }): Control => {
    // Свойство со значением: панель читает его и пишет обратно
    const field = (kind: Control['kind'], property: { value: unknown } | null, options?: string[]): Control => ({
      name,
      kind,
      value: property?.value,
      options,
      set: (value) => {
        if (property) property.value = value
      }
    })
    switch (type) {
      case 'number': return field('number', vm.number(name))
      case 'boolean': return field('boolean', vm.boolean(name))
      case 'string': return field('string', vm.string(name))
      case 'enumType': return field('enum', vm.enum(name), vm.enum(name)?.values)
      case 'trigger': return { name, kind: 'trigger', value: undefined, set: () => vm.trigger(name)?.trigger() }
      default: return { name, kind: 'other', value: type, set: () => {} }
    }
  })
}

const kb = (bytes: number) => `${Math.round(bytes / 1024).toLocaleString('ru')} КБ`

export const Viewer: StoryObj<Args> = {
  // Одна история названа как раздел — Storybook показывает её одной строкой «Rive»
  name: 'Rive',
  render: storyArgs => ({
    components: { DsRive },
    setup() {
      const src = computed(() => URLS[storyArgs.file] ?? '')
      // Выбор в панели; пока не выбрано — DsRive берёт первые артборд и стейт-машину файла
      const artboard = ref<string>()
      const machine = ref<string>()
      const restart = ref(0)
      const playing = ref(true)

      // Что играет сейчас — запоминается при загрузке: на паузе рантайм уже не называет стейт-машину «играющей»
      const loaded = ref({ artboard: '', machine: '' })
      const boards = shallowRef<{ name: string, animations: string[], stateMachines: { name: string }[] }[]>([])
      const inputs = ref<Control[]>([])
      const properties = ref<Control[]>([])
      const log = ref<string[]>([])
      const size = ref('')
      // View model артборда: есть — DsRive перезапускается с bind-view-model; лежит в файле без привязки — подсказка
      const bindViewModel = ref(false)
      const viewModelNote = ref('')
      let viewModelChecked = false

      const push = (line: string) => {
        log.value = [`${new Date().toLocaleTimeString('ru')} ${line}`, ...log.value].slice(0, 40)
      }

      const current = computed(() => ({
        artboard: artboard.value ?? loaded.value.artboard,
        machine: machine.value ?? loaded.value.machine
      }))
      const board = computed(() => boards.value.find(item => item.name === current.value.artboard))
      const snippet = computed(() => [
        `import animation from './${storyArgs.file.split('/').pop()}.riv?url'`,
        '',
        `<DsRive :src="animation" artboard="${current.value.artboard}" state-machine="${current.value.machine}" fit="${storyArgs.fit}"${bindViewModel.value ? ' bind-view-model' : ''} alt="" />`
      ].join('\n'))

      const forgetViewModel = () => {
        bindViewModel.value = false
        viewModelNote.value = ''
        viewModelChecked = false
      }
      watch(() => storyArgs.file, () => {
        artboard.value = undefined
        machine.value = undefined
        boards.value = []
        log.value = []
        size.value = ''
        forgetViewModel()
      })

      async function onLoad(instance: RiveInstance) {
        loaded.value = {
          artboard: instance.activeArtboard,
          machine: instance.playingStateMachineNames[0] ?? instance.pausedStateMachineNames[0] ?? ''
        }
        // Состав файла — один раз на файл: contents каждый раз заново создаёт стейт-машины в рантайме
        if (!boards.value.length) boards.value = instance.contents?.artboards ?? []
        // Есть ли у артборда view model — один раз на артборд: без привязки рантайм пишет ошибку в консоль
        if (!viewModelChecked && instance.viewModelCount > 0) {
          viewModelChecked = true
          if (instance.defaultViewModel()) {
            bindViewModel.value = true
            return
          }
          viewModelNote.value = `в файле есть view model (${instance.viewModelCount}), но к артборду она не привязана — bind-view-model не нужен`
        }
        const name = current.value.machine
        inputs.value = name ? inputControls(instance, name) : []
        properties.value = viewModelControls(instance)
        size.value = `${instance.artboardWidth}×${instance.artboardHeight}`
        push(`загружен: ${current.value.artboard} · ${name || 'без стейт-машины'}`)
        const { EventType } = await loadRive()
        instance.on(EventType.StateChange, event => push(`состояние: ${([] as string[]).concat(event.data as string[]).join(', ')}`))
        fetch(src.value).then(response => response.blob()).then((blob) => {
          size.value = `${instance.artboardWidth}×${instance.artboardHeight} · ${kb(blob.size)}`
        }).catch(() => {})
      }

      const onEvent = (name: string) => push(`событие: ${name}`)
      const onError = (error: unknown) => push(`не загрузился: ${String(error)}`)

      function chooseArtboard(name: string) {
        artboard.value = name
        machine.value = undefined
        forgetViewModel()
      }
      function setControl(control: Control, value: unknown) {
        control.set(value)
        if (control.kind !== 'trigger') control.value = value
        push(`${control.name} = ${control.kind === 'trigger' ? 'сработал' : String(value)}`)
      }

      return {
        args: storyArgs, src, artboard, machine, restart, playing, boards, board, current, inputs, properties, log, size, bindViewModel, viewModelNote,
        snippet, backdrop: computed(() => BACKDROPS[storyArgs.backdrop]), onLoad, onEvent, onError, chooseArtboard, setControl
      }
    },
    template: `
      <div class="sb-rive">
        <div class="sb-rive__stage" :style="{ background: backdrop }">
          <DsRive
            v-if="src"
            :key="args.file + '|' + restart"
            class="ds:size-full"
            :src="src"
            :artboard="artboard"
            :state-machine="machine"
            :fit="args.fit"
            :autoplay="playing"
            :bind-view-model="bindViewModel"
            alt=""
            data-testid="rive"
            @load="onLoad"
            @event="onEvent"
            @error="onError"
          />
          <p v-else class="sb-note">Нет файлов .riv: положите их в apps/storybook/rive</p>
        </div>

        <aside class="sb-rive__panel">
          <section>
            <h3>{{ args.file }}.riv</h3>
            <p class="sb-rive__muted" data-testid="rive-size">{{ size || 'загружается…' }}</p>
            <div class="sb-rive__row">
              <button type="button" @click="restart++">Сначала</button>
              <button type="button" @click="playing = !playing">{{ playing ? 'Пауза' : 'Играть' }}</button>
            </div>
          </section>

          <section v-if="boards.length">
            <label>Артборд
              <select :value="current.artboard" data-testid="rive-artboard" @change="chooseArtboard($event.target.value)">
                <option v-for="item in boards" :key="item.name" :value="item.name">{{ item.name }}</option>
              </select>
            </label>
            <label v-if="board && board.stateMachines.length">Стейт-машина
              <select :value="current.machine" @change="machine = $event.target.value">
                <option v-for="item in board.stateMachines" :key="item.name" :value="item.name">{{ item.name }}</option>
              </select>
            </label>
            <p v-if="board && board.animations.length" class="sb-rive__muted">Анимации: {{ board.animations.join(', ') }}</p>
          </section>

          <section v-for="group in [{ title: 'Inputs стейт-машины', items: inputs }, { title: 'Свойства view model', items: properties, note: viewModelNote }]" :key="group.title">
            <h4>{{ group.title }}</h4>
            <p v-if="!group.items.length" class="sb-rive__muted">{{ group.note || 'нет — анимация играет сама' }}</p>
            <div v-for="control in group.items" :key="control.name" class="sb-rive__control">
              <button v-if="control.kind === 'trigger'" type="button" @click="setControl(control)">{{ control.name }}</button>
              <label v-else-if="control.kind === 'boolean'"><input type="checkbox" :checked="control.value" @change="setControl(control, $event.target.checked)"> {{ control.name }}</label>
              <label v-else-if="control.kind === 'number'">{{ control.name }} <input type="number" :value="control.value" @change="setControl(control, Number($event.target.value))"></label>
              <label v-else-if="control.kind === 'enum'">{{ control.name }}
                <select :value="control.value" @change="setControl(control, $event.target.value)"><option v-for="option in control.options" :key="option">{{ option }}</option></select>
              </label>
              <label v-else-if="control.kind === 'string'">{{ control.name }} <input :value="control.value" @change="setControl(control, $event.target.value)"></label>
              <span v-else class="sb-rive__muted">{{ control.name }}: {{ control.value }}</span>
            </div>
          </section>

          <section>
            <h4>Как подключить</h4>
            <pre class="sb-rive__code">{{ snippet }}</pre>
          </section>

          <section>
            <h4>Лог</h4>
            <ol class="sb-rive__log" data-testid="rive-log"><li v-for="(line, index) in log" :key="log.length - index">{{ line }}</li></ol>
          </section>
        </aside>
      </div>
    `
  })
}
