export function ProficiencyDot({ level = 'none' as 'none' | 'proficient' | 'expertise', active }: { level?: 'none' | 'proficient' | 'expertise'; active?: boolean }) {
  const resolved = active ? 'proficient' : level

  if (resolved === 'expertise') {
    return (
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-accent ring-2 ring-accent/40"
        title="Expertise"
      />
    )
  }
  if (resolved === 'proficient') {
    return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-primary" title="Proficient" />
  }
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-border" />
}
