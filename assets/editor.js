/* editor.js — faculty materials form for contribute.html.
   Standalone (does NOT load app.js). Reads window.SCHOOL for the session list and
   fixed facts. When a session already has a published content/<id>.json, the form
   PRELOADS it so the faculty member edits a *proposed revision* rather than a blank
   form: abstract, bio note, structured resources and bibliography, and existing files
   (Keep / Replace / Remove). The output is a revision package (see envelope() below)
   that the organiser reviews and merges; nothing is published directly from here.

   SUBMIT_ENDPOINT is the PUBLIC URL of the deployed serverless function (NOT a secret).
   Leave it empty until the function is deployed: while empty, the online-submission UI
   stays hidden and the page is a download-only package builder. No password or token is
   ever stored here — the password is sent only on submit and verified server-side. */
(function(){
  "use strict";

  /* ---- configure after deploying the function (public URL, not secret) ---- */
  var SUBMIT_ENDPOINT = "https://vssdph-materials.emmavedph.workers.dev";  // deployed Cloudflare Worker (public URL, not a secret)

  var ALLOWED = ["pdf","md","txt","jpg","jpeg","png","webp"];
  var IMG_EXT = ["jpg","jpeg","png","webp"];
  var MAX_BYTES = 10 * 1024 * 1024;  // 10 MB per file (mirrors the server limit)
  var MAX_FILES = 12;
  var MAX_DIM = 1600;                // longest image side, px

  var S = window.SCHOOL || {};
  function esc(x){ return String(x==null?"":x).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function $(id){ return document.getElementById(id); }
  function slugOf(date,start){ return date + "-" + start.replace(":",""); }
  function baseName(p){ return String(p||"").split(/[\\/]/).pop(); }
  function safeName(name){
    return String(name||"file").split(/[\\/]/).pop()
      .replace(/[^A-Za-z0-9._-]/g,"_").replace(/_{2,}/g,"_").replace(/^\.+/,"").slice(0,80) || "file";
  }

  function repoBase(){
    if(S.meta && S.meta.repo) return String(S.meta.repo).replace(/\/+$/,"");
    try { var u = new URL(S.meta.url);
      return "https://github.com/" + u.hostname.split(".")[0] + "/" + u.pathname.replace(/\//g,""); }
    catch(e){ return ""; }
  }
  var TEMPLATE = JSON.stringify(
    { abstract:"", bioNote:"", resources:[{ label:"", href:"" }],
      bibliography:[{ citation:"", doi:"", url:"", notes:"" }], files:[] }, null, 2);
  function chooseHtml(slug, exists){
    var base = repoBase(), ghLink;
    if(base){
      var gh = exists
        ? base + "/edit/main/content/" + slug + ".json"
        : base + "/new/main?filename=" + encodeURIComponent("content/" + slug + ".json") +
          "&value=" + encodeURIComponent(TEMPLATE);
      ghLink = '<a href="' + gh + '" target="_blank" rel="noopener">edit it on GitHub \u2192</a>';
    } else { ghLink = "edit the content file on GitHub"; }
    return '<p><strong>More than one way to do this.</strong> Submit below for review; or edit your page ' +
           'directly on GitHub \u2014 ' + ghLink + '; or fill in the form below and send the ' +
           'package through the agreed review channel.</p>' +
           '<p class="ed-choose-see"><a href="session.html?s=' + encodeURIComponent(slug) +
           '" target="_blank" rel="noopener">Preview your page \u2192</a></p>';
  }

  var MAP = {};
  (S.days||[]).forEach(function(d){ (d.sessions||[]).forEach(function(s){
    MAP[slugOf(d.date,s.start)] = { s:s, d:d, slug:slugOf(d.date,s.start) }; }); });

  var sel = $("ed-session"), form = $("ed-form"), facts = $("ed-facts"),
      resBox = $("ed-resources"), bibBox = $("ed-biblio"), note = $("ed-note"),
      choose = $("ed-choose"), status = $("ed-status"),
      drop = $("ed-drop"), fileInput = $("ed-file"), fileReplaceInput = $("ed-file-replace"),
      fileList = $("ed-filelist");

  // ATTACH: {kind:"new",name,type,label,dataBase64,size,replacesHref?}
  //       | {kind:"old",href,type,label,action:"keep"|"remove"}
  var ATTACH = [];
  var hadPublished = false;   // did a published content/<id>.json exist at load?
  var prefilled = { abstract:"", bioNote:"" };   // originally-loaded values (guards against accidental emptying)

  /* File controls (Keep/Replace/Remove) are always available so the package can
     describe file changes. The password + submit box appears only when the
     serverless endpoint is configured. */
  var fsec = $("ed-files-section"); if(fsec) fsec.hidden = false;
  var outNote = $("ed-out-note"), dlBtn = $("ed-download");
  if(SUBMIT_ENDPOINT){
    var sbx = $("ed-submit-box"); if(sbx) sbx.hidden = false;
    if(outNote) outNote.textContent = "Or download the review package to keep a copy, or to submit it through the agreed review channel.";
  } else {
    if(dlBtn) dlBtn.classList.add("solid");   // download is the primary action when online submission is off
    if(outNote) outNote.textContent = "Online submission is not currently enabled. Please download the review package and send it through the agreed review channel.";
  }

  /* explicit "Clear" controls for abstract / bio note (shown only for revisions):
     ticking one blanks + disables the field and records an explicit clear in the package,
     so removing a value is deliberate — never inferred from an accidentally-emptied box. */
  function wireClear(cbId, taId){
    var cb = $(cbId), ta = $(taId);
    if(cb && ta) cb.addEventListener("change", function(){
      ta.disabled = cb.checked; ta.classList.toggle("ed-cleared", cb.checked);
      if(cb.checked) ta.value = "";
    });
  }
  wireClear("ed-clear-abstract","ed-abstract");
  wireClear("ed-clear-bio","ed-bio");

  if(sel){
    var html = '<option value="">\u2014 choose your session \u2014</option>';
    (S.days||[]).forEach(function(d){
      html += '<optgroup label="' + esc(d.label + " \u00b7 " + d.date) + '">';
      (d.sessions||[]).forEach(function(s){
        html += '<option value="' + esc(slugOf(d.date,s.start)) + '">' +
                esc(s.start + " \u2014 " + s.title) + '</option>';
      });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
    sel.addEventListener("change", function(){ onSelect(sel.value); });
  }

  /* ---------- structured rows: resources & bibliography ---------- */
  function el(tag,cls){ var e=document.createElement(tag); if(cls) e.className=cls; return e; }
  function inp(k,ph,v,cls){ var i=document.createElement("input"); i.dataset.k=k; i.placeholder=ph;
    i.value=(v==null?"":v); if(cls) i.className=cls; return i; }
  function moveRow(row, dir){
    var sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling;
    if(sib && sib.classList.contains("ed-srow")){
      if(dir < 0) row.parentNode.insertBefore(row, sib);
      else row.parentNode.insertBefore(sib, row);
    }
  }
  function rowCtl(row){
    var span = el("span","ed-rowctl");
    var up = el("button","ed-mv"); up.type="button"; up.textContent="\u25b2";
    up.title="Move up"; up.setAttribute("aria-label","Move up");
    up.addEventListener("click", function(){ moveRow(row,-1); });
    var dn = el("button","ed-mv"); dn.type="button"; dn.textContent="\u25bc";
    dn.title="Move down"; dn.setAttribute("aria-label","Move down");
    dn.addEventListener("click", function(){ moveRow(row,1); });
    var x = el("button","ed-x"); x.type="button"; x.textContent="\u00d7";
    x.title="Remove"; x.setAttribute("aria-label","Remove this entry");
    x.addEventListener("click", function(){ row.remove(); });
    span.appendChild(up); span.appendChild(dn); span.appendChild(x);
    return span;
  }
  function rowVal(row,k){ var e=row.querySelector('[data-k="'+k+'"]'); return e?e.value.trim():""; }

  function resourceRow(r){
    r = r || {};
    var row = el("div","ed-srow");
    var label = inp("label","Label (e.g. Project website)", r.label, "ed-cite");
    var pair = el("div","ed-pair");
    pair.appendChild(inp("href","https://\u2026", r.href));
    pair.appendChild(inp("type","Type (optional, e.g. website, dataset)", r.type));
    var notes = inp("notes","Notes (optional)", r.notes);
    row.appendChild(label); row.appendChild(pair); row.appendChild(notes); row.appendChild(rowCtl(row));
    resBox.appendChild(row); return label;
  }
  function biblioRow(b){
    b = b || {};
    var row = el("div","ed-srow");
    var cite = inp("citation","Full citation \u2014 author, title, publisher, year", b.citation, "ed-cite");
    var pair = el("div","ed-pair");
    pair.appendChild(inp("doi","DOI (optional)", b.doi));
    pair.appendChild(inp("url","URL (optional)", b.url));
    var notes = inp("notes","Notes (optional)", b.notes);
    row.appendChild(cite); row.appendChild(pair); row.appendChild(notes); row.appendChild(rowCtl(row));
    bibBox.appendChild(row); return cite;
  }

  Array.prototype.forEach.call(document.querySelectorAll(".ed-add"), function(btn){
    btn.addEventListener("click", function(){
      var input = btn.dataset.add === "resource" ? resourceRow({}) : biblioRow({});
      input.focus();
    });
  });

  /* ---------- files (client-side processing) ---------- */
  function setStatus(msg, cls){ if(!status) return; status.textContent = msg; status.className = "ed-status" + (cls?(" "+cls):""); }
  function blobToBase64(blob){
    return new Promise(function(res,rej){
      var fr = new FileReader();
      fr.onload = function(){ res(String(fr.result).replace(/^data:[^;]+;base64,/,"")); };
      fr.onerror = function(){ rej(new Error("read failed")); };
      fr.readAsDataURL(blob);
    });
  }
  function processFile(file){
    return new Promise(function(res,rej){
      var ext = (file.name.split(".").pop()||"").toLowerCase();
      if(ALLOWED.indexOf(ext) === -1){ rej(new Error("Unsupported file type: " + file.name)); return; }
      if(IMG_EXT.indexOf(ext) !== -1){
        var img = new Image();
        img.onload = function(){
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, m = Math.max(w,h);
          if(m > MAX_DIM){ var sc = MAX_DIM/m; w = Math.round(w*sc); h = Math.round(h*sc); }
          var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          try { URL.revokeObjectURL(img.src); } catch(e){}
          cv.toBlob(function(blob){
            if(!blob){ rej(new Error("Could not process " + file.name)); return; }
            if(blob.size > MAX_BYTES){ rej(new Error("Image still too large after resizing: " + file.name)); return; }
            blobToBase64(blob).then(function(b64){
              res({ kind:"new", name: safeName(file.name.replace(/\.[^.]+$/,"") + ".jpg"),
                    type:"jpg", label:"", dataBase64:b64, size:blob.size });
            }).catch(rej);
          }, "image/jpeg", 0.85);
        };
        img.onerror = function(){ try { URL.revokeObjectURL(img.src); } catch(e){} rej(new Error("Could not read image: " + file.name)); };
        img.src = URL.createObjectURL(file);
      } else {
        if(file.size > MAX_BYTES){ rej(new Error("File too large (max 10 MB): " + file.name)); return; }
        blobToBase64(file).then(function(b64){
          res({ kind:"new", name: safeName(file.name), type: ext, label:"", dataBase64:b64, size:file.size });
        }).catch(rej);
      }
    });
  }

  function activeCount(){ var n=0; ATTACH.forEach(function(it){ if(!(it.kind==="old"&&it.action==="remove")) n++; }); return n; }
  function takenNames(excludeIdx){
    var taken={};
    ATTACH.forEach(function(it,idx){
      if(idx===excludeIdx) return;
      if(it.kind==="old" && it.action==="remove") return;
      taken[it.kind==="new"?it.name:baseName(it.href)] = true;
    });
    return taken;
  }
  function uniqueName(name, taken){
    if(!taken[name]) return name;
    var dot=name.lastIndexOf("."), base=dot>0?name.slice(0,dot):name, ext=dot>0?name.slice(dot):"";
    var n=2, cand;
    do { cand = base + "-v" + n + ext; n++; } while(taken[cand]);
    return cand;
  }

  function fbtn(label, on, fn){
    var b=el("button","fb"+(on?" on":"")); b.type="button"; b.textContent=label;
    b.addEventListener("click", fn); return b;
  }
  function renderFiles(){
    if(!fileList) return;
    fileList.innerHTML = "";
    ATTACH.forEach(function(it, i){
      var removed = (it.kind==="old" && it.action==="remove");
      var li = el("li", removed ? "ed-fl gone" : "ed-fl");
      var nm = it.kind==="new" ? it.name : baseName(it.href);
      var fn = el("span","fn"); fn.textContent = nm; li.appendChild(fn);
      var meta = el("span", it.kind==="new" ? "fs" : "ftag");
      meta.textContent = it.kind==="new"
        ? (Math.max(1, Math.round(it.size/1024)) + " KB" + (it.replacesHref ? " \u00b7 replaces " + baseName(it.replacesHref) : ""))
        : (removed ? "will be removed" : "on file");
      li.appendChild(meta);
      var ctl = el("span","fctl");
      if(it.kind==="old"){
        ctl.appendChild(fbtn("Keep", it.action!=="remove", function(){ it.action="keep"; renderFiles(); }));
        ctl.appendChild(fbtn("Replace", false, function(){ replaceTarget=i; if(fileReplaceInput) fileReplaceInput.click(); }));
        ctl.appendChild(fbtn("Remove", it.action==="remove", function(){ it.action="remove"; renderFiles(); }));
      } else {
        ctl.appendChild(fbtn("Remove", false, function(){ ATTACH.splice(i,1); renderFiles(); }));
      }
      li.appendChild(ctl);
      fileList.appendChild(li);
    });
  }

  var replaceTarget = -1;
  if(fileReplaceInput){
    fileReplaceInput.addEventListener("change", function(){
      var idx = replaceTarget; replaceTarget = -1;
      var file = fileReplaceInput.files && fileReplaceInput.files[0];
      fileReplaceInput.value = "";
      if(!file || idx<0 || !ATTACH[idx]) return;
      var oldHref = ATTACH[idx].kind==="old" ? ATTACH[idx].href : null;
      processFile(file).then(function(item){
        item.name = uniqueName(item.name, takenNames(idx));   // version against the OTHER kept files
        if(oldHref) item.replacesHref = oldHref;
        ATTACH.splice(idx, 1, item);
        renderFiles();
        if(status && status.className.indexOf("err")>-1) setStatus("","");
      }).catch(function(e){ setStatus(e.message,"err"); });
    });
  }
  function addFiles(list){
    Array.prototype.slice.call(list).forEach(function(file){
      if(activeCount() >= MAX_FILES){ setStatus("You can attach up to " + MAX_FILES + " files.", "err"); return; }
      processFile(file).then(function(item){
        item.name = uniqueName(item.name, takenNames(-1));    // never silently overwrite an existing name
        ATTACH.push(item); renderFiles();
        if(status && status.className.indexOf("err")>-1) setStatus("","");
      }).catch(function(e){ setStatus(e.message, "err"); });
    });
  }
  if(drop && fileInput){
    drop.addEventListener("click", function(){ fileInput.click(); });
    drop.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener("change", function(){ addFiles(fileInput.files); fileInput.value=""; });
    ["dragenter","dragover"].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add("drag"); }); });
    ["dragleave","drop"].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove("drag"); }); });
    drop.addEventListener("drop", function(e){ if(e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  }

  function renderFacts(f){
    var d = f.d, s = f.s, v = (S.venues||{})[s.venueId] || {};
    var t = (S.types||{})[s.type] || { label:s.type };
    var when = new Date(d.date + "T12:00:00").toLocaleDateString("en-GB",
      { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    var venue = [v.name,v.building].filter(Boolean).join(", ") || "To be confirmed";
    var who = (s.speakers||[]).map(function(p){
      return esc(p.name) + (p.affiliation ? " (" + esc(p.affiliation) + ")" : ""); }).join(", ") || "\u2014";
    facts.innerHTML =
      '<dt>Session</dt><dd>' + esc(s.title) + '</dd>' +
      '<dt>When</dt><dd>' + esc(when) + ', ' + esc(s.start) + '\u2013' + esc(s.end) + '</dd>' +
      '<dt>Where</dt><dd>' + esc(venue) + '</dd>' +
      '<dt>Format</dt><dd>' + esc(t.label) + '</dd>' +
      '<dt>Speakers</dt><dd>' + who + '</dd>';
  }

  function showRev(on){
    var b=$("ed-rev"); if(b) b.hidden = !on;
    ["ed-clear-abstract-row","ed-clear-bio-row"].forEach(function(id){ var e=$(id); if(e) e.hidden = !on; });
  }
  function resetClear(cbId, taId){
    var cb=$(cbId), ta=$(taId);
    if(cb) cb.checked = false;
    if(ta){ ta.disabled = false; ta.classList.remove("ed-cleared"); }
  }
  function clearForm(){
    resBox.innerHTML = ""; bibBox.innerHTML = "";
    $("ed-abstract").value = ""; var b=$("ed-bio"); if(b) b.value = "";
    var ch=$("ed-changes"); if(ch) ch.value = "";
    resetClear("ed-clear-abstract","ed-abstract");
    resetClear("ed-clear-bio","ed-bio");
    ATTACH = []; renderFiles(); setStatus("", "");
  }
  function prefill(c){
    clearForm();
    prefilled.abstract = c.abstract || "";
    prefilled.bioNote = c.bioNote || c.bio || "";
    $("ed-abstract").value = prefilled.abstract;
    var b=$("ed-bio"); if(b) b.value = prefilled.bioNote;
    (c.resources||[]).forEach(function(r){ resourceRow(typeof r==="string" ? { label:r, href:r } : r); });
    (c.bibliography||[]).forEach(function(x){
      if(typeof x === "string") biblioRow({ citation:x });
      else if(x && x.citation !== undefined) biblioRow(x);
      else if(x) biblioRow({ citation:x.label||"", url:x.href||"" });   // legacy {label,href}
    });
    (c.files||[]).forEach(function(f){
      if(f && f.href) ATTACH.push({ kind:"old", href:f.href, action:"keep",
        type: f.type || (baseName(f.href).split(".").pop()||"").toLowerCase(), label: f.label||"" });
    });
    if(c.pdf && c.pdf.href) ATTACH.push({ kind:"old", href:c.pdf.href, action:"keep",   // legacy single PDF
      type:"pdf", label: c.pdf.label || baseName(c.pdf.href) });
    renderFiles();
    if(!resBox.children.length) resourceRow({});   // one empty row to start
    if(!bibBox.children.length) biblioRow({});
  }

  var current = null;
  function onSelect(slug){
    var f = MAP[slug];
    if(!f){ form.hidden = true; current = null; if(choose) choose.innerHTML = ""; return; }
    current = f; form.hidden = false; note.textContent = ""; setStatus("","");
    renderFacts(f);
    if(choose) choose.innerHTML = chooseHtml(slug, false);
    hadPublished = false; showRev(false);
    fetch("content/" + slug + ".json")
      .then(function(r){ var ok = r.ok; if(choose) choose.innerHTML = chooseHtml(slug, ok); return ok ? r.json() : null; })
      .then(function(c){ hadPublished = !!c; showRev(hadPublished); prefill(c||{}); })
      .catch(function(){ hadPublished = false; showRev(false); prefill({}); });
    try { history.replaceState(null, "", "contribute.html?s=" + slug); } catch(e){}
  }

  /* ---------- collectors ---------- */
  function getResources(){
    var out=[];
    Array.prototype.forEach.call(resBox.querySelectorAll(".ed-srow"), function(row){
      var label=rowVal(row,"label"), href=rowVal(row,"href"), type=rowVal(row,"type"), notes=rowVal(row,"notes");
      if(!label && !href) return;                 // empty row → not a deletion, just skipped
      var o={ label: label || href, href: href };
      if(type) o.type=type; if(notes) o.notes=notes;
      out.push(o);
    });
    return out;
  }
  function getBibliography(){
    var out=[];
    Array.prototype.forEach.call(bibBox.querySelectorAll(".ed-srow"), function(row){
      var c=rowVal(row,"citation"), doi=rowVal(row,"doi"), url=rowVal(row,"url"), notes=rowVal(row,"notes");
      if(!c && !doi && !url && !notes) return;     // empty row → skipped
      if(!c){ c = url || (doi ? ("doi:"+doi) : ""); if(!c){ c = notes; notes = ""; } }  // citation required; fall back (incl. a bare note) so nothing is lost
      var o={ citation:c };
      if(doi) o.doi=doi; if(url) o.url=url; if(notes) o.notes=notes;
      out.push(o);
    });
    return out;
  }
  function fileRefs(){     // kept old files + new files, as content refs (no bytes)
    var out=[];
    ATTACH.forEach(function(it){
      if(it.kind==="old"){ if(it.action==="remove") return;
        out.push({ label: it.label || baseName(it.href), href: it.href, type: it.type }); }
      else out.push({ label: it.label || it.name, href: "materials/" + current.slug + "/" + it.name, type: it.type });
    });
    return out;
  }
  function submitFiles(){  // for the serverless function: base64 for new files
    var out=[];
    ATTACH.forEach(function(it){
      if(it.kind==="old"){ if(it.action==="remove") return;
        out.push({ href: it.href, type: it.type, label: it.label || baseName(it.href) }); }
      else { var f={ name: it.name, type: it.type, dataBase64: it.dataBase64, label: it.label || it.name };
        if(it.replacesHref) f.replacesHref = it.replacesHref; out.push(f); }
    });
    return out;
  }

  function isOn(id){ var e=$(id); return !!(e && e.checked); }
  function fieldOut(taId, prefVal, cleared){
    if(cleared) return null;                          // explicit clear → omit
    var v = ($(taId)||{}).value; v = v ? v.trim() : "";
    if(v) return v;                                   // kept / edited
    if(hadPublished && prefVal) return prefVal;       // empty but NOT cleared → preserve original (no accidental loss)
    return null;
  }
  function buildContent(){
    var out = {}, clear = [];
    var clearedA = isOn("ed-clear-abstract"), clearedB = isOn("ed-clear-bio");
    var ab = fieldOut("ed-abstract", prefilled.abstract, clearedA);
    if(ab) out.abstract = ab; else if(clearedA) clear.push("abstract");
    var bio = fieldOut("ed-bio", prefilled.bioNote, clearedB);
    if(bio) out.bioNote = bio; else if(clearedB) clear.push("bioNote");
    var res = getResources(); if(res.length) out.resources = res;
    var bib = getBibliography(); if(bib.length) out.bibliography = bib;
    var refs = fileRefs(); if(refs.length) out.files = refs;
    return { content: out, clear: clear };
  }
  function envelope(){     // the proposed-revision package
    var bc = buildContent();
    var env = {
      session: current.slug,
      mode: hadPublished ? "revision" : "new",
      basedOn: hadPublished ? "published" : "none",
      status: "pending",
      changesSummary: (($("ed-changes")||{}).value||"").trim(),
      content: bc.content
    };
    if(bc.clear.length) env.clear = bc.clear;   // explicit field removals
    return env;
  }

  function download(){
    if(!current) return;
    var json = JSON.stringify(envelope(), null, 2) + "\n";
    var name = current.slug + ".revision.json";
    var blob = new Blob([json], { type:"application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    var hasNew = ATTACH.some(function(it){ return it.kind==="new"; });
    note.innerHTML = 'Saved <code>' + esc(name) + '</code> \u2014 a <span class="ed-ok">proposed revision</span> for organiser review. ' +
      'Send it through the agreed review channel' + (hasNew ? ', together with the new file(s) you attached' : '') +
      '. The organiser reviews the package and merges it into <code>content/' + esc(current.slug) + '.json</code>.';
  }
  function copy(){
    if(!current) return;
    var json = JSON.stringify(envelope(), null, 2);
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(json).then(
        function(){ note.textContent = "Revision package copied to the clipboard."; },
        function(){ note.textContent = "Couldn\u2019t copy \u2014 use Download instead."; });
    } else { note.textContent = "Use Download instead."; }
  }

  /* ---------- submit for review (serverless): same package + password ---------- */
  function submitPayload(){
    var env = envelope();
    env.content.files = submitFiles();              // embed base64 for new files
    env.password = (($("ed-pass")||{}).value || "");
    return env;
  }
  function submit(){
    if(!current) return;
    if(!SUBMIT_ENDPOINT){ setStatus("Online submission isn\u2019t set up yet \u2014 please use Download below.", "err"); return; }
    var pass = ($("ed-pass")||{}).value || "";
    if(!pass){ setStatus("Enter the faculty password to submit.", "err"); return; }
    var btn = $("ed-submit"); if(btn) btn.disabled = true;
    setStatus("Submitting\u2026", "busy");
    fetch(SUBMIT_ENDPOINT, {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(submitPayload())
    }).then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; },
                                             function(){ return { ok:r.ok, j:null }; }); })
      .then(function(res){
        if(btn) btn.disabled = false;
        if(res.ok && res.j && res.j.ok){
          setStatus("Thank you. Your proposed revision has been submitted for review and will appear on the session page after approval.", "ok");
          var p = $("ed-pass"); if(p) p.value = "";
        } else {
          setStatus((res.j && res.j.error) || "Submission failed. Please try again, or use Download below.", "err");
        }
      })
      .catch(function(){ if(btn) btn.disabled = false;
        setStatus("Couldn\u2019t reach the server. Check your connection, or use Download below.", "err"); });
  }

  var dl = $("ed-download"); if(dl) dl.addEventListener("click", download);
  var cp = $("ed-copy"); if(cp) cp.addEventListener("click", copy);
  var sbt = $("ed-submit"); if(sbt) sbt.addEventListener("click", submit);

  var want = new URLSearchParams(location.search).get("s");
  if(want && MAP[want] && sel){ sel.value = want; onSelect(want); }
})();
