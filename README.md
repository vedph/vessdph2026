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
  with `status: "published"`) are shown.

Faculty contributors prepare these files with the contribution page (next section), which
also validates the structure; `tools/check-site.js` checks the same model in CI.

## Faculty materials submission

`contribute.html?s=YYYY-MM-DD-HHMM` lets faculty add or update their session materials —
abstract, bio note, structured resources and bibliography, and files — without relying on unstructured email
exchanges.

**Live page:** https://vedph.github.io/vessdph2026/contribute.html — open it directly; it is
intentionally **not** linked in the site navigation (it is reached from a "Teaching a session?"
link on the programme page). A teacher picks their session and logs in with their personal
credentials.

### Proposed-revision workflow

When a faculty member opens the page for a session, it loads the core metadata from
`data/program.js` and then tries to load the currently published
`content/YYYY-MM-DD-HHMM.json`. **If a published file exists, the form pre-loads it** and a
banner makes clear the faculty member is updating already-published materials. They can edit the abstract and bio note, add bibliography and resource rows,
reorder them with **Move up / Move down**, remove them, and **Keep / Replace / Remove** each
existing file (default **Keep**). New items are added. When submitted through the online
flow (below), the changes publish to the site directly; the personal login (with the
`teacher`/`admin` role) is the gate.

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
  URL set in `assets/editor.js` (`SUBMIT_ENDPOINT`), faculty log in with their personal
  credentials and submit directly. The function validates the package, embeds any new
  file bytes, and writes it as **published** to the configured branch (e.g. `main`) — it goes
  live immediately; the personal login (with the `teacher`/`admin` role) is the only gate.

### Personal logins

Online submission is gated by **per-person logins**, not a shared password. Each participant
and teacher has a username and password, held server-side in the function's `CREDENTIALS`
secret as a JSON map of `{ username: { password, role, name } }`, where `role` is `teacher`,
`student` or `admin`. Credentials are **never** stored in the repository, in HTML or in
client-side JavaScript: the browser only sends them on submit, and the function compares them
in constant time. Materials submission requires the `teacher` (or `admin`) role; the Journal is
open to any valid login. The "show the form after login" behaviour is a UX convenience — the
real check happens in the function on every request.

### Serverless function

`functions/submit-materials.js` is written as a Cloudflare Worker (the core
`handleSubmit()` is platform-independent and adapts to Netlify Functions or Cloudflare
Pages Functions with a thin wrapper change). On each submission it:

1. verifies the personal login and role (constant-time compare; materials require the
   `teacher` or `admin` role);
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

The **same Worker** also serves the Journal — creating, listing, photo-serving and removing
entries, stored in Cloudflare D1. See **Journal & Field Notes** below for those routes.

### Required environment variables

Set in the serverless deployment environment only — never in the repo:

```txt
CREDENTIALS               # secret: JSON map {username:{password,role,name}} of per-person logins
GITHUB_TOKEN              # secret: fine-grained PAT, THIS repo only, Contents: R/W
GITHUB_OWNER              # e.g. vedph
GITHUB_REPO               # e.g. vessdph2026
GITHUB_BRANCH             # e.g. main  (the live branch — submissions publish here)
ALLOW_ORIGIN              # e.g. https://vedph.github.io
```

The Journal also needs a **D1 database binding** named `DB` (declared in `wrangler.toml`),
holding the `journal` table from `functions/schema.sql`.

For Cloudflare: put the non-secret vars in `wrangler.toml` (see
`functions/wrangler.toml.example`), add the `DB` D1 binding, and set the two secrets via
`wrangler secret put CREDENTIALS` and `wrangler secret put GITHUB_TOKEN`, then `wrangler deploy`.
Finally set the resulting Worker URL as `SUBMIT_ENDPOINT` in `assets/editor.js` — it is also the
endpoint used by the Journal pages.

### Where submissions go

Submissions are committed straight to the branch named in `GITHUB_BRANCH` (set it to `main`
for live publishing) as `"status": "published"`, so they appear on the site within about a
minute — there is **no separate review or merge step**. The safeguards are the personal
logins (with the `teacher`/`admin` role required for materials), the `KNOWN_SESSIONS` allowlist,
the file-type and size limits, and the input sanitising in the function.

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
  Use it only for materials you are happy to publish, keep logins restricted to the people who
  need them, and do not use this flow for sensitive files.
- Files are committed into Git, so they remain in history; keep them small and prefer
  external hosting for large assets. Removal on request requires editing the repo (and
  history rewriting to fully purge). (Journal entries are different — they live in D1 and are
  removed cleanly by their author or an organiser.)
