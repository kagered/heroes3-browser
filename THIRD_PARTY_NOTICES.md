# Third-party notices

## VCMI / WebAssembly engine

- Engine: **VCMI 1.6.5**, WebAssembly build **1.6.5-0**.
- Upstream: https://github.com/vcmi/vcmi
- WebAssembly port: https://github.com/caiiiycuk/vcmi-wasm
- Port source reference: `58b3887253852a6206400b1d7293291701414695` (`vcmi-wasm-1.6.5`).
- Artifact snapshot: `55d0af39d301a2c24d98976cff794d87f3695c17` (`gh-pages`).
- License: **GPL-2.0-or-later**. The GPL text is in [LICENSE](LICENSE); the original engine notice is fetched alongside the engine.

Engine JS, WASM and VCMI resource packages are **not tracked in this repository or included in its source archive**. `scripts/fetch_engine.py` obtains the pinned upstream artifacts with size and SHA-256 verification. Source and binary revisions are recorded separately in `config/engine.lock.json`; no bit-identical upstream compiler output is claimed.

The browser integration does not modify those engine artifacts. Exit routing and settings are applied to the engine’s in-memory filesystem. See the upstream source for its engine dependencies, notices and build instructions.

## fflate

- Version: **0.8.3**.
- Source: https://github.com/101arrowz/fflate
- License: **MIT**.
- Bundled browser build: `src/vendor/save-zip.js`.
- Original license: [LICENSE-fflate.txt](src/vendor/LICENSE-fflate.txt).

## noble-hashes

- Version: **1.8.0**.
- Source: https://github.com/paulmillr/noble-hashes/tree/1.8.0
- License: **MIT**.
- SHA-256-only browser bundle: `src/vendor/asset-sha256.js`.
- Original license: [LICENSE-noble-hashes.txt](src/vendor/LICENSE-noble-hashes.txt).

Bundle versions and file hashes are recorded in `config/vendor.lock.json`. The vendored JS is served locally; players do not load these libraries from a CDN.

## Development dependencies

`fake-indexeddb` (Apache-2.0) and esbuild (MIT), along with the library packages used to regenerate browser bundles, are development dependencies only. Their exact versions and package integrity values are in `package-lock.json`. They are not copied into the generated game site as Node packages.

## Original game, artwork and screenshots

Heroes of Might and Magic III and its original data/artwork belong to their respective rights holders. Game archives, music, scenarios and saves are not included in the repository or source release. Users provide their own compatible game files for a local build.

The documentation’s development screenshot depicts original game artwork for illustration. That artwork is not covered by the project’s GPL license. The original vector banner and launcher graphics are project assets.
