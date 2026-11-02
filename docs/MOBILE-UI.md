# Mobile UI experiment

Work only on `lab`; the stable site and desktop engine artifacts remain unchanged.

## Constraints

- No page zoom or whole-canvas zoom required to read or operate the mobile UI.
- Map zoom may change the world view independently of controls.
- First target: landscape phone adventure map; towns, hero windows and battles remain a later phase.
- Preserve the desktop layout and controls. Do not replace `src/vendor` or publish a rebuilt engine globally as a mobile experiment.

## Engine baseline

`config/engine-build.lock.json` pins VCMI 1.6.5 source archives, FuzzyLite and Emscripten. Install Python 3.12+, Node.js, CMake, Ninja and the pinned Emscripten SDK. SDK folder must contain `bin/` and `emscripten/`.

```sh
python3 scripts/build_engine.py --sdk /path/to/emsdk/upstream
```

The script checks source archive hashes, configures MinSizeRel, builds dependencies with four jobs by default, and verifies with `ninja -j32 html5` after the initial build in its `emscripten` directory. It writes artifacts and their hashes under ignored `.engine-work/`; it neither installs nor deploys them. `--work` selects another local directory, and `--prepare-only` stops after configuration.

## UI findings

Adventure map widgets are defined in `config/widgets/adventureMap.json` and built in `client/adventureMap/AdventureMapWidget.cpp`. The map viewport and sidebar are separate widgets. `client/renderSDL/ScreenHandler.cpp` currently derives scaling limits from 800 × 600; reducing the CSS canvas alone is therefore insufficient. A mobile layout must provide logical sizing and touch targets separately, including a safe route back to unchanged classic screens.

Before a mobile rollout, test desktop baseline, touch-only selection, map gestures, menus, hero/town lists, save/reload, rotation and iPad relaunch. A rebuilt baseline is not itself a mobile UI.

## Baseline verification (2026-11-02)

The pinned source built successfully with Emscripten 4.0.23, CMake 3.31.10 and Ninja 1.13.0. The complete scripted path and final `ninja -j32 html5` completed successfully.

Build compatibility adjustments are recorded in the script: disable dependency-only TBB tests, remove two invalid `template` disambiguators in Boost QVM indexed accessors, export `HEAPU8` for the existing save bridge, and package the empty music path as a directory rather than a file.

A local smoke site with checksums for the rebuilt artifacts reached the main menu and opened the Russian tutorial map. This verifies basic startup, resource mounting and adventure-map rendering; it is not a full gameplay regression pass. Published desktop and lab engine files remain the original pinned artifacts. No mobile UI has been deployed by this groundwork change.
