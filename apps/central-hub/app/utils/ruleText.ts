// Текст правила из l10n-core (имя ключа, описание, проверки текста) — на языке интерфейса; каталог — shared/utils/ruleMessages.ts.
// null — правило не нарушено
export const ruleText = <T extends string | null>(text: T): T => (text && localizeRule(text, currentHubLocale())) as T
