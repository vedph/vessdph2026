# Venice Summer School in Digital and Public Humanities 2026

Static website for the **Venice Summer School in Digital and Public Humanities 2026**, developed for the Venice Centre for Digital and Public Humanities.

The site publishes the school programme, session pages, faculty information, venues, calendar exports, structured data and an Open Knowledge Format bundle. It is designed as a lightweight static publication: no framework, no build step for the public site, and one canonical programme data file.

**Live site:** https://vedph.github.io/vessdph2026/

## Main features

* programme view grouped by day;
* individual session pages generated from session identifiers;
* faculty page generated from programme metadata;
* venue information and map view;
* full-programme and per-session `.ics` calendar export;
* structured metadata for search engines;
* downloadable JSON programme data;
* Open Knowledge Format export;
* Progressive Web App support for offline access to the core site;
* contributor form for preparing per-session material files.

## Repository structure

```txt
.
├── index.html                  # Home page
├── programme.html              # Programme view
├── session.html                # Parametric session page (?s=YYYY-MM-DD-HHMM)
├── people.html                 # Faculty / speakers page
├── partners.html               # Partners and funders
├── contribute.html             # Contributor form for session materials
├── colophon.html               # Method, credits and technical notes
├── data/
│   └── program.js              # Canonical programme data
├── content/                    # Optional per-session material files
├── assets/
│   ├── app.js                  # Main rendering and interaction logic
│   ├── editor.js               # Logic for contribute.html
│   ├── style.css               # Site stylesheet
│   ├── fonts/                  # Self-hosted fonts
│   ├── leaflet/                # Self-hosted Leaflet (map library), loaded on demand
│   ├── logos/                  # Institutional and partner logos
│   └── avatars/                # Speaker images
├── materials/                  # PDFs or other downloadable session files
├── okf/                        # Generated Open Knowledge Format bundle
├── tools/
│   └── build-okf.js            # OKF generation script
├── manifest.webmanifest        # PWA manifest
├── sw.js                       # Service worker
└── .nojekyll                   # GitHub Pages: serve files as-is
```

## Editing the programme

The canonical source for the programme is:

```txt
data/program.js
```

This file contains:

* site metadata;
* days;
* sessions;
* speakers;
* venues;
* partner and institutional information.

Most visible pages are rendered from this file. When editing the programme, update `data/program.js` first rather than editing generated or repeated content elsewhere.

### Session identifiers

Session pages use identifiers in the form:

```txt
YYYY-MM-DD-HHMM
```

Example:

```txt
2026-07-09-1400
```

The same identifier is used for the session URL and for optional content files.

A session page can be opened as:

```txt
session.html?s=2026-07-09-1400
```

## Session materials

Additional materials for a session can be added through JSON files in:

```txt
content/
```

The expected filename pattern is:

```txt
content/YYYY-MM-DD-HHMM.json
```

Example:

```txt
content/2026-07-09-1400.json
```

A typical file may contain:

```json
{
  "abstract": "Session abstract.",
  "bioNote": "A sentence or two about the speaker.",
  "resources": [
    { "label": "Project site", "href": "https://example.org", "type": "website", "notes": "Optional note" }
  ],
  "bibliography": [
    {
      "citation": "Matthew G. Kirschenbaum, Mechanisms, MIT Press, 2008.",
      "doi": "10.7551/mitpress/7549.001.0001",
      "url": "https://mitpress.mit.edu/9780262612263/mechanisms/",
      "notes": "Suggested background reading"
    },
    "Author, Title, Publisher, Year."
  ],
  "files": [
    { "label": "Slides", "href": "materials/2026-07-09-1400/slides.pdf", "type": "pdf" }
  ]
}
```

All fields are optional. If no content file exists for a session, the session page still displays the core programme data.

Field notes:

- **`bioNote`** — a short note about the speaker (legacy key `bio` is still rendered).
- **`bibliography`** — an array whose entries are either a plain **string** (legacy) or an
  object `{ "citation", "doi"?, "url"?, "notes"? }`. `citation` is required on objects;
  `doi` renders as a DOI link, `url` as a link, empty link fields are not shown.
- **`resources`** — an array of `{ "label", "href", "type"?, "notes"? }`.
- **`files`** — an array of `{ "label", "href", "type"? }`, with `href` pointing into
  `materials/<session>/`. A legacy single `pdf` object is still accepted.
