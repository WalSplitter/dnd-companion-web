import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n/I18nContext'
import { buildVault } from '../parseFrontmatter'
import { VaultIndexProvider } from '../VaultIndexContext'
import { buildVaultIndex } from '../wikilinks'
import { renderObsidianBody } from './renderObsidian'

const index = buildVaultIndex(buildVault([{ path: 'Regeln/Gepäck.md', content: '---\ntags: [Regeln/Endeavour]\n---\nGepäckregeln.' }]))

function renderBody(body: string) {
  const wrap = ({ children }: { children: ReactNode }) => (
    <I18nProvider>
      <VaultIndexProvider index={index}>{children}</VaultIndexProvider>
    </I18nProvider>
  )
  return render(<div data-testid="body">{renderObsidianBody(body)}</div>, { wrapper: wrap })
}

describe('renderObsidianBody', () => {
  it('drops headings, callouts and fenced blocks but keeps prose with clickable wikilinks', () => {
    renderBody('# `=this.file.name`\n> [!infobox]\n> | Kosten | `=this.Kosten` |\n\n```dynamic-embed\n[[embed]]\n```\nEin Rucksack, siehe [[Gepäck]].')
    const body = screen.getByTestId('body')
    expect(body).toHaveTextContent('Ein Rucksack, siehe Gepäck.')
    expect(body).not.toHaveTextContent('embed')
    expect(screen.getByRole('button', { name: /Gepäck/ })).toBeInTheDocument()
  })

  it('drops Dataview inline expressions instead of rendering them as links', () => {
    renderBody('`=this.Beschreibung`\n\nKosten: `=this.Kosten` Gold.')
    const body = screen.getByTestId('body')
    expect(body).toHaveTextContent('Kosten: Gold.')
    expect(body).not.toHaveTextContent('this.')
    expect(body.querySelectorAll('p')).toHaveLength(1)
  })
})
