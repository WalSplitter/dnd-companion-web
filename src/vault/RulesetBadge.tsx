import { useT } from '../i18n/I18nContext'
import { useVaultStore } from '../store/vaultStore'

/** Shown in the app header next to the vault name — a best-effort hint at which ruleset the loaded
 * vault's content actually follows (see `detectRuleset.ts`), since a real campaign vault mixing
 * D&D, Nimble and homebrew ideas has no explicit marker for this anywhere. */
export function RulesetBadge() {
  const t = useT()
  const ruleset = useVaultStore((s) => s.ruleset)

  return (
    <span
      className="hidden items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg-muted sm:inline-flex"
      title={`${t('ruleset.tooltipHeuristic')}${ruleset.evidence.length > 0 ? ` (${ruleset.evidence.join('; ')})` : ''}`}
    >
      {t('ruleset.badgeLabel')}: <span className="font-semibold text-fg">{t(`ruleset.${ruleset.ruleset}`)}</span>
    </span>
  )
}
