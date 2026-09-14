# Changelog

## 0.31.51 - 2026-09-13

- Support loading translation catalogs and datasets from a configured public R2 origin for GitHub Pages deployments.
- Add a GitHub Pages Actions workflow that builds and publishes only the generated `dist/` artifact.

## 0.31.50 - 2026-09-11

- Match the top location bar's Liquid Glass shell to the bottom dock and use inset partial-height segment dividers.

## 0.31.49 - 2026-09-10

- Restrict hover highlights to fine-pointer devices so mobile button presses do not leave a completed action visually highlighted.

## 0.31.48 - 2026-09-10

- Combine the book and chapter controls into one four-segment top location bar with whole-Bible previous/next chapter arrows.
- Lock the shared reader chrome hidden after an explicit reader tap until another explicit tap releases the lock; swipe-based auto-hide remains available otherwise.

## 0.31.46 - 2026-08-19

- Replace standalone chapter control with a three-part floater for whole-Bible previous/next chapter navigation, including held-key and repeated-press queuing.
- Keep ArrowLeft and ArrowRight chapter navigation available regardless of focused reader chrome, without restoring obsolete verse focus borders.
- Restore the last validated reading chapter per Bible language after refresh; use the first chapter only as a fallback.
- Refine reader chrome with vertically aligned floater labels, lined arrow icons, separators, a hidden-chrome embossed location header, and touch-safe active states.
- Use static low-contrast day and night backgrounds, a stronger left-edge chapter-progress rail, quicker marquee labels, and the selected verse font across all reader controls and feature sheets.
- Stabilize trackpad chapter gestures so momentum advances at most one chapter and subsequent swipes remain available.

## 0.31.31 - 2026-08-17

- Focus browser Quality checks on user-visible behavior and release reader state before a closing overlay becomes hidden.

## 0.31.30 - 2026-08-17

- Keep reader-chrome input listeners active across overlay close and use scrollbar-aware sheet geometry checks in Quality.

## 0.31.29 - 2026-08-17

- Verify fixed overlay geometry against the full viewport while checking mobile overflow against the scrollbar-aware layout width.

## 0.31.28 - 2026-08-17

- Make browser geometry and floating-control tests portable across scrollbar layouts, and log the Node runtime used by the Quality workflow.

## 0.31.27 - 2026-08-17

- Run the Quality workflow on Node.js 26 or later so CI uses a current TypeScript-capable runtime.

## 0.31.26 - 2026-08-17

- Pin the Quality workflow to Node.js 26.7.0.

## 0.31.25 - 2026-08-14

- Show a transient, local verse preview beneath each History reference without persisting Bible text.

## 0.31.24 - 2026-08-13

- Preserve the selected language’s centered verse after closing Profile and show dynamic language labels consistently in Search, History, and verse actions.

## 0.31.23 - 2026-08-13

- Discover local `bible-*.json` files as selectable Bible languages and publish their generated catalog alongside staged datasets.
- Keep top and bottom reader controls hidden after a sheet closes and the user resumes scrolling, even when focus returns to its triggering control.
- Show temporary selected-verse accent pills outside both verse edges, clear of the verse-number button.

## 0.31.22 - 2026-08-12

- Dismiss an open feature sheet before normal browser Back navigation continues.
- Keep the top reading controls and bottom dock coordinated through one shared reader-chrome visibility controller.
- Mark the selected verse with temporary left-edge accent-pill feedback.

## 0.31.21

- Support long verse entries in discovered Bible datasets.
- Keep dynamically selected primary and secondary Bible languages distinct.

## 0.31.3 - 2026-07-14

- Keep the Search sheet at the full available viewport size so changing results never causes distracting layout snaps.

## 0.31.2 - 2026-07-14

- Animate verse copy actions symmetrically from their verse-number trigger and remove motion when requested by the operating system.
- Share one safe-area-aware screen inset between the reading pane and floating controls.

## 0.31.1 - 2026-07-13

- Reconcile cloud snapshots transactionally so offline clears, removals, and concurrent additions remain durable across devices.
- Preserve local data on Auth observer and sign-out failures, quarantine prior-owner activity, and retry dirty saves after recovery.
- Consolidate persistence orchestration, explicit search states, account UI, loading skeletons, and profile-photo fallback behavior.
- Narrow sparse Search and Profile sheets while retaining centered mobile-safe layouts and confirmed destructive clears.
- Add versioned owner-only Firestore rules, future-schema protection, deterministic search-history keys, and cancellation cleanup.

