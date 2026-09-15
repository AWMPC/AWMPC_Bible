# AWMPC Bible

AWMPC Bible is a web-only, lightweight Bible experience backed by structured
JSON text using a book → chapter → verse hierarchy.

The application is a static React SPA built with Vite. It requires no application
server and can be served from a VM, CDN, or any static web host.
Browsers can install the site as a PWA from the checked-in web manifest, app
icons, and same-origin service worker.

## Design

- The application shell renders immediately with an accessible loading skeleton.
- A typed Vite module worker fetches, validates, parses, and retains the full dataset.
- The main thread receives only navigation metadata and the selected chapter.
- A focused Liquid Glass interface uses native CSS effects with graceful fallbacks.
- A data-driven bottom dock scales to additional AWMPC Bible tools without duplicating overlay infrastructure.
- The bottom dock keeps book and chapter navigation in the top location bar, leaving the dock focused on reading tools.
- One four-part location bar combines previous/next chapter arrows with book and chapter navigation segments, sharing the bottom dock's Liquid Glass shell and inset separators; it shrink-wraps to the required control width, is centered above the reader on compact screens, and rests at the bottom-left on desktop.
- One native dialog expands from the pressed dock button into the edge-to-edge space above the dock.
- Overlay dismissal reverses into the same originating control.
- Browser Back dismisses an open feature sheet before its normal navigation behavior continues.
- Verse selections create bounded history entries containing only references and timestamps; the History sheet resolves a transient local verse preview for each entry without persisting Bible text.
- Profile offers five meaningful, snapping text scales for every verse and verse number.
- Navigation keeps Books, Chapters, and Verses vertically ordered in one contained scroll view.
- The top location bar and bottom dock hide together for recent user-invoked scrolling; an explicit tap on the reader or surrounding page surface that hides them locks them hidden until the next explicit tap.
- Touch actions on reading controls and the dock clear their temporary highlight after the action; only open menus remain highlighted.
- Overflowing floater labels use a brisk, short-pause marquee while retaining the reduced-motion fallback.
- One shared reader-chrome visibility controller keeps the top reading controls and bottom dock coordinated through reader interactions and verse changes.
- A selected verse receives temporary accent-pill feedback outside both verse edges.
- Profile selects among privacy-safe local Sans, Serif, and Mono verse fonts.
- The selected verse font applies consistently to reader text, floaters, dock controls, and feature sheets.
- Refresh restores the last validated chapter for each Bible language; a first chapter is used only when no saved location is available.
- Appearance supports explicit Day or Night modes and an Auto mode that follows the system.
- Day and Night reading backgrounds use a single, low-contrast static tint throughout each chapter.
- A clear 3px page-edge rail fills with the current chapter’s reading progress without covering verse content or reader controls.
- Profile discovers local Bible datasets, keeps one primary language, and optionally stacks a distinct secondary language beneath each verse.
- Book controls and Navigation show secondary-language book names as subordinate text when parallel text is active.
- Book and chapter floaters vertically center their labels within their matching control heights.
- Language changes preserve the verse crossing the viewport midpoint and recenter its translated counterpart.
- Reader swipes move through adjacent chapters: left advances, right returns, and trackpad momentum is limited to one chapter per gesture.
- Reader ArrowLeft and ArrowRight keys use queued whole-Bible chapter navigation regardless of reader focus, allowing held keys and repeated floater presses to continue through loaded chapters.
- When reader chrome is hidden, a larger embossed location header keeps the current primary and optional secondary book names with chapter context visible.
- Horizontal chapter gestures preserve native vertical scrolling, pinch zoom, interactive controls, overlays, and global book boundaries.
- History and search history remain global across languages; Search is intentionally scoped to only the currently active language texts.
- Search lazily builds a bounded fuzzy index inside each active language worker, keeping indexing and typo-tolerant scoring off the reading thread.
- Search results use the same centered verse-selection transition as Navigation and History and record the result's exact language.
- Verse actions stay attached to their exact translation, so copied text and links retain the selected verse language.
- Verse-number menus copy plain verse text or a bounded, deployable deep link to that verse.
- The static shell registers a same-origin service worker for browser
  installability, uses the app semver in its shell cache name, and keeps
  validated Bible catalogs and translations in a persistent data cache with
  stale-while-revalidate behavior and offline fallback. Worker activation also
  best-effort warms every catalog-listed translation.