- **`status`** — **a content file whose `status` is `"pending"` is never shown on the public
  site or included in the Open Knowledge Format bundle** — only files without that flag (or
  with `status: "approved"`) are published.

Faculty contributors prepare these files with the contribution page (next section), which
also validates the structure; `tools/check-site.js` checks the same model in CI.

## Faculty materials submission

`contribute.html?s=YYYY-MM-DD-HHMM` lets faculty add or update their session materials —
abstract, bio note, structured resources and bibliography, and files — without relying on unstructured email
exchanges.

**Live page:** https://vedph.github.io/vessdph2026/contribute.html — open it directly; it is
intentionally **not** linked in the site navigation. A teacher picks their session and enters the
shared password.

### Proposed-revision workflow

When a faculty member opens the page for a session, it loads the core metadata from
`data/program.js` and then tries to load the currently published
`content/YYYY-MM-DD-HHMM.json`. **If a published file exists, the form pre-loads it** and a
banner makes clear the faculty member is updating already-published materials. They can edit the abstract and bio note, add bibliography and resource rows,
reorder them with **Move up / Move down**, remove them, and **Keep / Replace / Remove** each
existing file (default **Keep**). New items are added. When submitted through the online
flow (below), the changes publish to the site directly; the shared password is the gate.

**Preventing accidental deletion.** Because the form is pre-loaded, list rows and files
change only on an explicit action (the row's ×, or a file's Replace/Remove), and existing
files are never overwritten silently — a new file whose name collides with a kept one is
versioned automatically (e.g. `slides-v2.pdf`). For the **abstract** and **bio note**,
emptying the box does **not** delete the published value: it is preserved unless the faculty
member ticks the explicit **"Clear"** control. A clear is recorded in the package as
`"clear": ["abstract"]` (and/or `"bioNote"`), so removals are deliberate and auditable rather
than inferred from an empty field.

**Static-site limitation.** When a faculty member reopens the contribution page for a
session, the form pre-loads the currently published `content/YYYY-MM-DD-HHMM.json` file, if
available. Pending or unreviewed submissions are not loaded by the static site and must be
managed through the review workflow.

### The revision package

The page produces a **proposed-revision package** (download: `<session>.revision.json`):

```json
{
  "session": "2026-07-09-1400",
  "mode": "revision",
  "basedOn": "published",
  "status": "published",
  "changesSummary": "Added slides and updated bibliography.",
  "content": {
    "abstract": "Revised abstract.",
    "bioNote": "Optional note.",
    "bibliography": [],
    "resources": [],
    "files": []
  }
}
```

`mode`/`basedOn` are `"new"`/`"none"` when no published file existed. An optional
`"clear": ["abstract", "bioNote"]` array lists fields the faculty member explicitly removed.
The `content` object is the **complete proposed state** of the page, so the organising team
reviews the package and **replaces `content/<session>.json` with its `content` object**; the
wrapper fields (`mode`, `basedOn`, `status`, `changesSummary`, `clear`) are review metadata
and are not part of the published file. The downloaded package lists files by reference only,
so when new files are attached they are sent through the review channel alongside the package
(or, with the online flow below, uploaded automatically).

It works in two modes:

- **Offline (default).** The page builds the revision package to download and submit through
  the agreed review channel, or to apply directly on GitHub. No backend is needed; this is
  how the page behaves until the serverless function below is deployed.
- **Online submission (optional).** With a small serverless function deployed and its public
  URL set in `assets/editor.js` (`SUBMIT_ENDPOINT`), faculty enter a shared password and
  submit directly. The function validates the package, embeds any new
  file bytes, and writes it as **published** to the configured branch (e.g. `main`) — it goes
  live immediately; the shared password is the only gate.

### Shared faculty password

A single shared password gates online submission. It is **checked server-side** by the
function and read from an environment secret (`FACULTY_UPLOAD_PASSWORD`). The password is
**never** stored in the repository, in HTML, or in client-side JavaScript: the browser
only sends it on submit. The "show the form after a password" behaviour is purely a UX
convenience — the real check happens in the function.

### Serverless function

`functions/submit-materials.js` is written as a Cloudflare Worker (the core
`handleSubmit()` is platform-independent and adapts to Netlify Functions or Cloudflare
Pages Functions with a thin wrapper change). On each submission it:

