/* journal-contribute.js — prepares a clean, reviewable journal submission package
   ENTIRELY in the browser. Nothing is uploaded or published. Images are resized and
   re-encoded on a canvas (which strips EXIF, including any GPS), a thumbnail is made,
   and everything is bundled into a .zip (dependency-free) for the organiser to review.
   Coordinates are saved only when the contributor explicitly chooses a place. */
(function(){
  "use strict";
  var S = window.SCHOOL || {};
  function $(id){ return document.getElementById(id); }
  function el(t){ return document.createElement(t); }
  function pad(n){ return (n < 10 ? "0" : "") + n; }

  /* ---------- slug / id / paths ---------- */
  function slugify(s){
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "note";
  }
  function offsetStr(d){
    var o = -d.getTimezoneOffset(), s = o >= 0 ? "+" : "-"; o = Math.abs(o);
    return s + pad(Math.floor(o / 60)) + ":" + pad(o % 60);
  }
  function parseLocal(v){  // datetime-local "2026-07-09T18:30"
    var m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if(!m) return null;
    var d = new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5]);
    return { date: m[1]+"-"+m[2]+"-"+m[3], hhmm: m[4]+m[5],
             iso: m[1]+"-"+m[2]+"-"+m[3]+"T"+m[4]+":"+m[5]+":00"+offsetStr(d) };
  }

  /* ---------- image processing (canvas re-encode strips EXIF) ---------- */
  function drawScaled(img, max){
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, m = Math.max(w, h);
    if(m > max){ var s = max / m; w = Math.round(w*s); h = Math.round(h*s); }
    var cv = el("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    return { canvas: cv, w: w, h: h };
  }
  function blobOf(canvas, q){ return new Promise(function(res, rej){
    canvas.toBlob(function(b){ b ? res(b) : rej(new Error("encode failed")); }, "image/jpeg", q); }); }
  function processImage(file){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.onload = function(){
        var full = drawScaled(img, 1600), thumb = drawScaled(img, 480);
        try { URL.revokeObjectURL(img.src); } catch(e){}
        Promise.all([blobOf(full.canvas, 0.85), blobOf(thumb.canvas, 0.82)])
          .then(function(b){ resolve({ full: b[0], thumb: b[1], w: full.w, h: full.h }); })
          .catch(reject);
      };
      img.onerror = function(){ try { URL.revokeObjectURL(img.src); } catch(e){} reject(new Error("Could not read this image.")); };
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- dependency-free ZIP (STORE, no compression) ---------- */
  var CRC = (function(){ var t = [], c; for(var n=0;n<256;n++){ c=n;
    for(var k=0;k<8;k++) c = (c&1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); t[n]=c>>>0; } return t; })();
  function crc32(b){ var c = 0xFFFFFFFF; for(var i=0;i<b.length;i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; }
  function zipStore(files){  // [{name, bytes:Uint8Array}]
    var enc = new TextEncoder(), chunks = [], central = [], offset = 0;
    var u16 = function(n){ return [n&0xFF, (n>>>8)&0xFF]; };
    var u32 = function(n){ return [n&0xFF, (n>>>8)&0xFF, (n>>>16)&0xFF, (n>>>24)&0xFF]; };
    files.forEach(function(f){
      var name = enc.encode(f.name), data = f.bytes, crc = crc32(data), sz = data.length;
      var lfh = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(sz), u32(sz), u16(name.length), u16(0));
      chunks.push(new Uint8Array(lfh), name, data);
      var cdr = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(sz), u32(sz), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
      central.push({ head: new Uint8Array(cdr), name: name });
      offset += lfh.length + name.length + sz;
    });
    var cdStart = offset, cdSize = 0;
    central.forEach(function(c){ chunks.push(c.head, c.name); cdSize += c.head.length + c.name.length; });
    chunks.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0),
      u16(files.length), u16(files.length), u32(cdSize), u32(cdStart), u16(0))));
    return new Blob(chunks, { type: "application/zip" });
  }
  function blobBytes(blob){ return blob.arrayBuffer().then(function(ab){ return new Uint8Array(ab); }); }

  /* ---------- form state ---------- */
  var processed = null;  // { full, thumb, w, h }
  var chosen = { lat: null, lng: null };

  function setStatus(msg, cls){ var s = $("jc-status"); if(!s) return;
    s.textContent = msg; s.className = "jc-status" + (cls ? " " + cls : ""); }

  /* session select */
  (function(){
    var sel = $("jc-session"); if(!sel) return;
    var html = '<option value="">— none —</option>';
    (S.days||[]).forEach(function(d){
      html += '<optgroup label="' + (d.label + " · " + d.date).replace(/"/g,"&quot;") + '">';
      (d.sessions||[]).forEach(function(s){
        var id = d.date + "-" + s.start.replace(":","");
        html += '<option value="' + id + '">' + (s.start + " — " + s.title).replace(/[<>&]/g,"") + '</option>';
      });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
  })();

  /* place select (known venues with coordinates) */
  (function(){
    var sel = $("jc-place"); if(!sel) return;
    var opts = '<option value="">No location</option><optgroup label="Known places">';
    Object.keys(S.venues||{}).forEach(function(id){
      var v = S.venues[id]; if(v.lat == null) return;
      opts += '<option value="' + v.lat + "," + v.lng + '">' + String(v.name).replace(/[<>&]/g,"") + '</option>';
    });
    opts += '</optgroup><option value="__map__">Choose a point on the map…</option>';
    sel.innerHTML = opts;
    sel.addEventListener("change", onPlaceChange);
  })();

  function showCoords(){
    var c = $("jc-coords");
    if(c) c.textContent = (chosen.lat != null)
      ? "Location set: " + chosen.lat.toFixed(5) + ", " + chosen.lng.toFixed(5)
      : "";
  }
  function onPlaceChange(){
    var v = $("jc-place").value, pick = $("jc-pickwrap");
    if(v === "__map__"){ if(pick) pick.hidden = false; loadPicker(); return; }
    if(pick) pick.hidden = true;
    if(v){ var p = v.split(",").map(Number); chosen.lat = p[0]; chosen.lng = p[1]; }
    else { chosen.lat = chosen.lng = null; }
    showCoords();
  }

  /* manual map picker (Leaflet, vendored, loaded on demand) */
  var leafletLoading = null, pickMarker = null;
  function loadLeaflet(){
    if(window.L) return Promise.resolve();
    if(leafletLoading) return leafletLoading;
    leafletLoading = new Promise(function(resolve, reject){
      var css = el("link"); css.rel = "stylesheet"; css.href = "assets/leaflet/leaflet.css"; document.head.appendChild(css);
      var js = el("script"); js.src = "assets/leaflet/leaflet.js"; js.async = true;
      js.onload = function(){ resolve(); }; js.onerror = function(){ leafletLoading = null; reject(new Error("leaflet")); };
      document.head.appendChild(js);
    });
    return leafletLoading;
  }
  var pickerBuilt = false;
  function loadPicker(){
    if(pickerBuilt){ return; }
    if(!navigator.onLine){ var c = $("jc-coords"); if(c) c.textContent = "The map needs an internet connection. You can still submit without a location."; return; }
    loadLeaflet().then(function(){
      var wrap = $("jc-pickmap"); if(!wrap || !window.L) return;
      pickerBuilt = true;
      var map = L.map(wrap, { scrollWheelZoom:false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom:19, subdomains:"abcd",
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(map);
      map.setView([45.4350, 12.3300], 14);
      map.on("click", function(ev){
        chosen.lat = ev.latlng.lat; chosen.lng = ev.latlng.lng;
        if(pickMarker) pickMarker.setLatLng(ev.latlng);
        else pickMarker = L.circleMarker(ev.latlng, { radius:9, color:"#b01e28", weight:2, fillColor:"#b01e28", fillOpacity:.82 }).addTo(map);
        showCoords();
      });
      setTimeout(function(){ map.invalidateSize(); }, 200);
    }).catch(function(){ var c = $("jc-coords"); if(c) c.textContent = "The map could not be loaded. You can still submit without a location."; });
  }

  /* ---------- file input / drag-drop / preview ---------- */
  function handleFile(file){
    if(!/^image\//.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)){
      setStatus("Please choose an image (JPG, PNG or WebP).", "err"); return;
    }
    setStatus("Processing image…", "busy");
    processImage(file).then(function(p){
      processed = p;
      var prev = $("jc-preview");
      if(prev){
        var url = URL.createObjectURL(p.thumb);
        prev.innerHTML = '<img src="' + url + '" alt="preview">' +
          '<span class="jc-pinfo">' + p.w + "×" + p.h + " · ~" + Math.max(1, Math.round(p.full.size/1024)) + " KB</span>" +
          '<button type="button" class="ed-x" id="jc-rm" aria-label="Remove image">\u00d7</button>';
        prev.hidden = false;
        var rm = $("jc-rm"); if(rm) rm.addEventListener("click", clearImage);
      }
      // auto-tick the "photo" tag
      var photoTag = document.querySelector('.jc-tag[value="photo"]'); if(photoTag) photoTag.checked = true;
      setStatus("Image ready. Metadata removed; resized to 1600 px with a 480 px thumbnail.", "ok");
    }).catch(function(e){ setStatus(e.message || "Could not process the image.", "err"); });
  }
  function clearImage(){
    processed = null;
    var prev = $("jc-preview"); if(prev){ prev.innerHTML = ""; prev.hidden = true; }
    var fi = $("jc-file"); if(fi) fi.value = "";
    setStatus("", "");
  }
  (function(){
    var drop = $("jc-drop"), fi = $("jc-file");
    if(!drop || !fi) return;
    drop.addEventListener("click", function(){ fi.click(); });
    drop.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); fi.click(); } });
    fi.addEventListener("change", function(){ if(fi.files && fi.files[0]) handleFile(fi.files[0]); });
    ["dragenter","dragover"].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add("drag"); }); });
    ["dragleave","drop"].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove("drag"); }); });
    drop.addEventListener("drop", function(e){ if(e.dataTransfer && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  })();

  /* default datetime = now (local) */
  (function(){
    var dt = $("jc-datetime"); if(!dt || dt.value) return;
    var n = new Date();
    dt.value = n.getFullYear() + "-" + pad(n.getMonth()+1) + "-" + pad(n.getDate()) + "T" + pad(n.getHours()) + ":" + pad(n.getMinutes());
  })();

  /* ---------- build the entry + package ---------- */
  function getTags(){
    return Array.prototype.slice.call(document.querySelectorAll(".jc-tag:checked")).map(function(c){ return c.value; });
  }
  function buildEntry(){
    var title = ($("jc-title").value || "").trim();
    var when = parseLocal(($("jc-datetime").value || "").trim());
    if(!title){ setStatus("Please add a title.", "err"); return null; }
    if(!when){ setStatus("Please set a valid date and time.", "err"); return null; }

    var role = $("jc-role").value || "participant";
    var anon = $("jc-anon").checked;
    var nameField = ($("jc-author").value || "").trim();
    var roleLabel = { participant:"Summer School participant", faculty:"Summer School faculty", organiser:"Organiser" }[role] || "Summer School participant";
    var authorDisplay = anon ? roleLabel : (nameField || roleLabel);

    var id = when.date + "-" + when.hhmm + "-" + slugify(title);
    var entry = {
      id: id,
      datetime: when.iso,
      title: title,
      caption: ($("jc-caption").value || "").trim(),
      body: ($("jc-note").value || "").trim(),
      authorDisplay: authorDisplay,
      attribution: anon ? "anonymous" : "named",
      role: role,
      tags: getTags(),
      relatedSession: $("jc-session").value || null,
      status: "approved"
    };
    if(!entry.body) delete entry.body;
    if(chosen.lat != null){ entry.lat = +chosen.lat.toFixed(6); entry.lng = +chosen.lng.toFixed(6); }
    if(processed){
      entry.image = "assets/journal/photos/" + when.date + "/" + id + ".jpg";
      entry.thumb = "assets/journal/thumbs/" + when.date + "/" + id + ".jpg";
    }
    return { entry: entry, when: when, id: id };
  }

  function readme(entry, id){
    return [
"Venice Summer School in Digital and Public Humanities — Journal contribution package",
"====================================================================================",
"",
"Entry id : " + id,
"Prepared : " + new Date().toISOString(),
"",
"TO PUBLISH THIS ENTRY (organiser only, after reviewing content and consent):",
"",
"1. Check the image(s) and text below for content and for consent of anyone recognisable.",
entry.image
  ? "2. Copy the two image files in this package into the repository, keeping their paths:\n" +
    "     " + entry.image + "\n" +
    "     " + entry.thumb
  : "2. (This entry has no photo — nothing to copy.)",
"3. Open data/journal.js and paste the object from entry.json into the",
"   window.JOURNAL = [ ... ] array.",
"4. Commit and push. The entry then appears on journal.html.",
"",
"Only reviewed and approved entries should be added. Do NOT commit unreviewed media",
"to the public repository.",
"",
"entry.json",
"----------",
JSON.stringify(entry, null, 2),
""
    ].join("\n");
  }

  function dl(blob, name){
    var url = URL.createObjectURL(blob), a = el("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  }
  function separateDownloads(entry, id){
    dl(new Blob([JSON.stringify(entry, null, 2) + "\n"], { type:"application/json" }), id + ".json");
    if(processed){ dl(processed.full, id + ".jpg"); dl(processed.thumb, id + ".thumb.jpg"); }
    setStatus("Downloaded the files separately (zip unavailable). Send them to the organisers.", "ok");
  }

  function build(){
    var r = buildEntry(); if(!r) return;
    var entry = r.entry, id = r.id, enc = new TextEncoder();
    var files = [
      { name: "entry.json", bytes: enc.encode(JSON.stringify(entry, null, 2) + "\n") },
      { name: "README.txt", bytes: enc.encode(readme(entry, id)) }
    ];
    var imgWork = Promise.resolve();
    if(processed){
      imgWork = Promise.all([blobBytes(processed.full), blobBytes(processed.thumb)]).then(function(b){
        files.push({ name: entry.image, bytes: b[0] });
        files.push({ name: entry.thumb, bytes: b[1] });
      });
    }
    setStatus("Building package…", "busy");
    imgWork.then(function(){
      try {
        var zip = zipStore(files);
        dl(zip, id + ".zip");
        setStatus("Package ready: " + id + ".zip downloaded. It will be reviewed before publication.", "ok");
      } catch(e){
        separateDownloads(entry, id);
      }
    }).catch(function(){ separateDownloads(entry, id); });
  }

  /* contribution type → auto-check the matching tag (a photo stays optional for every type) */
  (function(){
    var sel = $("jc-type"); if(!sel) return;
    sel.addEventListener("change", function(){
      var tag = ({ photo:"photo", reflection:"reflection", resource:"resource" })[sel.value];
      if(tag){
        var cb = document.querySelector('.jc-tag[value="' + tag + '"]');
        if(cb && !cb.checked) cb.checked = true;
      }
    });
  })();

  var btn = $("jc-build"); if(btn) btn.addEventListener("click", build);
})();
