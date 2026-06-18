# materials/

This folder stores downloadable files linked from session content files — slides,
handouts, datasets and similar. They are committed to the repository (versioned,
served from the same origin, with no external host).

## Structure

Use one folder per session, named with the session id:

```txt
materials/YYYY-MM-DD-HHMM/
```

Example:

```txt
materials/2026-07-09-1400/slides.pdf
materials/2026-07-09-1400/handout.pdf
```

## Referencing files

Files are normally referenced from the corresponding session content file:

```txt
content/2026-07-09-1400.json
```

The session content file lists them in its `files` array:

```json
{
  "files": [
    {
      "label": "Slides",
      "href": "materials/2026-07-09-1400/slides.pdf",
      "type": "pdf"
    }
  ]
}
```

## Conventions

- Keep filenames lowercase, stable and URL-safe; prefer hyphens over spaces.
- Large media files should not be committed to this repository. Host large videos or
  large datasets externally and reference them as resources instead.
- Submitted materials should be reviewed before publication. Pending or unreviewed files
  should not be treated as public session materials.
