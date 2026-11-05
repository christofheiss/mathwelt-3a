// MathWelt 3A – gemeinsame Regeln und Speicherung für das Spiel (index.html) und die Lern-App (app.html).
// Beide Zugänge nutzen denselben Spielstand, dieselben Codes und dieselben Aufgaben.
// Dieses Modul zeichnet nichts ausser dem QR-Scanner, den beide Anmeldeseiten mit denselben IDs enthalten.
import { BUILDINGS, STAGES, checkPart } from './tasks.js';
import { CONFIG } from './config.js';
import * as K from './crypto.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Level ----------
export const TITLES = ['Neuling', 'Entdecker/in', 'Rechenlehrling', 'Gleichungsprofi', 'Datendetektiv/in', 'Baumeister/in', 'Mathe-Meister/in', 'Legende'];
export const levelCost = (lvl) => 40 + 30 * (lvl - 1);
export const titleOf = (lvl) => lvl <= TITLES.length ? TITLES[lvl - 1] : `Legende +${lvl - TITLES.length}`;

export function buyLevel(S, via) {
  const cost = levelCost(S.level);
  if (S.coins < cost) return false;
  S.coins -= cost; S.level++;
  S.log.push({ t: Date.now(), b: 'level', s: 0, ok: true, tries: 0, hint: false, ms: 0, coins: -cost, q: `Aufstieg auf Level ${S.level}`, a: [], via });
  return true;
}

// ---------- Spielstand ----------
const emptyStats = () => ({ 1: { c: 0, w: 0 }, 2: { c: 0, w: 0 }, 3: { c: 0, w: 0 }, recent: [] });
export function newState(id) {
  const stats = {};
  for (const b of BUILDINGS) stats[b.id] = emptyStats();
  return { app: 'mathwelt-3a', v: 1, id, created: Date.now(), lastSave: Date.now(), coins: 0, earned: 0, level: 1, hints: 0, stats, log: [], sessions: [], world: null, posBy: {}, unsavedSince: 0 };
}
export function migrate(st) {
  st.posBy = st.posBy || {}; delete st.pos;   // alte Position passt nicht mehr zu den neuen Karten
  for (const b of BUILDINGS) if (!st.stats[b.id]) st.stats[b.id] = emptyStats();
}

const storageKey = (id) => 'mathwelt3a_' + id;
export async function storeLocal(S, sKey) {
  S.lastSave = Date.now();
  const ses = S.sessions[S.sessions.length - 1]; if (ses) ses.end = Date.now();
  try { localStorage.setItem(storageKey(S.id), JSON.stringify(await K.sealSave(S, sKey, CONFIG.teacherPublicKey))); }
  catch (e) { console.warn('Lokales Speichern nicht möglich', e); }
}
export async function uploadSave(S, token, sKey) {
  const file = await K.sealSave(S, sKey, CONFIG.teacherPublicKey);
  const res = await fetch(CONFIG.saveUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, file }) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}
