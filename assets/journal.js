/* journal.js (page logic for journal.html) — standalone, does not load app.js.
   Renders the curated timeline of approved entries from window.JOURNAL and wires
   a privacy-aware Journal map (Leaflet, vendored) that loads its tiles when the map initialises. */
(function(){
  "use strict";
  var S = window.SCHOOL || {};
  var J = (window.JOURNAL || []).filter(function(e){ return e && e.status === "approved"; });
  // newest first
  J.sort(function(a,b){ return String(b.datetime||"").localeCompare(String(a.datetime||"")); });

  function esc(x){ return String(x==null?"":x).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function $(id){ return document.getElementById(id); }
  function el(t){ return document.createElement(t); }

  var ROLE = { participant:"Participant", faculty:"Teacher", organiser:"Organiser" };
  function roleLabel(r){ return ROLE[r] || (r ? r.charAt(0).toUpperCase()+r.slice(1) : ""); }

  function sessionTitle(id){
    var found = "";
    (S.days||[]).forEach(function(d){ (d.sessions||[]).forEach(function(s){
      if(d.date + "-" + s.start.replace(":","") === id) found = s.title; }); });
    return found;
  }
  function dateHeading(ymd){
    var dt = new Date(ymd + "T12:00:00");
    return isNaN(dt) ? ymd : dt.toLocaleDateString("en-GB",
      { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  }
  function timeOf(iso){
    var m = String(iso||"").match(/T(\d{2}:\d{2})/);
    return m ? m[1] : "";
  }

  function entryCard(e){
    var photo = "";
    if(e.thumb || e.image){
      var full = e.image || e.thumb, th = e.thumb || e.image;
      photo = '<a class="jr-photo" href="' + esc(full) + '" target="_blank" rel="noopener">' +
              '<img src="' + esc(th) + '" alt="' + esc(e.caption || e.title || "") + '" loading="lazy"></a>';
    }
    var tags = (e.tags||[]).map(function(t){ return '<span class="jr-tag">' + esc(t) + '</span>'; }).join("");
    var rel = "";
    if(e.relatedSession){
      var st = sessionTitle(e.relatedSession);
      if(st) rel = '<a class="jr-rel" href="session.html?s=' + esc(e.relatedSession) + '">' + esc(st) + ' \u2192</a>';
    }
    var who = e.authorDisplay || (e.attribution === "anonymous" ? "Anonymous" : "");
    var foot = (tags || rel) ? '<div class="jr-foot">' + tags + rel + '</div>' : "";
    return '<article class="jr-entry" id="jr-' + esc(e.id||"") + '">' +
      '<div class="jr-meta">' +
        (timeOf(e.datetime) ? '<time class="jr-time">' + esc(timeOf(e.datetime)) + '</time>' : '') +
        '<span class="jr-role jr-role-' + esc(e.role||"") + '">' + esc(roleLabel(e.role)) + '</span>' +
        (who ? '<span class="jr-who">' + esc(who) + '</span>' : '') +
      '</div>' +
      (e.title ? '<h3 class="jr-title">' + esc(e.title) + '</h3>' : '') +
      photo +
      (e.caption ? '<p class="jr-cap">' + esc(e.caption) + '</p>' : '') +
      (e.body ? '<p class="jr-body">' + esc(e.body) + '</p>' : '') +
      foot +
    '</article>';
  }

  function renderTimeline(){
    var host = $("journal-timeline"); if(!host) return;
    if(!J.length){
      host.innerHTML = '<p class="jr-empty">The journal is empty for now. During and after the school, ' +
        'reflections, field notes and photographs from participants and faculty will gather here. ' +
        '<a href="contribute-journal.html">Contribute to the journal \u2192</a></p>';
      return;
    }
    var groups = {}, order = [];
    J.forEach(function(e){ var d = String(e.datetime||"").slice(0,10) || "undated";
      if(!groups[d]){ groups[d] = []; order.push(d); } groups[d].push(e); });
    var html = "";
    order.forEach(function(d){
      html += '<section class="jr-day"><h2 class="jr-date">' + esc(d === "undated" ? "Undated" : dateHeading(d)) + '</h2>';
      groups[d].forEach(function(e){ html += entryCard(e); });
      html += '</section>';
    });
    host.innerHTML = html;
  }

  /* ---------- journal map (opens automatically; tiles load with the map) ---------- */
  var leafletLoading = null;
  function loadLeaflet(){
    if(window.L) return Promise.resolve();
    if(leafletLoading) return leafletLoading;
    leafletLoading = new Promise(function(resolve, reject){
      var css = el("link"); css.rel = "stylesheet"; css.href = "assets/leaflet/leaflet.css";
      document.head.appendChild(css);
      var js = el("script"); js.src = "assets/leaflet/leaflet.js"; js.async = true;
      js.onload = function(){ resolve(); };
      js.onerror = function(){ leafletLoading = null; reject(new Error("leaflet")); };
      document.head.appendChild(js);
    });
    return leafletLoading;
  }

  function whenLabel(e){
    var d = String(e.datetime||"").slice(0,10), t = timeOf(e.datetime);
    var ds = d ? dateHeading(d) : "";
    return ds + (t ? (ds ? ", " : "") + t : "");
  }
  function buildJournalMap(pts){
    var wrap = $("jr-map"); if(!wrap || !window.L) return;
    var map = L.map(wrap, { scrollWheelZoom:false, attributionControl:true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom:19, subdomains:"abcd",
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    var RED = "#b01e28", coords = [];
    pts.forEach(function(e){
      coords.push([e.lat, e.lng]);
      var hasImg = !!(e.thumb || e.image);
      // photo markers are filled; text-note markers are hollow, so the two read differently
      var m = L.circleMarker([e.lat, e.lng], { radius: hasImg ? 9 : 7, color:RED, weight:2,
        fillColor: hasImg ? RED : "#fff", fillOpacity: hasImg ? .82 : 1 }).addTo(map);
      var th = e.thumb || e.image, txt = e.caption || e.body || "";
      var who = e.authorDisplay || (e.attribution === "anonymous" ? "Anonymous" : "");
      var when = whenLabel(e);
      var link = e.id ? '<a class="jr-pop-link" href="#jr-' + esc(e.id) + '">View in timeline \u2192</a>' : '';
      var html = '<div class="jr-pop">' +
        (th ? '<img src="' + esc(th) + '" alt="">' : '') +
        (e.title ? '<b>' + esc(e.title) + '</b>' : '') +
        (txt ? '<span>' + esc(txt) + '</span>' : '') +
        (when ? '<time>' + esc(when) + '</time>' : '') +
        (who ? '<span class="jr-pop-who">' + esc(who) + '</span>' : '') +
        link + '</div>';
      m.bindPopup(html, { maxWidth:220 });
    });
    if(coords.length) map.fitBounds(coords, { padding:[40,40], maxZoom:15 });
    setTimeout(function(){ map.invalidateSize(); }, 200);
  }

  function wireJournalMap(){
    var section = $("jr-map-section"); if(!section) return;   // the section is always shown
    var pts = J.filter(function(e){ return e.lat != null && e.lng != null; });
    var note = $("jr-cartonote"), empty = $("jr-map-empty"), wrap = $("jr-mapwrap");
    if(!pts.length){
      // no geolocated entries yet → keep the section, show the empty state
      if(note) note.hidden = true;
      if(empty) empty.hidden = false;
      return;
    }
    if(empty) empty.hidden = true;
    if(!navigator.onLine){
      if(note) note.textContent = "The Journal map needs an internet connection. The entries above are available offline.";
      return;
    }
    // opens automatically on load, like the venue and community maps
    loadLeaflet().then(function(){
      if(wrap) wrap.hidden = false;
      buildJournalMap(pts);
    }).catch(function(){
      if(note) note.textContent = "The map could not be loaded. The entries above remain available.";
    });
  }

  renderTimeline();
  wireJournalMap();
})();
