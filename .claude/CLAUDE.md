# Project instructions

## Licenses of third-party code and assets

The app is MIT-licensed and deployed as a built bundle (GitHub Pages, Owlbear Rodeo extension). The minified bundle drops all license comments, so the build writes `third-party-licenses.txt` next to `index.html` (plugin `thirdPartyLicenses` in `vite.config.ts`, fed by Vite's `build.license`), linked from the footer. Handle licenses as part of every change, without being asked:

- **Before adding a dependency**, check its license (`npm view <pkg> license`) and that of any new transitive dependencies that end up in the bundle.
  - Fine to add: MIT, ISC, BSD-2/3-Clause, 0BSD, Apache-2.0, Unlicense, CC0, OFL-1.1 (fonts).
  - Ask the user first: GPL, LGPL, AGPL, MPL, EPL, CC-BY-SA, CC-BY-NC, "SEE LICENSE IN …", missing or unknown licenses. Explain what the license would require.
  - devDependencies are not shipped and only need a quick sanity check.
- **After adding or updating a runtime dependency**, run `npm run build` and check that every shipped package appears in `dist/third-party-licenses.txt` with its license text.
  - JS imports are picked up automatically. Packages imported from stylesheets under `src/` (`@import '<pkg>/…'`) are added by the plugin. Anything loaded another way (e.g. a CDN link, a file copied out of `node_modules`) is not — extend the plugin for it.
- **Third-party assets that don't come from npm** (images, icons, fonts, sounds, copied code snippets): only use them when their license allows redistribution, and ask the user how to credit them before committing. Note source and license in the commit message.
- Keep `"license": "MIT"` in `package.json` and the `LICENSE` file in sync if the project's own license ever changes.