- The browser favicon uses the same rounded app-icon PNG as installed launches,
  keeping the crucifix artwork identical across surfaces.
- Profile shows which catalog and translations are currently cached, reports
  the browser storage estimate, and can manually cache every catalog-listed
  translation before leaving a connected network.
- The acceleration boundary leaves room for WASM search acceleration and optional
  WebGPU effects without making either necessary for correct reading.

All Bible content is rendered as text. AWMPC Bible does not use analytics or
remote fonts. Optional Firebase modules load after the reader only when the
deployment supplies Firebase configuration.

## Development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm test
npm run build
npm run test:browser
```

The browser suite uses Playwright Chromium and starts its own local Vite server.

After a push to `master`, `release-after-green.yml` waits for every
push-triggered workflow at that exact commit to finish successfully. It then
reads the semver in `package.json`, creates the matching `vX.Y.Z` tag, and
publishes a GitHub release with GitHub-generated notes, every curated
`CHANGELOG.md` section since the previous semver tag, and the commits in that
range. Pushes that do not bump the package version finish
without creating a duplicate release. To publish a release, bump `package.json`
and add its same-version changelog heading in the same push.

When a GitHub release is published with a semver tag such as `v0.31.64`,
`sync-release-notes.yml` repairs or prepends the full range from the previous
semver tag through the release version. `.github/release.yml`
organizes those generated notes by pull-request label. Keep each release's
curated entry headed as `## X.Y.Z - YYYY-MM-DD` (an optional `v` is also
accepted). An existing release can be repaired from the Actions tab by running
`Sync release notes` with its `release_tag`.

The deployable static output is written to `dist/`. In production, serve that
directory with a static server such as Caddy or nginx. `npm start` is intended
only for local previewing of a completed build. All generated asset and dataset
references are relative, so the unchanged `dist/` directory may be hosted at
the domain root or beneath any VM directory path.

For GitHub Pages, `.github/workflows/deploy-pages.yml` builds and uploads only
the contents of `dist/` to the Pages artifact. Set the repository Actions
variable or secret `VITE_BIBLE_DATA_BASE_URL` to the HTTPS origin of the public
R2 data endpoint. The Pages build then skips local dataset staging and the
browser loads `bibles.json` and each `bible-*.json` file from that endpoint.
Keep the translation sources out of Git; update the R2 objects through the
separate controlled data-upload process.

The Pages workflow reads `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` from repository Actions
secrets with those exact names. These values are compiled into the public web
bundle because they are Firebase client configuration, not server credentials;
Firebase Authentication must also list every served hostname as an authorized
domain.

The production host should send restrictive security headers. A Firebase-enabled
deployment can begin with this CSP, replacing `AUTH_DOMAIN` with the exact
`VITE_FIREBASE_AUTH_DOMAIN` value:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' https://*.googleapis.com; frame-src https://AUTH_DOMAIN https://accounts.google.com; img-src 'self' data: https://*.googleusercontent.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Keep the dataset response same-origin to the application data origin and serve
it with the correct JSON content type. The first online visit populates the
browser's Cache Storage; worker activation also best-effort warms every
catalog-listed translation. Later opens can restore the shell, catalog, and
translations without network access. Cached translations are served
immediately while an online service worker refreshes them in the background.
Browser or OS storage pressure may still evict caches, so the app cannot
guarantee offline availability after an explicit cache eviction.

Tighten endpoint wildcards after confirming the selected Firebase project's
observed Auth and Firestore requests.

For VM-hosted static deployments, prefer synchronizing the contents of `dist/`
over manually deleting and re-copying the remote web root:

