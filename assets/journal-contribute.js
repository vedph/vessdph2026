/* journal-contribute.js — online journal posting for contribute-journal.html.
   Log in with a personal username/password, write an entry (optionally with a
   photo and a location), and it is posted to the site API and appears on the
   journal immediately. The photo is resized and re-encoded in the browser
   (camera metadata, including GPS, is dropped) before being sent. */
(function () {
  "use strict";
  var ENDPOINT = "https://vssdph-materials.emmavedph.workers.dev";
  var S = window.SCHOOL || {};
  function $(id) { return document.getElementById(id); }

  var creds = null;                  // {username, password}
  var photo = null;                  // {base64, ext, w, h}
  var geo = null;                    // {lat, lng}
  var STORE_KEY = "vss_journal_auth"; // shared with the journal page (browser session)
  function saveAuth(name, role) { try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ username: creds.username, password: creds.password, name: name, role: role })); } catch (e) {} }
  function clearAuth() { try { sessionStorage.removeItem(STORE_KEY); } catch (e) {} }
  function showForm(name) { $("jc-login").hidden = true; $("jc-form").hidden = false; $("jc-signed").textContent = "Signed in as " + name + "."; syncChapter(); }

  /* ---- populate session dropdown from the programme ---- */
  (function fillSessions() {
    var sel = $("jc-session"); if (!sel) return;
    (S.days || []).forEach(function (d) {
      var og = document.createElement("optgroup");
      og.label = d.label + " · " + d.date;
      (d.sessions || []).forEach(function (s) {
        var id = d.date + "-" + String(s.start).replace(":", "");
        var o = document.createElement("option");
        o.value = id; o.textContent = s.start + " — " + s.title;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  })();

  /* ---- chapter → show/hide the related-session field ---- */
  function syncChapter() {
    var ch = ($("jc-chapter") || {}).value;
    var f = $("jc-session-field"); if (f) f.hidden = (ch !== "school");
  }
  var chSel = $("jc-chapter"); if (chSel) chSel.addEventListener("change", syncChapter);

  /* ---- login ---- */
  function login() {
    var u = (($("jc-u") || {}).value || "").trim().toLowerCase();
    var p = (($("jc-p") || {}).value || "");
    var st = $("jc-login-status");
    if (!u || !p) { st.textContent = "Enter your username and password."; st.className = "jc-status err"; return; }
    st.textContent = "Signing in…"; st.className = "jc-status busy";
    fetch(ENDPOINT + "/whoami", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) {
          creds = { username: u, password: p };
          st.textContent = ""; st.className = "jc-status";
          saveAuth(res.j.name, res.j.role);
          showForm(res.j.name);
        } else { st.textContent = (res.j && res.j.error) || "Login failed."; st.className = "jc-status err"; }
      }).catch(function () { st.textContent = "Could not reach the server."; st.className = "jc-status err"; });
  }
  var lb = $("jc-login-btn"); if (lb) lb.addEventListener("click", login);
  var pIn = $("jc-p"); if (pIn) pIn.addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  var lo = $("jc-logout2"); if (lo) lo.addEventListener("click", function () {
    creds = null; clearAuth(); $("jc-form").hidden = true; $("jc-login").hidden = false;
    var s = $("jc-login-status"); if (s) { s.textContent = ""; s.className = "jc-status"; }
  });

  /* ---- photo: resize + re-encode in the browser ---- */
  function handleFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var img = new Image();
    img.onload = function () {
      var max = 1200, w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, max / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      var c = document.createElement("canvas"); c.width = cw; c.height = ch;
      c.getContext("2d").drawImage(img, 0, 0, cw, ch);
      var url = c.toDataURL("image/jpeg", 0.8);
      photo = { base64: url.split(",")[1], ext: "jpg", w: cw, h: ch };
      var pv = $("jc-preview");
      pv.innerHTML = '<img src="' + url + '" alt=""><span class="jc-pinfo">' + cw + '×' + ch +
        ' · ~' + Math.round(photo.base64.length * 3 / 4 / 1024) + ' KB</span>' +
        '<button type="button" class="ed-x" id="jc-drop-x" aria-label="Remove photo">×</button>';
      pv.hidden = false;
      $("jc-consent-wrap").hidden = false;
      $("jc-drop-x").addEventListener("click", clearPhoto);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = function () { var s = $("jc-status"); if (s) { s.textContent = "That image could not be read."; s.className = "jc-status err"; } };
    img.src = URL.createObjectURL(file);
  }
  function clearPhoto() {
    photo = null; var pv = $("jc-preview"); pv.hidden = true; pv.innerHTML = "";
    $("jc-consent-wrap").hidden = true; var cb = $("jc-consent"); if (cb) cb.checked = false;
    var fi = $("jc-file"); if (fi) fi.value = "";
  }
  var drop = $("jc-drop"), fileIn = $("jc-file");
  if (drop && fileIn) {
    drop.addEventListener("click", function () { fileIn.click(); });
    drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileIn.click(); } });
    fileIn.addEventListener("change", function () { if (fileIn.files && fileIn.files[0]) handleFile(fileIn.files[0]); });
    ["dragover", "dragenter"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("drag"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  }

  /* ---- location: pick a point on a map (optional) ---- */
  var leafletLoading = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletLoading) return leafletLoading;
    leafletLoading = new Promise(function (resolve, reject) {
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "assets/leaflet/leaflet.css"; document.head.appendChild(css);
      var js = document.createElement("script"); js.src = "assets/leaflet/leaflet.js"; js.async = true;
      js.onload = function () { resolve(); }; js.onerror = function () { leafletLoading = null; reject(new Error("leaflet")); };
      document.head.appendChild(js);
    });
    return leafletLoading;
  }
  var pickMap = null, pickMarker = null;
  function showCoords() { var o = $("jc-coords"); if (o) o.textContent = geo ? (geo.lat + ", " + geo.lng) : ""; }
  function pinIcon() {
    return L.divIcon({
      className: "jc-pin",
      html: '<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 1C6.8 1 1 6.8 1 14c0 9.6 13 24.4 13 24.4S27 23.6 27 14C27 6.8 21.2 1 14 1z" fill="#b01e28" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="4.5" fill="#fff"/></svg>',
      iconSize: [28, 40], iconAnchor: [14, 39], popupAnchor: [0, -36]
    });
  }
  function setPoint(lat, lng) {
    geo = { lat: +(+lat).toFixed(5), lng: +(+lng).toFixed(5) };
    if (pickMap) {
      if (!pickMarker) {
        pickMarker = L.marker([geo.lat, geo.lng], { draggable: true, icon: pinIcon() }).addTo(pickMap);
        pickMarker.on("dragend", function () { var ll = pickMarker.getLatLng(); geo = { lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5) }; showCoords(); });
      } else pickMarker.setLatLng([geo.lat, geo.lng]);
    }
    showCoords();
  }
  function clearLocation() {
    geo = null;
    if (pickMarker && pickMap) { pickMap.removeLayer(pickMarker); pickMarker = null; }
    showCoords();
  }
  var locToggle = $("jc-loc-toggle");
  if (locToggle) locToggle.addEventListener("click", function () {
    var box = $("jc-loc"); box.hidden = false; locToggle.hidden = true;
    loadLeaflet().then(function () {
      if (pickMap) { setTimeout(function () { pickMap.invalidateSize(); }, 150); return; }
      pickMap = L.map("jc-pickmap", { scrollWheelZoom: false }).setView([45.4372, 12.3346], 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(pickMap);
      pickMap.on("click", function (e) { setPoint(e.latlng.lat, e.latlng.lng); });
      setTimeout(function () { pickMap.invalidateSize(); }, 200);
    }).catch(function () { var o = $("jc-coords"); if (o) o.textContent = "The map could not be loaded."; });
  });
  var geoBtn = $("jc-geo");
  if (geoBtn) geoBtn.addEventListener("click", function () {
    var out = $("jc-coords");
    if (!navigator.geolocation) { if (out) out.textContent = "Location isn't available in this browser."; return; }
    if (out) out.textContent = "Getting your location\u2026";
    navigator.geolocation.getCurrentPosition(function (pos) {
      var la = pos.coords.latitude, ln = pos.coords.longitude;
      if (pickMap) pickMap.setView([la, ln], 15);
      setPoint(la, ln);
    }, function () { if (out) out.textContent = "Could not get your location."; });
  });
  var locClear = $("jc-loc-clear");
  if (locClear) locClear.addEventListener("click", clearLocation);

  /* ---- post ---- */
  function post() {
    if (!creds) return;
    var st = $("jc-status");
    var chapter = $("jc-chapter").value;
    var related = (chapter === "school") ? ($("jc-session").value || "") : "";
    var title = ($("jc-title").value || "").trim();
    var body = ($("jc-note").value || "").trim();
    if (!title && !body && !photo) { st.textContent = "Write a note, or add a photo."; st.className = "jc-status err"; return; }
    if (photo && !($("jc-consent") || {}).checked) { st.textContent = "Please confirm the photo consent box."; st.className = "jc-status err"; return; }

    var payload = {
      username: creds.username, password: creds.password,
      chapter: chapter, related: related, title: title, body: body
    };
    if (photo) { payload.photoBase64 = photo.base64; payload.photoExt = photo.ext; payload.photoW = photo.w; payload.photoH = photo.h; payload.consent = true; }
    if (geo) { payload.lat = geo.lat; payload.lng = geo.lng; }

    var btn = $("jc-post"); btn.disabled = true;
    st.textContent = "Posting…"; st.className = "jc-status busy";
    fetch(ENDPOINT + "/journal", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
      .then(function (res) {
        btn.disabled = false;
        if (res.ok && res.j && res.j.ok) {
          st.innerHTML = 'Posted! <a href="journal.html">See it on the journal →</a>';
          st.className = "jc-status ok";
          $("jc-title").value = ""; $("jc-note").value = ""; clearPhoto(); clearLocation();
        } else { st.textContent = (res.j && res.j.error) || "Could not post. Please try again."; st.className = "jc-status err"; }
      }).catch(function () { btn.disabled = false; st.textContent = "Could not reach the server."; st.className = "jc-status err"; });
  }
  var pb = $("jc-post"); if (pb) pb.addEventListener("click", post);

  /* ---- restore a remembered session (e.g. after posting and coming back) ---- */
  (function restore() {
    try { var s = sessionStorage.getItem(STORE_KEY); if (s) { var a = JSON.parse(s); creds = { username: a.username, password: a.password }; showForm(a.name); } } catch (e) {}
  })();
})();
