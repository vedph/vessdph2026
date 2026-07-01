/* ============================================================================
   VSS DPH 2026 — site API  (Cloudflare Worker)
   ----------------------------------------------------------------------------
   One Worker, several routes. Per-person login (username + password) is checked
   SERVER-SIDE here; the credential list lives only in the environment, never in
   the repo or in client JavaScript.

     POST /materials        teachers/admin → writes session materials to GitHub
                            (public, open data — auto-published).
     POST /journal          any logged-in user → creates a journal post
                            (text + photo, both in D1 — real deletion).
     GET  /journal          PUBLIC → list all journal posts.
     GET  /journal/photo/ID PUBLIC → serve a journal photo from D1.
     POST /journal/remove   author of the post OR admin → delete it.

   ENVIRONMENT
     Secret:
       CREDENTIALS   JSON: { "<username>": { "password": "...", "role": "...",
                              "name": "..." }, ... }  role ∈ teacher|student|admin
       GITHUB_TOKEN  fine-grained PAT, this repo only, Contents: read & write
     Vars:
       GITHUB_OWNER  e.g. "vedph"
       GITHUB_REPO   e.g. "vessdph2026"
       GITHUB_BRANCH e.g. "main"
       ALLOW_ORIGIN  e.g. "https://vedph.github.io"
     Bindings:
       DB            D1 database (table `journal`, see functions/schema.sql).
                     Journal photos are stored as base64 in D1 (no R2 needed).
   ========================================================================== */

const MAX_FILE_BYTES = 10 * 1024 * 1024;     // materials file (after client processing)
const MAX_FILES = 12;
const ALLOWED_EXT = ["pdf", "md", "txt", "jpg", "jpeg", "png", "webp"];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;     // journal photo (client already resizes)
const PHOTO_EXT = ["jpg", "jpeg", "png", "webp"];
const CHAPTERS = new Set(["before", "onway", "school", "home", "after"]);

const KNOWN_SESSIONS = new Set([
  "2026-07-06-0930", "2026-07-06-1000", "2026-07-06-1100", "2026-07-06-1145",
  "2026-07-06-1400", "2026-07-06-1700", "2026-07-07-0930", "2026-07-07-1130",
  "2026-07-07-1400", "2026-07-07-1600", "2026-07-07-1800", "2026-07-08-0930",
  "2026-07-08-1300", "2026-07-08-1500", "2026-07-09-0930", "2026-07-09-1145",
  "2026-07-09-1400", "2026-07-09-1530", "2026-07-10-0930", "2026-07-10-1000",
  "2026-07-10-1030", "2026-07-10-1200", "2026-07-10-1400", "2026-07-10-1800"
]);

/* ---------- shared helpers ---------- */

