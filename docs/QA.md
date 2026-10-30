# Validation for v0.2.0

## Completed before the public source release

The v0.1.12 audit passed **18 automated groups**. It checked every SHA-256 and split-file size for the hosted dataset: **442 game resources**, 316 `.h3m` scenarios in RoE/AB/SoD formats, engine hashes, script syntax, page structure and deployment headers.

The automated groups covered:

- Save migration, paired-file collisions, export/import and atomic rollback.
- Map import, mounting, ZIP round trips, names, duplicate detection, unsafe paths, corruption and limits.
- Independent storage profiles, unchanged save bytes across language choices, resource clearing and stable map paths after transfers.
- Verified cached/network downloads, targeted repair, finite retries, HTTP errors, header/body timeouts and cancellation.
- Runtime teardown, save-write ordering, the Safari helper route, one-shot retry state and touch gesture logic.
- Cache UI, dialogs, keyboard version selection, translated messages, Help and feedback metadata.

These were Node/fake-indexeddb/DOM-substitute tests plus static and HTTP checks, not automated execution of the whole game engine in a browser.

## Maintainer-confirmed device scenarios

The maintainer confirmed desktop and iPad use (iPad sixth generation, iPadOS 17.7.11), touch input, battles, map movement, screen rotation, the repeated-launch workaround, save transfer, cache management, map import and both native `.h3m` and ZIP selection on iPad.

After the automated audit, both final manual scenarios were reported working with no bugs found:

1. A real saved game and map collection transferred from computer to iPad, reloaded after changing language and relaunching.
2. A real interrupted resource download recovered after connectivity returned and Try again was used.

This is evidence for those tested devices and scenarios, not a guarantee for every browser or device.

## Repeatable public checks

```sh
npm ci --ignore-scripts
npm test
```

The public suite replaces original map/game data with explicitly synthetic fixtures. Build tests create temporary dummy data solely to test export mechanics, single/both-language configuration, deterministic manifests and static host header configuration. They do not produce a playable game. Engine checks use pinned metadata; the downloader verifies the real upstream engine when fetching it.

For future runtime releases, repeat the two manual scenarios above and specifically recheck any changed input/lifecycle behavior. Keep backups before intentionally exercising storage or network failures.
