# Build the static site for publication

## 1. Requirements

- Python **3.10+**. The static-site builder has no pip dependencies.
- HTTPS access to GitHub for the pinned engine download. The downloader uses system `curl` when available, otherwise Python’s verified HTTPS client.
- Your own **Heroes III Complete / Shadow of Death** data for English, Russian, or both. Original game data is not fetched by the scripts.
- Node **22** and npm are needed only for development tests and rebuilding the small browser libraries.

Work from the repository root. A compatible game folder should contain:

```text
Heroes III Complete/
├── Data/
│   ├── H3bitmap.lod
│   ├── H3sprite.lod
│   ├── H3ab_bmp.lod
│   ├── H3ab_spr.lod
│   ├── Heroes3.snd
│   └── H3ab_ahd.snd
├── Maps/    # .h3m / .h3c
└── Mp3/     # .mp3
```

Directory names are matched without case sensitivity by the exporter. Map and music folders may be absent, but a build without scenario maps will not provide a scenario collection. Steam HD Edition alone does not contain the expected Complete/SoD dataset.

## 2. Fetch the pinned VCMI engine

```sh
python3 scripts/fetch_engine.py
```

This downloads five **engine** files into ignored `src/vendor/` paths and verifies every size and SHA-256 against [engine.lock.json](../config/engine.lock.json). It does not download the original game archives, scenarios or music.

```sh
python3 scripts/fetch_engine.py --check
```

The engine is VCMI **1.6.5**, WebAssembly build `1.6.5-0`. Binary artifact URLs use immutable upstream commit `55d0af39d301a2c24d98976cff794d87f3695c17`. The versioned port source reference is `58b3887253852a6206400b1d7293291701414695`.

For upstream compilation, see the [pinned Emscripten build instructions](https://github.com/caiiiycuk/vcmi-wasm/blob/58b3887253852a6206400b1d7293291701414695/docs/Readme.emscripten.md) and [CMake configuration](https://github.com/caiiiycuk/vcmi-wasm/blob/58b3887253852a6206400b1d7293291701414695/CMakeLists.txt). That is a separate C++ build with additional dependencies and upstream caveats; this project does not claim a bit-for-bit reproducible recompilation of their binary. The supported site build uses the checksum-pinned artifacts above.

## 3. Build the static site

One language:

```sh
python3 scripts/build.py --english "/path/to/English game" --out dist
```

Or Russian:

```sh
python3 scripts/build.py --russian "/path/to/Russian game" --out dist-ru
```

Both languages:

```sh
python3 scripts/build.py --russian "/path/to/Russian game" --english "/path/to/English game" --out dist-bilingual
```

Use a new output directory for a full build; existing directories are not overwritten. All game inputs remain untouched. The generated manifest is sorted and records content hashes rather than local paths or timestamps, so the same code, engine and game inputs produce the same site content.

**The output contains your game data.** It is ignored by Git and must stay out of the source repository and source release archives. The build scripts only generate files; they do not start a server, create hosting or upload anything.

Files larger than 20 MiB are split into streaming parts. The browser still checks the hash of the whole reconstructed resource. Engine sizes and hashes are pinned in `src/app.js`; changing the engine requires updating those values and `src/cache-core.js`, not just dropping in a different WASM.

## 4. Publish over HTTPS

Upload only the generated directory to a static HTTPS host. Requests must return these headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
X-Content-Type-Options: nosniff
```

Cloudflare Pages reads the generated `_headers` file. Other hosts may require their own configuration. GitHub Pages is not the documented deployment target because this game requires response-header control.

The repository has no automatic deployment workflow and contains no Cloudflare credentials. A friend who only wants to play should use the hosted website, not the build instructions.

### iPad repeated-launch helper

The hosted project uses a short, separate helper page to work around Safari retaining shared WASM memory after exit. Its source is in `support/memory-reset/`.

The checked-in route is deliberately bound to the project’s exact production origin. For your own host, deploy the helper on a **separate site**, change the production-origin and helper URL in `src/app.js` → `homeDestination()`, and change the helper’s fixed return URL in `support/memory-reset/index.html`. Keep the return URL fixed; do not accept arbitrary destinations from the query string. Preserve the helper’s no-store headers. Localhost and other hosts do not use the project’s helper automatically.

### Optional feedback destination

Source files contain no default report destination. Report links stay hidden unless configured for a deployment.

To enable them, create `src/feedback-config.local.json` with a `reportURL` property containing your HTTPS GitHub new-issue URL. This local file is excluded by `.gitignore`; do not commit it. The exporter embeds the setting into the generated site, where it is public to visitors. Without this file, exported sites have no report links. The generic draft-building code remains reusable in `src/feedback.js`.

When hosting a fork, update README play links to your address.

## 5. Update only the client of an existing build

```sh
python3 src/export_site.py --out dist --refresh-client
```

Use this only with an existing generated `site-data.js`. It refreshes launcher files without recopying game resources. The normal engine verification and full-build workflow is recommended for releases.
