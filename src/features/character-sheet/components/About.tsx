import { useState } from 'react'
import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/I18nContext'
import { renderObsidianBody } from '../../../vault/components/WikiLink'

/** Backstory / notes from the character file body. Long text is folded behind a fade so it doesn't
 * push the rest of the sheet down. */
export function About({ body }: { body: string | undefined }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const rendered = renderObsidianBody(body)
  if (!rendered) return null

  return (
    <Card title={t('cards.about')}>
      <div
        className={`relative text-sm leading-relaxed text-fg-muted [overflow-wrap:anywhere] ${
          expanded ? '' : 'max-h-44 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]'
        }`}
      >
        {rendered}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 cursor-pointer font-display text-xs font-bold uppercase tracking-wider text-trim transition hover:text-fg"
      >
        {expanded ? t('common.showLess') : t('common.showMore')}
      </button>
    </Card>
  )
}