function corsHeaders(env, origin) {
  const allowed = env.ALLOW_ORIGIN || "";
  const allow = origin && allowed && origin === allowed ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": allow || "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function jsonResponse(obj, status, env, origin) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json", ...corsHeaders(env, origin) },
  });
}
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function cleanText(s, max) {
  return String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, max).trim();
}
function normUrl(s) {
  s = cleanText(s, 600);
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;          // already has a scheme
  if (/^\/\//.test(s)) return "https:" + s;        // protocol-relative //host
  if (/\s/.test(s) || !/\./.test(s)) return "";    // not domain-like → ignore
  return "https://" + s.replace(/^\/+/, "");        // bare domain/path → add https://
}
function cleanFilename(name) {
  return String(name || "file").split(/[\\/]/).pop()
    .replace(/[^A-Za-z0-9._-]/g, "_").replace(/_{2,}/g, "_")
    .replace(/^\.+/, "").slice(0, 80) || "file";
}
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToBytes(b64) {
  const clean = String(b64 || "").replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length === 0) return null;
  const bin = atob(clean);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function mimeForExt(ext) {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}

/* ---------- authentication (per-person) ---------- */

function getCredentials(env) {
  try { return JSON.parse(env.CREDENTIALS || "{}"); } catch { return {}; }
}
// returns { username, role, name } or null
function authenticate(body, env) {
  const creds = getCredentials(env);
  const u = cleanText(body && body.username, 80).toLowerCase();
  const rec = u && creds[u];
  if (!rec || typeof rec.password !== "string") return null;
  if (!safeEqual(body && body.password, rec.password)) return null;
  const role = rec.role === "admin" || rec.role === "teacher" ? rec.role : "student";
  return { username: u, role, name: String(rec.name || u) };
}

/* ---------- GitHub Contents API (materials) ---------- */

async function getSha(base, path, branch, headers) {
  const res = await fetch(`${base}/${path}?ref=${encodeURIComponent(branch)}`, { headers });
  if (res.ok) { const j = await res.json(); return j.sha; }
  return null;
}
async function putFile(base, path, contentB64, message, branch, headers) {
  const sha = await getSha(base, path, branch, headers);
  const res = await fetch(`${base}/${path}`, {
    method: "PUT", headers,
    body: JSON.stringify({ message, content: contentB64, branch, ...(sha ? { sha } : {}) }),
  });
  return res.ok;
}

/* ---------- /materials  (teachers + admin → GitHub) ---------- */

async function handleMaterials(body, env, auth) {
  if (auth.role !== "teacher" && auth.role !== "admin") {
    return { status: 403, payload: { ok: false, error: "Only teachers can submit session materials." } };
  }
  const session = String(body.session || "");
  if (!/^\d{4}-\d{2}-\d{2}-\d{4}$/.test(session))
    return { status: 400, payload: { ok: false, error: "Invalid session id." } };
  if (!KNOWN_SESSIONS.has(session))
    return { status: 400, payload: { ok: false, error: "Unknown session." } };

  const c = body.content || body;
  const abstract = cleanText(c.abstract, 4000);
  const bioNote = cleanText(c.bioNote != null ? c.bioNote : c.bio, 3000);
  const changesSummary = cleanText(body.changesSummary, 2000);
  const mode = /^(revision|new)$/.test(String(body.mode)) ? String(body.mode) : "revision";

  const bibliography = Array.isArray(c.bibliography) ? c.bibliography.map((x) => {
    if (x && typeof x === "object") {
      let citation = cleanText(x.citation, 600);
      const doi = cleanText(x.doi, 200), url = normUrl(x.url), nt = cleanText(x.notes, 400);
      if (!citation) citation = url || (doi ? "doi:" + doi : "") || nt;
      if (!citation) return null;
      const o = { citation };
      if (doi) o.doi = doi;
      if (url) o.url = url;
      if (nt && nt !== citation) o.notes = nt;
      return o;
    }
    const s = cleanText(x, 600); return s || null;
  }).filter(Boolean).slice(0, 60) : [];

  const resources = Array.isArray(c.resources) ? c.resources.map((r) => {
    let href = normUrl(r && r.href);
    let label = cleanText(r && r.label, 200);
    if (!href) { const fromLabel = normUrl(label); if (fromLabel) { href = fromLabel; label = ""; } }
    const o = { label: label || href, href };
    const type = cleanText(r && r.type, 60); if (type) o.type = type;
    const nt = cleanText(r && r.notes, 400); if (nt) o.notes = nt;
    return o;
  }).filter((r) => r.href).slice(0, 60) : [];

  const files = Array.isArray(c.files) ? c.files : [];
  if (files.length > MAX_FILES) return { status: 400, payload: { ok: false, error: "Too many files." } };

  const owner = env.GITHUB_OWNER, repo = env.GITHUB_REPO, branch = env.GITHUB_BRANCH || "main";
  if (!owner || !repo || !env.GITHUB_TOKEN)
    return { status: 500, payload: { ok: false, error: "Server is not configured." } };
  const base = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const ghHeaders = {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "Accept": "application/vnd.github+json",
    "User-Agent": "vssdph-fn", "Content-Type": "application/json",
  };

  const fileEntries = [];
  for (const f of files) {
    if (f && !f.dataBase64 && f.href) {
      const href = String(f.href);
      if (!new RegExp("^materials/" + session + "/[A-Za-z0-9._-]+$").test(href))
        return { status: 400, payload: { ok: false, error: "Invalid file reference." } };
      const ext0 = (href.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXT.includes(ext0))
        return { status: 400, payload: { ok: false, error: "File type not allowed." } };
      fileEntries.push({ label: cleanText(f.label || href.split("/").pop(), 200), href, type: ext0 });
      continue;
    }
    const safeName = cleanFilename(f && f.name);
    const ext = (safeName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      return { status: 400, payload: { ok: false, error: `File type not allowed: ${safeName}` } };
    const b64 = String((f && f.dataBase64) || "").replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length === 0)
      return { status: 400, payload: { ok: false, error: `Invalid file data: ${safeName}` } };
    if (Math.floor(b64.length * 3 / 4) > MAX_FILE_BYTES)
      return { status: 400, payload: { ok: false, error: `File too large: ${safeName}` } };
    const path = `materials/${session}/${safeName}`;
    const ok = await putFile(base, path, b64, `Materials by ${auth.name}: ${path}`, branch, ghHeaders);
    if (!ok) return { status: 502, payload: { ok: false, error: `Could not store ${safeName}.` } };
    fileEntries.push({ label: cleanText((f && f.label) || safeName, 200), href: path, type: ext });
  }

  const payload = {
    session, status: "published",
    ...(abstract ? { abstract } : {}),
    ...(bioNote ? { bioNote } : {}),
    ...(bibliography.length ? { bibliography } : {}),
    ...(resources.length ? { resources } : {}),
    ...(fileEntries.length ? { files: fileEntries } : {}),
    ...(changesSummary ? { changesSummary } : {}),
    mode, submittedAt: new Date().toISOString(),
  };
  (Array.isArray(body.clear) ? body.clear : []).forEach((k) => {
    if (k === "abstract" || k === "bioNote") delete payload[k];
  });
  const ok = await putFile(
    base, `content/${session}.json`, utf8ToBase64(JSON.stringify(payload, null, 2) + "\n"),
    `Materials update (${session}) by ${auth.name}`, branch, ghHeaders
  );
  if (!ok) return { status: 502, payload: { ok: false, error: "Could not store the submission." } };
  return { status: 200, payload: { ok: true, message: "Your session materials are now live." } };
}

/* ---------- journal helpers ---------- */

function newId() {
  return new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14) + "-" +
    Math.random().toString(36).slice(2, 8);
}
function rowToPost(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    author: r.author_name,
    authorUsername: r.author_username,
    role: r.role,
    chapter: r.chapter,
    related: r.related || null,
    title: r.title || null,
    body: r.body || null,
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    photo: r.photo_type ? { path: "journal/photo/" + r.id, w: r.photo_w || null, h: r.photo_h || null } : null,
  };
}

