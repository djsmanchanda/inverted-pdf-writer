# Choosing the upstream

Reviewed on 22 October 2026 using upstream repository metadata and PDF.js release source.

| Project | Strength | Fit for this app |
| --- | --- | --- |
| [Mozilla PDF.js](https://github.com/mozilla/pdf.js) | Apache-2.0; active viewer with ink, highlight, text annotations and PDF saving | Selected. Embed the real viewer in Electron, retaining its editors and adding a student library and display inversion. |
| [Xournal++](https://github.com/xournalpp/xournalpp) | Excellent Windows/Linux pen note-taking; GPL-2.0 | Strong existing option, but its notebook-first document model and C++/GTK build make a custom PDF library and UI a larger fork. |
| [SumatraPDF](https://github.com/sumatrapdfreader/sumatrapdf) | Fast Windows-native PDF reading; GPL-3.0 | Excellent reader, but less suitable for building the requested touchscreen annotation workflow. |

This is a distribution fork rather than a rewrite of PDF rendering. The upstream release's complete viewer and renderer are kept under `vendor/pdfjs`, with its original licenses and resource notices. The desktop app adds the subject library, private imported copies, crash-resistant save replacement, inversion CSS, touch/pen routing, and save lifecycle integration. We do not change the upstream JavaScript bundles.

Upstream tag: `v6.4.299`. Fetch the corresponding Git source from the `upstream` remote when developing renderer/editor changes. To update, replace the vendored release, reapply the two viewer.html integration tags and title change, regenerate the manifest, and repeat the PDF annotation persistence tests before shipping.
