import { describe, expect, it } from 'vitest'
import { fitPanel } from './panel'

describe('fitPanel', () => {
  const bounds = { minWidth: 320, maxWidth: 1000, minHeight: 240, maxHeight: 800 }

  it('keeps a dragged size inside the window and above the minimum', () => {
    expect(fitPanel(600, 500, bounds)).toEqual({ width: 600, height: 500 })
    expect(fitPanel(100, 100, bounds)).toEqual({ width: 320, height: 240 })
    expect(fitPanel(4000, 4000, bounds)).toEqual({ width: 1000, height: 800 })
  })

  it('rounds to whole pixels', () => {
    expect(fitPanel(600.6, 500.2, bounds)).toEqual({ width: 601, height: 500 })
  })
})