/* ---------- POST /journal  (any user → D1; photo stored as base64 in D1) ---------- */

async function handleJournalSubmit(body, env, auth) {
  if (!env.DB) return { status: 500, payload: { ok: false, error: "Server is not configured." } };

  const chapter = CHAPTERS.has(String(body.chapter)) ? String(body.chapter) : "school";
  const title = cleanText(body.title, 200);
  const text = cleanText(body.body, 4000);
  const related = cleanText(body.related, 80);
  let lat = null, lng = null;
  if (body.lat != null && body.lng != null) {
    const la = Number(body.lat), ln = Number(body.lng);
    if (isFinite(la) && isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180) { lat = la; lng = ln; }
  }

  const id = newId();
  let photo_data = null, photo_type = null, photo_w = null, photo_h = null;
  if (body.photoBase64) {
    if (body.consent !== true)
      return { status: 400, payload: { ok: false, error: "Please confirm the photo consent box." } };
    let ext = cleanText(body.photoExt, 5).toLowerCase().replace(/[^a-z]/g, "");
    if (!PHOTO_EXT.includes(ext)) ext = "jpg";
    const clean = String(body.photoBase64).replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length === 0)
      return { status: 400, payload: { ok: false, error: "Invalid photo data." } };
    if (Math.floor(clean.length * 3 / 4) > MAX_PHOTO_BYTES)
      return { status: 400, payload: { ok: false, error: "Photo too large." } };
    photo_type = mimeForExt(ext);
    photo_data = clean;
    const w = parseInt(body.photoW, 10), h = parseInt(body.photoH, 10);
    photo_w = isFinite(w) && w > 0 ? w : null;
    photo_h = isFinite(h) && h > 0 ? h : null;
  }

  if (!text && !title && !photo_data)
    return { status: 400, payload: { ok: false, error: "Write something or add a photo." } };

  const created_at = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO journal (id, created_at, author_username, author_name, role, chapter, related, title, body, lat, lng, photo_data, photo_type, photo_w, photo_h) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, created_at, auth.username, auth.name, auth.role, chapter,
    related || null, title || null, text || null, lat, lng, photo_data, photo_type, photo_w, photo_h
  ).run();

  return {
    status: 200,
    payload: {
      ok: true, message: "Posted.",
      post: rowToPost({
        id, created_at, author_username: auth.username, author_name: auth.name, role: auth.role,
        chapter, related, title, body: text, lat, lng, photo_type, photo_w, photo_h,
      }),
    },
  };
}

