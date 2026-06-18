#!/usr/bin/env node
/* check-site.js — static integrity checks for the Venice Summer School site.
   No dependencies. Run from anywhere: `node tools/check-site.js`.
   Exits 1 if any ERROR is found (so it can gate a GitHub Action); WARNINGS never fail.

   Checks: duplicate session ids; speakers missing from SCHOOL.people; sessions whose
   venue/type is unknown; people avatar files that don't exist; journal entries with
   missing referenced images, non-numeric coordinates, text-less notes, a bad
   relatedSession or an unparseable datetime; content/<id>.json files
   whose id is not a real session (or invalid JSON); service-worker CORE paths that don't
   exist; font/url() targets in style.css that don't exist; broken local href/src links
   across all HTML; and oversized committed files. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const warns = [];
const E = (m) => errors.push(m);
const W = (m) => warns.push(m);
const rel = (p) => path.relative(ROOT, p) || p;
const exists = (r) => { try { return fs.existsSync(path.join(ROOT, r)); } catch (e) { return false; } };

function loadGlobal(relPath, name) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = {};
  // the data files are plain `window.X = ...` assignments
  // eslint-disable-next-line no-new-func
  new Function('window', code)(win);
  return win[name];
}

let SCHOOL, JOURNAL;
try { SCHOOL = loadGlobal('data/program.js', 'SCHOOL'); }
catch (e) { E(`Could not load data/program.js: ${e.message}`); }
try { JOURNAL = loadGlobal('data/journal.js', 'JOURNAL') || []; }
catch (e) { E(`Could not load data/journal.js: ${e.message}`); JOURNAL = []; }

/* ---- session id set + duplicates ---- */
const sessionIds = new Set();
if (SCHOOL && SCHOOL.days) {
  const seen = Object.create(null);
  SCHOOL.days.forEach((d) => (d.sessions || []).forEach((s) => {
    const id = `${d.date}-${String(s.start).replace(':', '')}`;
    if (seen[id]) E(`Duplicate session id: ${id} ("${seen[id]}" and "${s.title}")`);
    else { seen[id] = s.title; sessionIds.add(id); }
  }));
}

/* ---- speakers, venues, types ---- */
if (SCHOOL && SCHOOL.days) {
  const people = SCHOOL.people || {};
  const venues = SCHOOL.venues || {};
  const types = SCHOOL.types || {};
  SCHOOL.days.forEach((d) => (d.sessions || []).forEach((s) => {
    (s.speakers || []).forEach((p) => {
      if (!(p.name in people)) E(`Speaker not in SCHOOL.people: "${p.name}" (session ${d.date} ${s.start})`);
    });
    if (!(s.venueId in venues)) E(`Unknown venueId "${s.venueId}" (session ${d.date} ${s.start})`);
    if (!(s.type in types)) W(`Unknown session type "${s.type}" (session ${d.date} ${s.start})`);
  }));
}

