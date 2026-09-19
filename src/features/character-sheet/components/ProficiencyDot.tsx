import { useT } from '../../../i18n/I18nContext'

export function ProficiencyDot({ level = 'none' as 'none' | 'proficient' | 'expertise', active }: { level?: 'none' | 'proficient' | 'expertise'; active?: boolean }) {
  const t = useT()
  const resolved = active ? 'proficient' : level

  if (resolved === 'expertise') {
    return (
      <span
        className="inline-block size-2.5 shrink-0 rotate-45 rounded-[1px] bg-accent ring-2 ring-accent/40"
        title={t('proficiency.expertise')}
      />
    )
  }
  if (resolved === 'proficient') {
    return <span className="inline-block size-2.5 shrink-0 rotate-45 rounded-[1px] bg-primary" title={t('proficiency.proficient')} />
  }
  return <span className="inline-block size-2.5 shrink-0 rotate-45 rounded-[1px] border border-trim/40" />
}
