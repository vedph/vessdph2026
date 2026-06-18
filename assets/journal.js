/* journal.js — dynamic Journal page for journal.html.
   Loads posts from the site API (Cloudflare Worker), groups them into the five
   travel-diary chapters, and lets a logged-in author (or an admin) remove their
   entries. The "At the Summer school" chapter is structured from the programme
   in data/program.js: posts attached to a session appear under that session.
   Photos are served by the Worker from D1. Leaflet (vendored) loads on demand
   for geolocated entries. */
(function () {
  "use strict";
  var ENDPOINT = "https://vssdph-materials.emmavedph.workers.dev";
  var S = window.SCHOOL || {};
  function $(id) { return document.getElementById(id); }
  function el(t) { return document.createElement(t); }
  function esc(x) {
    return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var CHAPTERS = [
    { key: "before", label: "Before" },
    { key: "onway",  label: "On our way" },
    { key: "school", label: "At the Summer school" },
    { key: "home",   label: "Heading home" },
    { key: "after",  label: "Afterwards" }
  ];

  // programme sessions in chronological order, with labels (school timeline scaffold)
  var SESS = (function () {
    var idx = {}, order = [];
    (S.days || []).forEach(function (d) {
      (d.sessions || []).forEach(function (s) {
        var id = d.date + "-" + String(s.start).replace(":", "");
        idx[id] = { id: id, dayLabel: d.label, start: s.start, title: s.title };
        order.push(id);
      });
    });
    return { idx: idx, order: order };
  })();

  // login kept only in memory
  var me = null, creds = null, posts = [];

  function roleClass(r) { return r === "admin" ? "jr-role-organiser" : r === "teacher" ? "jr-role-faculty" : ""; }
  function roleLabel(r) { return r === "admin" ? "Organiser" : r === "teacher" ? "Teacher" : "Participant"; }
  function fmtWhen(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " +
             d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }
  function canRemove(p) { return !!(me && (me.role === "admin" || me.username === p.authorUsername)); }

  function postHtml(p) {
    var h = '<article class="jr-entry" id="jr-' + esc(p.id) + '" data-id="' + esc(p.id) + '">';
    h += '<div class="jr-meta"><span class="jr-time">' + esc(fmtWhen(p.createdAt)) + '</span>';
    h += '<span class="jr-role ' + roleClass(p.role) + '">' + esc(roleLabel(p.role)) + '</span>';
    h += '<span class="jr-who">' + esc(p.author) + '</span>';
    if (canRemove(p)) h += '<button type="button" class="jr-remove" data-id="' + esc(p.id) + '">Remove</button>';
    h += '</div>';
    if (p.title) h += '<h3 class="jr-title">' + esc(p.title) + '</h3>';
    if (p.photo) h += '<span class="jr-photo"><img loading="lazy" src="' + ENDPOINT + '/' + esc(p.photo.path) +
      '" alt="' + esc(p.title || "Journal photograph") + '"></span>';
    if (p.body) h += '<p class="jr-body">' + esc(p.body).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>") + '</p>';
    return h + '</article>';
  }

  function renderSchool(list) {
    var bySess = {}, other = [];
    list.forEach(function (p) {
      if (p.related && SESS.idx[p.related]) (bySess[p.related] = bySess[p.related] || []).push(p);
      else other.push(p);
    });
    var html = "";
    SESS.order.forEach(function (sid) {
      var ps = bySess[sid]; if (!ps || !ps.length) return;
      var s = SESS.idx[sid];
      html += '<div class="jr-moment"><p class="jr-moment-h"><span class="jr-moment-time">' +
        esc(s.dayLabel + " · " + s.start) + '</span> ' + esc(s.title) + '</p>';
      ps.forEach(function (p) { html += postHtml(p); });
      html += '</div>';
    });
    if (other.length) {
      html += '<div class="jr-moment"><p class="jr-moment-h"><span class="jr-moment-time">Around the week</span></p>';
      other.forEach(function (p) { html += postHtml(p); });
      html += '</div>';
    }
    return html;
  }

  function render() {
    var root = $("journal-timeline"); if (!root) return;
    if (!posts.length) {
      root.innerHTML = '<p class="jr-empty">The journal is empty so far. Taking part in the Summer School? ' +
        '<a href="contribute-journal.html">Add the first entry &rarr;</a></p>';
      return;
    }
    var byChapter = {};
    posts.forEach(function (p) { (byChapter[p.chapter] = byChapter[p.chapter] || []).push(p); });
    var html = "";
    CHAPTERS.forEach(function (ch) {
      var list = byChapter[ch.key]; if (!list || !list.length) return;
      html += '<section class="jr-chapter"><h2 class="jr-chapter-h">' + esc(ch.label) + '</h2>';
      html += (ch.key === "school") ? renderSchool(list) : list.map(postHtml).join("");
      html += '</section>';
    });
    root.innerHTML = html;
    wireRemove();
  }

  function wireRemove() {
    Array.prototype.forEach.call(document.querySelectorAll(".jr-remove"), function (btn) {
      btn.addEventListener("click", function () {
        if (!creds || !window.confirm("Remove this entry? This cannot be undone.")) return;
        var id = btn.dataset.id; btn.disabled = true;
        fetch(ENDPOINT + "/journal/remove", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: creds.username, password: creds.password, id: id })
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
          .then(function (res) {
            if (res.ok && res.j && res.j.ok) { posts = posts.filter(function (p) { return p.id !== id; }); render(); drawMap(); }
            else { btn.disabled = false; window.alert((res.j && res.j.error) || "Could not remove this entry."); }
          }).catch(function () { btn.disabled = false; window.alert("Could not reach the server."); });
      });
    });
  }

  /* ----- login bar (manage your entries) ----- */
  function renderLogin() {
    var box = $("jr-login"); if (!box) return;
    if (me) {
      box.innerHTML = 'Signed in as <b>' + esc(me.name) + '</b>' +
        (me.role === "admin" ? ' \u2014 organiser; you can remove any entry. ' : ' \u2014 you can remove your own entries. ') +
        '<button type="button" id="jr-logout" class="jr-linkbtn">Sign out</button>';
      $("jr-logout").addEventListener("click", function () { me = null; creds = null; renderLogin(); render(); drawMap(); });
      return;
    }
    box.innerHTML =
      '<button type="button" id="jr-show-login" class="jr-linkbtn">Log in to manage your entries</button>' +
      '<span id="jr-login-form" hidden> ' +
        '<input id="jr-u" placeholder="username" autocomplete="username" autocapitalize="off" spellcheck="false"> ' +
        '<input id="jr-p" type="password" placeholder="password" autocomplete="current-password"> ' +
        '<button type="button" id="jr-do-login" class="jr-linkbtn solid">Log in</button> ' +
        '<span id="jr-login-msg" class="jr-login-msg"></span>' +
      '</span>';
    $("jr-show-login").addEventListener("click", function () {
      $("jr-login-form").hidden = false; $("jr-show-login").hidden = true; $("jr-u").focus();
    });
    $("jr-do-login").addEventListener("click", doLogin);
    $("jr-p").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  }
  function doLogin() {
    var u = ($("jr-u").value || "").trim().toLowerCase(), p = $("jr-p").value || "", msg = $("jr-login-msg");
    if (!u || !p) { msg.textContent = "Enter username and password."; return; }
    msg.textContent = "\u2026";
    fetch(ENDPOINT + "/whoami", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) {
          me = { username: res.j.username, role: res.j.role, name: res.j.name };
          creds = { username: u, password: p };
          renderLogin(); render(); drawMap();
        } else { msg.textContent = (res.j && res.j.error) || "Login failed."; }
      }).catch(function () { msg.textContent = "Could not reach the server."; });
  }

  /* ----- map (geolocated entries; Leaflet vendored, loads on demand) ----- */
  var leafletLoading = null, theMap = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletLoading) return leafletLoading;
    leafletLoading = new Promise(function (resolve, reject) {
      var css = el("link"); css.rel = "stylesheet"; css.href = "assets/leaflet/leaflet.css"; document.head.appendChild(css);
      var js = el("script"); js.src = "assets/leaflet/leaflet.js"; js.async = true;
      js.onload = function () { resolve(); }; js.onerror = function () { leafletLoading = null; reject(new Error("leaflet")); };
      document.head.appendChild(js);
    });
    return leafletLoading;
  }
  function drawMap() {
    var geo = posts.filter(function (p) { return p.lat != null && p.lng != null; });
    var note = $("jr-cartonote"), empty = $("jr-map-empty"), wrap = $("jr-mapwrap");
    if (!geo.length) { if (note) note.hidden = true; if (empty) empty.hidden = false; if (wrap) wrap.hidden = true; return; }
    if (empty) empty.hidden = true; if (note) note.hidden = false;
    if (!navigator.onLine) { if (note) note.textContent = "The Journal map needs an internet connection."; return; }
    loadLeaflet().then(function () {
      if (wrap) wrap.hidden = false;
      var host = $("jr-map"); if (!host || !window.L) return;
      if (theMap) { theMap.remove(); theMap = null; host.innerHTML = ""; }
      theMap = L.map(host, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(theMap);
      var RED = "#b01e28", coords = [];
      geo.forEach(function (p) {
        coords.push([p.lat, p.lng]);
        var hasImg = !!p.photo;
        var m = L.circleMarker([p.lat, p.lng], { radius: hasImg ? 9 : 7, color: RED, weight: 2,
          fillColor: hasImg ? RED : "#fff", fillOpacity: hasImg ? .82 : 1 }).addTo(theMap);
        var html = '<div class="jr-pop">' +
          (p.photo ? '<img src="' + ENDPOINT + '/' + esc(p.photo.path) + '" alt="">' : '') +
          (p.title ? '<b>' + esc(p.title) + '</b>' : '') +
          (p.body ? '<span>' + esc(p.body.slice(0, 140)) + '</span>' : '') +
          '<time>' + esc(fmtWhen(p.createdAt)) + '</time>' +
          '<span class="jr-pop-who">' + esc(p.author) + '</span>' +
          '<a class="jr-pop-link" href="#jr-' + esc(p.id) + '">View in timeline \u2192</a></div>';
        m.bindPopup(html, { maxWidth: 220 });
      });
      if (coords.length) theMap.fitBounds(coords, { padding: [40, 40], maxZoom: 15 });
      setTimeout(function () { theMap.invalidateSize(); }, 200);
    }).catch(function () { if (note) note.textContent = "The map could not be loaded; the entries above remain available."; });
  }

  /* ----- load ----- */
  renderLogin();
  fetch(ENDPOINT + "/journal").then(function (r) { return r.json(); })
    .then(function (j) { posts = (j && j.posts) || []; render(); drawMap(); })
    .catch(function () {
      var root = $("journal-timeline");
      if (root) root.innerHTML = '<p class="jr-empty">Could not load the journal right now. Please try again in a moment.</p>';
    });
})();
