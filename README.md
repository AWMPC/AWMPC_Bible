# Quiet Reader

Quiet Reader is a web-only, lightweight interface for reading deeply nested
JSON text. The current dataset uses a book → chapter → verse hierarchy.

## Design

- The application shell renders immediately with an accessible loading skeleton.
- A dedicated Web Worker fetches, validates, parses, and retains the full dataset.
- The main thread receives only navigation metadata and the selected chapter.
- A focused Liquid Glass interface uses native CSS effects with graceful fallbacks.
- The acceleration boundary leaves room for WASM search/indexing and optional
  WebGPU effects without making either necessary for correct reading.

All content is rendered as text. The reader does not use analytics, remote fonts,
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
```

## Dataset licensing

The application source is licensed under Apache-2.0. Verify the translation,
attribution, and redistribution terms of any supplied text dataset independently
before publishing it.
