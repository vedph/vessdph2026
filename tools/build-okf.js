#!/usr/bin/env node
/* Build an Open Knowledge Format (OKF v0.1) bundle from the canonical programme
   data in data/program.js. Spec: https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf
   Output: okf/  (a directory of cross-linked markdown concepts).
   Re-run whenever data/program.js changes:  node tools/build-okf.js          */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'data', 'program.js'));
const S = global.window.SCHOOL;
const OUT = path.join(ROOT, 'okf');
const BASE = (S.meta.url || '').replace(/\/$/, '');           // site base URL, no trailing slash

/* ---------- helpers ---------- */
const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MO = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function humanDate(d){ const x=new Date(d+'T12:00:00Z'); return `${WD[x.getUTCDay()]}, ${x.getUTCDate()} ${MO[x.getUTCMonth()]} ${x.getUTCFullYear()}`; }
function slug(s){
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/['\u2019\u0060]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function q(s){ return '"' + String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"'; }
function yaml(fm){
  const lines = ['---'];
  for (const [k,v] of Object.entries(fm)){
    if (v==null || v==='') continue;
    if (Array.isArray(v)){ const a=v.filter(x=>x!=null && x!==''); if(!a.length) continue; lines.push(`${k}: [${a.map(q).join(', ')}]`); }
    else lines.push(`${k}: ${q(v)}`);
  }
  lines.push('---');
  return lines.join('\n');
}
function firstSentence(s){
  const m = String(s).match(/^[\s\S]*?[.!?](\s|$)/);
  let t = (m ? m[0] : String(s)).trim();
  if (t.length > 180) t = t.slice(0,177).trimEnd() + '\u2026';
  return t;
}
function isoLocal(date, hm){ return `${date}T${hm}:00+02:00`; }   // Venice in July = CEST (UTC+2)
function areaTag(area){
  const a = String(area).toLowerCase();
  if (a.includes('archaeolog')) return 'Archaeology';
  if (a.includes('textual'))    return 'Textual Scholarship';
  if (a.includes('art history'))return 'Art History';
  if (a.includes('history'))    return 'History';
  if (a.includes('art'))        return 'Art History';
  return null;
}
function write(rel, content){
  const fp = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content.replace(/\n+$/,'') + '\n');
}

/* ---------- derive ---------- */
const FLAT = [];
S.days.forEach(d => d.sessions.forEach(s => FLAT.push({ s, d })));
const sessionSlug = f => `${f.d.date}-${f.s.start.replace(':','')}-${slug(f.s.title).slice(0,40).replace(/-+$/,'')}`;
const personSlug  = name => slug(name);
const venueSlug   = id => slug(id);
const daySlug     = d => d.date;

const speakers = {};                       // name -> { name, affil:Set, sessions:[f] }
FLAT.forEach(f => (f.s.speakers||[]).forEach(p => {
  const e = speakers[p.name] || (speakers[p.name] = { name:p.name, affil:new Set(), sessions:[] });
  if (p.affiliation) e.affil.add(p.affiliation);
  e.sessions.push(f);
}));
const venueSessions = {};
FLAT.forEach(f => (venueSessions[f.s.venueId] = venueSessions[f.s.venueId] || []).push(f));

/* ---------- (re)create output ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* ---------- session concepts ---------- */
function readContent(date, start){
  const cp = path.join(ROOT, 'content', `${date}-${start.replace(':','')}.json`);
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    return (c && c.status === 'pending') ? {} : c; // pending submissions are not published
  } catch (e) { return {}; }
}
function fmtBib(x){
  if (typeof x === 'string') return `- ${x}`;
  if (x && x.citation !== undefined){            // {citation, doi?, url?, notes?}
    let s = `- ${x.citation || ''}`;
    if (x.doi) s += ` https://doi.org/${x.doi}`;
    if (x.url) s += ` ${x.url}`;
    if (x.notes) s += ` \u2014 ${x.notes}`;
    return s;
  }
  return x && x.href ? `- [${x.label || x.href}](${x.href})` : `- ${(x && x.label) || ''}`;
}
FLAT.forEach(f => {
  const { s, d } = f;
  const c = readContent(d.date, s.start);
  const t = S.types[s.type] || { label: s.type };
  const v = S.venues[s.venueId] || {};
  const venueLabel = [v.name, v.building].filter(Boolean).join(', ') || 'To be confirmed';
  const fm = yaml({
    type: 'Session',
    title: s.title,
    description: c.abstract ? firstSentence(c.abstract) : `${t.label} \u00b7 ${d.label}, ${s.start}\u2013${s.end}`,
    resource: BASE ? `${BASE}/session.html?s=${d.date}-${s.start.replace(':','')}` : undefined,
    tags: [areaTag(d.area), t.label].filter(Boolean),
    timestamp: isoLocal(d.date, s.start),
  });
  let b = `${fm}\n\n`;
  b += `Part of [${d.label}](/days/${daySlug(d)}.md) \u2014 ${d.area}.\n\n`;
  b += `# When & where\n\n`;
  b += `- **When:** ${humanDate(d.date)}, ${s.start}\u2013${s.end}\n`;
  b += `- **Where:** [${venueLabel}](/venues/${venueSlug(s.venueId)}.md)${v.detail ? ` \u00b7 ${v.detail}` : ''}\n`;
  b += `- **Format:** ${t.label}\n\n`;
  b += `# Speakers\n\n`;
  b += (s.speakers||[]).map(p => `- [${p.name}](/people/${personSlug(p.name)}.md)${p.affiliation ? ` \u2014 ${p.affiliation}` : ''}`).join('\n') + '\n';
  const links = [].concat(c.materials || [], c.files || [], c.resources || [], (c.pdf && c.pdf.href) ? [{ label: c.pdf.label || 'PDF (download)', href: c.pdf.href }] : []);
  if (c.abstract)   b += `\n# Abstract\n\n${c.abstract}\n`;
  const bioTxt = c.bioNote || c.bio;
  if (bioTxt)       b += `\n# About the speaker\n\n${bioTxt}\n`;
  if (links.length) b += `\n# Resources\n\n` + links.map(r => `- [${r.label || r.href}](${r.href})${r.notes ? ` \u2014 ${r.notes}` : ''}`).join('\n') + '\n';
  if (c.bibliography && c.bibliography.length) b += `\n# Recommended reading\n\n` + c.bibliography.map(fmtBib).join('\n') + '\n';
  write(`sessions/${sessionSlug(f)}.md`, b);
});