1. verifies the shared password (constant-time compare);
2. checks the session id format (`YYYY-MM-DD-HHMM`);
3. sanitises and length-limits all text fields;
4. validates files — allowed extensions only (`pdf, md, txt, jpg, jpeg, png, webp`),
   10 MB max each, max 12, with sanitised filenames;
5. writes any files to `materials/<session>/` and the metadata to
   `content/<session>.json` with `"status": "published"`, on the branch named in
   `GITHUB_BRANCH` (e.g. `main`), via the GitHub REST Contents API;
6. returns a clear success/failure message.

The function also checks the session id against a hardcoded **`KNOWN_SESSIONS`** allowlist
(the 24 real programme sessions). This is intentionally the simplest maintainable approach:
the list lives in one place, and **`tools/check-site.js` fails the build if it ever diverges
from `data/program.js`**, so a stale allowlist cannot ship unnoticed. No generated id file or
sync script is needed.

### Required environment variables

Set in the serverless deployment environment only — never in the repo:

```txt
FACULTY_UPLOAD_PASSWORD   # secret: the shared faculty password
GITHUB_TOKEN              # secret: fine-grained PAT, THIS repo only, Contents: R/W
GITHUB_OWNER              # e.g. vedph
GITHUB_REPO               # e.g. vessdph2026
GITHUB_BRANCH             # e.g. main  (the live branch — submissions publish here)
ALLOW_ORIGIN              # e.g. https://vedph.github.io
```

For Cloudflare: put the non-secret vars in `wrangler.toml` (see
`functions/wrangler.toml.example`) and the two secrets via
`wrangler secret put FACULTY_UPLOAD_PASSWORD` and `wrangler secret put GITHUB_TOKEN`,
then `wrangler deploy`. Finally set the resulting Worker URL as `SUBMIT_ENDPOINT` in
`assets/editor.js`.

### Where submissions go

Submissions are committed straight to the branch named in `GITHUB_BRANCH` (set it to `main`
for live publishing) as `"status": "published"`, so they appear on the site within about a
minute — there is **no separate review or merge step**. The safeguards are the shared
password, the `KNOWN_SESSIONS` allowlist, the file-type and size limits, and the input
sanitising in the function.

**Want moderation instead?** Point `GITHUB_BRANCH` at a non-live branch (created once,
manually — the Contents API cannot write to a missing branch) and merge it into `main`
by hand after review; that restores the older review-and-merge flow. As a safety net, the
session page and the OKF builder ignore any file still marked `"status": "pending"`, even
if one reaches `main` by mistake.

### Testing

The **client** can be tested locally with `python3 -m http.server` and the offline
download flow (no backend). The **online flow** can only be tested once the function is
deployed and `SUBMIT_ENDPOINT` is set: submit a session, confirm a `published` commit
lands on the configured branch, and verify the session page renders it. There is no way to test the live GitHub write without a real token and a
deployed function.

### Known limitations

- Online submissions publish immediately and the repository is public, so anything sent
  through this flow is live and reachable at once — there is **no pre-publication review**.
  Use it only for materials you are happy to publish, keep the shared password restricted,
  and do not use this flow for sensitive files.
- Files are committed into Git, so they remain in history; keep them small and prefer
  external hosting for large assets. Removal on request requires editing the repo (and
  history rewriting to fully purge).
- A shared password can leak within a group; the moderation step and file validation are
  the real safeguards. Consider Cloudflare rate-limiting on the Worker route.
- Image resizing/EXIF-stripping happens in the browser; the server re-validates type and
  size but does not re-encode images.

> **Do not store upload passwords, GitHub tokens or other secrets in the repository or in
> client-side JavaScript. Secrets must be configured as environment variables in the
> serverless deployment environment.**

## Journal & Field Notes

The Journal is a curated, community-memory record of the Summer School from participants and
faculty, shown as a vertical timeline. Entries can be **photos, text notes, field notes,
reflections (optionally linked to a session) or resource/link notes**, and may be
**geolocated or not** — a photo is never required. It is intentionally **fully static** — there is no backend, no upload endpoint,
no GitHub token and no serverless function at this stage. Contributions are prepared in the
browser and published by a maintainer after review.

- **Public page:** `journal.html` (linked as "Journal" in the main navigation). It renders
  only entries with `status: "approved"` from `data/journal.js`, grouped by day, and offers
  a **Journal map** of the geolocated entries.