/* ---------- GET /journal  (public list) ---------- */

async function handleJournalList(env) {
  if (!env.DB) return { status: 500, payload: { ok: false, error: "Not configured." } };
  const rs = await env.DB.prepare(
    "SELECT id, created_at, author_username, author_name, role, chapter, related, title, body, lat, lng, photo_type, photo_w, photo_h " +
    "FROM journal ORDER BY created_at ASC"
  ).all();
  const posts = (rs.results || []).map(rowToPost);
  return { status: 200, payload: { ok: true, posts } };
}

/* ---------- GET /journal/photo/ID  (public; serves base64 from D1) ---------- */

async function handleJournalPhoto(env, id, origin) {
  if (!env.DB) return new Response("Not found", { status: 404 });
  const row = await env.DB.prepare("SELECT photo_data, photo_type FROM journal WHERE id = ?").bind(id).first();
  if (!row || !row.photo_data) return new Response("Not found", { status: 404 });
  const bytes = base64ToBytes(row.photo_data);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": row.photo_type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      ...corsHeaders(env, origin),
    },
  });
}

/* ---------- POST /journal/remove  (author or admin) ---------- */

async function handleJournalRemove(body, env, auth) {
  if (!env.DB) return { status: 500, payload: { ok: false, error: "Not configured." } };
  const id = cleanText(body.id, 80);
  if (!id) return { status: 400, payload: { ok: false, error: "Missing id." } };
  const row = await env.DB.prepare("SELECT author_username FROM journal WHERE id = ?").bind(id).first();
  if (!row) return { status: 404, payload: { ok: false, error: "Post not found." } };
  if (auth.role !== "admin" && row.author_username !== auth.username)
    return { status: 403, payload: { ok: false, error: "You can only remove your own posts." } };
  await env.DB.prepare("DELETE FROM journal WHERE id = ?").bind(id).run();
  return { status: 200, payload: { ok: true, message: "Removed." } };
}

/* ---------- router ---------- */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });

    // public GET routes
    if (request.method === "GET") {
      if (path === "/journal") {
        const { status, payload } = await handleJournalList(env);
        return jsonResponse(payload, status, env, origin);
      }
      if (path.startsWith("/journal/photo/")) {
        const id = decodeURIComponent(path.slice("/journal/photo/".length));
        return handleJournalPhoto(env, id, origin);
      }
      return jsonResponse({ ok: false, error: "Not found." }, 404, env, origin);
    }

    if (request.method !== "POST")
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405, env, origin);

    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ ok: false, error: "Invalid request." }, 400, env, origin); }

    // all POST routes require a valid login
    const auth = authenticate(body, env);
    if (!auth) return jsonResponse({ ok: false, error: "Incorrect username or password." }, 401, env, origin);

    try {
      let result;
      if (path === "/whoami") result = { status: 200, payload: { ok: true, username: auth.username, role: auth.role, name: auth.name } };
      else if (path === "/journal") result = await handleJournalSubmit(body, env, auth);
      else if (path === "/journal/remove") result = await handleJournalRemove(body, env, auth);
      else if (path === "/materials" || path === "/") result = await handleMaterials(body, env, auth);
      else result = { status: 404, payload: { ok: false, error: "Not found." } };
      return jsonResponse(result.payload, result.status, env, origin);
    } catch (e) {
      return jsonResponse({ ok: false, error: "Unexpected server error." }, 500, env, origin);
    }
  },
};
