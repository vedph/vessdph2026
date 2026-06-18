# Logos and institutional marks

All marks used by the site are stored **locally in this folder** — nothing is
hot-linked from external servers, so the site makes no third-party requests for
logos and never breaks if an outside host changes.

## What's here

- **`site-lockup.png`** — the header brandmark (Ca' Foscari University of Venice /
  Venice Centre for Digital and Public Humanities). It is referenced by every page's
  `.brandlock` link. If it fails to load, the page falls back to the image's `alt`
  text automatically (see `wireLogoFallbacks` in `assets/app.js`).
- **Ca' Foscari department marks** (`ca-foscari-*.png`) and **partner / funder logos**
  (`aiucd.png`, `archivio-di-stato.png`, `biennale.png`, `cisph.png`, `digitalia.png`,
  `diptext-kc-clarin.png`, `eutopia.png`, `ilc-cnr.png`, `museyoum.png`) — shown on
  `partners.html`. Each logo links to its institution's own site.

## Maintaining the set

- **Format**: PNG or SVG with a transparent background; SVG is sharpest (if you switch
  a file to SVG, update its reference in `partners.html`).
- **Size**: any height ≥ 80 px is fine — logos are displayed at a uniform small height.
- **Add / remove / reorder**: edit the logo entries in `partners.html`. A referenced
  file that is missing is simply hidden, so a partial set still renders cleanly.
- **Replacing the header lockup**: drop a new `site-lockup.png` here (same name) — no
  markup change needed.

## Rights

These are institutional marks. They are **not** covered by the project's code or content
licence and remain © their respective owners, used here for identification of the
organising and partner institutions. Obtain official files and follow each institution's
brand guidelines (for Ca' Foscari, via the Communication Office / brand manual at
`www.unive.it/logo`). See `RIGHTS.md` in the repository root.