export async function downloadSaveFile(S, sKey) {
  const file = await K.sealSave(S, sKey, CONFIG.teacherPublicKey);
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `MathWelt3A_${S.id}_${stamp}.mw3a`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function readSaveFile(file, token, sKey) {
  const data = JSON.parse(await file.text());
  const id = K.tokenId(token);
  if (data.app !== 'mathwelt-3a') throw new Error('Das ist keine Spielstand-Datei von MathWelt 3A.');
  if (data.id !== id) throw new Error(`Diese Datei gehört zur ID ${data.id}, du bist mit ${id} angemeldet.`);
  const st = await K.openSaveAsStudent(data, sKey);
  migrate(st);
  st.sessions.push({ start: Date.now(), end: Date.now() });
  return st;
}

// Letzter online gespeicherter Stand. Fehlt er oder ist der Worker nicht erreichbar, geht es lokal weiter.
async function fetchOnlineSave(token, sKey, id) {
  if (!CONFIG.saveUrl) return null;
  try {
    const res = await fetch(new URL('/load', CONFIG.saveUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const { file } = await res.json();
    if (!file || file.id !== id) return null;
    return await K.openSaveAsStudent(file, sKey);
  } catch (e) { console.warn('Online-Spielstand nicht lesbar', e); return null; }
}
// lastSave ändert schon beim blossen Öffnen, darum zählt die letzte gelöste Aufgabe
const lastActivity = (st) => st.log.length ? st.log[st.log.length - 1].t : 0;

// Prüft den Code und öffnet den neusten Spielstand dieser ID. Wirft einen Fehler mit Text für die Anmeldeseite.
export async function signIn(raw) {
  const token = K.normalizeToken(raw);
  if (token.length < 10) throw new Error('Bitte gib deinen ganzen Code ein (z. B. 3A07-K7QM-X2PD-9HTR).');
  if (!CONFIG.tokenHashes.includes(await K.tokenHash(token))) throw new Error('Dieser Code ist nicht gültig. Kontrolliere die Buchstaben oder frage deine Lehrperson.');
  const sKey = await K.studentKey(token), id = K.tokenId(token);
  let local = null;
  try { const stored = localStorage.getItem(storageKey(id)); if (stored) local = await K.openSaveAsStudent(JSON.parse(stored), sKey); } catch (e) { console.warn(e); }
  const online = await fetchOnlineSave(token, sKey, id);
  const fromOnline = !!online && (!local || lastActivity(online) > lastActivity(local));
  const found = fromOnline ? online : local;
  const S = found || newState(id);
  migrate(S);
  S.sessions.push({ start: Date.now(), end: Date.now() });
  if (fromOnline) await storeLocal(S, sKey);
  return { token, sKey, S, isNew: !found, fromOnline };
}

// QR-Code mit der Kamera lesen (wo der Browser es unterstützt)
export async function scanQr(onCode) {
  const $ = (s) => document.querySelector(s);
  const err = $('#loginError');
  if (!('BarcodeDetector' in window)) { err.textContent = 'Dein Browser kann keine QR-Codes lesen. Tippe den Code unter dem QR-Code ein.'; return; }
  const video = $('#qrVideo'); const wrap = $('#qrWrap');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); }
  catch { err.textContent = 'Die Kamera ist nicht freigegeben. Tippe den Code ein.'; return; }
  wrap.hidden = false; video.srcObject = stream; await video.play();
  const det = new window.BarcodeDetector({ formats: ['qr_code'] });
  let stop = false;
  $('#qrCancel').onclick = () => { stop = true; };
  while (!stop) {
    try {
      const codes = await det.detect(video);
      if (codes.length) { const v = codes[0].rawValue; const m = v.match(/[#?&]t=([A-Za-z0-9-]+)/); stop = true; onCode(m ? m[1] : v); }
    } catch { /* weiter versuchen */ }
    await new Promise(r => setTimeout(r, 250));
  }
  stream.getTracks().forEach(t => t.stop()); wrap.hidden = true;
}

// ---------- Freigabe der Themengebiete ----------
const WORLDS_KEY = 'mathwelt3a_worlds';
export function knownWorlds() {
  const w = { ...CONFIG.worlds };
  try { Object.assign(w, JSON.parse(localStorage.getItem(WORLDS_KEY) || '{}')); } catch { }
  return w;
}
export async function fetchWorlds() {
  if (!CONFIG.saveUrl) return { worlds: knownWorlds(), checked: true };
  try {
    const res = await fetch(new URL('/worlds', CONFIG.saveUrl), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const worlds = { ...CONFIG.worlds, ...(await res.json()).worlds };
    try { localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds)); } catch { }
    return { worlds, checked: true };
  } catch (e) { console.warn('Freigabe der Welten nicht lesbar', e); return { worlds: knownWorlds(), checked: false }; }
}

// ---------- Binnendifferenzierung ----------
export const unlocked3 = (S, id) => S.stats[id][2].c >= 3;
export function recommended(S, id) {
  const r = S.stats[id].recent || [];
  let s = r.length ? r[r.length - 1].s : 1;
  const lastSame = r.filter(x => x.s === s).slice(-3);
  if (lastSame.length === 3 && lastSame.every(x => x.ok)) s = Math.min(3, s + 1);
  const last2 = r.slice(-2);
  if (last2.length === 2 && last2.every(x => !x.ok && x.s === s)) s = Math.max(1, s - 1);
  if (s === 3 && !unlocked3(S, id)) s = 2;
  return s;
}
export const stageProgress = (S, id) => [1, 2, 3].map(s => (S.stats[id][s].c >= 3 ? '★' : '☆')).join('');

// ---------- Aufgaben ----------
// cur braucht id und stage; die übrigen Felder setzt beginTask
export function beginTask(cur, building) {
  const t = building.gen(cur.stage);
  cur.task = t; cur.tries = 0; cur.hint = false; cur.done = false; cur.t0 = Date.now();
  cur.parts = t.kind === 'multi' ? t.parts : [{ ...t, label: t.kind === 'num' ? 'Deine Antwort' : '' }];
}
export function answerHtml(cur) {
  return cur.parts.map((p, i) => p.kind === 'mc'
    ? `<fieldset class="mc"><legend>${esc(p.label || 'Wähle die richtige Antwort')}</legend>${p.options.map((o, j) => `<label><input type="radio" name="p${i}" value="${j}"> <span>${esc(o)}</span></label>`).join('')}</fieldset>`
    : `<label class="num">${esc(p.label)} <input id="p${i}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="z. B. 7 oder −2,5">${p.unit ? ' ' + p.unit : (cur.task.unit ? ' ' + cur.task.unit : '')}</label>`).join('');
}
export function readAnswers(cur) {
  return cur.parts.map((p, i) => p.kind === 'mc' ? (document.querySelector(`input[name=p${i}]:checked`)?.value ?? null) : document.querySelector('#p' + i).value);
}
// Bewertet die Antworten. Nach dem letzten Versuch: Coins, Statistik und Eintrag für die Masterview.
export function gradeTask(S, cur, vals, via) {
  const results = cur.parts.map((p, i) => checkPart(p, vals[i]));
  const ok = results.every(Boolean);
  cur.tries++;
  if (!ok && cur.tries < 2) return { ok, results, finished: false, coins: 0 };
  cur.done = true;
  const { id, stage: s, task: t } = cur;
  let coins = 0;
  if (ok) { coins = STAGES[s].coins; if (cur.tries > 1 || cur.hint) coins = Math.ceil(coins / 2); }
  S.coins += coins; S.earned += coins;
  S.stats[id][s][ok ? 'c' : 'w']++;
  const rec = S.stats[id].recent; rec.push({ s, ok }); if (rec.length > 10) rec.shift();
  const plain = t.q.replace(/<img[^>]*>|<svg[\s\S]*?<\/svg>|<table[\s\S]*?<\/table>/g, '[Grafik] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  S.log.push({ t: Date.now(), b: id, s, ok, tries: cur.tries, hint: cur.hint, ms: Date.now() - cur.t0, coins, q: plain, a: vals.map((v, i) => String(cur.parts[i].kind === 'mc' ? cur.parts[i].options[v] : v).slice(0, 40)), via });
  if (S.log.length > 3000) S.log.splice(0, S.log.length - 3000);
  S.unsavedSince++;
  return { ok, results, finished: true, coins };
}
