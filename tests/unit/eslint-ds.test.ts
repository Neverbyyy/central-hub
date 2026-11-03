import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { afterAll, describe, it } from 'vitest'
import ds from '../../tools/eslint/ds.mjs'

// Правила дизайн-системы (tools/eslint/ds.mjs): на каждое — что пропускает и что ловит
RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

const tester = new RuleTester({ languageOptions: { parser: vueParser, ecmaVersion: 2022, sourceType: 'module' } })
const vue = (template: string, script = '') => `<script setup lang="ts">${script}</script>\n<template>${template}</template>`

tester.run('ds/class-prefix', ds.rules['class-prefix'], {
  valid: [
    { code: vue('<div class="ds:flex ds:p-4 ds-button pw-hero__frame lk-hero" />') },
    { code: vue('<div :class="[active ? \'ds:opacity-100\' : \'ds:opacity-0\', { \'ds:w-full\': block }]" />') },
    // Строка без ds: в выражении — не класс (сравнение варианта)
    { code: vue('<div :class="variant === \'lp\' ? \'ds:text-lp\' : \'\'" />') },
    { code: vue('<div />', 'const VARIANT = { primary: \'ds:surface-cta ds:text-cta-text\' }') }
  ],
  invalid: [
    { code: vue('<div class="flex ds:p-4" />'), errors: [{ messageId: 'noPrefix' }] },
    { code: vue('<div :class="{ \'ds:flex mt-2\': open }" />'), errors: [{ messageId: 'noPrefix' }] },
    { code: vue('<div />', 'const CLASSES = \'ds:flex items-center\''), errors: [{ messageId: 'noPrefix' }] }
  ]
})

tester.run('ds/no-raw-values', ds.rules['no-raw-values'], {
  valid: [
    { code: vue('<div class="ds:bg-cta-bg ds:p-4 ds:shadow-(--ds-shadow-cta) ds:border-(length:--ds-line-cta)" />') },
    { code: vue('<div :style="{ aspectRatio: ratio, background: \'var(--ds-color-bg)\' }" />') },
    // id с решёткой — не цвет
    { code: vue('<a href="#cars2-stores" />', 'const target = \'#faq\'') }
  ],
  invalid: [
    { code: vue('<div class="ds:bg-[#fff]" />'), errors: [{ messageId: 'rawClass' }] },
    { code: vue('<div class="ds:p-[12px]" />'), errors: [{ messageId: 'rawClass' }] },
    { code: vue('<div class="ds:shadow-[0_2px_rgba(0,0,0,0.2)]" />'), errors: [{ messageId: 'rawClass' }] },
    { code: vue('<div style="color: #333" />'), errors: [{ messageId: 'rawStyle' }] },
    { code: vue('<div :style="{ padding: \'12px\' }" />'), errors: [{ messageId: 'rawStyle' }] },
    { code: vue('<div />', 'const brand = \'#05B8F6\''), errors: [{ messageId: 'rawHex' }] }
  ]
})