/* ---------- person concepts ---------- */
Object.values(speakers).forEach(p => {
  const meta = S.people[p.name] || {};
  const affils = [...p.affil];
  const fm = yaml({
    type: 'Person',
    title: p.name,
    description: affils.join('; ') || 'Teacher, Venice Summer School in Digital and Public Humanities',
    resource: meta.url || undefined,
  });
  let b = `${fm}\n\n`;
  if (affils.length) b += `${affils.join('; ')}\n\n`;
  b += `# Sessions\n\n` + p.sessions.map(f => `- [${f.s.title}](/sessions/${sessionSlug(f)}.md)`).join('\n') + '\n';
  write(`people/${personSlug(p.name)}.md`, b);
});

/* ---------- venue concepts ---------- */
Object.keys(venueSessions).forEach(id => {
  const v = S.venues[id] || {};
  const mapUrl = (v.lat!=null && v.lng!=null)
    ? `https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=18/${v.lat}/${v.lng}` : undefined;
  const addr = [v.building, v.detail, v.address].filter(Boolean).join(' \u00b7 ');
  const fm = yaml({
    type: 'Venue',
    title: v.name || id,
    description: addr || 'Venue of the Venice Summer School',
    resource: mapUrl,
  });
  let b = `${fm}\n\n`;
  if (addr) b += `${addr}\n\n`;
  if (v.lat!=null && v.lng!=null) b += `Coordinates: ${v.lat}, ${v.lng}\n\n`;
  b += `# Sessions held here\n\n` + venueSessions[id]
        .map(f => `- [${f.s.title}](/sessions/${sessionSlug(f)}.md) \u2014 ${humanDate(f.d.date)}, ${f.s.start}`).join('\n') + '\n';
  write(`venues/${venueSlug(id)}.md`, b);
});

