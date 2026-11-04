# Mobile UI experiment

Work only on `lab`; the stable site and desktop engine artifacts remain unchanged.

## Constraints

- No page zoom or whole-canvas zoom required to read or operate the mobile UI.
- Map zoom may change the world view independently of controls.
- Landscape phone map, town overview, army and individual-dwelling recruitment are adapted. Hero, kingdom, save/load, construction and other town subwindows remain a later phase.
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

## Hero identity, movement HUD and native game menu

The mobile Hero action resolves the current or last selected wandering hero by ID against the live hero list. It never opens the selected town through the generic View selected shortcut. Town selects and opens a town directly. Removed heroes are not retained as raw pointers.

VCMI publishes the hero's translated name and actual remaining/maximum movement points to the mobile shell. The HUD updates only when values change and distinguishes town selection from exhausted movement. The numeric counter does not shrink with long hero names.

The Menu action opens a native-sized HTML game menu with Resume, Save, Load, Scenario, Kingdom, Settings and Game main menu. Commands use the engine shortcut availability mask. Escape and a keyboard focus loop operate inside the menu. The original save/load, settings, hero and town windows remain classic; this is the first converted game window, not a claim of a fully adapted mobile UI.

## Map overlays and action dispatch

The renderer reads mobile actions but dispatches them through the regular SDL event queue, using a weak adventure-map reference and rechecking the top window before execution. Window creation and end-game actions are no longer invoked as part of rendering.

Small map information windows and right-click popups retain the native map surface. Their content is clamped inside the visible area including frame margins. Buttons behind a modal are disabled, and a window-state notification does not release an existing touch hold. The hold ends on finger-up/cancel or actual focus loss.

Map information, reward, choice and confirmation dialogs now lay out inside the visible mobile viewport with the original DiBoxBck texture, gold frame and button art. Text wraps or scrolls; reward components sit beside the text when space permits. Button targets are at least 44 pixels high. The map renders behind the whole dialog area, without a captured backdrop or canvas clipping. The bottom action bar hides while a modal is open. Information windows opened above a hero, town or battle retain that window's layout.

Hero level-up dialogs use a compact horizontal layout with the original portrait, primary-skill icon and secondary-skill components. Selection and confirmation retain the engine callbacks. Desktop constructors retain their original layout. Hero, town, save/load and battle windows are not yet converted.

Confirmed game-menu return avoids the browser build's blocking in-process endGameplay path: after the original confirmation, the mobile callback flushes pending save writes, uses the existing tracked-runtime teardown, and automatically relaunches into the game's title menu. Safari keeps its existing cross-origin memory-reset helper. No party is reloaded automatically. This adds a short cached-engine loading step when returning to the title menu.


## Town and recruitment prototype

The optional engine reflows the town into Town, Recruit and Army sections. Only the illustrated panorama is scaled; controls, troop slots and text retain independent native sizes. Building hit tests map panorama coordinates back to the original building masks. Building animations use the engine timer and the offscreen panorama buffer belongs to the town widget.

Town actions call the original building handlers. Construction, market, guild and tavern subwindows remain classic and return to the adapted town. The recruit list shows the original creature portraits, translated names and live availability, including dwellings not yet built. Updated buildings refresh their action availability. A Next town control appears when more than one town is owned.

On narrow screens recruitment cards use two columns. Town viewport changes rebuild the town window through the event queue, preserving the selected section and game state.

The Army section reuses the actual garrison and hero slots, including movement and splitting callbacks. Individual-dwelling recruitment keeps the original resource prices, affordability checks and recruit callback. It lays out creature choices beside quantity and costs, with large increment/decrement, Maximum, Recruit and Cancel controls. Quantity uses large increment/decrement and Maximum controls; the fixed-size desktop slider bitmap is kept offscreen while its original quantity logic remains authoritative. Empty purchases do nothing. Back / Close dismisses both native windows.

The native town currently requires at least 568 × 280 visible landscape pixels (320 pixels high below 700 pixels wide); recruitment requires at least 532 × 320. Shorter viewports retain the classic window and large dismissal bar. Browser standalone/fullscreen mode may provide additional usable height. Desktop never enters these branches.

The optional mobile loader URL includes its manifest hash, preventing an old cached loader from being paired with a new verified WebAssembly binary.


## Native character, kingdom, service and settings windows

A shared original-texture panel supports independent tabs, page controls and viewport reflow without canvas zoom. Market resource slots, tavern hero portraits, hero army slots, skills and artifact places retain their original engine objects and callbacks. Equipment and backpack navigation preserve an artifact held by the cursor. Hero actions retain biography, specialization, quest log and guarded dismissal.