## 0.31.0 - 2026-07-13

- Add lazy Google sign-in and Firebase cloud synchronization for settings, reading history, and search history.
- Adopt compatible legacy cloud fields through a server-first transaction while preserving unknown document data.
- Show the signed-in Google profile photo and sync state in Profile with loading and privacy-safe fallbacks.
- Add bounded local and cloud-backed recent searches with shared result selection behavior.
- Isolate account-owned local state across sign-out and account switches and retry transient cloud failures with bounded jitter.

## 0.30.0 - 2026-07-13

- Center and shrink-wrap feature sheets within the usable space above the floating dock.
- Cap oversized sheets to the mobile viewport while preserving internal scrolling and navigation spacing.
- Add overflow-measured, bidirectional marquee labels with reduced-motion and cleanup safeguards.

## 0.23.3 - 2026-07-12

- Remove the obsolete four-rem top clearance formerly reserved for the reader header.
- Remove the remaining mobile-only article top margin.
- Start the first verse at the reading pane's normal global inset on desktop and mobile.

## 0.23.2 - 2026-07-12

- Hide both top reading-location controls upward immediately after either control opens Navigation.
- Prevent focused obscured controls from overriding their hidden state during an overlay.
- Keep the bottom dock visible and foregrounded while top controls are hidden.
- Restore both top controls and focus to the initiating control when Navigation closes.

## 0.23.1 - 2026-07-12

- Target Chapters with transform-independent layout offsets after the overlay scroll reset.
- Validate direct Chapter entry against a full 66-book browser fixture.
- Place top reading-location controls beneath the shade and Navigation overlay while keeping the dock foregrounded.
- Make covered top controls inert and hidden from assistive technology until the overlay closes.

## 0.23.0 - 2026-07-12

- Replace the reader header with independent top-left Book and top-right Chapter Liquid Glass controls.
- Open Navigation directly at Books or Chapters from the corresponding reading-location control.
- Hide the top controls upward with the bottom dock's shared user-scroll and reader-tap visibility state.
- Keep top controls foregrounded during overlays, support live section retargeting, and restore focus to the true trigger.
- Remove all in-card book and chapter header markup so the reading surface contains only verses.

## 0.22.0 - 2026-07-11

- Append the footnote information control directly to the end of each annotated verse.
- Remove the outer button border and background while retaining native button semantics.
- Size the button and information icon with `1em` so they follow every verse text scale.
- Keep the expanding footnote card aligned beneath the verse text in its own grid row.

## 0.21.2 - 2026-07-11

- Lower the information icon and button border to translucent muted tones beneath verse-number emphasis.
- Reduce the information icon stroke while preserving focus-visible and forced-colors clarity.
- Anchor the control at the bottom of the verse text row within the verse-number column.
- Keep the expanding footnote card on its own row so it cannot reposition the control.

## 0.21.1 - 2026-07-11

- Reduce the visible verse-rail footnote control from 44 to 32 pixels square.
- Add a clearly visible Liquid Glass border with stronger active-state contrast.
- Replace the magnifying glass with a consistent current-color information-circle icon.
- Retain a forgiving pointer target without enlarging the visible control.

## 0.21.0 - 2026-07-11

- Move each footnote control into the verse-number rail directly beneath its number.
- Replace visible footnote text with a square, accessible magnifying-glass icon control.
- Preserve press, marker, card, reduced-motion, keyboard, and forced-colors behavior.
- Disable verse-list scroll anchoring so expanding a footnote cannot shift the reader viewport.

## 0.20.0 - 2026-07-11

- Smoothly advance the Navigation overlay from a user-selected book to Chapters.
- Smoothly advance from a user-selected chapter to Verses while its content loads.
- Scope progression scrolling to the overlay, cancel stale scheduled scrolls, and respect reduced motion.
- Keep initial overlay opening, data updates, and the background reader free from automatic scrolling.

## 0.19.1 - 2026-07-11

