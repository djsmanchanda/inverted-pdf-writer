# Third-party notices

This desktop application is a customized distribution fork of Mozilla PDF.js, released under Apache License 2.0. The upstream viewer, annotation editor, renderer, fonts, CMaps, images, locales, and WebAssembly resources are retained under `vendor/pdfjs`. Original copyright and resource-specific notices remain in place.

- Upstream: https://github.com/mozilla/pdf.js
- Pinned release: https://github.com/mozilla/pdf.js/releases/tag/v6.4.299
- Local modifications: `web/viewer.html` adds the app title and loads the desktop input and appearance integration. The PDF.js JavaScript bundles are unchanged.
- The release archive digest and per-file SHA-256 digests are recorded in `vendor/pdfjs/provenance.json`. Run `npm run verify:vendor` to check the unmodified upstream files.
- PDF.js license: `vendor/pdfjs/LICENSE` (Apache-2.0).
- Electron: https://github.com/electron/electron (MIT; its notices ship with the runtime).
- The development-only welcome PDF generator uses pdf-lib (MIT): https://github.com/Hopding/pdf-lib.

The Inverted PDF Writer shell and desktop integration are also licensed under Apache-2.0. This project is independently maintained and is not endorsed by Mozilla.
