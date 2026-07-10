# Changelog

## 0.12.0 - 2026-07-10

- Separate Old and New Testament books in the navigation overlay.
- Arrange all navigation button groups in fixed three-column rows.

## 0.11.5 - 2026-07-10

- Remove the “Now reading” eyebrow and redundant chapter heading from the verse view.

## 0.11.4 - 2026-07-10

- Toggle the floating dock when the user taps anywhere in the verse reading surface.

## 0.11.3 - 2026-07-10

- Match overlay closing duration, easing, and content timing to the opening animation in reverse.

## 0.11.2 - 2026-07-10

- Converge package, metadata, UI, source identifiers, and documentation on AWMPC Bible.
- Migrate legacy product history and settings into AWMPC Bible storage keys.

## 0.11.1 - 2026-07-10

- Keep the reading viewport completely stationary when an overlay closes.
- Remove post-close verse focus and target scrolling while retaining history recording.
- Lock background scrolling without positional body transforms or scroll restoration calls.

## 0.11.0 - 2026-07-10

- Add Auto, Day, and Night appearance selection to Profile.
- Make Auto follow live operating-system or browser color-scheme changes through CSS.
- Add complete Day and Night Liquid Glass tokens without media listeners or remote assets.

## 0.10.0 - 2026-07-10

- Add a native Profile selector for Serif, Sans, Rounded, and Monospace verse fonts.
- Apply validated local font stacks to every verse and verse number without downloads.
- Preserve existing text-scale settings while migrating the additive font preference.

## 0.9.1 - 2026-07-10

- Remove borders and outlines introduced by pointer selection or programmatic verse focus.
- Preserve explicit focus indicators for keyboard navigation only.
- Keep selected navigation states visible through fill, color, weight, and depth.

## 0.9.0 - 2026-07-10

- Auto-hide the floating dock on trusted user-initiated downward document scrolls.
- Reveal it on trusted upward scrolling while ignoring programmatic verse navigation.
- Support wheel, touch-drag, and scrolling-key intent with leak-free listener cleanup.

## 0.8.0 - 2026-07-10

- Stack Books, Chapters, and Verses vertically in one universal Navigation scroll view.
- Contain overlay overscroll and lock the background viewport until reverse close completes.
- Restore the exact prior document scroll position and inline scroll styles after dismissal.

## 0.7.0 - 2026-07-10

- Add a five-stop snapping verse text-size control to Profile.
- Scale every verse and verse number together with readable line-height adjustments.
- Persist validated AWMPC Bible settings locally behind a Firebase-ready settings interface.

## 0.6.0 - 2026-07-10

- Animate every overlay dismissal back into its originating dock button.
- Add verse selection to Navigation and focus the chosen verse after closing.
- Record each chosen verse reference with an ISO timestamp in bounded device-local history.
- Introduce a history storage interface ready for a future Firebase adapter.

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
- Simplify the AWMPC Bible chrome while preserving worker isolation and accessibility.

## 0.1.0 - 2026-07-10

- Add the initial web-only AWMPC Bible structured-text experience.
- Add worker-based loading, validated data limits, graceful fetch backoff, responsive navigation, loading skeletons, and hot-swappable visual themes.