Kingdom overview has paged hero, town, resource and site cards. It refreshes when returning from another window. The detailed classic table remains available for cross-hero operations. Town recruitment now has a separate dark divider and gap above navigation.

Settings wrap the existing translated controls and call the original toggles, sliders and radio groups. Native windows use the engine's real affordability and hiring restrictions. Display resolution, engine scaling and desktop fullscreen options are omitted from the mobile settings; the browser Screen action controls display. The game-actions page retains save, load, restart, menu return and exit. Save/load, construction, guild interiors and advanced non-resource market modes remain classic.

The mobile settings implementation must not receive the legacy lazy-tab exit bitmap: it eagerly creates all settings categories. The original desktop exit bridge remains unchanged. Browser profile exit uses the existing tracked teardown callbacks.

## Immutable mobile engine deployments

The installer writes all four mobile engine files under a content-derived `vendor-mobile/<build>/` directory and puts that base and checksums in `mobile-engine.js`. Earlier directories and legacy root files are retained, so cached launchers cannot mix a previous WebAssembly module with a newly deployed loader. The manifest is served with `Cache-Control: no-store`; the launcher is revalidated. The native-settings capability flag keeps legacy cached builds compatible with their original exit bridge.


### Mobile adventure v8

- Restore the last available wandering hero when returning to the adventure map, so closing Town or kingdom windows does not leave movement disabled by a town selection.
- The canvas backing allocation reserves the device screen, while the live map area follows the visual viewport. Safari fullscreen reserves its system status strip and left dismissal affordance; native panels reflow after geometry changes. Map resizing updates the existing view, input rectangle and tile canvases while retaining its controller, camera, route and observer; it never reconstructs AdventureMapWidget during an active game. Initial game loading does not trigger a redundant map resize.
- Map right-button tooltips retain the top and bottom navigation, inert until release. Other modal windows retain their own navigation.
- Market selection borders match their resized slots.
- Construction, building confirmation, mage guild and quest log have native layouts. Original build/research/quest actions and checks remain authoritative.
- Active game time is a browser-side ledger, counted by the lab mobile engine while a game exists in its window stack. Hidden/suspended tabs do not accrue time. It is displayed on the home page and pause menu, and included as optional metadata in the existing v1 save archive. Reimport merges per-session maxima to prevent double counting. This is total tracked play time, not a timer embedded in individual VCMI saves; old saves have no historical time to recover.
- Save/load and advanced market/kingdom modes remain classic. iPad Safari fullscreen still requires a physical-device check.

### Mobile adventure v9

- Recruitment repaints its textured surface each frame and no longer stretches the desktop slider bitmap. Quantity remains bounded by the original stock and affordability logic.
- Ordinary creature details use Stats and Abilities pages with original computed combat values, scrollable descriptions, and original dismissal/upgrade confirmations. Commander extensions retain their classic layout.
- Hero and town Army Split opens a quantity dialog for the selected owned stack and an empty slot in the same army. A clear hint explains missing selection, insufficient units or a full army. Desktop splitting retains its existing behavior. The landscape split dialog uses real numeric inputs and large increment/decrement controls.
- iPad fullscreen reserves 96 pixels at the start of the top navigation for Safari's dismissal control. Game gestures suppress page scrolling; Safari's system swipe-to-exit cannot be disabled by page code. Add to Home Screen avoids the browser fullscreen dismissal overlay; standalone launch does not request another fullscreen layer.
- Test on physical iPad: swipe over the map, system dismissal and return, top controls, split 2-unit stack, recruitment and creature details.

### Army selection feedback

Native garrison slots draw a high-contrast selection border from the actual garrison selection, independent of the classic overlay sprite. Changing or clearing selection repaints the slot. Formation displays the current authoritative tight/loose value and refreshes after the engine applies the change; its effect is the initial placement of stacks in battle. Larger army panels include this explanation. Desktop visuals and formation callbacks remain unchanged.

### Mobile adventure v10

Construction and build confirmations use content-sized, vertically centered windows; the thieves guild is capped at 360 logical pixels high. Construction uses compact rows with the original building previews, precise state labels and Previous/Next pagination. The original building click handlers, prices and restrictions remain authoritative. The thieves guild uses Kingdoms, Resources, Power and Leaders pages, with large controls for additional ranks and players. It only displays the information returned by the original thieves-guild callback, including unknown values.

All native buttons briefly illuminate on press. Individual-dwelling recruitment now includes adventure-map dwellings (level -1), uses a single visible creature choice with Previous/Next variant controls, disables zero-quantity purchases, and displays a request notice. A green confirmation follows an observed stock reduction while the recruitment window remains open. An initial request notice alone does not claim server acceptance.

