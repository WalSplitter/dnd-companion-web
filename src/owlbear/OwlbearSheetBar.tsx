import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import type { CharacterFrontmatter } from '../vault/types'
import { ConditionsEditor } from './ConditionsEditor'
import { formatPools } from './formatVitals'
import { samePools, vitalsOf } from './live'
import { pushVitals, saveToVault } from './liveSync'
import { setClaimed, setRollVisibility, useOwlbearStore, type RollVisibility } from './owlbearStore'

const BUTTON = 'rounded-md border border-trim/40 px-3 py-1.5 text-sm font-medium text-fg transition hover:border-trim hover:bg-trim/10'

/**
 * Above the sheet of a character linked in Owlbear Rodeo: that its values are live, who looks after
 * it, its conditions in the room (saved to the vault by the player who claimed it), who sees its rolls, and — for the player who does — where the room and the
 * vault disagree, and loot still waiting to go into the inventory.
 */
export function OwlbearSheetBar({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const live = useOwlbearStore((s) => s.roster[character.name])
  const claimed = useOwlbearStore((s) => s.claimed.includes(character.name))
  const isGM = useOwlbearStore((s) => s.role === 'GM')
  const rollVisibility = useOwlbearStore((s) => s.rollVisibility)
  const allLoot = useOwlbearStore((s) => s.loot)
  const canSave = useVaultStore((s) => s.editPermission === 'granted')
  const requestEditPermission = useVaultStore((s) => s.requestEditPermission)
  if (!live) return null
  const loot = allLoot.filter((drop) => drop.character === character.name)

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

      <ConditionsEditor name={character.name} editable={isGM || claimed} />

      <label className="flex w-fit items-center gap-2 text-xs text-fg-muted">
        {t('owlbear.rollVisibility')}
        <select
          value={rollVisibility}
          onChange={(e) => setRollVisibility(e.target.value as RollVisibility)}
          className="rounded-md border border-trim/40 bg-surface px-1.5 py-0.5 text-xs text-fg"
        >
          <option value="all">{t('owlbear.rollsAll')}</option>
          <option value="gm">{t('owlbear.rollsGM')}</option>
          <option value="off">{t('owlbear.rollsOff')}</option>
        </select>
      </label>

      {loot.length > 0 && (
        <p className="text-xs text-warning">
          {t(claimed && canSave ? 'owlbear.lootArriving' : claimed ? 'owlbear.lootNeedsEditing' : 'owlbear.lootWaiting', {
            items: loot.map((drop) => drop.name).join(', '),
          })}
        </p>
      )}

      {!claimed && <p className="text-xs text-fg-muted">{t(isGM ? 'owlbear.gmPoolsHint' : 'owlbear.lockedHint')}</p>}

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
