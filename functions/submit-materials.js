/* ============================================================================
   Faculty materials submission — serverless function  (OPTIONAL / REFERENCE)
   ----------------------------------------------------------------------------
   This is an OPTIONAL, reference implementation. It is NOT part of the static
   site and is INACTIVE until you (a) deploy it and (b) set its public URL as
   SUBMIT_ENDPOINT in assets/editor.js. While SUBMIT_ENDPOINT is empty,
   contribute.html stays a download-only package builder and this file does
   nothing. Nothing here is a secret; all secrets come from the environment.

   Receives a submission from contribute.html, verifies the shared faculty
   password SERVER-SIDE, validates and sanitises everything, then writes the
   content + any files to a *moderation branch* in the repository via the
   GitHub REST API. New material is always saved as status:"pending"; the
   public site never shows it until the organiser merges the branch.

   SECRETS — set these in the deployment environment, NEVER in the repo or in
   client JavaScript:
     FACULTY_UPLOAD_PASSWORD   the shared faculty password (checked here)
     GITHUB_TOKEN              fine-grained PAT, scoped to THIS repo only,
                               Contents: Read and write (least privilege)
   CONFIG (env vars, not secret):
     GITHUB_OWNER              e.g. "vedph"
     GITHUB_REPO               e.g. "vessdph2026"
     GITHUB_BRANCH             e.g. "materials-submissions"   (must already exist)
     ALLOW_ORIGIN              e.g. "https://vedph.github.io" (the public site)

   INPUT — the client POSTs a proposed-revision package:
     { password, session, mode, changesSummary,
       content: { abstract, bioNote, bibliography[], resources[], files[] } }
   (a flat legacy body is also accepted). The package is written as a PROPOSED
   revision with status:"pending" and is never auto-published.

   This file is written as a Cloudflare Worker (export default { fetch }).
   To deploy on Netlify Functions or Cloudflare Pages Functions, keep
   handleSubmit() as-is and replace only the thin wrapper at the bottom
   (see the notes there).
   ========================================================================== */

const MAX_FILE_BYTES = 10 * 1024 * 1024;   // 10 MB per file (after client processing)
const MAX_FILES = 12;
const ALLOWED_EXT = ["pdf", "md", "txt", "jpg", "jpeg", "png", "webp"];

// The 24 real sessions of the 2026 programme. Submissions are accepted only for these.
// Keep in sync with data/program.js (tools/check-site.js validates the site side).
const KNOWN_SESSIONS = new Set([
  "2026-07-06-0930", "2026-07-06-1000", "2026-07-06-1100", "2026-07-06-1145",
  "2026-07-06-1400", "2026-07-06-1700", "2026-07-07-0930", "2026-07-07-1130",
  "2026-07-07-1400", "2026-07-07-1600", "2026-07-07-1800", "2026-07-08-0930",
  "2026-07-08-1300", "2026-07-08-1430", "2026-07-09-0930", "2026-07-09-1145",
  "2026-07-09-1400", "2026-07-09-1530", "2026-07-10-0930", "2026-07-10-1000",
  "2026-07-10-1030", "2026-07-10-1200", "2026-07-10-1400", "2026-07-10-1800"
]);

/* ---------- helpers ---------- */

function corsHeaders(env, origin) {
  const allowed = env.ALLOW_ORIGIN || "";
  // echo the origin only if it matches the configured site; otherwise send the configured one
  const allow = origin && allowed && origin === allowed ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": allow || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(obj, status, env, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env, origin) },
  });
}

// constant-time string compare (avoids leaking the password via timing)
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
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "") // control chars
    .slice(0, max)
    .trim();
}