- **Contribution-preparation page:** `contribute-journal.html` (`noindex`). It uploads and
  publishes nothing; it only helps a contributor assemble a clean package.

### How a contributor prepares a package

On `contribute-journal.html` the contributor optionally selects a photo (resized to 1600 px
with a ~480 px thumbnail and **re-encoded on a canvas, which removes all EXIF including GPS**),
fills in title, caption, an optional longer note, date and time, display name (or anonymous,
by role), role, tags, an optional related session, and an optional location. Location is set
**only if explicitly chosen** — from the known programme venues or by clicking a point on an
on-demand map; GPS is never read from the photo. Pressing **Build my package** produces a
`<id>.zip` containing:

```txt
entry.json
README.txt
assets/journal/photos/<date>/<id>.jpg   (if a photo was added)
assets/journal/thumbs/<date>/<id>.jpg   (if a photo was added)
```

The zip is built without any dependency (a minimal STORE-method writer). If zip creation
fails, the page falls back to downloading the JSON and images separately. Safe ids follow
`<date>-<HHMM>-<title>`, e.g. `2026-07-09-1830-zattere-walk`.

### How a maintainer reviews and publishes an entry

1. Receive and open the package; review the image(s) and text for content and for the consent
   of anyone recognisable.
2. If approved, copy the two image files into the repository **keeping their paths** (the zip
   already mirrors them under `assets/journal/photos/<date>/` and
   `assets/journal/thumbs/<date>/`).
3. Paste the object from `entry.json` into the `window.JOURNAL = [ ... ]` array in
   `data/journal.js`.
4. Commit and push. The entry then appears on `journal.html`.

A small in-browser helper, **`journal-publish.html`** (organiser-only, `noindex`, not linked in
the navigation), automates steps 2–3: drop the approved `.zip` into it and it produces the
complete `data/journal.js` to paste and the renamed image files to upload into a single
`assets/journal/photos/` folder (the thumbnail keeps a `.thumb.jpg` suffix so it sits in the same
folder). Your review of content and consent in step 1 stays manual.

`README.txt` inside each package restates the manual steps.

### Where things are stored

- **Photos:** `assets/journal/photos/<date>/<id>.jpg`
- **Thumbnails:** `assets/journal/thumbs/<date>/<id>.jpg`
- **Metadata:** the entry object in `data/journal.js`

### Why no upload endpoint, and no pending media in the repository

A live self-service endpoint would require a backend, a write-scoped GitHub token and an
always-on service to secure, and — because the repository is public — any "pending" media
committed for moderation would be immediately reachable by its raw URL before any human
review. To keep the public site static and avoid publishing unreviewed media, moderation
happens **before** anything is committed: the contributor prepares a package, a maintainer
reviews it, and only approved entries are added. The `status: "approved"` field is only the
render gate, **not** the moderation mechanism.

### Journal map

`journal.html` shows a **Journal map** section for the geolocated entries. It initialises
automatically when the page loads, like the venue and community maps; its third-party tiles
(CARTO/OpenStreetMap) are fetched at that point, and the timeline is fully usable even if they
do not load. The section is **always present** — when no approved entry has coordinates it
shows an empty-state message ("Geolocated photos and notes will appear here…") instead of the
map. Markers cover **both geolocated photos and geolocated text notes** (photo markers
filled, note markers hollow); each popup shows the title, a short caption/body, the date and
time and the attribution, and links back to the entry in the timeline. Entries without
coordinates appear only in the timeline. If the visitor is offline or the map fails to load,
the timeline remains available and a short message is shown.

### Privacy and consent

Contributions are reviewed before publication. Contributors are asked to submit only material
they are willing to share publicly, to ensure recognisable people have agreed to publication,
and may be credited by name, by role, or anonymously. Published contributions can be amended
or removed on request. Photo metadata (including any GPS) is stripped during local processing,
and coordinates are stored only when the contributor explicitly sets a location.

> Pending or unreviewed images must not be committed to the public repository. Only reviewed
> and approved journal entries should be added to the public site.

## Community map

`people.html` ends with an **aggregated community map** showing the institutions represented
in the Summer School community.

- **Data source:** `data/community-map.js` (`window.COMMUNITY_MAP`), a separate file of
  **aggregated entries only** — one object per institution: `institution`, optional `city`
  and `country`, required numeric `lat`/`lng`, and a positive-integer `count`.
