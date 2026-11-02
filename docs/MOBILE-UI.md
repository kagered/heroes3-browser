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

## First adventure-map prototype

Build the patched engine separately:

```sh
python3 scripts/build_engine.py --sdk /path/to/emsdk/upstream --mobile
python3 scripts/install_mobile_engine.py .engine-work/emscripten/html5 /path/to/lab-static-site
```

Apply the patch before compiling; the installer only copies already-built artifacts and writes their integrity metadata. Keep `src/mobile-engine.js` as the checked-in empty default. The installer writes the populated file to the deployment directory, never to the public source checkout. Source-only exports without the experimental binaries fall back to the original engine.

`engine-patches/mobile-adventure.patch` changes the map viewport and adds a bounded action bridge that checks VCMI shortcut availability. The original sidebar objects are retained offscreen because the engine still needs their state. The classic engine stays in `vendor/`; the patched one lives in `vendor-mobile/` and is chosen only on touch devices (or the explicit QA override). `?mobile-map=1` forces the prototype for desktop QA; `?mobile-map=off` restores the classic layout.

The adventure map renders at one CSS pixel per engine pixel. The HTML controls have at least 44-pixel targets. Map zoom buttons and pinch change VCMI map zoom, never the canvas transform. Opening a classic dialog hides the new panel and clears queued actions. Returning restores the native map without scrolling its clipping container.

This is a map-only prototype, not a completed mobile port. Menus, hero/town windows and battles retain their classic fit-to-screen layout and existing touch bridge. The mobile session always uses landscape coordinates, rotating its surface in portrait. Touch and mouse coordinates are mapped back to the engine; rotating the device does not change the engine profile. Full responsive engine resizing, hero/town pickers and dedicated mobile dialogs remain future work. Physical iPad/Safari and Android touch testing is still required.

## Camera, dialog and display follow-up

Mobile settings enable left-button dragging and disable cursor-edge scrolling. The existing touch bridge emits the drag; VCMI pans the camera. The new Center hero action centers the currently selected hero, or selects the first wandering hero after a town selection. Zoom buttons/pinch still change only the map.

Classic windows use all space below one 48-pixel bar, with large Back / Close (Escape), Screen and Home controls. Their internal UI is still classic and has not been reflowed; the bar makes dismissal accessible without hitting the small engine close button. Whole-canvas pinch remains disabled throughout the experimental session.

On real touch devices the Play gesture attempts root fullscreen and, where available, landscape orientation lock. Explicit desktop QA does not request fullscreen automatically. Fullscreen/orientation rejection is handled without stopping the game. The Screen button remains available in both map and classic windows. A bilingual fallback explains Safari Share → Add to Home Screen; the web manifest and Apple standalone metadata enable web-app launch without browser tabs. Browsers may still show system UI. No service worker or offline-start promise is introduced.