```bash
rsync -az --delete dist/ user@host:/srv/awmpc-bible/
```

The trailing slashes are intentional: they copy the built files inside `dist/`
into the remote directory. `--delete` removes stale hashed assets on the remote
side, which keeps browser caches and the service worker from seeing old code.
The service worker uses a semvered shell cache and network-first static asset
fetches, so a complete `dist/` sync should make a new build visible without
manually editing cache names.
Do not use a target directory that also stores server-owned files such as
private environment files, certificates, logs, uploaded content, or backups. If
the web root must contain such files, exclude them explicitly or publish each
build to a versioned release directory and update the web server symlink after
the upload succeeds.

Removing only the remote static web directory does not delete Firebase Auth or
Firestore data, because those live in Firebase services rather than in `dist/`.
The Firebase deployment configuration in this repository is limited to
`firestore.rules`; deploying those rules is still a separate destructive-adjacent
operation that requires explicit human review.

Keep ignored `bible-*.json` files at the repository root. The text between
`bible-` and `.json` becomes the selectable Bible ID and display label; for
example, `bible-English-1984.json` appears as `English 1984`. During
`npm run dev`, Vite discovers and serves those root files directly with caching
disabled. `npm run build` validates and stages every matching file under
`public/data/` and writes a generated `bibles.json` catalog. Deploy the complete
`dist/` directory without moving either the catalog or datasets relative to
`index.html`. The source and staged JSON files remain ignored and must never be
committed.

When using R2, upload the catalog and translation objects to the root of the
configured data endpoint rather than committing or copying them into `dist/`.
The browser requests them cross-origin with bounded retry, timeout, response
size, and URL-origin checks. Configure R2 CORS for the exact Pages origin and
the local development origin, with read-only `GET` and `HEAD` access.

### Footnotes

Existing string verses may place footnote text inside balanced single braces at
the intended inline position. AWMPC Bible removes that text from the reading
line and numbers each note by occurrence. Braces are therefore reserved for
footnotes inside string verses.

New datasets may represent a verse explicitly for precise placement:

```json
{
  "segments": ["Sample text", { "footnote": "1" }, " continues."],
  "footnotes": [{ "number": "1", "text": "A concise explanatory note." }]
}
```

Marker numbers must be unique canonical positive integers and every marker must
have exactly one matching note. All values are validated and rendered only as
text.

## Optional Google sign-in and cloud sync

Create an ignored `.env.local` containing these deployment-specific public web
configuration values; never commit the values or an Admin SDK credential. Vite
compiles `VITE_*` values into the static JavaScript during `npm run build`, so
changing VM environment variables after a build does not reconfigure `dist/`:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Enable Google as an Authentication provider and add every served hostname to
Firebase Authentication's authorized domains. The versioned
[Firestore rules](firestore.rules) permit an authenticated user to read and
bounded merge-write only `users/{uid}` where `request.auth.uid == uid`, deny
document deletion, and deny all fallback access. The repository does not deploy
these rules automatically. Review them against existing production rules and
obtain explicit human approval before running a Firebase rules deployment.

The first authenticated hydration uses a server transaction before any write.
It adopts the existing `themeMode`, `font`, `history`, and `searchHistory`
fields, merges local bounded activity, and writes a versioned `awmpcBible`
namespace plus legacy-compatible fields. Merge writes intentionally preserve
unknown preexisting fields such as old-site configuration. Settings, reading
history, and search history then synchronize through server transactions after
a short debounce with bounded jittered retry. A local owner-scoped baseline
performs three-way reconciliation so offline removals, clears, and concurrent
device additions do not overwrite or resurrect one another. Signing out or
switching accounts quarantines owner-scoped state from the visible local session,
and no raw Firebase UID is added to application storage.

## Dataset licensing

The application source is licensed under Apache-2.0. Verify the translation,
attribution, and redistribution terms of any supplied text dataset independently
before publishing it.