function cleanFilename(name) {
  return String(name || "file")
    .split(/[\\/]/).pop()                     // drop any path
    .replace(/[^A-Za-z0-9._-]/g, "_")          // safe charset only
    .replace(/_{2,}/g, "_")
    .replace(/^\.+/, "")                        // no leading dots
    .slice(0, 80) || "file";
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// GitHub Contents API: read current file SHA (needed to update an existing file)
async function getSha(base, path, branch, headers) {
  const res = await fetch(`${base}/${path}?ref=${encodeURIComponent(branch)}`, { headers });
  if (res.ok) { const j = await res.json(); return j.sha; }
  return null;
}

async function putFile(base, path, contentB64, message, branch, headers) {
  const sha = await getSha(base, path, branch, headers);
  const res = await fetch(`${base}/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content: contentB64, branch, ...(sha ? { sha } : {}) }),
  });
  return res.ok;
}

/* ---------- core (platform-independent) ---------- */

async function handleSubmit(body, env) {
  // 1. password — verified here, server-side, never sent to the client
  if (!env.FACULTY_UPLOAD_PASSWORD || !safeEqual(body.password, env.FACULTY_UPLOAD_PASSWORD)) {
    return { status: 401, payload: { ok: false, error: "Incorrect password." } };
  }

  // 2. session id — strict format check (YYYY-MM-DD-HHMM) + must be a real programme session
  const session = String(body.session || "");
  if (!/^\d{4}-\d{2}-\d{2}-\d{4}$/.test(session)) {
    return { status: 400, payload: { ok: false, error: "Invalid session id." } };
  }
  if (!KNOWN_SESSIONS.has(session)) {
    return { status: 400, payload: { ok: false, error: "Unknown session." } };
  }

  // 3. content envelope (sanitise — defence in depth; the client also escapes on render).
  //    Accept the revision envelope { content:{...}, changesSummary, mode } or a flat legacy body.
  const c = body.content || body;
  const abstract = cleanText(c.abstract, 4000);
  const bioNote = cleanText(c.bioNote != null ? c.bioNote : c.bio, 1500);
  const changesSummary = cleanText(body.changesSummary, 2000);
  const mode = /^(revision|new)$/.test(String(body.mode)) ? String(body.mode) : "revision";

  const bibliography = Array.isArray(c.bibliography)
    ? c.bibliography.map((x) => {
        if (x && typeof x === "object") {                 // structured {citation, doi?, url?, notes?}
          let citation = cleanText(x.citation, 600);
          const doi = cleanText(x.doi, 200);
          const url = cleanText(x.url, 600);
          const nt = cleanText(x.notes, 400);
          if (!citation) citation = (/^https?:\/\//i.test(url) ? url : "") || (doi ? "doi:" + doi : "") || nt;
          if (!citation) return null;                       // truly empty row → drop; a bare note is kept
          const o = { citation };
          if (doi) o.doi = doi;
          if (/^https?:\/\//i.test(url)) o.url = url;
          if (nt && nt !== citation) o.notes = nt;
          return o;
        }
        const s = cleanText(x, 600); return s || null;     // legacy plain string
      }).filter(Boolean).slice(0, 60) : [];

  const resources = Array.isArray(c.resources)
    ? c.resources.map((r) => {
        const href = cleanText(r && r.href, 600);
        const o = { label: cleanText(r && r.label, 200) || href, href };
        const type = cleanText(r && r.type, 60); if (type) o.type = type;
        const nt = cleanText(r && r.notes, 400); if (nt) o.notes = nt;
        return o;
      }).filter((r) => /^https?:\/\//i.test(r.href)).slice(0, 60) : [];

  // 4. validate files
  const files = Array.isArray(c.files) ? c.files : [];
  if (files.length > MAX_FILES) {
    return { status: 400, payload: { ok: false, error: "Too many files." } };
  }

  const owner = env.GITHUB_OWNER, repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || "materials-submissions";
  if (!owner || !repo || !env.GITHUB_TOKEN) {
    return { status: 500, payload: { ok: false, error: "Server is not configured." } };
  }
  const base = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const ghHeaders = {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "vssdph-materials-fn",
    "Content-Type": "application/json",
  };

  const fileEntries = [];
  for (const f of files) {
    // (a) existing file kept on update: a ref under this session's own folder, no new bytes
    if (f && !f.dataBase64 && f.href) {
      const href = String(f.href);
      if (!new RegExp("^materials/" + session + "/[A-Za-z0-9._-]+$").test(href)) {
        return { status: 400, payload: { ok: false, error: "Invalid file reference." } };
      }
      const ext0 = (href.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXT.includes(ext0)) {
        return { status: 400, payload: { ok: false, error: "File type not allowed." } };
      }
      fileEntries.push({ label: cleanText(f.label || href.split("/").pop(), 200), href, type: ext0 });
      continue;
    }
    // (b) new upload with bytes
    const safeName = cleanFilename(f && f.name);
    const ext = (safeName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return { status: 400, payload: { ok: false, error: `File type not allowed: ${safeName}` } };
    }
    const b64 = String((f && f.dataBase64) || "").replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length === 0) {
      return { status: 400, payload: { ok: false, error: `Invalid file data: ${safeName}` } };
    }
    if (Math.floor(b64.length * 3 / 4) > MAX_FILE_BYTES) {
      return { status: 400, payload: { ok: false, error: `File too large: ${safeName}` } };
    }
    const path = `materials/${session}/${safeName}`;
    const ok = await putFile(base, path, b64, `Faculty submission (pending): ${path}`, branch, ghHeaders);
    if (!ok) return { status: 502, payload: { ok: false, error: `Could not store ${safeName}.` } };
    fileEntries.push({ label: cleanText((f && f.label) || safeName, 200), href: path, type: ext });
  }

  // 5. write content/<session>.json with status:"pending" (a PROPOSED revision; never auto-published)
  const payload = {
    session,
    status: "pending",
    ...(abstract ? { abstract } : {}),
    ...(bioNote ? { bioNote } : {}),
    ...(bibliography.length ? { bibliography } : {}),
    ...(resources.length ? { resources } : {}),
    ...(fileEntries.length ? { files: fileEntries } : {}),
    ...(changesSummary ? { changesSummary } : {}),
    mode,
    submittedAt: new Date().toISOString(),
  };
  // honor explicit field clears from the revision package (content already omits them; defence in depth)
  (Array.isArray(body.clear) ? body.clear : []).forEach((k) => {
    if (k === "abstract" || k === "bioNote") delete payload[k];
  });
  const contentPath = `content/${session}.json`;
  const ok = await putFile(
    base, contentPath, utf8ToBase64(JSON.stringify(payload, null, 2) + "\n"),
    `Faculty proposed revision (pending): ${session}`, branch, ghHeaders
  );
  if (!ok) return { status: 502, payload: { ok: false, error: "Could not store the submission." } };

  return { status: 200, payload: { ok: true, message: "Proposed revision submitted for review." } };
}

/* ---------- Cloudflare Worker wrapper ----------
   Netlify Functions:  export const handler = async (event) => { ... parse
     JSON.parse(event.body), call handleSubmit(body, process.env), return
     { statusCode, headers, body: JSON.stringify(payload) } }.
   Cloudflare Pages Functions: export async function onRequestPost(context) {
     const body = await context.request.json();
     const r = await handleSubmit(body, context.env); ... }.
   The core handleSubmit() above does not change.                              */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405, env, origin);
    }
    let body;
    try { body = await request.json(); }
    catch { return jsonResponse({ ok: false, error: "Invalid request." }, 400, env, origin); }

    try {
      const { status, payload } = await handleSubmit(body, env);
      return jsonResponse(payload, status, env, origin);
    } catch (e) {
      return jsonResponse({ ok: false, error: "Unexpected server error." }, 500, env, origin);
    }
  },
};
