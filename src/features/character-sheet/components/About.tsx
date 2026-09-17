import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/I18nContext'
import { renderObsidianBody } from '../../../vault/components/WikiLink'

export function About({ body }: { body: string | undefined }) {
  const t = useT()
  const rendered = renderObsidianBody(body)
  if (!rendered) return null

  return (
    <Card title={t('cards.about')}>
      <div className="text-sm text-fg-muted">{rendered}</div>
    </Card>
  )
}
