import { Card } from '../../../components/Card'
import { renderObsidianBody } from '../../../vault/components/WikiLink'

export function About({ body }: { body: string | undefined }) {
  const rendered = renderObsidianBody(body)
  if (!rendered) return null

  return (
    <Card title="About">
      <div className="text-sm text-fg-muted">{rendered}</div>
    </Card>
  )
}
