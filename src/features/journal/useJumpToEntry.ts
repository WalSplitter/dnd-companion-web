import { useEffect, useState } from 'react'

/** Scrolls to an entry and lets it glow briefly — `flashId` is the one glowing. */
export function useJumpToEntry(onBeforeJump?: () => void): { flashId: string | null; jump: (id: string) => void } {
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => setFlashId(null), 1600)
    return () => clearTimeout(timer)
  }, [flashId])

  return {
    flashId,
    jump: (id) => {
      onBeforeJump?.()
      setFlashId(id)
      requestAnimationFrame(() => document.getElementById(`journal-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    },
  }
}
