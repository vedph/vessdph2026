/* gallery.js — photograph sets shown on gallery.html.

   To publish a set: put the photographs in the folder given by `dir`, named with the
   `prefix` followed by a number and the `ext` extension (biennale-1.jpg, biennale-2.jpg, …),
   then set `count` to how many there are. Nothing else needs changing: a missing file is
   simply skipped, so an approximate count does no harm.

   `captions` is optional. Where a caption is given for a number, it is used both as the
   caption under the photograph and as its alternative text; where it is missing, a neutral
   alternative text is generated. Written descriptions are always better than generated ones.

   Credit lines must be reproduced exactly as agreed with the rights holder. */

window.GALLERY = {
  sets: [
    {
      id: "biennale",
      title: "Biennale Sessions",
      subtitle: "61. Esposizione Internazionale d\u2019Arte della Biennale di Venezia",
      note: "The school\u2019s Biennale Sessions seminar, held on 8 July 2026 in Sala F of the Padiglione " +
            "Centrale at the Giardini: \u00abHorizons of Artificial Intelligence: Promises, Anxiety, and " +
            "Planetary Climate\u00bb, with Carolina Fern\u00e0ndez-Castrillo (Carlos III University of Madrid) " +
            "and discussant Paolo Berti (Ca\u2019 Foscari). The photographs follow the seminar in sequence.",
      credit: "Courtesy La Biennale di Venezia, foto di Luca Chiandoni",
      dir: "photos/biennale/",
      prefix: "biennale-",
      ext: ".jpg",
      count: 41,
      captions: {}
    }
  ]
};
