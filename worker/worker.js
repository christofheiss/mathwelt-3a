// MathWelt 3A – Cloudflare Worker: nimmt verschlüsselte Spielstände an und legt sie
// im privaten GitHub-Repo ab (saves/<ID>.mw3a). Der Worker kann die Spielstände nicht lesen.
// Zudem verwaltet er die Freigabe der Welten (worlds.json im selben Repo):
//   GET  /worlds            Freigabe lesen (öffentlich, enthält keine Daten von SuS, nur die Coin-Summe der Klasse)
//   POST /worlds/challenge  Aufgabe, die nur mit dem privaten Schlüssel im Dongle lösbar ist
//   POST /worlds            Freigabe ändern, mit der gelösten Aufgabe
// Und er gibt den eigenen, weiterhin verschlüsselten Spielstand zurück, damit es auf einem anderen Gerät weitergeht:
//   POST /load              braucht den gültigen Code der Schülerin / des Schülers
// Einrichtung: siehe worker/README.md
//
// Variablen:  DATA_REPO       z. B. christofheiss/mathwelt-3a-daten
//             CONFIG_URL      öffentliche js/config.js mit den Prüfwerten der Codes
//             ALLOWED_ORIGINS erlaubte Websites, durch Komma getrennt
// Geheimnis:  GITHUB_TOKEN    Schreibzugriff nur auf DATA_REPO

const MAX_BYTES = 5 * 1024 * 1024;
const HASH_CACHE_MS = 5 * 60 * 1000;
const WRITE_ATTEMPTS = 6;   // GitHub lehnt gleichzeitige Schreibzugriffe ab, z. B. am Ende einer Lektion

const WORLD_IDS = ['gl', 'aj'];
// Weitere Schalter in worlds.json: einzelne Gebäude, Boss pro Welt (alles true/false) und die Coins der Klasse (Zahl)
const SWITCH_IDS = [...WORLD_IDS, 'boss_gl', 'boss_aj',
  'waage', 'umkehr', 'probe', 'klammer', 'raetsel', 'detektiv', 'pyramide', 'prozent', 'zeit', 'fakten'];
const WORLDS_CACHE_MS = 30 * 1000;
const CHALLENGE_MS = 2 * 60 * 1000;

let configCache = { url: null, at: 0, hashes: null, publicKey: null };
let worldsCache = { at: 0, worlds: null };

// Muss zu normalizeToken und tokenHash in js/crypto.js passen
function normalizeToken(s) {
  const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return t.slice(0, 4).replace(/O/g, '0').replace(/[IL]/g, '1') + t.slice(4).replace(/0/g, 'O').replace(/1/g, 'I');
}
async function tokenHash(norm) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mathwelt-3a|' + norm));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function publicConfig(env) {
  const now = Date.now();
  if (configCache.url === env.CONFIG_URL && configCache.hashes && now - configCache.at < HASH_CACHE_MS) return configCache;
  const res = await fetch(env.CONFIG_URL);
  if (!res.ok) throw new Error('config ' + res.status);
  const text = await res.text();
  const hashes = new Set(text.match(/\b[0-9a-f]{64}\b/g) || []);
  if (!hashes.size) throw new Error('config ohne Prüfwerte');
  const key = text.match(/teacherPublicKey:\s*(\{.*\})\s*,\s*$/m);
  configCache = { url: env.CONFIG_URL, at: now, hashes, publicKey: key ? JSON.parse(key[1]) : null };
  return configCache;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
const reply = (status, body, headers) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Cache-Control': 'no-store' } });

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

const githubHeaders = (env, accept = 'application/vnd.github+json') => ({
  Authorization: `Bearer ${env.GITHUB_TOKEN}`,
  Accept: accept,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'mathwelt-3a-worker',
});

async function writeToGitHub(env, path, text, message) {
  const url = `https://api.github.com/repos/${env.DATA_REPO}/contents/${path}`;
  const headers = githubHeaders(env);
  const content = toBase64(text);
  let last = 0;
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 300 * 2 ** (attempt - 1) + Math.random() * 400));
    const cur = await fetch(url, { headers });
    if (!cur.ok && cur.status !== 404) { last = cur.status; if (cur.status < 500 && cur.status !== 403 && cur.status !== 429) break; continue; }
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const put = await fetch(url, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, ...(sha ? { sha } : {}) }),
    });
    if (put.ok) return;
    last = put.status;
    const retry = put.status === 409 || put.status === 422 || put.status === 403 || put.status === 429 || put.status >= 500;
    if (!retry) break;
  }
  throw new Error('GitHub ' + last);
}

// ---------- Welten ----------
function cleanWorlds(w) {
  const out = Object.fromEntries(SWITCH_IDS.filter(id => typeof w?.[id] === 'boolean').map(id => [id, w[id]]));
  if (Number.isInteger(w?.klasse) && w.klasse >= 0 && w.klasse < 1e7) out.klasse = w.klasse;
  return out;
}
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

