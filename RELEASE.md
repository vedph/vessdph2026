# Release checklist

A practical, repeatable checklist for publishing the site to GitHub Pages. The CI workflow
(`.github/workflows/checks.yml`) runs the syntax and site checks automatically on every push
to `main`; this list also covers the manual checks CI cannot perform (map behaviour, offline
fallback, rights/consent).

## 1. Code and data integrity

- [ ] Syntax-check the scripts:
  ```sh
  node --check data/program.js
  node --check data/journal.js
  node --check assets/app.js
  node --check assets/editor.js
  node --check assets/journal.js
  node --check assets/journal-contribute.js
  node --check sw.js
  node --check tools/check-site.js
  node --check tools/build-okf.js
  node --check functions/submit-materials.js
  ```
- [ ] Run `node tools/check-site.js` — must report **no errors**.
- [ ] Regenerate the OKF bundle: `node tools/build-okf.js` (commit any changes under `okf/`).
- [ ] Bump the service worker cache version in `sw.js` (`const CACHE = 'vsdph-2026-vNN'`)
      whenever a precached asset changed, so returning visitors get the update.

## 2. Maps and privacy (manual)

- [ ] Open the programme page: confirm the venue map loads automatically and displays CARTO/OpenStreetMap attribution.
- [ ] Open the People page: confirm the aggregated community map loads automatically and shows only institutional counts, not individual names.
- [ ] Open the Journal: confirm the Journal map loads automatically and displays geolocated journal entries when available.
- [ ] Confirm Leaflet is served locally (`assets/leaflet/…`), not from a CDN.

## 3. Other functionality (manual)

- [ ] Test the **offline fallback** (load once, go offline, reload — the page still works).
- [ ] Test a **calendar export** (`.ics`) from a session page.
- [ ] Open a session that has published `content/*.json` and confirm it renders
      (abstract, bio note, structured bibliography/resources, files).

## 4. Content review

- [ ] Review `content/*.json`: no entry left with `"status": "pending"` that should be live;
      no test/placeholder content.
- [ ] Review `data/journal.js`: only approved entries; correct dates and captions.
- [ ] Confirm **no pending or unreviewed media** (faculty materials or journal photos) is
      committed to the repository.

## 5. Rights and consent

- [ ] Confirm rights/permission for all images, logos and faculty materials (see `RIGHTS.md`).
- [ ] Confirm the site code `LICENSE` (MIT) is present and that materials, media and logos keep their own rights.
- [ ] Confirm institutional marks are used per each institution's brand guidelines.

## 6. Deploy

- [ ] Push to `main`; confirm the **Site checks** workflow passes.
- [ ] Confirm GitHub Pages has rebuilt and serves the new commit.
- [ ] Verify the **live site**: navigation, a session page, the venue, community and Journal maps (all open automatically),
      calendar export, and the contribution page.
