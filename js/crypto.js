// MathWelt 3A – Verschlüsselung (Web Crypto, läuft im Browser ohne Server)
//
// Spielstand-Datei:   Inhalt mit AES-GCM verschlüsselt. Der AES-Schlüssel liegt zweimal bei:
//   1) verschlüsselt mit dem Schlüssel aus dem Token der Schülerin / des Schülers (zum Weiterspielen)
//   2) verschlüsselt mit dem öffentlichen Schlüssel der Lehrperson (nur mit dem Dongle lesbar)
// Lehrer-Dongle:      privater Schlüssel, mit einem Passwort verschlüsselt (PBKDF2 + AES-GCM)

const C = globalThis.crypto;
const S = C.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();
export const PBKDF2_ITER = 150000;

export const b64 = {
  from(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); },
  to(str) { const s = atob(str); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
};
export const randomBytes = (n) => C.getRandomValues(new Uint8Array(n));

// Token: z. B. «3A07-K7QM-X2PD-9HTR» (ohne verwechselbare Zeichen)
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function normalizeToken(s) {
  const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // In der ID (erste 4 Zeichen) O als 0 und I/L als 1 lesen; im Code kommen 0, 1, O, I nicht vor
  return t.slice(0, 4).replace(/O/g, '0').replace(/[IL]/g, '1') + t.slice(4).replace(/0/g, 'O').replace(/1/g, 'I');
}
export function formatToken(raw) { return raw.match(/.{1,4}/g).join('-'); }
export function tokenId(token) { return normalizeToken(token).slice(0, 4); }
export function newToken(id) {
  const r = randomBytes(12); let s = '';
  for (const b of r) s += ALPH[b % ALPH.length];
  return formatToken(normalizeToken(id).padEnd(4, 'X').slice(0, 4) + s);
}
export async function sha256Hex(text) {
  const h = await S.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const tokenHash = (token) => sha256Hex('mathwelt-3a|' + normalizeToken(token));

async function pbkdf2Key(secret, salt, usages = ['encrypt', 'decrypt']) {
  const base = await S.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return S.deriveKey({ name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usages);
}
export const studentKey = (token) => pbkdf2Key(normalizeToken(token), enc.encode('mathwelt-3a-student|' + tokenId(token)));

async function aesEncrypt(key, bytes) { const iv = randomBytes(12); const ct = await S.encrypt({ name: 'AES-GCM', iv }, key, bytes); return { iv: b64.from(iv), ct: b64.from(ct) }; }
async function aesDecrypt(key, box) { return new Uint8Array(await S.decrypt({ name: 'AES-GCM', iv: b64.to(box.iv) }, key, b64.to(box.ct))); }

// ---------- Spielstand ----------
export async function sealSave(data, sKey, teacherPublicJwk) {
  const raw = randomBytes(32);
  const dataKey = await S.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const body = await aesEncrypt(dataKey, enc.encode(JSON.stringify(data)));
  const forStudent = await aesEncrypt(sKey, raw);
  const pub = await S.importKey('jwk', teacherPublicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const forTeacher = b64.from(await S.encrypt({ name: 'RSA-OAEP' }, pub, raw));
  return { app: 'mathwelt-3a', v: 1, id: data.id, saved: data.lastSave, body, kS: forStudent, kT: forTeacher };
}
export async function openSaveAsStudent(file, sKey) {
  const raw = await aesDecrypt(sKey, file.kS);
  const k = await S.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  return JSON.parse(dec.decode(await aesDecrypt(k, file.body)));
}
export async function openSaveAsTeacher(file, privKey) {
  const raw = new Uint8Array(await S.decrypt({ name: 'RSA-OAEP' }, privKey, b64.to(file.kT)));
  const k = await S.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  return JSON.parse(dec.decode(await aesDecrypt(k, file.body)));
}

// ---------- Lehrer-Dongle ----------
export async function makeDongle(content, password) {
  const salt = randomBytes(16);
  const key = await pbkdf2Key(password, salt);
  const box = await aesEncrypt(key, enc.encode(JSON.stringify(content)));
  return { app: 'mathwelt-3a-dongle', v: 1, salt: b64.from(salt), iter: PBKDF2_ITER, ...box };
}
export async function openDongle(dongle, password) {
  if (dongle.app !== 'mathwelt-3a-dongle') throw new Error('Das ist keine Dongle-Datei von MathWelt 3A.');
  const key = await pbkdf2Key(password, b64.to(dongle.salt));
  let bytes;
  try { bytes = await aesDecrypt(key, dongle); } catch { throw new Error('Das Passwort ist falsch.'); }
  return JSON.parse(dec.decode(bytes));
}
export async function importPrivate(jwk) {
  return S.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}
export async function generateTeacherKeys() {
  const kp = await S.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  return { publicJwk: await S.exportKey('jwk', kp.publicKey), privateJwk: await S.exportKey('jwk', kp.privateKey) };
}