iPad browser sessions no longer request fullscreen automatically. Screen explains Safari's system gesture and offers explicit fullscreen opt-in, or Add to Home Screen for a standalone launch. Other touch devices retain their previous behavior. Page gestures remain suppressed over the game surface; the website cannot suppress Safari or iPadOS system gestures.


### Mobile adventure v11

The spellbook, save/load screens and in-game scenario information now have native mobile layouts. The spellbook shows independently sized spell cards, school and combat/adventure filters, paging, spell cost and current mana. Casting and long-press descriptions reuse the original SpellArea handlers. The source hero's learned/available spells and the original cast validation remain authoritative. Desktop spellbook layout is unchanged.

Save/load has paged 44-pixel file rows, folder navigation, selection feedback, a larger filename input for saving and separate scenario/player details. Original filename filtering, overwrite confirmation, save callbacks and load validation remain in use. Disabled classic controls are kept out of touch input. Escape and the large close action dismiss native screens. Map-size filters, sorting and delete mode are not yet exposed in this first mobile file-browser layout.

In-game scenario information uses Scenario, Players and Rules pages. It remains read-only, as in the original screen; player colors, control type, starting town, hero and bonus are shown without changing the party. New-game lobby customization is outside this change.

Validation: full pinned Emscripten build and required `ninja -j32 html5`, public JavaScript/Python checks and patch application checks. Interactive browser verification is unavailable in this session because Browser use is disabled by the app. Physical iPad verification of spell casting/descriptions, save/overwrite/load, folder paging, close/return-to-map and orientation remains required. Production and the original desktop engine are not replaced.


### Mobile save-screen follow-up

Saving now lists all readable saves independently of the lobby guest flag and tutorial/campaign load-mode filter; loading retains its original compatibility filtering. The current scenario metadata is retained separately from file selection, including an empty list. The mobile Scenario tab describes the active party rather than the selected destination file.

The filename uses a real HTML input placed over the native field, so tapping it is a browser input gesture on iPad. It preserves focused edits across redraws, filters the same forbidden filename characters, transfers text before Save, and hides/loses focus over confirmations, other pages and after closing the screen. Cyrillic, filtering, selection/focus preservation and dismissal have automated checks. Actual iPad keyboard and full save/reload behavior still need physical verification; Browser use remains unavailable.


### iPad keyboard focus follow-up

Dialog layer changes can occur when Safari shrinks its visual viewport for the keyboard. Closing an already-closed pause menu no longer focuses the canvas; focus returns to the game only after an actual pause-menu dismissal and never while the browser filename input is focused. The regression test simulates a keyboard-sized viewport and native-dialog layer changes, fails on the previous code, and passes with the fix. Physical iPad confirmation is still required.

### Battle, long text and keyboard viewport follow-up

Mobile battle clicks resolve the current pointer hex and update the legal action at click time. When a neighbouring enemy sprite overlaps the active stack's ground hex, its upper body provides a bounded alternate target; normal move/attack legality remains authoritative. This is a targeted overlap fix, not a full battle UI rewrite. Battle results replace the unsupported browser video area with an original-texture heading.

Text-box resize updates the multiline label's actual visible rectangle. Overflowing mobile information dialogs retain all text and add 44-pixel up/down controls beside the existing scroll bar. The same layout serves both languages.

The browser save-name field lives outside the rotating game container. While focused it stays upright at the visible viewport's top with a Done control, and keyboard resize does not resize the game. An explicit engine text-editing flag prevents innerHeight changes from shrinking native panels. Blur restores normal geometry. Tests cover focus, keyboard-sized viewport offsets, unchanged game viewport and ending text entry. Physical checks remain required for adjacent attacks, results, long-text scrolling and iPad keyboard visibility. Browser use is unavailable in this session.

### Result, recruitment and load-transition follow-up

Mobile battle results use one continuous original-texture interior while retaining the original outer frame and result/casualty controls, instead of a button-shaped patch over the video rectangle. External recruitment closes through a queued weak-window callback after observed stock reduction, rather than immediately claiming success.

Mobile information text is reconstructed from the original raw message. Long single-confirmation messages also expose Full text, a separate browser reader with native touch scrolling; closing the reader does not accept the game dialog. Its full-message preservation is tested.

Confirming in-game Load uses the tracked browser teardown/relaunch path instead of blocking in endGameplay. A one-shot session target opens the Load title-menu tab after relaunch, preserving the original save-mode choices. Actual save loading stays under the engine's normal validation. Regression tests cover the target and deferred teardown. Physical iPad verification remains required; no interactive browser access is available in this session.


### Full-text eligibility and tutorial-data diagnosis

Full text is offered only when the laid-out mobile text box actually overflows and owns a scroll bar, rather than from raw UTF-8 byte length. Short fitting notices have only their original confirmation control.

