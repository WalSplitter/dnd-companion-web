import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useI18n'
import { useVaultStore } from '../../store/vaultStore'

/** The vault that is open right now — with its ruleset and party size, to close it or go back to it. */
export function CurrentVaultBar() {
  const t = useT()
  const navigate = useNavigate()
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const characterCount = useVaultStore((s) => s.vault.characters.length)
  const ruleset = useVaultStore((s) => s.ruleset.ruleset)
  const closeVault = useVaultStore((s) => s.closeVault)

  return (
    <div className="rise-in current-vault mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-trim/30 px-5 py-2.5 short:mb-3 short:py-2 tall:mb-6 tall:py-3.5" style={{ '--i': 3 } as CSSProperties}>
      <span className="recent-live size-2.5 shrink-0 rounded-full bg-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-fg-muted">{t('start.currentLabel')}</p>
        <p className="truncate font-display text-lg font-bold text-fg">
          {source === 'sample' ? t('vaultLoader.sampleData') : vaultName}
          <span className="ml-3 font-sans text-xs font-normal text-fg-muted">
            {ruleset !== 'unknown' && `${t(`ruleset.${ruleset}`)} · `}
            {t('start.characterCount', { n: characterCount })}
          </span>
        </p>
      </div>
      <button type="button" onClick={closeVault} className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg">
        {t('start.closeVault')}
      </button>
      <button type="button" onClick={() => navigate('/characters')} className="rpg-button start-cta">
        {t('start.toCharacters')} →
      </button>
    </div>
  )
}
