// Правила дизайн-системы для ESLint: то, что ловит линтер, а не ревью. Подключаются в eslint.config.mjs (пакеты)
// и в apps/landings/eslint.config.mjs; тесты — tests/unit/eslint-ds.test.ts.
//   ds/class-prefix   — классы только с префиксом ds: (Tailwind дизайн-системы) или свои классы компонента
//                       (ds-button, pw-hero__frame, lk-…): без префикса класс не дойдёт до стилей и перебьёт хост InApp;
//   ds/no-raw-values  — никаких сырых цветов и пикселей: ds:bg-[#fff], ds:p-[12px], style="color: #fff",
//                       ':style' с px и hex в строках кода. Только токены (ds:bg-cta-bg, ds:p-4, var(--ds-…)).
// Текст в шаблоне и <img> ловят правила eslint-plugin-vue (vue/no-bare-strings-in-template,
// vue/no-restricted-html-elements) — они подключаются рядом.

// Свой класс компонента для <style scoped> и data-атрибутов: ds-button, ds-video__play, pw-hero__frame, lk-hero
const OWN_CLASS = /^(?:ds|pw|lk)-[a-z0-9_-]+$/
const HEX = /#[0-9a-f]{3,8}\b/i
// «_» в классах Tailwind — пробел: ds:shadow-[0_2px_…] — поэтому перед числом не буква, а не «не слово»
const PX = /(?<![a-z-])\d*\.?\d+px\b/i
const ARBITRARY = /\[([^\]]+)\]|\(([^)]+)\)/g

const tokensOf = text => text.split(/\s+/).filter(Boolean)

/** Сырое значение в классе: ds:bg-[#fff], ds:p-[12px], ds:shadow-[0_2px_#000]. Скобки с var(--ds-…) — можно. */
function rawInClass(token) {
  for (const match of token.matchAll(ARBITRARY)) {
    const inner = match[1] ?? match[2] ?? ''
    if (HEX.test(inner) || PX.test(inner) || /rgba?\(|hsla?\(/.test(inner)) return inner
  }
  return null
}

/** Строки внутри выражения: литералы, части шаблонных строк, ключи объектов — по ним проверяются :class и :style. */
function stringsOf(node, out = []) {
  if (!node || typeof node !== 'object') return out
  if (node.type === 'Literal' && typeof node.value === 'string') out.push({ node, value: node.value })
  else if (node.type === 'TemplateElement') out.push({ node, value: node.value.cooked ?? '' })
  else if (node.type === 'Property' && !node.computed && node.key.type === 'Identifier') {
    // { 'ds:w-full': block } — ключ-строка; { color: 'x' } — имя свойства, не класс
    stringsOf(node.value, out)
    return out
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    if (Array.isArray(value)) value.forEach(item => stringsOf(item, out))
    else if (value && typeof value.type === 'string') stringsOf(value, out)
  }
  return out
}

const bindingName = (attribute) => {
  if (!attribute.directive) return attribute.key.name
  if (attribute.key.name.name !== 'bind' || !attribute.key.argument || attribute.key.argument.type !== 'VIdentifier') return null
  return attribute.key.argument.name
}

// .vue — шаблон и код; .ts — только код (у парсера TypeScript нет шаблона)
function templateVisitor(context, handler) {
  const services = context.sourceCode.parserServices
  if (!services?.defineTemplateBodyVisitor) return handler.script ?? {}
  return services.defineTemplateBodyVisitor(handler.template, handler.script ?? {})
}

const classPrefix = {
  meta: {
    type: 'problem',
    docs: { description: 'Классы — только с префиксом ds: или свои классы компонента (ds-…, pw-…, lk-…)' },
    schema: [],
    messages: {
      noPrefix: 'Класс «{{ token }}» без префикса ds: — в дизайн-системе только ds:{{ token }} (Tailwind с префиксом) или свой класс ds-…/pw-…/lk-…'
    }
  },
  create(context) {
    const check = (node, tokens) => {
      for (const token of tokens) {
        if (token.startsWith('ds:') || OWN_CLASS.test(token)) continue
        context.report({ node, messageId: 'noPrefix', data: { token } })
      }
    }
    // В выражениях и в коде строка — классы, только если в ней есть ds: (иначе это 'lp' из variant === 'lp')
    const checkClassString = (node, text) => {
      const tokens = tokensOf(text)
      if (tokens.some(token => token.startsWith('ds:'))) check(node, tokens)
    }
    return templateVisitor(context, {
      template: {
        VAttribute(attribute) {
          if (bindingName(attribute) !== 'class' || !attribute.value) return
          if (!attribute.directive) return check(attribute, tokensOf(attribute.value.value))
          for (const { node, value } of stringsOf(attribute.value.expression)) checkClassString(node, value)
        }
      },
      script: {
        // Карты классов в коде (VARIANT = { primary: 'ds:… ds:…' })
        Literal(node) {
          if (typeof node.value === 'string') checkClassString(node, node.value)
        }
      }
    })
  }
}

const noRawValues = {
  meta: {
    type: 'problem',
    docs: { description: 'Без сырых цветов и пикселей: только токены' },
    schema: [],
    messages: {
      rawClass: 'Сырое значение «{{ value }}» в классе — только токены: ds:bg-<токен>, ds:p-<шаг шкалы>, ds:shadow-(--ds-shadow-…)',
      rawStyle: 'Сырое значение в style («{{ value }}») — только токены: var(--ds-…) или классы ds:',
      rawHex: 'Цвет «{{ value }}» в коде — только токены (color.* в packages/tokens), у компонента — классы ds:'
    }
  },
  create(context) {
    const checkClass = (node, text) => {
      for (const token of tokensOf(text)) {
        const raw = rawInClass(token)
        if (raw) context.report({ node, messageId: 'rawClass', data: { value: token } })
      }
    }
    const checkStyle = (node, text) => {
      const match = HEX.exec(text) ?? PX.exec(text)
      if (match) context.report({ node, messageId: 'rawStyle', data: { value: match[0] } })
    }
    return templateVisitor(context, {
      template: {
        VAttribute(attribute) {
          const name = bindingName(attribute)
          if (!attribute.value || (name !== 'class' && name !== 'style')) return
          const strings = attribute.directive ? stringsOf(attribute.value.expression) : [{ node: attribute, value: attribute.value.value }]
          for (const { node, value } of strings) {
            if (name === 'class') checkClass(node, value)
            else checkStyle(node, value)
          }
        }
      },
      script: {
        Literal(node) {
          if (typeof node.value !== 'string') return
          if (/(^|\s)ds:/.test(node.value)) return checkClass(node, node.value)
          const hex = HEX.exec(node.value)
          if (hex) context.report({ node, messageId: 'rawHex', data: { value: hex[0] } })
        }
      }
    })
  }
}

export default {
  meta: { name: 'amaya-ds' },
  rules: { 'class-prefix': classPrefix, 'no-raw-values': noRawValues }
}