The supplied Russian Tutorial.tut stores the Inferno/Archangels event message as exactly 300 Windows-1251 bytes, ending mid-sentence. The English map contains the complete counterpart. This is a source-map content defect, also embedded into existing saves, not hidden content in the reader. Game maps and save contents are not rewritten by this UI fix.

### Sequential dwelling purchases and turn feedback

External dwelling recruitment stays open after an acknowledged purchase, retaining variant arrows and the success notice, so a player can buy other war-machine types without revisiting the building. Town single-dwelling behavior remains the engine default.

The native mobile shell receives player-end, opponent-start and your-turn events from the engine, including player color and the authoritative month/week/day. A noninteractive gold-framed ribbon animates an hourglass while waiting, identifies opponents, then briefly shows Your turn with the new date. It never introduces a gameplay delay or confirmation. Classic battle windows suppress the ribbon; reduced-motion preferences disable animation. Tests cover phases, date, stale dismissal timers and window visibility. Physical iPad timing and presentation still require checking; Browser use is unavailable in this session.

### Mobile digging action

Menu → Dig (Копать) forwards action 17 to ADVENTURE_DIG_GRAIL through the existing shortcut availability mask and queued adventure dispatch. The original hero diggingStatus checks, messages and dig callback remain authoritative, including movement, occupied ground and terrain restrictions. The action is unavailable without a selected hero or behind modal windows. Tests cover Russian/English labels, availability, queue dispatch and dialog clearing. Actual iPad digging still needs physical verification.

### Scenario completion and mobile exit

Confirmed Grail construction retains the original callback and victory rules. For completed single scenarios/tutorials, the mobile high-score path avoids blocking endGameplay: it requests disconnection without joining workers, gives control to the main menu interface, and presents the original high-score input/result screens with the original calculation/statistics. Only when those screens return to the title menu does the browser perform tracked teardown and cached relaunch. Campaign transitions retain the original path and are not covered by this change. Actual tutorial completion still requires physical verification; Browser use is unavailable.

Menu → Exit to desktop (Выход в ОС) forwards action 18 to the original quit shortcut and confirmation. After confirmation the mobile branch defers the existing quitGame callback, flushing queued save writes and returning to the site home page. Short landscape menus align their overflowing content at the top so the added action remains reachable by scrolling. Tests cover bilingual labels, availability and dispatch; desktop engine artifacts remain unchanged.

### Nonblocking victory-dialog completion

The mobile single-scenario gameOver handler no longer enters waitForAllDialogs. The terminal network event instead copies its result/statistics into a deferred completion. GUI updates keep presenting queued messages; only when the queue is empty and the active dialog has been acknowledged is the completion posted to the SDL main-thread queue. The existing result/high-score flow then runs. No message is automatically accepted or discarded.

DeferredDialogCompletion has a standalone native regression test covering queued messages, an active dialog, duplicate scheduling, deferred execution and exactly-once extraction. After preparing the engine source, run `c++ -std=c++17 -I .engine-work/source/client/gui tests/native/deferred-dialog-completion.cpp -o /tmp/dialog-completion-test` and `/tmp/dialog-completion-test`. Browser launch logs mark asynchronous waiting, acknowledged dialogs and the result screen opening. Full Grail completion still needs a physical iPad check; Browser use is unavailable.

### Defer server shutdown until browser teardown

Audit of the remaining completion path found that sendClientDisconnecting itself closes the connection and calls waitForServerShutdown. The mobile result transition must not invoke it. It now marks the completed session DISCONNECTING to ignore further gameplay packets, presents the original results with the game state still available, and leaves worker/server destruction to tracked browser teardown after the result screens. A late disconnect during this completed-session state also skips the synchronous server wait. Campaign/desktop paths are unchanged.

The supplied Grail video was decoded into frames: the town already contains its Grail structure and remains on the town screen throughout the short clip. This supports successful construction but does not prove the exact blocked call or reproduce the fix. Full iPad completion still requires verification.

The completed-session guard stays set until the runtime is destroyed. A separate one-shot flag prevents repeated relaunch requests while keeping late disconnect callbacks away from synchronous waits during teardown.

Completion checkpoints are retained in session storage and copied into the launch log on the next page load, so a reload after a stall does not erase the last completed phase. This local diagnostic contains only the phase label.

### Durable scenario completion diagnostics

Completion checkpoints persist in localStorage across closing and reopening a frozen tab. The launch log prints the previous attempt with timestamps. A new confirmed Grail placement resets the trace; only the latest 24 generic phase labels are retained. Checkpoints cover Grail updates, terminal packets, dialog acknowledgement, window cleanup and score-screen construction. This diagnostic update still requires an iPad reproduction; the freeze is not yet confirmed fixed.
