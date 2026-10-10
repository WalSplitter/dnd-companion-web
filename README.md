<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
  <img src="docs/logo-light.svg" alt="" width="110">
</picture>

# D&D Companion

**A D&D character sheet that lives inside your Obsidian vault, and at your Owlbear Rodeo table.**

Point it at your vault, a folder on your device or your group's GitHub repository,<br>
and your characters, items and spells turn into an interactive sheet.<br>
No server · no database · no account.

[![Open the app](https://img.shields.io/badge/Open_the_app-walsplitter.github.io-d4af5f?style=for-the-badge&logo=googlechrome&logoColor=white)](https://walsplitter.github.io/dnd-companion-web/)
[![Wiki](https://img.shields.io/badge/Read_the-wiki-5b6cff?style=for-the-badge&logo=github&logoColor=white)](https://github.com/WalSplitter/dnd-companion-web/wiki)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)

<img src="docs/media/theme-dark.webp" width="540" alt="The D&D Companion start page: continue with the last vault, open a vault folder, or explore the sample vault" />

</div>

## Features

- 🎲 **A living sheet.** Modifiers, saves, skills and spell DC are derived, never duplicated. Click any value like `1d8` or `2d6+3` to roll it.
- 🎒 **Slot-grid inventory.** Drag items between backpacks and pouches, track charges, and equip gear on a character screen with body slots.
- ✨ **Spells and resources.** Slots, mana, class pools, luck points, exhaustion, rests and a biography tab.
- 📜 **Reads your vault directly.** Frontmatter and `[[Wikilinks]]`, with hover previews like in Obsidian.
- 💾 **Writes back safely.** Edits are patched into the exact YAML key; formatting and comments stay. Failed writes are rolled back.
- ☁️ **Straight from GitHub.** On any device, phones included, saved as tidy commits.
- 🏰 **In Owlbear Rodeo.** HP, temp HP, resilience and AC of linked tokens are live for the whole group, in sync with the Clash! tracker; rolls show up on the token.
- 👥 **The whole party.** Cards, a compact list or a front/middle/back lineup, plus a side-by-side comparison.
- 🎨 **Yours to style.** Colour palettes, class and animated topic themes; English and German.

## Quick start

Open **<https://walsplitter.github.io/dnd-companion-web/>**. There is nothing to install. Then pick a card on the start page:

| | Card | Where the vault is | Saving changes |
| --- | --- | --- | --- |
| 🧪 | **Explore the sample vault** | bundled demo party of six | tried in memory, never saved |
| 📁 | **Choose folder…** | a folder on your device | into the files (Chrome, Edge, Opera) |
| ☁️ | **Open from a repository** | a GitHub repository | as commits, in any browser |

Your vault is read in the browser and not uploaded anywhere. Saving to a folder needs the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), so Firefox and Safari open folders read-only; GitHub vaults work everywhere.

## Documentation

The [wiki](https://github.com/WalSplitter/dnd-companion-web/wiki) has step-by-step guides for players and DMs:

| Guide | What's in it |
| --- | --- |
| [Getting Started](https://github.com/WalSplitter/dnd-companion-web/wiki/Getting-Started) | from zero to your character sheet in a few minutes |
| [GitHub Sync](https://github.com/WalSplitter/dnd-companion-web/wiki/GitHub-Sync) | repository setup, access tokens, how and when changes are committed |
| [Owlbear Rodeo](https://github.com/WalSplitter/dnd-companion-web/wiki/Owlbear-Rodeo) | the extension, live values, Clash!, rolls on the token |
| [Vault Setup](https://github.com/WalSplitter/dnd-companion-web/wiki/Vault-Setup) · [For the DM](https://github.com/WalSplitter/dnd-companion-web/wiki/For-the-DM) | characters, items, spells and classes in your vault |
| [Vault Formats](https://github.com/WalSplitter/dnd-companion-web/wiki/Vault-Formats) | the exact frontmatter of the native, Endeavour and legacy formats |
| [FAQ and Troubleshooting](https://github.com/WalSplitter/dnd-companion-web/wiki/FAQ-and-Troubleshooting) | when something doesn't work |

## Owlbear Rodeo

In Owlbear Rodeo, open **Extensions → Manage Extensions → Add custom extension**, enter

```
https://walsplitter.github.io/dnd-companion-web/owlbear-manifest.json
```

and turn it on for your room. A **d20** in the toolbar opens the companion next to the map. How linking tokens, live values and Clash! work is in the [wiki](https://github.com/WalSplitter/dnd-companion-web/wiki/Owlbear-Rodeo).

## Development

Requires [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/WalSplitter/dnd-companion-web.git
cd dnd-companion-web
npm install
npm run dev      # http://localhost:5173
```

`npm run build` type-checks and builds, `npm run test` runs Vitest, `npm run lint` runs oxlint. Every push to `main` redeploys GitHub Pages. Architecture, local Owlbear testing and self-hosting are covered in [Development](https://github.com/WalSplitter/dnd-companion-web/wiki/Development).

## Roadmap

Planned work is tracked in [GitHub issues](https://github.com/WalSplitter/dnd-companion-web/issues), for example [#23](https://github.com/WalSplitter/dnd-companion-web/issues/23) (more Owlbear integration: initiative, conditions on tokens, loot) and [#12](https://github.com/WalSplitter/dnd-companion-web/issues/12) (offline use as a PWA).

## License

[MIT](LICENSE)