- Per-person logins are low-value credentials shared with the cohort; the input validation,
  the role check (for materials) and the allowlist are the real safeguards. Consider Cloudflare
  rate-limiting on the Worker route.
- Image resizing/EXIF-stripping happens in the browser; the server re-validates type and
  size but does not re-encode images.

> **Do not store upload passwords, GitHub tokens or other secrets in the repository or in
> client-side JavaScript. Secrets must be configured as environment variables in the
> serverless deployment environment.**

## Journal & Field Notes

The Journal is a **live, contributory** record of the Summer School from participants and
faculty. Anyone with a personal login can post a short note, a reflection or a photograph; the
entry appears on the public page immediately and can be removed at any time by its author or an
organiser. This replaces the earlier "prepare a package, review, paste" workflow.

- **Public page:** `journal.html` ("Journal" in the main navigation). It fetches the entries
  from the site API and lays them out as the five chapters of a travel diary — *Before*, *On our
  way*, *At the Summer school*, *Heading home*, *Afterwards* — each with a short description, so
  the arc reads even when a chapter is still empty. Within *At the Summer school*, entries
  attached to a programme session are grouped under that session (in programme order), with an
  "Around the week" group for the rest. A **Journal map** shows the geolocated entries.
- **Contribution page:** `contribute-journal.html` (`noindex`). Log in with a personal
  username/password, choose a chapter (and, for the school, an optional related session), write
  a title and note, optionally add a photo and a location, and post. The entry is published at
  once.

### How an entry is written

On `contribute-journal.html`, after logging in the contributor writes a note (and/or a title)
and may:

- **Add a photo** — resized to 1200 px and **re-encoded on a canvas, which removes all EXIF
  including GPS**, then sent as base64. A **consent checkbox** must be confirmed whenever a photo
  is attached (recognisable people must have agreed to be shown).
- **Add a location** — by clicking a point on a small map (drag the pin to fine-tune), or with a
  "use my current location" shortcut. A location is saved only if one is set; GPS is never read
  from the photo.

The login is remembered for the browser session and shared with `journal.html` (via
`sessionStorage`), so after posting you arrive on the Journal already signed in and can remove
your own entries there.

### Backend

The Journal and the teacher materials are served by a **single Cloudflare Worker**
(`functions/submit-materials.js`) — the only server-side component. Journal routes:

- `POST /journal` — create an entry (any valid login). Text, metadata and the photo (base64) are
  stored in **Cloudflare D1** (`functions/schema.sql`, table `journal`); **no R2 bucket** is
  used. Consent is required when a photo is present.
- `GET /journal` — public list of entries (oldest first; the heavy photo data is omitted).
- `GET /journal/photo/<id>` — public; serves a single photo, decoded from D1.
- `POST /journal/remove` — deletes an entry (its author, or an `admin`). Removal is a real
  `DELETE`; the photo goes with the row.
- `POST /whoami` — confirms a login and returns the display name and role, so the pages can show
  the right controls.

Logins are the per-person credentials described under **Personal logins** above; the Journal is
open to any valid login (teacher, student or admin). Deployment is the same as for materials,
with one D1 binding (`DB`) added — create the database, load `functions/schema.sql`, bind it in
`wrangler.toml`, and `wrangler deploy`.

### Journal map

`journal.html` shows a **Journal map** of the geolocated entries. It uses the vendored Leaflet
setup with CARTO/OpenStreetMap tiles, loaded on demand. The section shows an empty-state message
until an entry has coordinates. Photo markers are filled, text-note markers hollow; each popup
shows the title, a short excerpt, the date and time and the author, and links back to the entry.
Entries without coordinates appear only in the chapters. If the visitor is offline or the tiles
fail to load, the chapters remain available.

### Privacy and consent

Entries are public and attributed to the contributor's name. A photo is re-encoded locally so
its metadata (including any GPS) is dropped before upload, and a consent checkbox must be
confirmed for recognisable people. Coordinates are stored only when a location is explicitly
set. An entry — text and photo together — can be removed at any time by its author or an
organiser, which deletes it from the database.

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

The venue list is available without external requests. The two interactive maps — the venue map and the Journal map — each initialise automatically when their page loads, fetching CARTO basemap tiles (based on OpenStreetMap data) at that point; Leaflet itself is self-hosted. If the user is offline, or the tiles cannot be loaded, the underlying lists and the Journal entries remain visible and usable.

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
