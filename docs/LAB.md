# Heroes III laboratory

The `lab` branch is the experimental baseline, isolated from `main`.

- Lab: https://heroes-iii-lab.pages.dev/
- Stable site: https://heroes-iii-browser.pages.dev/
- Lab Apple memory-reset helper: https://heroes-iii-lab-reset.pages.dev/

The lab has a separate Cloudflare Pages project and a separate origin, so browser storage (saves, maps and cached game data) is independent. Use export/import to copy a party or map collection. Never clear stable-site data to test lab recovery.

Build with `src/export_site.py` and deploy the generated directory with `wrangler pages deploy <directory> --project-name heroes-iii-lab --branch lab`. Deploy `support/memory-reset` only to `heroes-iii-lab-reset`. Do not use stable project names for lab deployments. Original game files and local feedback configuration remain excluded from Git.

The baseline uses VCMI 1.6.5 / build 0.2.1. Future experiments belong on this branch or branches based on it. Promote reviewed changes deliberately to main; publishing lab never publishes the stable site automatically.
