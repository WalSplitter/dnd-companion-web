import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import type { CharacterFrontmatter } from '../vault/types'
import { formatPools } from './formatVitals'
import { samePools, vitalsOf } from './live'
import { pushVitals, saveToVault } from './liveSync'
import { setClaimed, useOwlbearStore } from './owlbearStore'

const BUTTON = 'rounded-md border border-trim/40 px-3 py-1.5 text-sm font-medium text-fg transition hover:border-trim hover:bg-trim/10'

/**
 * Above the sheet of a character linked in Owlbear Rodeo: that its values are live, who looks after
 * it, and — for the player who does — where the room and the vault disagree.
 */
export function OwlbearSheetBar({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const live = useOwlbearStore((s) => s.roster[character.name])
  const claimed = useOwlbearStore((s) => s.claimed.includes(character.name))
  const isGM = useOwlbearStore((s) => s.role === 'GM')
  const canSave = useVaultStore((s) => s.editPermission === 'granted')
  const requestEditPermission = useVaultStore((s) => s.requestEditPermission)
  if (!live) return null

  const vault = vitalsOf(character)
  const differs = !samePools(vault, live)
  const save = async () => {
    if (!canSave) await requestEditPermission()
    await saveToVault(character.name)
  }

  return (
    <section className="rpg-panel mb-5 space-y-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 font-semibold text-fg">
          <span className="recent-live size-2 rounded-full bg-success" aria-hidden />
          {t('owlbear.liveOnSheet')}
        </span>
        {live.byName && <span className="text-xs text-fg-muted">{t('owlbear.changedBy', { name: live.byName })}</span>}
        {!isGM && (
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-fg">
            <input
              type="checkbox"
              checked={claimed}
              onChange={(e) => setClaimed(character.name, e.target.checked)}
              className="size-4 accent-[var(--color-trim)]"
            />
            {t('owlbear.claim')}
          </label>
        )}
      </div>

      {!claimed && <p className="text-xs text-fg-muted">{t('owlbear.lockedHint')}</p>}

      {claimed && differs && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
          <p className="text-warning">{t('owlbear.mismatch', { live: formatPools(t, live), vault: formatPools(t, vault) })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={BUTTON} onClick={() => void save()}>
              {t('owlbear.saveLive')}
            </button>
            <button type="button" className={BUTTON} onClick={() => void pushVitals(character.name, vault)}>
              {t('owlbear.sendVault')}
            </button>
          </div>
        </div>
      )}

      {claimed && !differs && !canSave && <p className="text-xs text-warning">{t('owlbear.needsEditing')}</p>}
    </section>
  )
}
