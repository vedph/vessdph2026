/* =============================================================================
   Venice Summer School 2026 — app.js
   Renders the programme from window.SCHOOL and wires every feature.
   No framework, no build step, no external data calls (beyond the optional map).
   ========================================================================== */
(function () {
  "use strict";
  const S = window.SCHOOL;
  if (!S) { console.error("program.js did not load"); return; }
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const el = (t, c, h) => { const n=document.createElement(t); if(c)n.className=c; if(h!=null)n.innerHTML=h; return n; };
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  const cssEsc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/["\\]/g,"\\$&");
  const OFFSET = (S.meta.utcOffsetMinutes||0) * 60000;

  /* ---- time helpers ----------------------------------------------------- */
  const sid = (d, s) => d.date + "T" + s.start;
  function instant(dateStr, hhmm){
    const [y,mo,da] = dateStr.split("-").map(Number);
    const [h,mi] = hhmm.split(":").map(Number);
    return Date.UTC(y, mo-1, da, h, mi) - OFFSET;
  }
  function icsStamp(ms){ const d=new Date(ms);
    const p=n=>String(n).padStart(2,"0");
    return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+"T"+
           p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+"Z"; }
  function isoLocal(dateStr, hhmm){
    const off = S.meta.utcOffsetMinutes||0, sign = off>=0?"+":"-";
    const a=Math.abs(off), p=n=>String(n).padStart(2,"0");
    return `${dateStr}T${hhmm}:00${sign}${p(a/60|0)}:${p(a%60)}`;
  }

  const FLAT = [];
  S.days.forEach((d) => d.sessions.forEach((s, si) => {
    FLAT.push({ id:sid(d,s), day:d, s, si,
      a:instant(d.date,s.start), b:instant(d.date,s.end) });
  }));

  /* ---- unique teachers (used by the colophon and the Faculty section) --- */
  function uniqueTeachers(){
    const map = new Map();   // name -> { aff, firstId } (first seen, chronologically)
    FLAT.forEach(f => (f.s.speakers||[]).forEach(p=>{
      if(!map.has(p.name)) map.set(p.name, { aff: p.affiliation||"", firstId: f.id });
    }));
    const arr = [...map.entries()].map(([name,o])=>({ name, aff:o.aff, firstId:o.firstId }));
    const key = n => (n.name.trim().split(/\s+/).pop()||"").toLowerCase();
    arr.sort((x,y)=> key(x).localeCompare(key(y)) || x.name.localeCompare(y.name));
    return arr;
  }

  /* =========================================================================
     MASTHEAD colophon
     ====================================================================== */
  function colophon(){
    const venues = new Set();
    S.days.forEach(d=>d.sessions.forEach(s=>{ if(s.venueId!=="tbc") venues.add(s.venueId); }));
    const facts = [
      [S.days.length, "days"],
      [FLAT.length, "sessions"],
      [uniqueTeachers().length, "teachers"],
      [venues.size, "venues across Venice"]
    ];
    const host = $("#colophon"); if(!host) return;
    facts.forEach(([n,l])=>{ const f=el("div","fact");
      f.innerHTML = `<span class="n">${n}</span><span class="l">${esc(l)}</span>`;
      host.appendChild(f); });
  }

  /* =========================================================================
     DAY NAV
     ====================================================================== */
  function daynav(){
    const nav = $("#daynav"); if(!nav) return;
    S.days.forEach((d,i)=>{ const a=el("a");
      a.href = "#day-"+(i+1);
      const wd = new Date(d.date+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short"});
      a.innerHTML = `${esc(wd)} <span class="dnum">${d.date.slice(8)}</span>`;
      a.dataset.day = "day-"+(i+1);
      nav.appendChild(a);
    });
  }

  /* =========================================================================
     PROGRAMME
     ====================================================================== */
  /* inline SVG icons (themed via currentColor; no icon font) */
  const SVG = {
    cal:'<svg class="fi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v4M16 3v4"/></svg>',
    mat:'<svg class="fi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>',
    res:'<svg class="fi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
  };
  /* small per-kind hint shown before an item label (optional `kind` field) */
  const KIND = { reading:"\u00b6", pdf:"\u00b6", doc:"\u00b6", dataset:"\u25a4", code:"</>",
    model:"\u25c8", slides:"\u25ad", html:"\u25ad", site:"\u25c9", forum:"\u275d",
    plugin:"\u2699", repo:"</>", video:"\u25b6", link:"\u2197" };

  function speakersHTML(list){
    if(!list || !list.length) return "";
    return `<div class="auth">` + list.map(p =>
      `<span class="nm">${esc(p.name)}</span>` +
      (p.affiliation ? ` <span class="af">${esc(p.affiliation)}</span>` : "")
    ).join(`<span class="sep"> / </span>`) + `</div>`;
  }
  function venueHTML(s){
    const v = S.venues[s.venueId]; if(!v) return "";
    const label = [v.name, v.building].filter(Boolean).join(", ");
    const hasGeo = v.lat!=null && v.lng!=null;
    const inner = `<span class="pin">\u25c9</span> ` +
      (hasGeo ? `<a href="#map-section" data-venue="${esc(s.venueId)}">${esc(label)}</a>` : `${esc(label)}`) +
      (v.detail ? ` \u00b7 ${esc(v.detail)}` : "");
    return `<div class="where">${inner}</div>`;
  }
  function chip(item, external){
    const ext = external || /^https?:/.test(item.href||"");
    const k = item.kind && KIND[item.kind] ? `<span class="k" aria-hidden="true">${KIND[item.kind]}</span>` : "";
    return `<a class="chip-link" href="${esc(item.href)}"${ext?' target="_blank" rel="noopener"':''}>`+
      `${k}${esc(item.label)}${ext?' <span class="ext" aria-hidden="true">\u2197</span>':''}</a>`;
  }
  function fgroup(icon, label, list, external){
    if(!list || !list.length) return "";
    return `<div class="fgroup"><span class="fg-l">${icon}<span>${esc(label)}</span></span>`+
      `<span class="fg-items">${list.map(it=>chip(it,external)).join("")}</span></div>`;
  }

  /* ---- expandable per-session detail panel (renders only when it has content) */
  function dblock(label, list, external){
    if(!list || !list.length) return "";
    return `<div class="dm-sec"><h4 class="dm-h">${esc(label)}</h4>`+
      `<div class="dm-chips">${list.map(it=>chip(it,external)).join("")}</div></div>`;
  }
  function dbiblio(list){
    if(!list || !list.length) return "";
    const items = list.map(it=>{
      if(typeof it === "string") return `<li>${esc(it)}</li>`;
      if(it.citation !== undefined){            // structured: {citation, doi?, url?, notes?}
        const links = [];
        if(it.doi) links.push(`<a href="https://doi.org/${esc(it.doi)}" target="_blank" rel="noopener">doi:${esc(it.doi)}</a>`);
        if(it.url) links.push(`<a href="${esc(it.url)}" target="_blank" rel="noopener">link \u2197</a>`);
        const lk = links.length ? ` <span class="dm-cl">${links.join(" \u00b7 ")}</span>` : "";
        const nt = it.notes ? `<span class="dm-note">${esc(it.notes)}</span>` : "";
        return `<li>${esc(it.citation)}${lk}${nt}</li>`;
      }
      const ext = /^https?:/.test(it.href||"");   // legacy: {label, href}
      return `<li>${ it.href
        ? `<a href="${esc(it.href)}"${ext?' target="_blank" rel="noopener"':''}>${esc(it.label)}${ext?' \u2197':''}</a>`
        : esc(it.label||"") }</li>`;
    }).join("");
    return `<div class="dm-sec"><h4 class="dm-h">Recommended reading</h4><ul class="dm-biblio">${items}</ul></div>`;
  }
  function resourcesBlock(list){
    if(!list || !list.length) return "";
    const items = list.map(r=>{
      if(typeof r === "string") return `<li>${esc(r)}</li>`;
      const ext = /^https?:/.test(r.href||"");
      const link = r.href
        ? `<a href="${esc(r.href)}"${ext?' target="_blank" rel="noopener"':''}>${esc(r.label||r.href)}${ext?' \u2197':''}</a>`
        : esc(r.label||"");
      const ty = r.type ? `<span class="dm-type">${esc(r.type)}</span>` : "";
      const nt = r.notes ? `<span class="dm-note">${esc(r.notes)}</span>` : "";
      return `<li>${link}${ty}${nt}</li>`;
    }).join("");
    return `<div class="dm-sec"><h4 class="dm-h">External resources</h4><ul class="dm-biblio dm-res">${items}</ul></div>`;
  }
  function detailPanel(){ return ""; }  // (replaced by the dedicated session page)

  function lemma(d, s){
    const id = sid(d,s);
    const t = S.types[s.type] || {label:s.type,siglum:"\u00b7",role:"plain"};
    const node = el("article","lemma");
    node.id = "s-" + id;
    node.dataset.id = id;
    node.dataset.type = s.type;
    if(t.role==="key") node.classList.add("is-key");

    node.innerHTML = `
      <div class="rail">
        <span class="mano" hidden>\u261e</span>
        <span class="sig ${t.role==="key"?"key":""}" title="${esc(t.label)}">${t.siglum}</span>
        <span class="time">${esc(s.start)}<span class="to">\u2013</span>${esc(s.end)}</span>
      </div>
      <div class="body">
        <h3 class="ttl">${esc(s.title)}</h3>
        ${s.note?`<p class="note">${esc(s.note)}</p>`:""}
        <div class="app">
          ${speakersHTML(s.speakers)}
          ${venueHTML(s)}
        </div>
        <div class="card-foot">
          <button class="act ics" data-id="${id}" title="Add this session to your calendar">${SVG.cal}<span>Add to calendar</span></button>
          <a class="act open-session" href="session.html?s=${esc(d.date)}-${esc(s.start.replace(":",""))}">Show details <span aria-hidden="true">\u2192</span></a>
        </div>
      </div>`;
    return node;
  }

  function programme(){
    const host = $("#programme"); if(!host) return;
    S.days.forEach((d,i)=>{
      const sec = el("section","day"); sec.id = "day-"+(i+1);
      const wd = new Date(d.date+"T12:00:00").toLocaleDateString("en-GB",
        {weekday:"long",day:"numeric",month:"long",year:"numeric"});
      sec.innerHTML = `
        <header class="day-head">
          <div class="row">
            <p class="area kicker">${esc(d.label)} \u00b7 ${esc(d.area)}</p>
            <span class="when">${esc(wd)}</span>
          </div>
          <h2>${esc(d.theme)}</h2>
          ${d.intro?`<p class="intro">${esc(d.intro)}</p>`:""}
        </header>`;
      d.sessions.forEach(s => sec.appendChild(lemma(d,s)));
      host.appendChild(sec);
    });

    // when arriving at (or navigating to) #s-<id>, open that session's detail panel
    function openFromHash(){
      const h = location.hash;
      if(!/^#s-/.test(h)) return;
      const node = document.getElementById(h.slice(1));
      if(!node) return;
      const det = node.querySelector(".lemma-more");
      if(det) det.open = true;
      if(node.scrollIntoView) node.scrollIntoView({block:"start"});
    }
    window.addEventListener("hashchange", openFromHash);
    setTimeout(openFromHash, 0);
  }

  /* =========================================================================
     FACULTY  — every teacher, with affiliation
     ====================================================================== */
  function faculty(){
    const host = $("#faculty");
    if(!host || S.meta.showFaculty===false){ const sec=$("#faculty-section"); if(sec) sec.hidden=true; return; }
    const people = S.people || {};
    const prefix = $("#programme") ? "" : "programme.html";   // jump to the programme page
    uniqueTeachers().forEach(p=>{
      const meta = people[p.name] || {};
      const initials = p.name.trim().split(/\s+/).map(w=>w[0]||"").slice(0,2).join("").toUpperCase();
      const avatar = meta.photo
        ? `<span class="av"><img src="${esc(meta.photo)}" alt="" loading="lazy"></span>`
        : `<span class="av av-i" aria-hidden="true">${esc(initials)}</span>`;
      const nameHTML = meta.url
        ? `<a class="nm" href="${esc(meta.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>`
        : `<span class="nm">${esc(p.name)}</span>`;
      const jump = p.firstId
        ? `<a class="inprog" href="${prefix}#s-${esc(p.firstId)}" aria-label="Find ${esc(p.name)} in the programme">\u21b3 in the programme</a>`
        : "";
      const c = el("div","person");
      c.innerHTML = avatar +
        `<span class="ptext">${nameHTML}` +
        (p.aff?`<span class="af">${esc(p.aff)}</span>`:"") +
        (jump?`<span class="pmeta">${jump}</span>`:"") +
        `</span>`;
      host.appendChild(c);
    });
  }

  /* =========================================================================
     SUPPORT - organising / administrative people (not teachers; no programme link)
     ====================================================================== */
  function support(){
    const host = $("#support");
    const list = S.support || [];
    if(!host || !list.length){ const sec=$("#support-section"); if(sec) sec.hidden=true; return; }
    list.forEach(p=>{
      const initials = (p.name||"").trim().split(/\s+/).map(w=>w[0]||"").slice(0,2).join("").toUpperCase();
      const avatar = p.photo
        ? `<span class="av"><img src="${esc(p.photo)}" alt="" loading="lazy"></span>`
        : `<span class="av av-i" aria-hidden="true">${esc(initials)}</span>`;
      const role = p.role ? (p.url
        ? `<a class="af" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.role)}</a>`
        : `<span class="af">${esc(p.role)}</span>`) : "";
      const c = el("div","person");
      c.innerHTML = avatar + `<span class="ptext"><span class="nm">${esc(p.name)}</span>${role}</span>`;
      host.appendChild(c);
    });
  }

  /* =========================================================================
     COHORT — aggregate figures only (renders nothing if data missing/hidden)
     ====================================================================== */
  function cohort(){
    const host = $("#cohort"); const C = S.cohort;
    if(!host || !C || C.show===false){ const sec=$("#cohort-section"); if(sec) sec.hidden=true; return; }
    const stats = [
      [C.total, "participants"],
      [C.countries, "countries"],
      [C.institutions, "institutions"],
      [(C.strands||[]).length, "project strands"]
    ].filter(s => s[0] != null);
    if(C.places && C.places.eutopia) stats.push([C.places.eutopia, "EUTOPIA DigIn scholarships"]);

    const cards = stats.map(([n,l]) =>
      `<div class="stat"><span class="n">${esc(n)}</span><span class="l">${esc(l)}</span></div>`).join("");

    const max = Math.max(...(C.strands||[]).map(s=>s.count), 1);
    const bars = (C.strands||[]).map(s =>
      `<div class="bar-row">
         <span class="bl">${esc(s.label)}</span>
         <span class="bt"><span class="bf" style="width:${Math.round(s.count/max*100)}%"></span></span>
         <span class="bn">${esc(s.count)}</span>
       </div>`).join("");

    const bits = [];
    if(C.italy && C.international)
      bits.push(`${esc(C.italy)} from Italy and ${esc(C.international)} international, across ${esc(C.countries)} countries`);
    // Gender figures are intentionally not displayed.
    if(C.gender && (C.gender.f||C.gender.m))
      bits.push(`participants: ${esc(C.gender.f)} women / ${esc(C.gender.m)} men`);
    const caption = bits.length ? `<p class="cap">${bits.join(" \u00b7 ")}.</p>` : "";

    host.innerHTML =
      `<div class="stat-grid">${cards}</div>` +
      (bars ? `<div class="bars"><p class="bars-h kicker">Participants by project strand</p>${bars}</div>` : "") +
      caption;
  }

  /* =========================================================================
     WHEEL — circular programme overview (5 day-segments, clickable)
     ====================================================================== */
  function wheel(){
    const host = $("#wheel"), panel = $("#wheel-panel");
    if(!host || S.meta.showWheel===false){ const sec=$("#wheel-section"); if(sec) sec.hidden=true; return; }
    const days = S.days, N = days.length;
    const COLORS = S.meta.wheelColors || ["#b01e28","#1d6a73","#c2882b","#3f5e8c","#7d3a6a"];
    const cx=120, cy=120, R=112, ri=60, pop=7, gap=1.6;
    const pt=(r,deg)=>{ const a=deg*Math.PI/180; return [cx+r*Math.sin(a), cy-r*Math.cos(a)]; };
    const tagOf=a=>{
      if(/Art\b/i.test(a)&&/Histor/i.test(a)) return "ART";
      if(/Pimp|Biennale/i.test(a)) return "PROJ";
      if(/Archaeolog/i.test(a)) return "ARCH";
      if(/Textual/i.test(a)) return "TEXT";
      if(/Histor/i.test(a)) return "HIST";
      return (a.replace(/^Area\s*\d+\s*[\u00b7.\-]?\s*/,"").trim().split(/\s+/)[0]||"").slice(0,4).toUpperCase();
    };
    let segs="";
    days.forEach((d,i)=>{
      const a1=i*(360/N)+gap/2, a2=(i+1)*(360/N)-gap/2, am=(a1+a2)/2, large=(a2-a1)>180?1:0;
      const [ox1,oy1]=pt(R,a1),[ox2,oy2]=pt(R,a2),[ix2,iy2]=pt(ri,a2),[ix1,iy1]=pt(ri,a1);
      const path=`M ${ox1.toFixed(2)} ${oy1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)} `+
                 `L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${ri} ${ri} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
      const [lx,ly]=pt(85,am), dnum=d.date.slice(8).replace(/^0/,"");
      const dx=(pop*Math.sin(am*Math.PI/180)).toFixed(2), dy=(-pop*Math.cos(am*Math.PI/180)).toFixed(2);
      segs += `<g class="seg" data-i="${i}" role="button" tabindex="0" aria-pressed="false" `+
        `aria-label="${esc(d.label)}: ${esc(d.theme)}" style="--c:${COLORS[i%COLORS.length]};--dx:${dx}px;--dy:${dy}px;--d:${i*70}ms">`+
        `<path d="${path}"/>`+
        `<text class="slabel" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">`+
        `<tspan class="snum" x="${lx.toFixed(1)}" dy="-2">${dnum}</tspan>`+
        `<tspan class="stag" x="${lx.toFixed(1)}" dy="13">${esc(tagOf(d.area))}</tspan>`+
        `</text></g>`;
    });
    const center = `<circle class="hole" cx="${cx}" cy="${cy}" r="${ri-2}"/>`+
      `<text class="ctop" x="${cx}" y="${cy-7}">6\u201310</text>`+
      `<text class="cbot" x="${cx}" y="${cy+12}">JULY 2026</text>`;
    host.innerHTML = `<svg viewBox="0 0 240 240" role="img" aria-label="Programme overview, five days">${segs}${center}</svg>`;
    const segEls = $$(".seg", host);
    const linkPrefix = $("#programme") ? "" : "programme.html";   // cross-page links from the home page

    function renderPanel(i){
      if(!panel) return;
      const d = days[i], col = COLORS[i%COLORS.length];
      const wd = new Date(d.date+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long"});
      const dd = d.date.slice(8).replace(/^0/,"");
      const area = d.area.replace(/^Area\s*\d+\s*\u00b7?\s*/,"").trim();
      panel.style.setProperty("--c", col);
      panel.innerHTML =
        `<div class="wp-head">`+
          `<span class="wp-day kicker">${esc(d.label)} \u00b7 ${esc(wd)} ${dd} July</span>`+
          `<h3 class="wp-theme">${esc(d.theme)}</h3>`+
          `<span class="wp-area">${esc(area)}</span>`+
        `</div>`+
        `<ul class="wp-list">`+ d.sessions.map(s=>
            `<li><a href="${linkPrefix}#s-${d.date}T${s.start}" data-sid="${d.date}T${s.start}">`+
            `<span class="wt">${esc(s.start)}</span><span class="wq">${esc(s.title)}</span></a></li>`
          ).join("") +`</ul>`+
        `<a class="wp-open" href="${linkPrefix}#day-${i+1}">Open the full day \u2192</a>`;
    }
    let curIdx = 0;
    function select(i){
      curIdx = i;
      segEls.forEach((s,idx)=>{ const on=idx===i; s.classList.toggle("active",on); s.setAttribute("aria-pressed",on); });
      renderPanel(i);
    }
    segEls.forEach((s)=>{
      const i = +s.dataset.i;
      s.addEventListener("click",()=>select(i));
      s.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); select(i); }});
    });
    if(panel) panel.addEventListener("click", e=>{
      const a = e.target.closest("a[data-sid]"); if(!a) return;
      const t = document.querySelector(`.lemma[data-id="${cssEsc(a.dataset.sid)}"]`);
      if(t){ e.preventDefault(); const det=t.querySelector(".lemma-more"); if(det) det.open=true; t.scrollIntoView({behavior:"smooth", block:"center"}); }
      // otherwise let the link navigate to programme.html
    });

    // Stabilise the panel height to the tallest day's content, so switching days
    // (or following the "week at a glance" link) never reflows the page.
    function stabilize(){
      if(!panel) return;
      panel.style.minHeight = "";
      let max = 0;
      for(let i=0;i<N;i++){ renderPanel(i); max = Math.max(max, panel.offsetHeight); }
      panel.style.minHeight = max ? max + "px" : "";
    }
    stabilize();
    let rT; window.addEventListener("resize", ()=>{
      clearTimeout(rT); rT = setTimeout(()=>{ stabilize(); select(curIdx); }, 180);
    });

    // default selection: today during the school, else the first day
    const today = new Date().toISOString().slice(0,10);
    const ti = days.findIndex(d=>d.date===today);
    select(ti>=0 ? ti : 0);
  }

  /* =========================================================================
     CALENDAR (.ics) — per session, whole week
     ====================================================================== */
  function toast(msg){
    let t = $("#toast"); if(!t){ t=el("div","toast"); t.id="toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), 2200);
  }
  function icsText(items){
    const esc = s => String(s).replace(/[\\;,]/g, m=>"\\"+m).replace(/\n/g,"\\n");
    const enc = new TextEncoder();
    const fold = line => {
      let out = "", lineBytes = 0;
      for(const ch of line){
        const b = enc.encode(ch).length;
        if(lineBytes + b > 75){ out += "\r\n "; lineBytes = 1; }
        out += ch; lineBytes += b;
      }
      return out;
    };
    const L = ["BEGIN:VCALENDAR","VERSION:2.0",
      "PRODID:-//VeDPH//Venice Summer School 2026//EN","CALSCALE:GREGORIAN",
      "METHOD:PUBLISH","X-WR-CALNAME:"+esc("Venice Summer School 2026"),
      "X-WR-TIMEZONE:"+(S.meta.timezone||"Europe/Rome")];
    const stamp = icsStamp(Date.now());
    items.forEach(f=>{
      const v = S.venues[f.s.venueId]||{};
      const loc = [v.name, v.building, v.address].filter(Boolean).join(", ");
      const who = (f.s.speakers||[]).map(p=>p.name+(p.affiliation?" ("+p.affiliation+")":"")).join("; ");
      const desc = [who, f.s.note, f.day.area].filter(Boolean).join(" \u2014 ");
      L.push("BEGIN:VEVENT",
        "UID:"+f.id+"@vedph.unive.it",
        "DTSTAMP:"+stamp,
        "DTSTART:"+icsStamp(f.a),
        "DTEND:"+icsStamp(f.b),
        "SUMMARY:"+esc(f.s.title),
        loc?("LOCATION:"+esc(loc)):"",
        desc?("DESCRIPTION:"+esc(desc)):"",
        "URL:"+ (S.meta.url||"") ,
        "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.filter(Boolean).map(fold).join("\r\n");
  }
  function downloadBlob(text, type, filename){
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href=url; a.download=filename; document.body.appendChild(a);
    a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1500);
  }
  function downloadICS(items, filename){
    downloadBlob(icsText(items), "text/calendar;charset=utf-8", filename);
    toast(items.length>1 ? "Calendar file downloaded \u2014 open it to import" : "Event downloaded");
  }
  document.addEventListener("click", e=>{
    const ics = e.target.closest(".act.ics");
    if(ics){ const f = FLAT.find(x=>x.id===ics.dataset.id);
      if(f) downloadICS([f], "vsdph-"+f.id.replace(/[:T]/g,"")+".ics"); }
  });

  /* =========================================================================
     OPEN DATA (.json) + JSON-LD
     ====================================================================== */
  function downloadData(){
    downloadBlob(JSON.stringify(S,null,2), "application/json;charset=utf-8",
      "venice-summer-school-2026.json");
    toast("Programme data downloaded (JSON)");
  }
  function injectJSONLD(){
    const sub = FLAT.map(f=>{
      const v = S.venues[f.s.venueId]||{};
      const o = { "@type":"EducationEvent", name:f.s.title,
        startDate:isoLocal(f.day.date,f.s.start), endDate:isoLocal(f.day.date,f.s.end) };
      if(v.name) o.location = { "@type":"Place", name:[v.name,v.building].filter(Boolean).join(", "),
        address:v.address||"Venezia" };
      const who = (f.s.speakers||[]).map(p=>({ "@type":"Person", name:p.name,
        affiliation:p.affiliation||undefined }));
      if(who.length) o.performer = who;
      return o;
    });
    const data = { "@context":"https://schema.org", "@type":"EducationEvent",
      name:S.meta.titleFull,
      description:"Advanced training in theories, technologies and methods of Digital and Public Humanities, on the cultural heritage of Venice.",
      startDate:isoLocal(S.meta.dateStart,"09:30"),
      endDate:isoLocal(S.meta.dateEnd,"19:00"),
      inLanguage:"en", eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",
      eventStatus:"https://schema.org/EventScheduled",
      location:{ "@type":"Place", name:S.meta.host, address:"Venezia, Italy" },
      organizer:{ "@type":"Organization", name:S.meta.centre.split(" \u2014 ")[0], url:S.meta.info },
      url:S.meta.url, subEvent:sub };
    const sc = el("script"); sc.type="application/ld+json";
    sc.textContent = JSON.stringify(data);
    document.head.appendChild(sc);
  }

  /* =========================================================================
     FILTERS — search + type chips
     ====================================================================== */
  let query = "", activeType = "all";
  function buildChips(){
    const host = $("#chips"); if(!host) return;
    const groups = [["all","All"],["lecture","Lectures"],["workshop","Workshops"],
      ["keynote","Keynotes"],["tour","Tours & visits"]];
    const labelEl = el("span","kicker chips-label"); labelEl.textContent="Filter";
    host.appendChild(labelEl);
    groups.forEach(([key,label])=>{
      const b=el("button","chip"); b.dataset.k=key;
      b.setAttribute("aria-pressed", key==="all");
      const sg = key==="tour" ? `<span class="s">T/V</span>`
               : (S.types[key] ? `<span class="s">${S.types[key].siglum}</span>` : "");
      b.innerHTML = sg+esc(label);
      b.addEventListener("click",()=>{ activeType=key;
        $$(".chip",host).forEach(c=>c.setAttribute("aria-pressed", c.dataset.k===key));
        applyFilters(); });
      host.appendChild(b);
    });
  }
  function matchType(s){
    if(activeType==="all") return true;
    if(activeType==="tour") return s.type==="tour"||s.type==="visit";
    return s.type===activeType;
  }
  function matchQuery(d,s){
    if(!query) return true;
    const hay = [s.title, s.note, d.theme, d.area,
      ...(s.speakers||[]).flatMap(p=>[p.name,p.affiliation])].join(" ").toLowerCase();
    return query.split(/\s+/).every(tok=>hay.includes(tok));
  }
  function applyFilters(){
    let shown = 0;
    S.days.forEach((d,i)=>{
      const sec = $("#day-"+(i+1)); if(!sec) return; let any=false;
      d.sessions.forEach(s=>{
        const node = sec.querySelector(`.lemma[data-id="${cssEsc(sid(d,s))}"]`);
        const ok = matchType(s) && matchQuery(d,s);
        if(node) node.classList.toggle("hidden", !ok);
        if(ok){ any=true; shown++; }
      });
      sec.classList.toggle("hidden", !any);
    });
    const note = $("#noresults"); if(note) note.hidden = shown>0;
  }
  function wireSearch(){
    const inp = $("#search-input"); if(!inp) return;
    inp.addEventListener("input", ()=>{ query = inp.value.trim().toLowerCase(); applyFilters(); });
  }

  /* =========================================================================
     NOW / NEXT — the manicule
     ====================================================================== */
  function clearMano(){ $$(".lemma").forEach(n=>{ n.classList.remove("is-now");
    const m=$(".mano",n); if(m) m.hidden=true; }); }
  function markMano(id, kind){
    const node = document.querySelector(`.lemma[data-id="${cssEsc(id)}"]`);
    if(!node) return null;
    if(kind==="now") node.classList.add("is-now");
    const m=$(".mano",node); if(m) m.hidden=false;
    return node;
  }
  let nowTarget = null;
  function refreshNow(){
    const now = Date.now();
    const pill = $("#nowpill"); if(!pill) return;
    pill.className = "nowpill"; clearMano(); nowTarget=null;
    const firstA = FLAT[0].a, lastB = FLAT[FLAT.length-1].b;
    const cur = FLAT.find(f=> now>=f.a && now<f.b);
    const nxt = FLAT.find(f=> f.a>now);
    if(now < firstA){
      const days = Math.ceil((firstA-now)/86400000);
      pill.classList.add("before");
      pill.innerHTML = `<span class="mano">\u25c9</span> ` +
        (days>1 ? `Begins in ${days} days` : (days===1?"Begins tomorrow":"Begins today"));
      nowTarget = "#programme";
    } else if(now >= lastB){
      pill.classList.add("after");
      pill.innerHTML = `<span class="mano">\u00b7</span> School concluded`;
    } else if(cur){
      pill.innerHTML = `<span class="mano">\u261e</span> Happening now`;
      const node = markMano(cur.id,"now"); nowTarget = node ? "#s-"+cur.id : null;
    } else if(nxt){
      pill.innerHTML = `<span class="mano">\u261e</span> Up next \u00b7 ${nxt.s.start}`;
      const node = markMano(nxt.id,"next"); nowTarget = node ? "#s-"+nxt.id : null;
    }
    pill.style.cursor = nowTarget ? "pointer" : "default";
  }
  function wireNow(){
    const pill = $("#nowpill"); if(!pill) return;
    pill.addEventListener("click", ()=>{ if(!nowTarget) return;
      const t = nowTarget.startsWith("#s-")
        ? document.querySelector(`.lemma[data-id="${cssEsc(nowTarget.slice(3))}"]`)
        : $(nowTarget);
      if(t) t.scrollIntoView({behavior:"smooth", block:"center"});
    });
    refreshNow(); setInterval(refreshNow, 60000);
  }

  /* =========================================================================
     SCROLL-SPY
     ====================================================================== */
  function spy(){
    const tabs = $$("#daynav a");
    const setActive = id => tabs.forEach(a=>a.classList.toggle("active", a.dataset.day===id));
    if(!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(ents=>{
      ents.forEach(e=>{ if(e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin:"-30% 0px -60% 0px", threshold:0 });
    $$(".day").forEach(s=>io.observe(s));
  }

  /* =========================================================================
     MAP — Leaflet + a light CARTO basemap (online); fallback offline
     ====================================================================== */
  function venueSessions(vid){
    return FLAT.filter(f=>f.s.venueId===vid)
      .map(f=>`${f.day.label}, ${f.s.start} \u2014 ${f.s.title}`);
  }
  let leafletLoading = null;
  function loadLeaflet(){
    if(window.L) return Promise.resolve();
    if(leafletLoading) return leafletLoading;
    leafletLoading = new Promise((resolve, reject)=>{
      const css = el("link"); css.rel = "stylesheet"; css.href = "assets/leaflet/leaflet.css";
      document.head.appendChild(css);
      const js = el("script"); js.src = "assets/leaflet/leaflet.js"; js.async = true;
      js.onload = ()=>resolve();
      js.onerror = ()=>{ leafletLoading = null; reject(new Error("leaflet")); };
      document.body.appendChild(js);
    });
    return leafletLoading;
  }

  /* Default, request-free view of the venues — the site is fully usable without the map. */
  function renderVenueList(){
    const host = $("#venue-list"); if(!host) return;
    Object.entries(S.venues).forEach(([id,v])=>{
      if(v.lat == null) return;
      const n = venueSessions(id).length;
      const sub = [v.building, v.detail].filter(Boolean).join(" \u00b7 ");
      const li = el("li","venue-li");
      li.innerHTML = `<span class="vn">${esc(v.name)}</span>`+
        (sub?`<span class="vb">${esc(sub)}</span>`:"")+
        (v.address?`<span class="va">${esc(v.address)}</span>`:"")+
        (n?`<span class="vs">${n} session${n>1?"s":""}</span>`:"");
      host.appendChild(li);
    });
  }

  /* The venue map opens automatically on the programme page. Leaflet is vendored locally;
     the CARTO basemap tiles are fetched when the map initialises. Offline (or on failure)
     it falls back to the request-free venue list above. */
  function openVenueMap(){
    const wrap = $("#mapwrap"); if(!wrap) return;     // only where the map exists (programme page)
    const note = document.querySelector(".map-note");
    if(!navigator.onLine){
      if(note) note.textContent = "The interactive map needs an internet connection. The venue list above is available offline.";
      return;
    }
    loadLeaflet().then(()=>{
      const legend = $("#map-legend");
      wrap.hidden = false;
      if(legend) legend.hidden = false;
      buildMap();
    }).catch(()=>{
      if(note) note.textContent = "The map could not be loaded. The venue list above remains available.";
    });
  }

  function buildMap(){
    const wrap = $("#map"); if(!wrap || !window.L) return;
    const map = L.map(wrap, { scrollWheelZoom:false, attributionControl:true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom:19, subdomains:"abcd",
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    const RED = "#b01e28";
    const byCoord = {};
    Object.entries(S.venues).forEach(([id,v])=>{
      if(v.lat==null) return; const k=v.lat+","+v.lng;
      (byCoord[k] = byCoord[k] || []).push(id);
    });
    const markers = {}; const pts = [];
    Object.entries(byCoord).forEach(([k,ids])=>{
      const [lat,lng] = k.split(",").map(Number); pts.push([lat,lng]);
      const names = ids.map(id=>S.venues[id].name).join(" / ");
      const m = L.circleMarker([lat,lng], { radius:9, color:RED, weight:2,
        fillColor:RED, fillOpacity:.82 }).addTo(map);
      const sess = ids.flatMap(venueSessions);
      const html = `<div class="mvenue"><b>${esc(names)}</b>
        <span class="sub">${esc(S.venues[ids[0]].building||"")}<br>${esc(S.venues[ids[0]].address||"")}</span></div>`+
        (sess.length?`<div class="mvsess">`+ sess.slice(0,8).map(esc).join("<br>")+`</div>`:"");
      m.bindPopup(html, { maxWidth:260 });
      ids.forEach(id=>markers[id]=m);
    });
    if(pts.length) map.fitBounds(pts, { padding:[40,40], maxZoom:15 });

    document.addEventListener("click", e=>{
      const a = e.target.closest("a[data-venue]"); if(!a) return;
      const m = markers[a.dataset.venue]; if(!m) return;
      setTimeout(()=>{ map.setView(m.getLatLng(), 16, {animate:true}); m.openPopup(); }, 350);
    });
    setTimeout(()=>map.invalidateSize(), 200);
  }

  /* =========================================================================
     COMMUNITY MAP (people.html) — aggregated institutions only, never individuals
     ====================================================================== */
  function buildCommunityMap(data){
    const wrap = $("#cm-map"); if(!wrap || !window.L) return;
    const map = L.map(wrap, { scrollWheelZoom:false, attributionControl:true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom:19, subdomains:"abcd",
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    const RED = "#b01e28";
    const maxC = Math.max.apply(null, data.map(e => Math.max(1, +e.count || 1)));
    const pts = [];
    data.forEach(e => {
      pts.push([e.lat, e.lng]);
      const c = Math.max(1, +e.count || 1);
      const r = 7 + Math.round(11 * Math.sqrt(c / maxC));   // marker area ~ count, ~7-18px
      const m = L.circleMarker([e.lat, e.lng], { radius:r, color:RED, weight:2,
        fillColor:RED, fillOpacity:.5 }).addTo(map);
      const loc = [e.city, e.country].filter(Boolean).map(esc).join(", ");
      const ppl = c + (c === 1 ? " person" : " people");
      m.bindPopup('<div class="mvenue"><b>' + esc(e.institution || "") + '</b>' +
        (loc ? '<span class="sub">' + loc + '</span>' : '') +
        '<div class="mvsess">' + ppl + '</div></div>', { maxWidth:240 });
    });
    if(pts.length) map.fitBounds(pts, { padding:[40,40], maxZoom:13 });
    setTimeout(() => map.invalidateSize(), 200);
  }
  /* Follows the venue-map pattern: opens automatically when online; shows only counts. */
  function communityMap(){
    const section = $("#cm-map-section"); if(!section) return;   // only on people.html
    const data = (window.COMMUNITY_MAP || []).filter(function(e){
      return e && typeof e.lat === "number" && !isNaN(e.lat) && typeof e.lng === "number" && !isNaN(e.lng); });
    const note = $("#cm-cartonote"), empty = $("#cm-empty"), wrap = $("#cm-mapwrap");
    if(!data.length){                  // empty / not yet available → empty state, keep the section
      if(note) note.hidden = true;
      if(empty) empty.hidden = false;
      return;
    }
    if(!navigator.onLine){
      if(note) note.textContent = "The map needs an internet connection.";
      return;
    }
    loadLeaflet().then(function(){
      if(wrap) wrap.hidden = false;
      buildCommunityMap(data);
    }).catch(function(){
      if(note) note.textContent = "The map could not be loaded.";
    });
  }

  /* =========================================================================
     TOOLBAR / LEDE BUTTONS
     ====================================================================== */
  function wireButtons(){
    const calBtn = $("#cal-all"); if(calBtn)
      calBtn.addEventListener("click", ()=>downloadICS(FLAT, "venice-summer-school-2026.ics"));
    const dataBtn = $("#data-all"); if(dataBtn)
      dataBtn.addEventListener("click", downloadData);
  }

  /* if a logo image fails to load, show the institution name as text instead */
  function wireLogoFallback(){
    $$("img[data-logo]").forEach(img=>{
      img.addEventListener("error", ()=>{
        if(!img.parentNode) return;
        const span = document.createElement("span");
        span.className = "logo-text";
        span.textContent = img.getAttribute("alt") || "";
        img.parentNode.replaceChild(span, img);
      });
    });
  }

  /* =========================================================================
     SESSION PAGE — dedicated, data-driven page for one session (session.html?s=…)
     ====================================================================== */
  function sessionBody(c){
    if(!c || c.status === "pending") return ""; // pending submissions are never shown publicly
    const abs = c.abstract ? `<p class="sp-abstract">${esc(c.abstract)}</p>` : "";
    const bioTxt = c.bioNote || c.bio || "";    // bioNote (current) or bio (legacy)
    const bio = bioTxt ? `<p class="sp-bio">${esc(bioTxt)}</p>` : "";
    const mats = [].concat(c.materials || [], c.files || []);
    const pdf = (c.pdf && c.pdf.href)
      ? `<div class="dm-sec"><a class="dm-pdf" href="${esc(c.pdf.href)}" target="_blank" rel="noopener">\u2b07 ${esc(c.pdf.label||"Download PDF")}</a></div>`
      : "";
    return abs + bio + dblock("Materials", mats, false)
      + resourcesBlock(c.resources) + dbiblio(c.bibliography) + pdf;
  }

  function sessionPage(){
    const host = $("#session"); if(!host) return;
    const want = new URLSearchParams(location.search).get("s");
    const f = FLAT.find(x => (x.day.date + "-" + x.s.start.replace(":","")) === want);
    if(!f){
      host.innerHTML = `<p class="sp-empty">Session not found. <a href="programme.html">Back to the programme \u2192</a></p>`;
      return;
    }
    const s = f.s, d = f.day, t = S.types[s.type] || {label:s.type};
    const people = S.people || {};
    const dayN = S.days.indexOf(d) + 1;
    const ppl = (s.speakers||[]).map(p=>{
      const meta = people[p.name] || {};
      const nm = meta.url
        ? `<a href="${esc(meta.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>`
        : esc(p.name);
      const ini = p.name.trim().split(/\s+/).map(w=>w[0]||"").slice(0,2).join("").toUpperCase();
      const av = meta.photo
        ? `<span class="sp-av"><img src="${esc(meta.photo)}" alt="" loading="lazy"></span>`
        : `<span class="sp-av sp-av-i" aria-hidden="true">${esc(ini)}</span>`;
      const aff = p.affiliation ? `<span class="sp-aff">${esc(p.affiliation)}</span>` : "";
      return `<span class="sp-person">${av}<span class="sp-pn">${nm}${aff}</span></span>`;
    }).join("");
    const v = S.venues[s.venueId];
    const venueLabel = v ? [v.name, v.building].filter(Boolean).join(", ") : "";
    const venueHTML = venueLabel
      ? ((v.lat!=null && v.lng!=null)
          ? `<a href="programme.html#map-section">${esc(venueLabel)}</a>`
          : esc(venueLabel)) + (v.detail?` \u00b7 ${esc(v.detail)}`:"")
      : "To be confirmed";
    const wd = new Date(d.date+"T12:00:00").toLocaleDateString("en-GB",
      {weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const idx = FLAT.indexOf(f);
    const prev = idx>0 ? FLAT[idx-1] : null;
    const next = idx < FLAT.length-1 ? FLAT[idx+1] : null;
    const linkTo = x => `session.html?s=${x.day.date}-${x.s.start.replace(":","")}`;
    host.innerHTML =
      `<p class="sp-kicker kicker"><a href="programme.html#day-${dayN}">${esc(d.label)} \u00b7 ${esc(d.area)}</a></p>`+
      `<h1 class="sp-title">${esc(s.title)}</h1>`+
      (s.note?`<p class="sp-note">${esc(s.note)}</p>`:"")+
      `<div class="sp-head">`+
        `<div class="sp-people">${ppl}</div>`+
        `<dl class="sp-facts">`+
          `<div><dt>When</dt><dd>${esc(wd)}<br>${esc(s.start)}\u2013${esc(s.end)}</dd></div>`+
          `<div><dt>Where</dt><dd>${venueHTML}</dd></div>`+
          `<div><dt>Format</dt><dd>${esc(t.label)}</dd></div>`+
        `</dl>`+
        `<button class="btn solid sp-cal" type="button">\u22b7 Add to calendar</button>`+
      `</div>`+
      `<div class="sp-body" id="sp-body"></div>`+
      `<nav class="sp-nav">`+
        (prev?`<a class="sp-prev" href="${linkTo(prev)}"><span class="d">Previous</span>${esc(prev.s.title)}</a>`:`<span></span>`)+
        (next?`<a class="sp-next" href="${linkTo(next)}"><span class="d">Next</span>${esc(next.s.title)}</a>`:`<span></span>`)+
      `</nav>`+
      `<p class="sp-back"><a href="programme.html#s-${f.id}">\u2190 Back to the programme</a></p>`;
    const cal = host.querySelector(".sp-cal");
    if(cal) cal.addEventListener("click", ()=> downloadICS([f], "vsdph-"+f.id.replace(/[:T]/g,"")+".ics"));
    document.title = s.title + " \u00b7 Venice Summer School DPH 2026";
    const bodyEl = host.querySelector("#sp-body");
    const emptyMsg = `<p class="sp-empty">Materials, external resources and recommended reading for this session will be added here.</p>`;
    fetch("content/" + want + ".json")
      .then(r => r.ok ? r.json() : null)
      .then(c => { bodyEl.innerHTML = (c && sessionBody(c)) || emptyMsg; })
      .catch(() => { bodyEl.innerHTML = emptyMsg; });
  }

  /* =========================================================================
     BOOT
     ====================================================================== */
  colophon(); daynav(); programme(); faculty(); support(); cohort(); wheel(); sessionPage();
  buildChips(); wireSearch(); wireButtons(); wireNow(); spy();
  injectJSONLD(); wireLogoFallback();
  renderVenueList(); openVenueMap(); communityMap();
})();