- **No individual data:** popups show only the institution, city/country and a headcount
  (e.g. "6 people"). No names, roles, e-mail addresses or profiles appear on the map, and the
  map is not derived automatically from participant records. Counts must be verified before
  publication.
- **Behaviour:** it reuses the vendored Leaflet setup and CARTO/OpenStreetMap tiles with
  proportional circle markers; it opens automatically like the venue map. When
  `data/community-map.js` is empty it shows an empty-state message and the section stays
  visible. `tools/check-site.js` validates the entries (institution, numeric coordinates,
  positive-integer count).

## Local preview

The site can be opened directly from `index.html`, but local serving is recommended for testing the service worker, map behaviour and relative paths.

```bash
python3 -m http.server 8080
```

Then open:

```txt
http://localhost:8080/
```

## Regenerating the Open Knowledge Format bundle

The `okf/` directory contains a generated Open Knowledge Format representation of the programme.

This is normally **automatic**: `.github/workflows/build-okf.yml` regenerates the bundle and
commits it back on every push to `main` that touches `data/program.js`, `content/`, or the
generator. To rebuild it locally — after editing `data/program.js` or session content files —
run:

```bash
node tools/build-okf.js
```

The entry point is:

```txt
okf/index.md
```

## Deployment

The site is intended for GitHub Pages.

Recommended setup:

1. push the repository to `vedph/vessdph2026`;
2. open **Settings → Pages**;
3. choose **Deploy from a branch**;
4. select branch `main`;
5. select folder `/ (root)`.

The `.nojekyll` file is included so that GitHub Pages serves the static files without Jekyll processing.

Before publishing, follow **`RELEASE.md`** (syntax/site checks, OKF regeneration, service
worker version, map/offline/calendar checks, content and rights review, deploy and live
verification). On every push to `main`, `.github/workflows/build-okf.yml` rebuilds the OKF
bundle automatically (see *Regenerating the Open Knowledge Format bundle*).

## Rights

The repository mixes material under different rights — site code, programme data, faculty
materials, journal media, institutional logos, fonts, Leaflet, and CARTO/OpenStreetMap map
data — with **no single blanket licence**. See **`RIGHTS.md`** for the per-category details.
The **site code and technical documentation are under the MIT License** (see `LICENSE`);
content, materials, media, logos and third-party assets keep their own rights.

## Data and generated outputs

The programme data is exposed or reused in several forms:

* HTML programme and session pages;
* JSON programme export;
* JSON-LD structured data;
* `.ics` calendar files;
* Open Knowledge Format markdown files.

The source of truth remains `data/program.js`.

## Privacy and external resources

The site uses self-hosted fonts and a self-hosted copy of the Leaflet map library; no third-party scripts or styles are loaded on page load.

The venue list is available without external requests. The interactive maps — the venue map, the aggregated community map and the Journal map — each initialise automatically when their page loads, fetching CARTO basemap tiles (based on OpenStreetMap data) at that point; Leaflet itself is self-hosted. If the user is offline, or the tiles cannot be loaded, the underlying lists and the Journal timeline remain visible and usable.

The participant list is not published in the repository or on the public site.

## AI-assisted development workflow

This site was developed through an AI-assisted, version-controlled workflow. Claude Opus 4.8 was used as a pair-programming assistant for the initial implementation, interface refinement and code iteration. OpenAI ChatGPT/GPT-5.5 Thinking was used for additional code review, debugging and consistency checks across the static site structure, JavaScript logic, service worker, calendar export and metadata model.

The outputs of both systems were manually reviewed, tested against the local source files and revised before publication. All programme data, textual content, structural decisions and final implementation remain under human responsibility. The AI systems were used as technical and editorial assistants, not as authors.

## Credits

The site was developed for the Venice Centre for Digital and Public Humanities under the responsibility of **Emmanuela Carbé**.

The programme itself — including sessions, speakers and scholarly content — is the work of the Venice Centre for Digital and Public Humanities and its contributors.

Fonts:

* EB Garamond;
* IBM Plex Mono.

Both are self-hosted and distributed under the SIL Open Font License.

Map:

* Leaflet;
* CARTO basemap;
* OpenStreetMap data.

Institutional marks, partner logos and programme content remain subject to their respective rights and institutional uses.
