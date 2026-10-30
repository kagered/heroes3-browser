# Contributing

Thanks for helping keep “one more turn” easy to reach.

## Report a bug

Use **Report a problem** on the website. It prepares a GitHub draft with the current build and browser details; review it before submitting. Or open an issue directly and include the build version, device, browser, steps, expected result and actual result. Reports are public. Do not attach personal saves unless you intentionally want to share them.

## Make a change

1. Work from the current source and keep changes focused.
2. Run `npm ci --ignore-scripts` and `npm test`.
3. For a game run from your own hosted build, use your data and the publication instructions in `docs/BUILD.md`.
4. Recheck desktop and touch behavior when changing UI, input, rendering or runtime lifecycle.
5. Update RU and EN together. Add release-history entries in `src/release-notes.js` for meaningful releases; small fixes can stay within a version.

Keep the original in-game experience. Launcher improvements should help launch and manage the game, not replace its menus.

## Do not commit

Original game files, downloaded engine artifacts, saves, custom maps, generated sites, credentials, local configurations, personal paths or Node dependency directories. `scripts/check_repository.py` checks the tracked/staged package. Add synthetic test fixtures instead of real copyrighted map data.

Project changes use GPL-2.0-or-later. Preserve third-party notices and keep generated bundle provenance current. Runtime changes should not silently erase user data. Document limitations rather than claiming universal compatibility.