async function readWorlds(env) {
  if (worldsCache.worlds && Date.now() - worldsCache.at < WORLDS_CACHE_MS) return worldsCache.worlds;
  const res = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/worlds.json`, { headers: githubHeaders(env, 'application/vnd.github.raw+json') });
  if (!res.ok && res.status !== 404) throw new Error('GitHub ' + res.status);
  const worlds = res.ok ? cleanWorlds(JSON.parse(await res.text())) : {};
  worldsCache = { at: Date.now(), worlds };
  return worlds;
}
// Der Worker merkt sich nichts: Die Quittung (ticket) ist mit dem Geheimnis des Workers signiert
const ticketKey = (env) => crypto.subtle.importKey('raw', new TextEncoder().encode('mathwelt-3a-worlds|' + env.GITHUB_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
async function makeChallenge(env) {
  const { publicKey } = await publicConfig(env);
  if (!publicKey) throw new Error('kein öffentlicher Schlüssel');
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const pub = await crypto.subtle.importKey('jwk', publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const exp = Date.now() + CHALLENGE_MS;
  const sig = await crypto.subtle.sign('HMAC', await ticketKey(env), new TextEncoder().encode(`${exp}|${b64(nonce)}`));
  return { challenge: b64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, nonce)), exp, ticket: b64(sig) };
}
async function checkAnswer(env, { answer, exp, ticket }) {
  if (typeof answer !== 'string' || typeof ticket !== 'string' || typeof exp !== 'number' || exp < Date.now()) return false;
  try {
    const sig = Uint8Array.from(atob(ticket), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', await ticketKey(env), sig, new TextEncoder().encode(`${exp}|${answer}`));
  } catch { return false; }
}
async function handleWorlds(request, env, headers, path) {
  if (path === '/worlds' && request.method === 'GET') {
    try { return reply(200, { worlds: await readWorlds(env) }, headers); }
    catch { return reply(502, { error: 'github' }, headers); }
  }
  if (request.method !== 'POST') return reply(405, { error: 'method' }, headers);
  if (path === '/worlds/challenge') {
    try { return reply(200, await makeChallenge(env), headers); }
    catch { return reply(503, { error: 'config' }, headers); }
  }
  let body;
  try { body = JSON.parse(await request.text()); } catch { return reply(400, { error: 'json' }, headers); }
  if (!await checkAnswer(env, body)) return reply(403, { error: 'challenge' }, headers);
  const worlds = cleanWorlds(body.worlds);
  try { await writeToGitHub(env, 'worlds.json', JSON.stringify(worlds), 'Welten: ' + JSON.stringify(worlds)); }
  catch { return reply(502, { error: 'github' }, headers); }
  worldsCache = { at: Date.now(), worlds };
  return reply(200, { worlds }, headers);
}

// ---------- Eigenen Spielstand holen ----------
async function handleLoad(request, env, headers) {
  if (request.method !== 'POST') return reply(405, { error: 'method' }, headers);
  let payload;
  try { payload = JSON.parse(await request.text()); } catch { return reply(400, { error: 'json' }, headers); }
  const norm = normalizeToken(payload.token);
  let hashes;
  try { ({ hashes } = await publicConfig(env)); }
  catch { return reply(503, { error: 'config' }, headers); }
  if (!hashes.has(await tokenHash(norm))) return reply(401, { error: 'token' }, headers);
  const res = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/saves/${norm.slice(0, 4)}.mw3a`, { headers: githubHeaders(env, 'application/vnd.github.raw+json') });
  if (res.status === 404) return reply(200, { file: null }, headers);
  if (!res.ok) return reply(502, { error: 'github' }, headers);
  return reply(200, { file: JSON.parse(await res.text()) }, headers);
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (path === '/worlds' || path === '/worlds/challenge') return handleWorlds(request, env, headers, path);
    if (path === '/load') return handleLoad(request, env, headers);
    if (request.method !== 'POST') return reply(405, { error: 'method' }, headers);

    if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) return reply(413, { error: 'too_large' }, headers);
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return reply(413, { error: 'too_large' }, headers);
    let payload;
    try { payload = JSON.parse(raw); } catch { return reply(400, { error: 'json' }, headers); }

    const norm = normalizeToken(payload.token);
    let hashes;
    try { ({ hashes } = await publicConfig(env)); }
    catch { return reply(503, { error: 'config' }, headers); }
    if (!hashes.has(await tokenHash(norm))) return reply(401, { error: 'token' }, headers);

    const id = norm.slice(0, 4);
    const file = cleanFile(payload.file, id);
    if (!file) return reply(400, { error: 'file' }, headers);

    try { await writeToGitHub(env, `saves/${id}.mw3a`, JSON.stringify(file), `Spielstand ${id}`); }
    catch { return reply(502, { error: 'github' }, headers); }
    return reply(200, { ok: true, id, saved: file.saved }, headers);
  },
};
