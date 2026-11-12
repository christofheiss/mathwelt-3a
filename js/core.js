// MathWelt 3A – gemeinsame Regeln und Speicherung für das Spiel (index.html) und die Lern-App (app.html).
// Beide Zugänge nutzen denselben Spielstand, dieselben Codes und dieselben Aufgaben.
// Dieses Modul zeichnet nichts ausser dem QR-Scanner, den beide Anmeldeseiten mit denselben IDs enthalten.
import { BUILDINGS, STAGES, WORLDS, checkPart } from './tasks.js';
import { CONFIG } from './config.js';
import * as K from './crypto.js';

const BYID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
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
  const st = { app: 'mathwelt-3a', v: 1, id, created: Date.now(), lastSave: Date.now(), coins: 0, earned: 0, level: 1, hints: 0, stats, log: [], sessions: [], world: null, posBy: {}, unsavedSince: 0 };
  migrate(st);
  return st;
}
// Alte Lernziel-Nummern (LU 11 zuerst) → neue (LU 10 zuerst)
const LZ_OLD_TO_NEW = { LZ1: 'LZ5', LZ2: 'LZ6', LZ3: 'LZ7', LZ4: 'LZ8', LZ5: 'LZ1', LZ6: 'LZ2', LZ7: 'LZ3', LZ8: 'LZ4' };
const emptyBoss = () => ({ fights: 0, wins: 0, right: [0, 0, 0], wrong: [0, 0, 0], best: null, last: null });
export function migrate(st) {
  st.posBy = st.posBy || {}; delete st.pos;   // alte Position passt nicht mehr zu den neuen Karten
  for (const b of BUILDINGS) if (!st.stats[b.id]) st.stats[b.id] = emptyStats();
  st.badges = st.badges || {};                 // { LZ1: { silver: Zeit, gold: Zeit } }
  // Lernziele wurden umnummeriert (LU 10 zuerst): alte Abzeichen-Schlüssel übernehmen
  if (st.lzv !== 2) {
    const neu = {};
    for (const [k, v] of Object.entries(st.badges)) { const n = LZ_OLD_TO_NEW[k] || k; neu[n] = { ...neu[n], ...v }; }
    st.badges = neu; st.lzv = 2;
  }
  st.items = st.items || [];                   // gekaufte Gegenstände aus dem Shop
  st.equip = st.equip || { pet: null, top: null };
  st.probes = st.probes || { ok: 0, n: 0 };    // Probe-Bonus
  st.boss = st.boss || {};
  for (const w of Object.keys(WORLDS)) st.boss[w] = { ...emptyBoss(), ...st.boss[w] };
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
  if (res.status === 409) { const e = new Error('Zurückgesetzt'); e.code = 'reset'; throw e; }
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

// ---------- Reset durch die Lehrperson ----------
// worlds.reset = Zeitpunkt des Resets. Ein Spielstand, der vorher begonnen wurde, gilt nicht mehr.
export const isStale = (st, worlds) => !!st && !!worlds?.reset && (st.created || 0) < worlds.reset;
export function forgetLocal(id) { try { localStorage.removeItem(storageKey(id)); } catch { } }
export const RESET_MSG = 'Deine Lehrperson hat die MathWelt zurückgesetzt. Alle beginnen neu. Bitte melde dich nochmals an.';
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
  if (isStale(st, knownWorlds())) throw new Error('Diese Datei stammt von vor dem Zurücksetzen durch deine Lehrperson. Starte ein neues Spiel.');
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
  const { worlds } = await fetchWorlds();
  let local = null;
  try { const stored = localStorage.getItem(storageKey(id)); if (stored) local = await K.openSaveAsStudent(JSON.parse(stored), sKey); } catch (e) { console.warn(e); }
  if (isStale(local, worlds)) { forgetLocal(id); local = null; }   // Stand von vor dem Reset
  let online = await fetchOnlineSave(token, sKey, id);
  if (isStale(online, worlds)) online = null;
  const fromOnline = !!online && (!local || lastActivity(online) > lastActivity(local));
  const found = fromOnline ? online : local;
  const S = found || newState(id);
  // Falsch gehende Uhr am Gerät: Ein neuer Stand muss nach dem Reset beginnen, sonst gälte er sofort als veraltet
  if (!found && worlds?.reset && S.created <= worlds.reset) S.created = worlds.reset + 1;
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

// Gebäude sind offen, solange die Lehrperson sie nicht sperrt; der Boss ist gesperrt, bis sie ihn öffnet
// oder bis jemand 3 Abzeichen der Welt hat.
export const worldOf = (b) => Object.values(WORLDS).find(w => w.lu === b.lu).id;
export const buildingOpen = (worlds, b) => !!worlds[worldOf(b)] && worlds[b.id] !== false;
export const BOSS_BADGES = 3;
export const bossOpen = (S, worlds, w) => !!worlds[w] && (!!worlds['boss_' + w] || badgeCount(S, w) >= BOSS_BADGES);

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
export function readAnswers(cur, root = document) {
  return cur.parts.map((p, i) => p.kind === 'mc' ? (root.querySelector(`input[name=p${i}]:checked`)?.value ?? null) : root.querySelector('#p' + i).value);
}
// Bewertet die Antworten. Nach dem letzten Versuch: Coins, Statistik und Eintrag für die Masterview.
export function gradeTask(S, cur, vals, via) {
  const results = cur.parts.map((p, i) => checkPart(p, vals[i]));
  const ok = results.every(Boolean);
  cur.tries++;
  if (!ok && cur.tries < 2) return { ok, results, finished: false, coins: 0 };
  cur.done = true;
  const { id, stage: s, task: t } = cur;
  const under = s === 1 && recommended(S, id) > 1;   // nur ★, wenn das Spiel schon ★★ empfiehlt
  let coins = 0;
  if (ok) {
    coins = STAGES[s].coins;
    if (cur.tries > 1 || cur.hint) coins = Math.ceil(coins / 2);
    if (under) coins = Math.ceil(coins * UNDER_FACTOR);   // unter dem empfohlenen Niveau lohnt sich «Farmen» nicht
  }
  S.coins += coins; S.earned += coins;
  S.stats[id][s][ok ? 'c' : 'w']++;
  const rec = S.stats[id].recent; rec.push({ s, ok }); if (rec.length > 10) rec.shift();
  const plain = t.q.replace(/<img[^>]*>|<svg[\s\S]*?<\/svg>|<table[\s\S]*?<\/table>/g, '[Grafik] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  S.log.push({ t: Date.now(), b: id, s, ok, tries: cur.tries, hint: cur.hint, ms: Date.now() - cur.t0, coins, q: plain, a: vals.map((v, i) => String(cur.parts[i].kind === 'mc' ? cur.parts[i].options[v] : v).slice(0, 40)), via });
  if (S.log.length > 3000) S.log.splice(0, S.log.length - 3000);
  S.unsavedSince++;
  const badges = checkBadges(S, via);
  return { ok, results, finished: true, coins, under, badges, probe: ok && t.probe !== undefined };
}
export const UNDER_FACTOR = 0.4;

// ---------- Probe-Bonus ----------
// Nach einer richtigen Gleichung: Setze die Lösung ein. Welchen Wert haben beide Seiten?
export const PROBE_COINS = 2;
export function probeHtml(cur) {
  const x = cur.parts[0].answer;
  return `<div class="probe"><b>Probe-Bonus (+${PROBE_COINS} Coins):</b> Setze x = ${fmtN(x)} in die Gleichung ein. Welchen Wert haben dann beide Seiten?
    <label class="num">Wert <input id="probeIn" type="text" autocomplete="off" spellcheck="false"></label> <button id="probeBtn">Probe prüfen</button> <span id="probeMsg"></span></div>`;
}
const fmtN = (n) => (n < 0 ? '−' : '') + String(Math.abs(Math.round(n * 1000) / 1000)).replace('.', ',');
export function gradeProbe(S, cur, value) {
  if (cur.probeDone || cur.task.probe === undefined) return null;
  cur.probeDone = true;
  const ok = checkPart({ kind: 'num', answer: cur.task.probe }, value);
  S.probes.n++;
  if (ok) { S.probes.ok++; S.coins += PROBE_COINS; S.earned += PROBE_COINS; }
  return { ok, coins: ok ? PROBE_COINS : 0, value: fmtN(cur.task.probe) };
}

// ---------- Abzeichen pro Lernziel ----------
// Abzeichen: 5 Aufgaben ab ★★ im ersten Versuch ohne Lösungshilfe. Gold: 3 solche Aufgaben auf ★★★.
export const BADGES = [   // Anzeige in der Reihenfolge des Unterrichts: zuerst LU 10 (LZ1–LZ4)
  { lz: 'LZ1', name: 'Pyramiden-Leser/in', icon: '📊', w: 'aj', goal: 'Alterspyramiden lesen' },
  { lz: 'LZ2', name: 'Prozent-Profi', icon: '％', w: 'aj', goal: 'Absolute und relative Zahlen' },
  { lz: 'LZ3', name: 'Trend-Späher/in', icon: '📈', w: 'aj', goal: 'Entwicklungen aus Graphen lesen' },
  { lz: 'LZ4', name: 'Faktenchecker/in', icon: '📰', w: 'aj', goal: 'Aussagen prüfen, kritisch fragen' },
  { lz: 'LZ5', name: 'Umform-Ass', icon: '⚖️', w: 'gl', goal: 'Gleichungen mit Umformungen lösen' },
  { lz: 'LZ6', name: 'Proben-Profi', icon: '✅', w: 'gl', goal: 'Lösungen mit der Probe prüfen' },
  { lz: 'LZ7', name: 'Rätselknacker/in', icon: '🧩', w: 'gl', goal: 'Sachsituationen in Gleichungen übersetzen' },
  { lz: 'LZ8', name: 'Fehlerdetektiv/in', icon: '🔍', w: 'gl', goal: 'Schritte notieren und Fehler finden' },
];
export const BADGE_NEED = { silver: 5, gold: 3 }, BADGE_COINS = { silver: 15, gold: 25 };
const hasLz = (b, lz) => b.lz.split(' · ').includes(lz);
export function badgeProgress(S, lz) {
  let silver = 0, gold = 0;
  for (const l of S.log) {
    const b = BYID[l.b];
    if (!b || !l.ok || l.tries !== 1 || l.hint || l.s < 2 || !hasLz(b, lz)) continue;
    silver++; if (l.s === 3) gold++;
  }
  return { silver: Math.min(silver, BADGE_NEED.silver), gold: Math.min(gold, BADGE_NEED.gold) };
}
export function checkBadges(S, via) {
  const out = [];
  for (const bd of BADGES) {
    const p = badgeProgress(S, bd.lz), have = S.badges[bd.lz] || {};
    for (const tier of ['silver', 'gold']) {
      if (have[tier] || p[tier] < BADGE_NEED[tier]) continue;
      have[tier] = Date.now(); S.badges[bd.lz] = have;
      const coins = BADGE_COINS[tier];
      S.coins += coins; S.earned += coins;
      S.log.push({ t: Date.now(), b: 'badge', s: 0, ok: true, tries: 0, hint: false, ms: 0, coins, q: `${tier === 'gold' ? 'Gold-Abzeichen' : 'Abzeichen'} ${bd.lz} ${bd.name}`, a: [], via });
      out.push({ ...bd, tier, coins });
    }
  }
  return out;
}
export const badgeCount = (S, w, tier = 'silver') => BADGES.filter(b => (!w || b.w === w) && S.badges[b.lz]?.[tier]).length;

// ---------- Shop: nur Aussehen, kein Vorteil beim Rechnen ----------
export const SHOP = [
  { id: 'pet_wuerfel', kind: 'pet', name: 'Würfel-Begleiter', price: 40, desc: 'Ein kleiner Würfel hüpft hinter dir her.' },
  { id: 'pet_vogel', kind: 'pet', name: 'Block-Vogel', price: 60, desc: 'Ein bunter Vogel flattert um dich herum.' },
  { id: 'pet_robo', kind: 'pet', name: 'Mini-Roboter', price: 90, desc: 'Ein kleiner Roboter mit leuchtenden Augen.' },
  { id: 'top_kristall', kind: 'top', name: 'Kristall-Spitze', price: 25, desc: 'Ein Kristall auf deiner goldenen Säule.' },
  { id: 'top_flamme', kind: 'top', name: 'Flammen-Spitze', price: 25, desc: 'Eine orange Flamme auf deiner Säule.' },
  { id: 'top_rose', kind: 'top', name: 'Rosen-Spitze', price: 25, desc: 'Eine rosa Blüte auf deiner Säule.' },
];
export function buyItem(S, id, via) {
  const it = SHOP.find(x => x.id === id);
  if (!it || S.items.includes(id) || S.coins < it.price) return false;
  S.coins -= it.price; S.items.push(id); S.equip[it.kind] = id;
  S.log.push({ t: Date.now(), b: 'shop', s: 0, ok: true, tries: 0, hint: false, ms: 0, coins: -it.price, q: `Shop: ${it.name}`, a: [], via });
  return true;
}
export function equipItem(S, id) {
  const it = SHOP.find(x => x.id === id); if (!it || !S.items.includes(id)) return;
  S.equip[it.kind] = S.equip[it.kind] === id ? null : id;
}

// ---------- Klassen-Leuchtturm: alle verdienten Coins der Klasse ----------
// Die Lehrperson überträgt die Summe in der Masterview (worlds.json → klasse). Keine Daten einzelner SuS.
export const CLASS_STEP = 800, CLASS_STAGES = 10;
export const classStage = (total) => Math.max(0, Math.min(CLASS_STAGES, Math.floor((total || 0) / CLASS_STEP)));
export function classInfo(worlds) {
  const total = Number(worlds?.klasse) || 0, stage = classStage(total);
  return { total, stage, next: stage >= CLASS_STAGES ? null : (stage + 1) * CLASS_STEP };
}
