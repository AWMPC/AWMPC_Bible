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
- Verse selections create bounded, device-local history entries containing only references and timestamps.
- Profile offers five meaningful, snapping text scales for every verse and verse number.
- Navigation keeps Books, Chapters, and Verses vertically ordered in one contained scroll view.
- The top reading controls and bottom dock hide together only for recent user-invoked scrolling or reader taps.
- Profile selects among privacy-safe local Serif, Sans, Rounded, and Monospace verse fonts.
- Appearance supports explicit Day or Night modes and an Auto mode that follows the system.
- Profile switches between separately provisioned English and Korean Bible datasets.
- The acceleration boundary leaves room for WASM search/indexing and optional
  WebGPU effects without making either necessary for correct reading.

All content is rendered as text. AWMPC Bible does not use analytics, remote fonts,
or third-party runtime services.

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

The production host should send a restrictive Content Security Policy allowing
only same-origin scripts, styles, workers, data, and connections. It should also
set `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a minimal
`Permissions-Policy`, and deny framing with `frame-ancestors 'none'`. Keep the
dataset response same-origin and serve it with the correct JSON content type.

The English and Korean datasets belong at `public/data/bible-en.json` and
`public/data/bible-ko.json`. Those files are ignored at every directory depth
and must be provisioned separately before building. Vite copies them to
`dist/data/bible-en.json` and `dist/data/bible-ko.json`; deploy the complete
`dist/` directory without moving either dataset relative to `index.html`.

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

## Persistence direction

Reading history, search history, preferences, and identity are intentionally not
coupled to a server database. Future persistence should use small application
interfaces with a Firebase adapter, user-scoped security rules, bounded retention,
and explicit clear/export controls.

## Dataset licensing

The application source is licensed under Apache-2.0. Verify the translation,
attribution, and redistribution terms of any supplied text dataset independently
before publishing it.
