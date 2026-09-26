import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterFrontmatter, Vault } from '../vault/types'
import { useErrorLogStore } from './errorLogStore'
import { useVaultStore } from './vaultStore'

const character = (name: string, hp: number) => ({ path: `${name}.md`, body: '', frontmatter: { name, hp } as unknown as CharacterFrontmatter })

function fakeHandle(content: string, failOnWrite = false) {
  let text = content
  return {
    getFile: async () => ({ text: async () => text }),
    createWritable: async () => ({
      write: async (data: string) => {
        if (failOnWrite) throw new Error('disk full')
        text = data
      },
      close: async () => {},
    }),
  } as unknown as FileSystemFileHandle
}

function setup(handle: FileSystemFileHandle) {
  useVaultStore.setState({
    vault: { characters: [character('A', 1), character('B', 1)] } as unknown as Vault,
    fileHandles: new Map([['A.md', handle]]),
    editPermission: 'granted',
    writeError: null,
  })
}

const hpOf = (name: string) => (useVaultStore.getState().vault.characters.find((c) => c.frontmatter.name === name)!.frontmatter as unknown as { hp: number }).hp
const bump = (c: CharacterFrontmatter) => ({ ...c, hp: 9 }) as unknown as CharacterFrontmatter

describe('vaultStore vault lifecycle', () => {
  it('starts with nothing opened, so the sample vault never flashes by before the last vault loads', () => {
    const initial = useVaultStore.getInitialState()
    expect(initial.source).toBe('none')
    expect(initial.status).toBe('idle')
    expect(initial.vault.characters).toHaveLength(0)
  })

  it('opens the sample vault on request and closes back to the empty state', () => {
    useVaultStore.getState().loadSampleVault()
    expect(useVaultStore.getState().source).toBe('sample')
    expect(useVaultStore.getState().vault.characters.length).toBeGreaterThan(0)

    useVaultStore.getState().closeVault()
    expect(useVaultStore.getState().source).toBe('none')
    expect(useVaultStore.getState().vault.characters).toHaveLength(0)
  })
})

describe('vaultStore.updateCharacterField', () => {
  beforeEach(() => {
    useErrorLogStore.getState().clear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('keeps the optimistic edit when the write succeeds', async () => {
    setup(fakeHandle('---\nhp: 1\n---\n'))
    await useVaultStore.getState().updateCharacterField('A.md', { path: 'A.md', keyPath: ['hp'] }, 9, bump)
    expect(hpOf('A')).toBe(9)
    expect(useVaultStore.getState().writeError).toBeNull()
  })

  it('rolls back only the edited character and logs a retryable error when the write fails', async () => {
    setup(fakeHandle('---\nhp: 1\n---\n', true))
    // A concurrent edit to another character must survive the rollback.
    const pending = useVaultStore.getState().updateCharacterField('A.md', { path: 'A.md', keyPath: ['hp'] }, 9, bump)
    useVaultStore.setState((s) => ({ vault: { ...s.vault, characters: s.vault.characters.map((c) => (c.path === 'B.md' ? character('B', 5) : c)) } }))
    await pending

    expect(hpOf('A')).toBe(1)
    expect(hpOf('B')).toBe(5)
    expect(useVaultStore.getState().writeError).toBe('disk full')
    const [entry] = useErrorLogStore.getState().entries
    expect(entry.source).toBe('vault.updateCharacterField')
    expect(entry.action).toBeDefined()
  })

  it('is a no-op without edit permission', async () => {
    setup(fakeHandle('---\nhp: 1\n---\n'))
    useVaultStore.setState({ editPermission: 'not-requested' })
    await useVaultStore.getState().updateCharacterField('A.md', { path: 'A.md', keyPath: ['hp'] }, 9, bump)
    expect(hpOf('A')).toBe(1)
  })
})