- Animate inline footnote markers into and out of the verse flow to avoid abrupt text jumps.
- Expand and collapse nested footnote cards with the shared symmetric Liquid Glass motion.
- Give the footnotes control the same pressed-scale feedback as floating dock buttons.
- Preserve immediate state changes when reduced motion is requested.

## 0.19.0 - 2026-07-11

- Extract existing inline brace footnotes into ordered, numbered verse metadata without changing plain verses.
- Add an accessible `footnotes` toggle beneath annotated verses with synchronized inline markers and a nested note card.
- Accept a bounded, validated segment-based verse shape for precise future footnote placement.
- Keep footnote expansion local to each passage and independent from reader scrolling, navigation, and history.

## 0.18.0 - 2026-07-11

- Centralize overlay, shade, and dock motion timing and track overlay lifecycle with explicit phases.
- Resize open overlays with the viewport and announce live panel switches to assistive technology.
- Add single-entry removal and confirmed clear-all controls for device-local reading history.
- Add focused Chromium regressions for overlay switching, scroll stability, verse centering, history, and resizing.
- Add a GitHub Actions quality gate and update Vite to the security-patched 8.1 release.
- Remove the obsolete Wrangler cache ignore and generalize shared settings control styling.

## 0.17.2 - 2026-07-11

- Cancel in-flight verse reveals before they can scroll behind a newly opened overlay.
- Settle chapter requests safely when the data worker is unavailable, not ready, or fails.
- Preserve newly recorded history during asynchronous hydration and reject malformed stored entries.
- Cancel unsuccessful dataset response streams before retrying or reporting an error.

## 0.17.1 - 2026-07-11

- Fade the background shade smoothly alongside overlay opening and closing.
- Preserve shade continuity when rapidly switching between overlay features.

## 0.17.0 - 2026-07-11

- Keep the floating dock foregrounded and interactive while an overlay is open.
- Switch directly between overlay features and close when the active dock button is pressed again.
- Keep the reader inert and scroll-locked across overlay switches with explicit Escape and focus-return handling.

## 0.16.3 - 2026-07-11

- Set symmetric overlay opening and closing motion to 210 milliseconds.

## 0.16.2 - 2026-07-11

- Fit the reading card to the 70-character text measure, verse-number gutter, and responsive margins.
- Tighten the verse-number column gap and line height at every reading scale.

## 0.16.1 - 2026-07-11

- Shorten overlay opening and closing to 150 milliseconds.
- Size the book title relative to verse text instead of viewport width and keep Chapter N inline.
- Constrain verses to a 70-character measure with tighter side insets and vertical spacing.

## 0.16.0 - 2026-07-10

- Split worker brokerage, staged navigation, verse selection, history, settings, and panels into focused modules.
- Stream and bound dataset downloads, add request timeouts, and validate nonempty canonical chapter and verse structures.
- Add navigation loading and request-scoped errors without invalidating an already loaded Bible.
- Reverse active overlay animations instead of starting competing close animations.
- Replace broad source-shape tests with focused data, storage, selection, and UI behavior suites.
- Consolidate theme and reader styles, clean obsolete repository ignores, and document production security headers.

## 0.15.0 - 2026-07-10

- Route history selections through the shared verse transition and centered reveal flow.
- Load history passages without changing the reader until selection is ready.
- Avoid creating duplicate history entries when navigating from history itself.
- Preserve the loaded library when an individual chapter request fails.

## 0.14.0 - 2026-07-10

- Fade the verse view during passage changes, then scroll smoothly from the chapter top to center the selected verse.
- Keep overlay dismissal independent from asynchronous history persistence.

## 0.13.1 - 2026-07-10

- Use a symmetric sampled quintic smoothstep curve for overlay and floating-dock motion.
- Shorten overlay opening and closing to 300 milliseconds with a graceful legacy easing fallback.

## 0.13.0 - 2026-07-10

- Stage book and chapter navigation inside the overlay without changing the verse view.
- Commit the staged passage and history entry only when the user selects a verse.
- Route worker responses independently so stale navigation loads cannot replace reader content.

## 0.12.1 - 2026-07-10

- Slow overlay closing slightly and keep its content visibly shrinking into the trigger.
- Use one symmetric motion curve for overlay opening, closing, and floating-dock visibility.

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
