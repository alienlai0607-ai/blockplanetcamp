# Trainer Studio redesign — 2026-11-17

Status: PAUSED. User subsequently instructed: 範例改好再上線. Restored original production tree with commit 063d2c4b17f06c8fcb00195b7cdd57b61e5247fc. Keep local redesign draft. Do not republish until the exact original mascot image has been directly pixelated with transparent background and integrated as the example. Await user-provided original image; rejected generated designs must not be used.

## Changes
- Bright sky blue, Poké Ball red and yellow workbench, rounded controls and a Poké Ball preview console.
- Desktop colors and drawing tools beside canvas. Narrow layouts place drawing tools, canvas and palette together; edit/preview switch avoids scrolling between them.
- Save/export/USB moved into a dedicated dialog reachable from the header.
- Honest connection indicator separates local artwork preview from hardware connection.
- Existing artwork storage, identity, animation, exports, USB and firmware logic retained.
- Fresh canvas checkerboard and brighter preset palette; existing stored colors unchanged.

## Mascot request still pending
The user rejected the newly generated mascots. DO NOT integrate them. They want the exact supplied original artwork directly pixelated, transparent background, preserving shapes, faces and colors. Request the exact original image again: the source found in the existing site was a holiday-themed version, not confirmed as the requested original.

## Verification
- JS syntax and esbuild bundle pass; all referenced control IDs exist and are unique.
- 61 of 62 selected existing tests pass, covering drawing, save/import, animation, backgrounds, trainer motion, device package and USB protocol.
- Existing link.test.mjs fails on released firmware source.zip matching device/link files; UI changes do not modify these firmware assets. Do not claim all tests pass or change firmware as part of this design task.
- DOM tests need happy-dom/fake-indexeddb; dependencies absent locally.
- Browser responsive QA at 1280 desktop and 390 mobile is still REQUIRED before publication. Local server binding is denied in this environment, and browser file URLs are disallowed. Do not bypass these restrictions.
- verification/trainer-studio-preview.html is a standalone review copy. Artwork in this file uses a separate local browser origin from production. Firmware updating is disabled in the review copy; use the production source for actual hardware work.

## Files changed
teacher-tools/pokemon-trainer/index.html
teacher-tools/pokemon-trainer/app.js
teacher-tools/pokemon-trainer/model.js
teacher-tools/pokemon-trainer/studio.css (new)
teacher-tools/pokemon-trainer/studio.js (new)

The checkout's .git pack files are iCloud dataless and git status/diff may hang. Preserve current changes. Refresh remote baseline before eventual publishing; never overwrite concurrent work.

## Publication / QA follow-up
- Initial UI release f714bb65a9c435a07b52d49ac4b9440058f3b6a8 and mobile spacing fix 09bc6f5faae1aa90916d5cc1927482689aff8ca6 were reverted at user request.
- During online QA, desktop at 1280x800 has no horizontal overflow. Color selection, keyboard drawing, undo, save dialog and mobile preview switch work; browser console had no errors.
- Mobile 390x844 initially needed scrolling to reach the palette. The spacing fix is in the local studio.css, but needs fresh browser verification before final publication.
- The hosted rollback tree matches the original baseline cdd5a5a7d99d75b945de7269db53df58be006f4f exactly.

- Rollback deployment run 44039357868 completed successfully. Browser confirmed original title and heading 「像素夥伴製造機」. Temporary mobile viewport override reset. Latest user decision: finish exact-original mascot examples before publishing the combined redesign.


## 2026-11-17 mascot completion
- User original resolved: 小布(3).JPEG, uploaded 2026-11-17 08:43 UTC. Red twin-pigtail hair, yellow body, sparkle eyes, peach cheeks, hands near cheeks.
- User clarified body must be round; final art preserves these features and completes the circular lower body, with transparent exterior.
- Editable 64px sprite in mascot.js and matching SVG thumbnail; 16/32px samples downsample from the same source. No background embedded in character pixels.
- Fresh collection starts with 小布; existing work is preserved. Small 小布範例 button creates a new separate project. New-project dialog also offers 小布.
- Together preview includes idle, play, bath, walk and food (uses saved food artwork); firmware/protocol unchanged.
- User authorized automatic public deployment after examples complete; no additional approval needed.
