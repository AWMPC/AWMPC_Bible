# AWMPC Bible

AWMPC Bible is a web-only, lightweight Bible experience backed by structured
JSON text using a book → chapter → verse hierarchy.

The application is a static React SPA built with Vite. It requires no application
server and can be served from a VM, CDN, or any static web host.

## Design

- The application shell renders immediately with an accessible loading skeleton.
- A typed Vite module worker fetches, validates, parses, and retains the full dataset.
- The main thread receives only navigation metadata and the selected chapter.
- A focused Liquid Glass interface uses native CSS effects with graceful fallbacks.
- A data-driven bottom dock scales to additional AWMPC Bible tools without duplicating overlay infrastructure.
- Separate floating Book and Chapter controls open Navigation directly at the corresponding selection list.
- One native dialog expands from the pressed dock button into the edge-to-edge space above the dock.
- Overlay dismissal reverses into the same originating control.
- Verse selections create bounded history entries containing only references and timestamps.
- Profile offers five meaningful, snapping text scales for every verse and verse number.
- Navigation keeps Books, Chapters, and Verses vertically ordered in one contained scroll view.
- The top reading controls and bottom dock hide together only for recent user-invoked scrolling or reader taps.
- Profile selects among privacy-safe local Sans, Serif, and Mono verse fonts.
- Appearance supports explicit Day or Night modes and an Auto mode that follows the system.
- Profile keeps one primary language and optionally stacks a distinct secondary language beneath each verse.
- Book controls and Navigation show secondary-language book names as subordinate text when parallel text is active.
- Language changes preserve the verse crossing the viewport midpoint and recenter its translated counterpart.
- Reader swipes move through adjacent chapters: left advances, right returns, and trackpad momentum is limited to one chapter per gesture.
- Horizontal chapter gestures preserve native vertical scrolling, pinch zoom, interactive controls, overlays, and global book boundaries.
- History and search history remain global across languages; Search is intentionally scoped to only the currently active language texts.
- Search lazily builds a bounded fuzzy index inside each active language worker, keeping indexing and typo-tolerant scoring off the reading thread.
- Search results use the same centered verse-selection transition as Navigation and History and record the result's exact language.
- Verse actions stay attached to their exact translation, so copied text and links retain the selected verse language.
- Verse-number menus copy plain verse text or a bounded, deployable deep link to that verse.
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

The deployable static output is written to `dist/`. In production, serve that
directory with a static server such as Caddy or nginx. `npm start` is intended
only for local previewing of a completed build. All generated asset and dataset
references are relative, so the unchanged `dist/` directory may be hosted at
the domain root or beneath any VM directory path.

The production host should send restrictive security headers. A Firebase-enabled
deployment can begin with this CSP, replacing `AUTH_DOMAIN` with the exact
`VITE_FIREBASE_AUTH_DOMAIN` value:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' https://*.googleapis.com; frame-src https://AUTH_DOMAIN https://accounts.google.com; img-src 'self' data: https://*.googleusercontent.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Keep the dataset response same-origin and serve it with the correct JSON content
type. Tighten endpoint wildcards after confirming the selected Firebase
project's observed Auth and Firestore requests.

Keep the ignored `bible-en.json` and `bible-ko.json` files at the repository
root. During `npm run dev`, Vite serves those root files directly with caching
disabled, so a newly placed or replaced file is picked up on browser reload.
`npm run build` validates and stages local copies under `public/data/`, then Vite
packages them as `dist/data/bible-en.json` and `dist/data/bible-ko.json`. Deploy
the complete `dist/` directory without moving either dataset relative to
`index.html`. The source and staged JSON files remain ignored and must never be
committed.

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
