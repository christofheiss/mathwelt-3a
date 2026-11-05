// MathWelt 3A – Cloudflare Worker: nimmt verschlüsselte Spielstände an und legt sie
// im privaten GitHub-Repo ab (saves/<ID>.mw3a). Der Worker kann die Spielstände nicht lesen.
// Einrichtung: siehe worker/README.md
//
// Variablen:  DATA_REPO       z. B. christofheiss/mathwelt-3a-daten
//             CONFIG_URL      öffentliche js/config.js mit den Prüfwerten der Codes
//             ALLOWED_ORIGINS erlaubte Websites, durch Komma getrennt
// Geheimnis:  GITHUB_TOKEN    Schreibzugriff nur auf DATA_REPO

const MAX_BYTES = 5 * 1024 * 1024;
const HASH_CACHE_MS = 5 * 60 * 1000;
const WRITE_ATTEMPTS = 6;   // GitHub lehnt gleichzeitige Schreibzugriffe ab, z. B. am Ende einer Lektion

let hashCache = { url: null, at: 0, hashes: null };

// Muss zu normalizeToken und tokenHash in js/crypto.js passen
function normalizeToken(s) {
  const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return t.slice(0, 4).replace(/O/g, '0').replace(/[IL]/g, '1') + t.slice(4).replace(/0/g, 'O').replace(/1/g, 'I');
}
async function tokenHash(norm) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mathwelt-3a|' + norm));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validHashes(env) {
  const now = Date.now();
  if (hashCache.url === env.CONFIG_URL && hashCache.hashes && now - hashCache.at < HASH_CACHE_MS) return hashCache.hashes;
  const res = await fetch(env.CONFIG_URL);
  if (!res.ok) throw new Error('config ' + res.status);
  const hashes = new Set((await res.text()).match(/\b[0-9a-f]{64}\b/g) || []);
  if (!hashes.size) throw new Error('config ohne Prüfwerte');
  hashCache = { url: env.CONFIG_URL, at: now, hashes };
  return hashes;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
const reply = (status, body, headers) => new Response(JSON.stringify(body), { status, headers });

const isBox = (b) => b && typeof b.iv === 'string' && typeof b.ct === 'string';
function cleanFile(file, id) {
  if (!file || file.app !== 'mathwelt-3a' || file.id !== id) return null;
  if (typeof file.saved !== 'number' || typeof file.kT !== 'string' || !isBox(file.body) || !isBox(file.kS)) return null;
  // Nur bekannte Felder ablegen
  return { app: file.app, v: file.v, id: file.id, saved: file.saved, body: file.body, kS: file.kS, kT: file.kT };
}

function toBase64(text) {
  let s = '';
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function writeToGitHub(env, id, text) {
  const url = `https://api.github.com/repos/${env.DATA_REPO}/contents/saves/${id}.mw3a`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mathwelt-3a-worker',
  };
  const content = toBase64(text);
  let last = 0;
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 300 * 2 ** (attempt - 1) + Math.random() * 400));
    const cur = await fetch(url, { headers });
    if (!cur.ok && cur.status !== 404) { last = cur.status; if (cur.status < 500 && cur.status !== 403 && cur.status !== 429) break; continue; }
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const put = await fetch(url, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Spielstand ${id}`, content, ...(sha ? { sha } : {}) }),
    });
    if (put.ok) return;
    last = put.status;
    const retry = put.status === 409 || put.status === 422 || put.status === 403 || put.status === 429 || put.status >= 500;
    if (!retry) break;
  }
  throw new Error('GitHub ' + last);
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'method' }, headers);

    if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) return reply(413, { error: 'too_large' }, headers);
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return reply(413, { error: 'too_large' }, headers);
    let payload;
    try { payload = JSON.parse(raw); } catch { return reply(400, { error: 'json' }, headers); }

    const norm = normalizeToken(payload.token);
    let hashes;
    try { hashes = await validHashes(env); }
    catch { return reply(503, { error: 'config' }, headers); }
    if (!hashes.has(await tokenHash(norm))) return reply(401, { error: 'token' }, headers);

    const id = norm.slice(0, 4);
    const file = cleanFile(payload.file, id);
    if (!file) return reply(400, { error: 'file' }, headers);

    try { await writeToGitHub(env, id, JSON.stringify(file)); }
    catch { return reply(502, { error: 'github' }, headers); }
    return reply(200, { ok: true, id, saved: file.saved }, headers);
  },
};
