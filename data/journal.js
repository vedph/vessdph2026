/* journal.js — APPROVED journal & field-note entries shown on journal.html.
   Only entries with status:"approved" are rendered. To publish a reviewed entry,
   paste its object (the entry.json from a contribution package) into this array
   and commit it together with its processed photo/thumbnail.

   Pending or unreviewed media must NOT be committed to this public repository.
   Only reviewed and approved entries belong here.

   Valid entry kinds (image, thumb, lat/lng and relatedSession are ALL optional):
     - photo + caption (+ optional location);
     - text note or field note (body, no image);
     - reflection linked to a session (set relatedSession);
     - resource / link note (put the link in the body);
     - any of the above, with or without coordinates.
   Entries with lat + lng also appear as markers on the Journal map; entries without
   coordinates appear only in the timeline. Entries without an image still render in the
   timeline (no photo needed) but must have a body or caption.

   Entry shape (copy this; remove the comment markers):

   {
     id: "2026-07-09-1830-zattere-walk",          // safe slug: <date>-<HHMM>-<title>
     datetime: "2026-07-09T18:30:00+02:00",        // ISO 8601 with offset
     title: "Walk to Zattere",
     caption: "Informal walk after the afternoon session.",
     body: "A short field note or reflection.",     // optional, longer text
     authorDisplay: "Summer School participant",    // shown name/label
     attribution: "anonymous",                       // "anonymous" | "named"
     role: "participant",                            // "participant" | "faculty" | "organiser"
     lat: 45.4297, lng: 12.3266,                     // optional; omit if no location
     image: "assets/journal/photos/2026-07-09/2026-07-09-1830-zattere-walk.jpg", // optional
     thumb: "assets/journal/thumbs/2026-07-09/2026-07-09-1830-zattere-walk.jpg", // optional
     tags: ["social", "photo"],                      // session|fieldwork|social|reflection|photo|resource
     relatedSession: null,                           // optional session id, e.g. "2026-07-09-1400"
     status: "approved"
   }
*/
window.JOURNAL = [
];
