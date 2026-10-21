<img src="assets/icon.svg" width="64" height="64" alt="">

# Inverted PDF Writer

A Windows-first, offline PDF study desk built as a customized fork of [Mozilla PDF.js](https://github.com/mozilla/pdf.js). Read black pages with light text, write notes directly on PDFs, and organize your reading by subject.

## Use it on Windows

Download the x64 `Setup.exe` from this repository's Releases and run the installer. Windows 10/11 on an Intel or AMD 64-bit device is the initial target. The installer is unsigned; Windows may show an unknown-publisher prompt. No account or internet connection is required after installation.

- **Add PDF** imports a private copy into your local library. Your source file remains untouched.
- Choose a subject on a PDF card, or create a subject with the **+** beside Subjects.
- Open a PDF. **Inverted / Normal** changes page colors, including images, without changing the stored PDF.
- Use PDF.js **Draw**, **Highlight**, or **Add text** tools to annotate. Use a stylus to write and a finger to scroll. Enable **Finger drawing** to write with touch. Mouse drawing also works.
- The open PDF saves locally **every five minutes**, on **Save / Ctrl+S**, when returning to the library, and when closing the app normally.
- **Export PDF** produces a regular PDF with your notes embedded. Other PDF readers can open it. Exported PDFs retain normal colors.
- The reader remembers the last saved page. Search, page navigation, zoom, thumbnails, selection, and PDF forms come from PDF.js.

## Where your files live

Choose **Open storage folder** in the app. On Windows the default location is `%APPDATA%\inverted-pdf-writer\library`.

```
library.json                       Subjects, titles, saved page, timestamps
library.previous.json              Previous library index
 documents/<document-id>/
   original.pdf                    Untouched imported PDF
   document.pdf                    Latest annotated PDF
   previous.pdf                    Previous save for recovery
```

Writes use a temporary file, flush it, then rename it into place. Back up the whole library folder to transfer your subjects and notes to another computer. Uninstalling keeps your library. The five-minute interval is not continuous crash protection: edits made since the last successful save can be lost in a power failure. Save errors stay visible and prevent normal app closure.

The browser preview uses IndexedDB instead of the Windows filesystem. Export to download PDFs from the preview; desktop storage and normal-close saving require the installed app.

## Development

Use Node.js 24 or newer.

```sh
npm ci
npm start
npm test
npm run verify:vendor
npm run test:electron
npm run preview
```

`npm run preview` serves the isolated browser preview at http://localhost:4173/app/index.html. `npm run test:electron` launches a separate Electron app with a temporary library; it does not use your regular library or browser profile.

Build the Windows installer **on Windows**:

```sh
npm run dist:win
```

The installer is written to `release/`. `.github/workflows/windows.yml` builds and checks it on a Windows runner. Linux cross-builds need Wine for NSIS's uninstaller generation. `INVERTED_PDF_DATA_DIR` optionally overrides the app's data directory, useful for testing or a portable library.

## Upstream and scope

PDF.js 6.4.299 provides actual PDF rendering and annotation editing. Its release distribution is vendored, so the installed app has no CDN dependency. `vendor/pdfjs/provenance.json` records its origin and checksums. See [upstream selection](docs/upstream.md), [Windows testing](docs/windows-testing.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

Inversion is display-only. Scans need OCR from another tool before text search will work. Password-protected PDFs use PDF.js's password dialog; if PDF.js cannot save an encrypted or restricted PDF, the app reports the save error. Digital signature preservation is not supported. Hardware pen pressure, palm rejection, and device-specific drivers still need a check on your Windows touchscreen.

Licensed under Apache-2.0.