/* ---- people avatars exist; orphan avatars ---- */
if (SCHOOL && SCHOOL.people) {
  const referenced = new Set();
  Object.entries(SCHOOL.people).forEach(([name, v]) => {
    if (v && v.photo) {
      referenced.add(v.photo);
      if (!exists(v.photo)) E(`Avatar file missing for ${name}: ${v.photo}`);
    }
    if (v && v.url && !/^https?:\/\//.test(v.url)) W(`Person URL is not absolute http(s) for ${name}: ${v.url}`);
  });
  (SCHOOL.support || []).forEach((v) => {
    if (v && v.photo) {
      referenced.add(v.photo);
      if (!exists(v.photo)) E(`Avatar file missing for support ${v.name}: ${v.photo}`);
    }
    if (v && v.url && !/^https?:\/\//.test(v.url)) W(`Support URL is not absolute http(s) for ${v.name}: ${v.url}`);
  });
  const avDir = path.join(ROOT, 'assets/avatars');
  if (fs.existsSync(avDir)) {
    fs.readdirSync(avDir).filter((f) => !f.startsWith('.')).forEach((f) => {
      const p = 'assets/avatars/' + f;
      if (!referenced.has(p)) W(`Avatar file not referenced by any person: ${p}`);
    });
  }
}

/* ---- journal entries ---- */
(JOURNAL || []).forEach((e, i) => {
  const tag = e && e.id ? e.id : `#${i}`;
  if (!e || !e.id) W(`Journal entry ${tag} has no id`);
  if (e && e.status !== 'approved') W(`Journal entry ${tag} is not status:"approved" (will not be shown)`);
  ['image', 'thumb'].forEach((k) => {
    if (e && e[k] && !exists(e[k])) E(`Journal ${k} file missing for ${tag}: ${e[k]}`);
  });
  // lat/lng are optional, but if either is present both must be valid numbers
  if (e && (e.lat != null || e.lng != null) &&
      (typeof e.lat !== 'number' || isNaN(e.lat) || typeof e.lng !== 'number' || isNaN(e.lng)))
    E(`Journal entry ${tag} must have numeric lat and lng together (or omit both)`);
  // a text-only approved entry (no image/thumb) must carry some text — no blank cards
  if (e && e.status === 'approved' && !e.image && !e.thumb &&
      !((e.body && String(e.body).trim()) || (e.caption && String(e.caption).trim())))
    E(`Journal entry ${tag} has no image and no body/caption`);
  if (e && e.relatedSession && !sessionIds.has(e.relatedSession))
    E(`Journal entry ${tag} relatedSession is not a real session: ${e.relatedSession}`);
  if (e && e.datetime && isNaN(new Date(e.datetime).getTime()))
    W(`Journal entry ${tag} has an unparseable datetime: ${e.datetime}`);
});

/* ---- community map (data/community-map.js, optional; aggregated counts only) ---- */
let COMMUNITY = [];
try { COMMUNITY = loadGlobal('data/community-map.js', 'COMMUNITY_MAP') || []; }
catch (e) { /* optional file — ignore if absent */ }
(COMMUNITY || []).forEach((e, i) => {
  const tag = e && e.institution ? e.institution : `#${i}`;
  if (!e || !e.institution || !String(e.institution).trim())
    E(`Community map entry ${tag} must have an institution`);
  if (!e || typeof e.lat !== 'number' || isNaN(e.lat) || typeof e.lng !== 'number' || isNaN(e.lng))
    E(`Community map entry ${tag} must have numeric lat and lng`);
  if (!e || typeof e.count !== 'number' || !Number.isInteger(e.count) || e.count <= 0)
    E(`Community map entry ${tag} must have a positive integer count`);
  if (e && e.city != null && typeof e.city !== 'string') E(`Community map entry ${tag} city must be a string`);
  if (e && e.country != null && typeof e.country !== 'string') E(`Community map entry ${tag} country must be a string`);
});

/* ---- content/<id>.json files: id validity, JSON validity, local refs ---- */
const contentDir = path.join(ROOT, 'content');
if (fs.existsSync(contentDir)) {
  fs.readdirSync(contentDir).filter((f) => f.endsWith('.json')).forEach((f) => {
    const id = f.replace(/\.json$/, '');
    if (!sessionIds.has(id)) E(`content/${f} does not match any session id`);
    let c = null;
    try { c = JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')); }
    catch (e) { E(`content/${f} is not valid JSON: ${e.message}`); }
    if (c) {
      // bibliography: string, or object that must have a "citation"; doi/url/notes/citation are strings
      (c.bibliography || []).forEach((x, j) => {
        if (typeof x === 'string') return;
        if (!x || typeof x !== 'object') { E(`content/${f} bibliography[${j}] must be a string or object`); return; }
        if (x.citation === undefined) E(`content/${f} bibliography[${j}] must have a "citation"`);
        ['citation', 'doi', 'url', 'notes'].forEach((k) => {
          if (x[k] !== undefined && typeof x[k] !== 'string') E(`content/${f} bibliography[${j}].${k} must be a string`);
        });
      });
      // resources: must have "label" and "href"
      (c.resources || []).forEach((r, j) => {
        if (!r || typeof r !== 'object') { E(`content/${f} resources[${j}] must be an object`); return; }
        if (!r.label) E(`content/${f} resources[${j}] must have a "label"`);
        if (!r.href) E(`content/${f} resources[${j}] must have a "href"`);
      });
      // files: must have "label" and "href"
      (c.files || []).forEach((r, j) => {
        if (!r || typeof r !== 'object') { E(`content/${f} files[${j}] must be an object`); return; }
        if (!r.label) E(`content/${f} files[${j}] must have a "label"`);
        if (!r.href) E(`content/${f} files[${j}] must have a "href"`);
      });
      // local file references must exist
      const refs = [];
      [].concat(c.materials || [], c.files || [], c.resources || []).forEach((r) => { if (r && r.href) refs.push(r.href); });
      if (c.pdf && c.pdf.href) refs.push(c.pdf.href);
      refs.forEach((href) => {
        if (/^(https?:|mailto:|data:|#)/i.test(href)) return;   // external / inline refs aren't our files
        if (!exists(String(href).split(/[?#]/)[0])) E(`content/${f} references a missing local file: ${href}`);
      });
    }
  });
}

/* ---- functions/submit-materials.js allowlist must match the programme ---- */
const fnPath = path.join(ROOT, 'functions/submit-materials.js');
if (fs.existsSync(fnPath)) {
  const fn = fs.readFileSync(fnPath, 'utf8');
  const m = fn.match(/KNOWN_SESSIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (m) {
    const allow = new Set((m[1].match(/'([^']+)'|"([^"]+)"/g) || []).map((s) => s.slice(1, -1)));
    sessionIds.forEach((id) => { if (!allow.has(id)) E(`Session ${id} is missing from KNOWN_SESSIONS in submit-materials.js`); });
    allow.forEach((id) => { if (!sessionIds.has(id)) E(`KNOWN_SESSIONS in submit-materials.js lists a session not in the programme: ${id}`); });
  } else {
    W('Could not find a KNOWN_SESSIONS allowlist in functions/submit-materials.js');
  }
}

/* ---- service-worker CORE paths exist ---- */
try {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const m = sw.match(/const\s+CORE\s*=\s*\[([\s\S]*?)\]/);
  if (m) {
    const paths = (m[1].match(/'([^']+)'|"([^"]+)"/g) || []).map((s) => s.slice(1, -1));
    paths.forEach((p) => { if (!exists(p)) E(`Service worker CORE references a missing file: ${p}`); });
  } else W('Could not locate the CORE array in sw.js');
} catch (e) { W(`Could not read sw.js: ${e.message}`); }

/* ---- url() targets in every local CSS (site stylesheet + vendored, e.g. Leaflet) ---- */
function cssFiles(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.') || f === 'node_modules' || f === '.git') continue;
    const fp = path.join(dir, f); const st = fs.statSync(fp);
    if (st.isDirectory()) out = out.concat(cssFiles(fp));
    else if (f.endsWith('.css')) out.push(fp);
  }
  return out;
}
cssFiles(ROOT).forEach((cssAbs) => {
  const css = fs.readFileSync(cssAbs, 'utf8');
  const cssDir = path.dirname(cssAbs);
  (css.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g) || []).forEach((u) => {
    const t = u.replace(/url\(\s*['"]?/, '').replace(/['"]?\s*\)$/, '').trim();
    if (/^(data:|https?:|#)/.test(t)) return;   // data URIs, remote, and IE VML refs (#default#VML)
    const target = path.normalize(path.join(cssDir, t.split(/[?#]/)[0]));
    if (!fs.existsSync(target)) E(`CSS url() target missing in ${rel(cssAbs)}: ${t}`);
  });
});

/* ---- broken local href/src links across HTML ---- */
function htmlFiles(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.') || f === 'node_modules') continue;
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) out = out.concat(htmlFiles(fp));
    else if (f.endsWith('.html')) out.push(fp);
  }
  return out;
}
htmlFiles(ROOT).forEach((fp) => {
  const html = fs.readFileSync(fp, 'utf8');
  const dir = path.dirname(fp);
  const refs = [];
  let mm;
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  while ((mm = re.exec(html))) refs.push(mm[1]);
  refs.forEach((ref) => {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref)) return;
    const clean = ref.split(/[?#]/)[0];
    if (!clean) return;
    const target = clean.startsWith('/')
      ? path.join(ROOT, clean)
      : path.normalize(path.join(dir, clean));
    if (!fs.existsSync(target)) E(`Broken local link in ${rel(fp)}: ${ref}`);
  });
});

/* ---- oversized committed files ---- */
const WARN_BYTES = 2 * 1024 * 1024;   // 2 MB
const ERR_BYTES = 20 * 1024 * 1024;   // 20 MB
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.') || f === 'node_modules' || f === '.git') continue;
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else {
      if (st.size > ERR_BYTES) E(`File is very large (${(st.size / 1048576).toFixed(1)} MB): ${rel(fp)}`);
      else if (st.size > WARN_BYTES) W(`Large file (${(st.size / 1048576).toFixed(1)} MB): ${rel(fp)}`);
    }
  }
}
walk(ROOT);

/* ---- report ---- */
const C = process.stdout.isTTY ? { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', x: '\x1b[0m' } : { r: '', y: '', g: '', d: '', x: '' };
console.log(`\nVenice Summer School — site checks`);
console.log(`${C.d}sessions: ${sessionIds.size} · people: ${SCHOOL ? Object.keys(SCHOOL.people || {}).length : '?'} · venues: ${SCHOOL ? Object.keys(SCHOOL.venues || {}).length : '?'} · journal entries: ${(JOURNAL || []).length} · community map: ${(COMMUNITY || []).length}${C.x}\n`);
if (warns.length) { console.log(`${C.y}WARNINGS (${warns.length}):${C.x}`); warns.forEach((m) => console.log(`  ${C.y}!${C.x} ${m}`)); console.log(''); }
if (errors.length) { console.log(`${C.r}ERRORS (${errors.length}):${C.x}`); errors.forEach((m) => console.log(`  ${C.r}✗${C.x} ${m}`)); console.log(''); }
if (!errors.length) console.log(`${C.g}✓ no errors${C.x}${warns.length ? `  ${C.d}(${warns.length} warning${warns.length > 1 ? 's' : ''})${C.x}` : ''}\n`);
process.exit(errors.length ? 1 : 0);
