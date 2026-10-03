import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AmbientLayer } from './AmbientLayer'
import { useThemeStore } from './themeStore'

function particleCount(): number {
  return document.querySelectorAll('.ambient-particle').length
}

describe('AmbientLayer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the full scene where matchMedia is missing (jsdom)', () => {
    useThemeStore.setState({ theme: 'berserker', effects: true })
    render(<AmbientLayer />)
    expect(particleCount()).toBe(34)
  })

  it('halves the particles on touch devices', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(hover: none)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    useThemeStore.setState({ theme: 'berserker', effects: true })
    render(<AmbientLayer />)
    expect(particleCount()).toBe(17)
  })
})
