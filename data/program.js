/* =============================================================================
   Venice Summer School in Digital and Public Humanities — 2026
   CANONICAL DATA MODEL · single source of truth
   -----------------------------------------------------------------------------
   Everything on the site is generated from this object: the programme, the map,
   the calendar files (.ics), the JSON-LD for search engines, and the open data
   download. Edit HERE only; nothing else needs to change.

   MODEL
     meta      → title, dates, organiser, canonical URL
     venues    → normalised dictionary (one entry per place, with coordinates)
     types     → session kinds + their one-letter siglum and colour role
     days[]    → each day: date, area, theme, intro, and sessions[]
       session → start, end, title, type, venueId, speakers[],
                 materials[]  → files in THIS repo (slides, datasets, TEI…)
                 resources[]  → external links (Omeka site/forum, plugins, docs…)
                 each item = { label, href, kind? }  (kind only sets a small glyph;
                 external links open in a new tab automatically)

   TIME      "HH:MM" 24h, local Venice time (CEST, UTC+2 in July).
   VENUE     sessions reference a venue by id (venueId), never by repeating it.
   ID        a session's stable id is `${date}T${start}` (used for anchors,
             the personal agenda, and calendar UIDs). Stable unless you move it.
   ========================================================================== */

window.SCHOOL = {

  meta: {
    title: "Venice Summer School",
    titleFull: "Venice Summer School in Digital and Public Humanities",
    accent: "in Digital and Public Humanities", // italicised tail in the masthead
    host: "Ca\u2019 Foscari University of Venice",
    centre: "Venice Centre for Digital and Public Humanities — [ve]dph",
    dateStart: "2026-07-06",
    dateEnd: "2026-07-10",
    datesHuman: "6\u201310 July 2026",
    language: "All classes are taught in English",
    timezone: "Europe/Rome",      // display only; .ics uses the offset below
    utcOffsetMinutes: 120,         // July in Venice = CEST = UTC+2
    url: "https://vedph.github.io/vessdph2026/", // GitHub Pages project site
    info: "https://www.unive.it/data/33113/2/113737",
    showFaculty: true,   // set false to hide the separate Faculty section
                         // (teacher names already appear inside each session)
    showWheel: true,     // set false to remove the circular programme overview
    // one colour per day-segment of the wheel (edit freely):
    wheelColors: ["#b01e28", "#1d6a73", "#c2882b", "#3f5e8c", "#7d3a6a"],
    funding: "Co-funded by the Erasmus+ Programme of the European Union — " +
             "DIGITALIA (2024-1-TR01-KA220-VET-000251597)"
  },

  /* --------------------------------------------------------------------------
     COHORT — AGGREGATE FIGURES ONLY.
     These are counts derived from the (confidential) application table. NO names,
     emails, affiliations or any per-person rows are stored here or shown anywhere.
     Only one-dimensional marginal counts are published: with a 25-person cohort,
     cross-tabulating dimensions (country x institution x strand) or listing
     singleton institutions/countries would re-identify individuals — so we don't.
     Set show:false to hide the whole section.
     ------------------------------------------------------------------------ */
  cohort: {
    show: true,
    total: 25,
    places: { regular: 23, eutopia: 2 },   // 2 = EUTOPIA DigIn Connected Community scholarships
    countries: 14,
    italy: 10,
    international: 15,
    institutions: 19,
    // Gender is intentionally NOT published (see app.js / colophon). If it is ever
    // reinstated, fill ONLY with real self-declared data and never infer it from names.
    gender: null,
    genderTeachers: null,
    strands: [
      { label: "Textual Scholarship",            count: 8 },
      { label: "Art History",                    count: 6 },
      { label: "History",                        count: 5 },
      { label: "Archaeology & Cultural Heritage", count: 3 },
      { label: "Digital Libraries & Archives",   count: 3 }
    ]
  },

  /* --------------------------------------------------------------------------
     PEOPLE — optional per-person metadata, merged into the Faculty list by name.
       url   : institutional profile page (only verified links; a wrong link is
               worse than none — leave absent if unsure).
       photo : path to a square headshot, e.g. "assets/people/surname.jpg".
               When absent, a sober initials avatar is shown instead.
     Names must match exactly the speaker names used in the sessions below.
     ------------------------------------------------------------------------ */
  people: {
    "Stefano Bergonzini":           {},  // Museyoum srl (industry) - no public institutional page; shown with initials
    "Diego Calaon":                 { url: "https://www.unive.it/data/persone/5592527", photo: "assets/avatars/calaon.jpg" },
    "Franz Fischer": { url: "https://www.unive.it/data/persone/21292086", photo: "assets/avatars/fischer.jpg" },
    "Elisa Corr\u00f2":              { url: "https://www.unive.it/persone/elisa.corro", photo: "assets/avatars/corro_.jpg" },
    "Grazia Solenne":               { url: "https://www.linkedin.com/in/grazia-solenne/", photo: "assets/avatars/solenne.jpg" },
    "Francesca Tomasi":             { url: "https://www.unibo.it/sitoweb/francesca.tomasi", photo: "assets/avatars/tomasi.jpg" },
    "Marina Buzzoni":               { url: "https://www.unive.it/data/persone/5592048", photo: "assets/avatars/buzzoni.jpg" },
    "Chiara De Bastiani":           { url: "https://www.unive.it/persone/chiara.debastiani", photo: "assets/avatars/de_bastiani.jpg" },
    "Federico Boschetti":           { url: "https://www.ilc.cnr.it/people/federico-boschetti-2/", photo: "assets/avatars/boschetti.jpg" },
    "Peter Robinson":               { url: "https://artsandscience.usask.ca/profile/PRobinson", photo: "assets/avatars/robinson.jpg" },
    "Paolo Monella":                { url: "https://www.paolomonella.it/", photo: "assets/avatars/monella.jpg" },
    "Carolina Fern\u00e0ndez-Castrillo": { url: "https://www.carolinafcastrillo.com", photo: "assets/avatars/fernandez-castrillo.jpg" },
    "Amanda Madden":                { url: "https://historyarthistory.gmu.edu/people/amadden8", photo: "assets/avatars/madden.jpg" },
    "Stefano Dall\u2019Aglio":      { url: "https://www.unive.it/persone/stefano.dallaglio", photo: "assets/avatars/dall_aglio.jpg" },
    "Emmanuela Carb\u00e9":         { url: "https://www.unive.it/data/persone/28978558", photo: "assets/avatars/carbe_.jpg" },
    "Fabrizio Nevola":              { url: "https://experts.exeter.ac.uk/22922-fabrizio-nevola", photo: "assets/avatars/nevola.jpg" },
    "Irene Russo":                  { url: "https://www.ilc.cnr.it/en/people/irene-russo/", photo: "assets/avatars/russo.jpg" },
    "Paolo Berti":                  { url: "https://www.unive.it/persone/paolo.berti", photo: "assets/avatars/berti.jpg" },
    "Stefania De Vincentis":        { url: "https://www.unive.it/persone/stefania.devincentis", photo: "assets/avatars/de_vincentis.jpg" },
    "Vince Dziekan":                { url: "https://research.monash.edu/en/persons/vincent-dziekan", photo: "assets/avatars/dziekan.jpg" },
    "Ross Parry":                   { url: "https://le.ac.uk/people/ross-parry", photo: "assets/avatars/parry.jpg" },
    "Francesca Dolcetti":          { url: "https://www.essex.ac.uk/people/DOLCE91308/Francesca-Dolcetti", photo: "assets/avatars/dolcetti.jpg" },
    "Daniele Fusi":                { url: "https://www.unive.it/data/persone/22711986", photo: "assets/avatars/fusi.jpg" },
    "Mariangela Giglio":           { url: "https://www.unibo.it/sitoweb/mariangela.giglio2", photo: "assets/avatars/giglio.jpg" },
    "Agnese Macchiarelli":         { url: "https://www.unive.it/data/persone/15736829", photo: "assets/avatars/macchiarelli.jpg" },
    "Tiziana Mancinelli":          { url: "https://www.studigermanici.it/ricerca/ricercatori/tiziana-mancinelli-2/", photo: "assets/avatars/mancinelli.jpg" },
    "Paola Peratello":             { url: "https://www.unive.it/data/persone/27241789", photo: "assets/avatars/peratello.jpg" }
  },

  /* Organising / administrative support (not teachers; no programme link). */
  support: [
    { name: "Laura Principi", role: "Segreteria didattica, DSU",
      url: "https://www.unive.it/data/persone/11760181", photo: "assets/avatars/principi.jpg" }
  ],

  /* --------------------------------------------------------------------------
     VENUES — coordinates are approximate; refine by dropping a pin in any map
     service and pasting lat/lng here. Order is irrelevant.
     ------------------------------------------------------------------------ */
  venues: {
    malcanton: {
      name: "VeDPH Lab",
      building: "Palazzo Malcanton Marcor\u00e0",
      detail: "2nd floor",
      address: "Dorsoduro 3484, Venezia",
      lat: 45.43508, lng: 12.32360
    },
    morelli: {
      name: "Aula Morelli",
      building: "Palazzo Malcanton Marcor\u00e0",
      detail: "ground floor",
      address: "Dorsoduro 3484, Venezia",
      lat: 45.43508, lng: 12.32360
    },
    baratto: {
      name: "Aula Baratto",
      building: "Ca\u2019 Foscari, main building",
      detail: "2nd floor",
      address: "Dorsoduro 3246, Venezia",
      lat: 45.43447, lng: 12.32660
    },
    berengo: {
      name: "Sala Marino Berengo",
      building: "Ca\u2019 Foscari, main building",
      detail: "1st floor",
      address: "Dorsoduro 3246, Venezia",
      lat: 45.43447, lng: 12.32660
    },
    archivio: {
      name: "Venice State Archives",
      building: "Archivio di Stato di Venezia",
      detail: "former convent of the Frari",
      address: "Campo dei Frari 3002, San Polo, Venezia",
      lat: 45.43683, lng: 12.32640
    },
    biennale: {
      name: "Biennale Sessions Space",
      building: "La Biennale di Venezia \u00b7 Arsenale",
      detail: "61st International Art Exhibition, \u201cIn Minor Keys\u201d",
      address: "Campo della Tana 2169/F, Castello, Venezia",
      lat: 45.43470, lng: 12.35350
    },
    tbc: {
      name: "Venue to be confirmed",
      building: "",
      detail: "",
      address: "Venezia",
      lat: null, lng: null
    }
  },

  /* --------------------------------------------------------------------------
     SESSION TYPES — the siglum is shown in the margin like an editorial mark.
     role drives colour: "key" = rubric red (highlighted), "plain" = ink.
     ------------------------------------------------------------------------ */
  types: {
    welcome:      { label: "Welcome",       siglum: "\u00b7", role: "muted"  },
    session:      { label: "Lecture & workshop", siglum: "L/W",    role: "plain"  },
    keynote:      { label: "Keynote",       siglum: "K",      role: "key"    },
    tour:         { label: "Guided tour",   siglum: "T",      role: "plain"  },
    visit:        { label: "Visit",         siglum: "V",      role: "plain"  },
    reception:    { label: "Reception",     siglum: "\u2767", role: "muted"  },
    consultation: { label: "Consultation",  siglum: "C",      role: "plain"  },
    discussion:   { label: "Round table",   siglum: "D",      role: "muted"  }
  },

  /* --------------------------------------------------------------------------
     DAYS
     ------------------------------------------------------------------------ */
  days: [
    {
      date: "2026-07-06",
      label: "Day One",
      area: "Area 1 \u00b7 Digital Archaeology and Public Archaeology",
      theme: "Absence, Mediation, and (Re-\u2060)Construction of Cultural Heritage",
      intro:
        "A one-day strand on how cultural heritage is shaped through absence, " +
        "narrative, and selective visibility. It opens with Marco Polo — globally " +
        "recognised, yet absent from the city\u2019s monuments — and asks not how to " +
        "reconstruct him, but how to design the conditions through which he can be " +
        "experienced, at the intersection of narrative design and generative AI. " +
        "Short theoretical inputs are paired with a guided experimental session using " +
        "3D models, eye-tracking, and participatory practices.",
      sessions: [
        { start: "09:30", end: "10:00", type: "welcome", venueId: "malcanton",
          title: "Welcome", speakers: [ { name: "Franz Fischer", affiliation: "Director, VeDPH" } ] },
        { start: "10:00", end: "11:00", type: "session", venueId: "malcanton",
          title: "Making Heritage from Absence: Digital Archaeology as a Shared Practice",
          speakers: [
            { name: "Diego Calaon", affiliation: "Ca\u2019 Foscari" },
            { name: "Elisa Corr\u00f2", affiliation: "Ca\u2019 Foscari" },
            { name: "Grazia Solenne", affiliation: "Ca\u2019 Foscari" }
          ] },
        { start: "11:00", end: "11:30", type: "session", venueId: "malcanton",
          title: "From Absence to Experience: Generative AI as a Narrative Device in Cultural Heritage",
          speakers: [
            { name: "Elisa Corr\u00f2", affiliation: "Ca\u2019 Foscari" },
            { name: "Stefano Bergonzini", affiliation: "Museyoum srl" }
          ] },
        { start: "11:45", end: "13:00", type: "session", venueId: "malcanton",
          title: "Ethics, Mediation, and Meaning: Participatory Approaches to Digital Heritage",
          speakers: [
            { name: "Francesca Dolcetti", affiliation: "University of Essex" }
          ] },
        { start: "14:00", end: "16:30", type: "session", venueId: "malcanton",
          title: "Designing Absence: A Values-Led Workshop on Digital Heritage",
          speakers: [
            { name: "Francesca Dolcetti", affiliation: "University of Essex" },
            { name: "Elisa Corr\u00f2", affiliation: "Ca\u2019 Foscari" },
            { name: "Grazia Solenne", affiliation: "Ca\u2019 Foscari" }
          ] },
        { start: "17:00", end: "19:00", type: "keynote", venueId: "baratto", area: "Opening keynote",
          title: "What Do We Mean by Scholarly Digital Culture?",
          note: "Opening keynote within the DIGITALIA Erasmus+ Project, introduced by Lorenzo Calvelli (Ca\u2019 Foscari).",
          speakers: [
            { name: "Francesca Tomasi", affiliation: "University of Bologna" }
          ] }
      ]
    },

    {
      date: "2026-07-07",
      label: "Day Two",
      area: "Area 2 \u00b7 Digital and Public Textual Scholarship",
      theme: "Texts in Motion: Digital and Public Approaches to Venetian Textual Heritage",
      intro:
        "Theories and practices of Digital Textual Scholarship through Venetian literary " +
        "traditions and archival records around Marco Polo (1254\u20131324), Veronica Franco " +
        "(1546\u20131591), and Giacomo Casanova (1725\u20131798). Close reading is combined with " +
        "hands-on work on manuscripts, archival documents, and early printed books. " +
        "Participants experiment with text encoding (TEI/XML), image annotation (IIIF), " +
        "automated text recognition (HTR) in Transkribus and eScriptorium, and basic data " +
        "modelling and linked open data (LOD). A visit to the State Archives grounds the day " +
        "in its material sources.",
      sessions: [
        { start: "09:30", end: "11:00", type: "session", venueId: "berengo",
          title: "Encoding Marco Polo and Visual Manuscript Culture",
          speakers: [
            { name: "Marina Buzzoni", affiliation: "Ca\u2019 Foscari" },
            { name: "Chiara De Bastiani", affiliation: "Ca\u2019 Foscari" },
            { name: "Paola Peratello", affiliation: "\u00c9cole nationale des chartes \u2014 PSL, Paris" }
          ] },
        { start: "11:30", end: "13:00", type: "session", venueId: "berengo",
          title: "Casanova in Context: Digital Approaches to Archival Documents and Early Prints",
          speakers: [
            { name: "Federico Boschetti", affiliation: "CNR-ILC" },
            { name: "Agnese Macchiarelli", affiliation: "Bergische Universit\u00e4t Wuppertal / Ca\u2019 Foscari" }
          ] },
        { start: "14:00", end: "15:30", type: "session", venueId: "archivio",
          title: "Modelling Venetian Renaissance Writing: The Case of Veronica Franco",
          speakers: [
            { name: "Tiziana Mancinelli", affiliation: "Istituto Italiano di Studi Germanici" },
            { name: "Daniele Fusi", affiliation: "Stuttgart University / Ca\u2019 Foscari" },
            { name: "Paolo Monella", affiliation: "Kore University of Enna" }
          ] },
        { start: "16:00", end: "17:30", type: "tour", venueId: "archivio",
          title: "Guided tour of the Venice State Archives",
          note: "Including documents related to Marco Polo, Veronica Franco, and Giacomo Casanova.",
          speakers: [] },
        { start: "18:00", end: "19:00", type: "reception", venueId: "tbc",
          title: "Wine reception and \u201cVery Special Sneak Preview\u201d",
          speakers: [
            { name: "Peter Robinson", affiliation: "University of Saskatchewan" }
          ] }
      ]
    },

    {
      date: "2026-07-08",
      label: "Day Three",
      area: "\u201cPimp my Project\u201d & La Biennale di Venezia",
      theme: "Individual consultations and the 61st International Art Exhibition, \u201cIn Minor Keys\u201d",
      intro:
        "In the morning, participants discuss their individual research and projects with " +
        "expert teachers from various domains. The afternoon visit to La Biennale di Venezia\u2019s " +
        "International Art Exhibition includes a lecture on Artificial Intelligence and serves as " +
        "a \u201cphoto sampling\u201d opportunity for Day Five.",
      sessions: [
        { start: "09:30", end: "12:00", type: "consultation", venueId: "malcanton",
          title: "Meet the Expert: individual consultation meetings",
          speakers: [ { name: "Franz Fischer", affiliation: "Director, VeDPH" } ] },
        { start: "13:00", end: "14:30", type: "session", venueId: "biennale",
          title: "Horizons of Artificial Intelligence: Promises, Anxiety, and Planetary Climate",
          note: "Discussant: Paolo Berti (Ca\u2019 Foscari).",
          speakers: [
            { name: "Carolina Fern\u00e0ndez-Castrillo", affiliation: "Carlos III University of Madrid" }
          ] },
        { start: "14:30", end: "18:30", type: "visit", venueId: "biennale",
          title: "Visit to the 61st International Art Exhibition, \u201cIn Minor Keys\u201d",
          note: "Including \u201cphoto sampling\u201d for Day Five.",
          speakers: [] }
      ]
    },

    {
      date: "2026-07-09",
      label: "Day Four",
      area: "Area 3 \u00b7 Digital and Public History",
      theme: "Venetian History, Urban Spaces and New Technologies",
      intro:
        "The history of Venice and its urban space, seen through a Digital and Public Humanities " +
        "lens. How can new technologies help us understand the Venetian past, and how can a public " +
        "history approach engage audiences in research and narrative? GIS and mapping connect " +
        "present-day locations to past life. The day mixes outdoor and indoor activities, with time " +
        "to apply generative AI and virtual exhibitions to the history of Venice.",
      sessions: [
        { start: "09:30", end: "11:30", type: "session", venueId: "malcanton",
          title: "Mapping Violence in Early Modern Italy",
          speakers: [
            { name: "Amanda Madden", affiliation: "George Mason University" }
          ] },
        { start: "11:45", end: "13:00", type: "session", venueId: "malcanton",
          title: "Murder in Venice. Generative AI and Historical Sources",
          speakers: [
            { name: "Stefano Dall\u2019Aglio", affiliation: "Ca\u2019 Foscari" }
          ] },
        { start: "14:00", end: "15:15", type: "session", venueId: "malcanton",
          title: "From Sources to Exhibitions: Prototyping Public History Projects with Omeka Classic",
          speakers: [
            { name: "Emmanuela Carb\u00e9", affiliation: "Ca\u2019 Foscari" },
            { name: "Mariangela Giglio", affiliation: "University of Bologna" }
          ] },
        { start: "15:30", end: "18:00", type: "session", venueId: "malcanton",
          title: "Urban Space, Geolocated Apps and Digital Public History: a Practical Demonstration of Hidden Venice",
          speakers: [
            { name: "Fabrizio Nevola", affiliation: "University of Exeter" }
          ] }
      ]
    },

    {
      date: "2026-07-10",
      label: "Day Five",
      area: "Area 4 \u00b7 Digital and Public Art History",
      theme: "Describing Art with AI: Bias and New Narratives",
      intro:
        "A new form of ekphrasis emerging from AI latent spaces: how user-driven descriptions of " +
        "artworks can reveal biases embedded in AI training datasets. Juxtaposing human perception " +
        "with AI-generated interpretations surfaces misconceptions, omissions, and underrepresented " +
        "narratives. Drawing on works from La Biennale di Venezia, the workshop asks how minor or " +
        "situated datasets can disrupt dominant institutional frameworks, and how curatorial, " +
        "economic, or promotional priorities shape algorithmic narratives.",
      sessions: [
        { start: "09:30", end: "10:00", type: "session", venueId: "malcanton",
          title: "Introduction to generative AI and (co-)creative processes",
          speakers: [
            { name: "Irene Russo", affiliation: "ILC-CNR" }
          ] },
        { start: "10:00", end: "10:30", type: "session", venueId: "malcanton",
          title: "Emergent representations in AI latent spaces: an artistic and historical perspective",
          speakers: [
            { name: "Paolo Berti", affiliation: "Ca\u2019 Foscari" }
          ] },
        { start: "10:30", end: "12:00", type: "session", venueId: "malcanton",
          title: "Perception and biases from La Biennale di Venezia. Reading the artworks with generative algorithms",
          speakers: [
            { name: "Stefania De Vincentis", affiliation: "Ca\u2019 Foscari" }
          ] },
        { start: "12:00", end: "13:00", type: "discussion", venueId: "malcanton",
          title: "Discussion and round table",
          speakers: [] },
        { start: "14:00", end: "17:30", type: "session", venueId: "malcanton",
          title: "Awash with images: Collecting institutions in a digital world",
          speakers: [
            { name: "Vince Dziekan", affiliation: "Monash University" },
            { name: "Ross Parry", affiliation: "University of Leicester" }
          ] },
        { start: "18:00", end: "19:00", type: "keynote", venueId: "morelli",
          title: "Museums and Datafication: Renegotiating museums and their digital interfaces",
          note: "Closing keynote.",
          speakers: [
            { name: "Ross Parry", affiliation: "University of Leicester" },
            { name: "Vince Dziekan", affiliation: "Monash University" }
          ] }
      ]
    }
  ]
};
