import { ConditionChips } from '../components/ConditionChips'
import { setConditions } from './liveSync'
import { useOwlbearStore } from './owlbearStore'

const NONE: string[] = []

/** The conditions of a character in the room (see `table.ts`), editable where `editable`. */
export function ConditionsEditor({ name, editable }: { name: string; editable: boolean }) {
  const conditions = useOwlbearStore((s) => s.table[name]?.conditions) ?? NONE
  return <ConditionChips conditions={conditions} onChange={editable ? (next) => void setConditions(name, next) : undefined} />
}
