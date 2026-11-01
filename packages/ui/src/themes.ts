// Темы — те же, что THEMES в @amaya/tokens (scripts/tokens.mjs): переключаются атрибутом data-ds-theme на DsRoot
export const DS_THEMES = ['base', 'cars2', 'farm'] as const

export type DsTheme = typeof DS_THEMES[number]