/* ---------- day concepts ---------- */
S.days.forEach(d => {
  const fm = yaml({
    type: 'Day',
    title: `${d.label} \u2014 ${humanDate(d.date)}`,
    description: d.area,
    timestamp: isoLocal(d.date, '09:00'),
  });
  let b = `${fm}\n\n`;
  if (d.theme) b += `**${d.theme}**\n\n`;
  if (d.intro) b += `${d.intro}\n\n`;
  b += `# Sessions\n\n` + d.sessions.map(s => `- ${s.start}\u2013${s.end} \u00b7 [${s.title}](/sessions/${sessionSlug({ s, d })}.md)`).join('\n') + '\n';
  write(`days/${daySlug(d)}.md`, b);
});

/* ---------- index.md files (progressive disclosure; no frontmatter) ---------- */
// sessions/index.md grouped by day
let si = `# Sessions\n`;
S.days.forEach(d => {
  si += `\n# ${d.label} \u2014 ${humanDate(d.date)}\n\n`;
  si += d.sessions.map(s => {
    const t = S.types[s.type] || { label: s.type };
    return `* [${s.title}](${sessionSlug({ s, d })}.md) - ${t.label}, ${s.start}\u2013${s.end}`;
  }).join('\n') + '\n';
});
write('sessions/index.md', si);

// people/index.md
let pi = `# Teachers\n\n`;
pi += Object.values(speakers).sort((a,b)=>a.name.localeCompare(b.name))
  .map(p => `* [${p.name}](${personSlug(p.name)}.md) - ${[...p.affil].join('; ') || 'Teacher'}`).join('\n') + '\n';
write('people/index.md', pi);

// venues/index.md
let vi = `# Venues\n\n`;
vi += Object.keys(venueSessions).map(id => {
  const v = S.venues[id] || {};
  const addr = [v.building, v.detail].filter(Boolean).join(', ');
  return `* [${v.name || id}](${venueSlug(id)}.md) - ${addr || 'Venue'}`;
}).join('\n') + '\n';
write('venues/index.md', vi);

// days/index.md
let di = `# Days\n\n`;
di += S.days.map(d => `* [${d.label}](${daySlug(d)}.md) - ${d.area}`).join('\n') + '\n';
write('days/index.md', di);

// root index.md (the one place an index.md MAY carry frontmatter: okf_version)
const root =
`---
okf_version: "0.1"
---

# ${S.meta.titleFull} \u2014 ${S.meta.datesHuman}

Open Knowledge Format bundle for the programme of the ${S.meta.titleFull} (${S.meta.host}, ${S.meta.datesHuman}). Each session, person, venue and day is a concept; concepts link to one another to form a graph.

# Contents

* [Days](days/) - ${S.days.length} days
* [Sessions](sessions/) - ${FLAT.length} sessions
* [People](people/) - ${Object.keys(speakers).length} faculty
* [Venues](venues/) - ${Object.keys(venueSessions).length} venues
`;
write('index.md', root);

/* ---------- summary ---------- */
function countMd(dir){ let n=0; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) n+=countMd(p); else if(e.name.endsWith('.md')) n++; } return n; }
console.log(`OKF bundle written to okf/  (${countMd(OUT)} markdown files)`);
console.log(`  sessions: ${FLAT.length}, people: ${Object.keys(speakers).length}, venues: ${Object.keys(venueSessions).length}, days: ${S.days.length}`);
