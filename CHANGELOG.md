# Changelog

## 0.5.0 - 2026-07-10

- Replace the floating sheet treatment with an edge-to-edge overlay above the dock.
- Expand the overlay from the exact bounds of the pressed dock button.
- Keep native dialog focus, Escape behavior, reduced-motion handling, and one shared overlay host.

## 0.4.0 - 2026-07-10

- Replace persistent header and book sidebar chrome with a scalable bottom floating dock.
- Add one native semi-fullscreen overlay host for Navigation, History, Search, and Profile.
- Move working book and chapter navigation into the overlay.
- Remove the dormant OpenAI Sites packaging artifacts.

## 0.3.0 - 2026-07-10

- Migrate from the Next/vinext server stack to a static Vite and React SPA.
- Replace the public JavaScript worker with a typed, bundled Vite module worker.
- Remove unused Tailwind, Drizzle, database, image optimization, and Cloudflare runtime code.
- Replace local-dataset-dependent tests with portable synthetic behavior tests.

## 0.2.0 - 2026-07-10

- Focus the interface exclusively on a refined Liquid Glass visual language.
- Remove theme state, persistence, controls, and Material-specific styling.
- Simplify the reader chrome while preserving worker isolation and accessibility.

## 0.1.0 - 2026-07-10

- Add the initial web-only structured text reader.
- Add worker-based loading, validated data limits, graceful fetch backoff, responsive navigation, loading skeletons, and hot-swappable visual themes.
