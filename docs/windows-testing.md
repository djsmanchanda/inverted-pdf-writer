# Windows acceptance checks

Target: Windows 10/11 x64. The GitHub Actions workflow runs persistence tests and a real Electron smoke test before building an NSIS installer.

Before distributing widely, run these hardware checks on a Windows touchscreen:

1. Install, launch, and confirm the local welcome PDF renders. Restart the app offline.
2. Import a normal PDF, a scanned PDF, a long textbook, and a password-protected PDF. Create a subject, assign a PDF, search the library, and restart.
3. Toggle inversion: white becomes black and black becomes white. Confirm reader controls remain readable.
4. Choose Draw. Write with a Windows stylus, rest a palm on the display, then scroll with a finger. Turn Finger drawing on and draw with a finger. Switch back off and verify pen drawing still works.
5. Add ink, a highlight, and text. Leave the document open for five minutes. Check the saved timestamp, close, and reopen. Notes must remain.
6. Change page and return to Library; reopen and confirm the saved page. Make more notes and close the window normally; reopen and confirm them.
7. Export and open the result in Edge or Adobe Acrobat. Notes must be present and page colors normal. Check a rotated page and a PDF form.
8. Back up the whole local library, confirm original.pdf is untouched, and inspect previous.pdf after two saves.
9. Simulate a full or read-only disk in a disposable library. Save must report an error, leave notes open, and prevent normal closure until the save succeeds or the notes are exported.

Unsigned builds show an unknown-publisher prompt. Pen driver behavior and installer execution cannot be certified using Linux browser tests; distinguish those hardware checks from the automated results in the release notes.
