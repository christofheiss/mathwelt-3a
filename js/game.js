// MathWelt 3A – Spiellogik, Anmeldung, Speichern
import { Renderer, Player, MAP_COLORS } from './engine.js';
import { buildWorld, buildingAt, setFamePillar, G, SIZE, LEVEL_TOWER } from './world.js';
import { BUILDINGS, STAGES, checkPart, fmt } from './tasks.js';
import { CONFIG } from './config.js';
import * as K from './crypto.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BYID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

export const TITLES = ['Neuling', 'Entdecker/in', 'Rechenlehrling', 'Gleichungsprofi', 'Datendetektiv/in', 'Baumeister/in', 'Mathe-Meister/in', 'Legende'];
export const levelCost = (lvl) => 40 + 30 * (lvl - 1);
export const titleOf = (lvl) => lvl <= TITLES.length ? TITLES[lvl - 1] : `Legende +${lvl - TITLES.length}`;

let token = null, sKey = null, S = null;            // Token, Schlüssel, Spielstand
let renderer, player, worldData, paused = true, current = null;
const keys = {};

// ---------- Spielstand ----------
function newState(id) {
  const stats = {};
  for (const b of BUILDINGS) stats[b.id] = { 1: { c: 0, w: 0 }, 2: { c: 0, w: 0 }, 3: { c: 0, w: 0 }, recent: [] };
  return { app: 'mathwelt-3a', v: 1, id, created: Date.now(), lastSave: Date.now(), coins: 0, earned: 0, level: 1, hints: 0, stats, log: [], sessions: [], pos: null, unsavedSince: 0 };
}
function storageKey() { return 'mathwelt3a_' + S.id; }
async function saveLocal() {
  if (!S) return;
  S.lastSave = Date.now();
  if (player) S.pos = { x: player.x, y: player.y, z: player.z, yaw: player.yaw };
  const ses = S.sessions[S.sessions.length - 1]; if (ses) ses.end = Date.now();
  try { localStorage.setItem(storageKey(), JSON.stringify(await K.sealSave(S, sKey, CONFIG.teacherPublicKey))); }
  catch (e) { console.warn('Lokales Speichern nicht möglich', e); }
}
async function downloadSave() {
  await saveLocal();
  const file = await K.sealSave(S, sKey, CONFIG.teacherPublicKey);
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `MathWelt3A_${S.id}_${stamp}.mw3a`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  S.unsavedSince = 0; await saveLocal(); updateHud();
  toast('Spielstand-Datei gespeichert. Gib sie wie besprochen ab (z. B. in LearningView).');
}
async function loadFile(file) {
  const data = JSON.parse(await file.text());
  if (data.app !== 'mathwelt-3a') throw new Error('Das ist keine Spielstand-Datei von MathWelt 3A.');
  if (data.id !== tokenId()) throw new Error(`Diese Datei gehört zur ID ${data.id}, du bist mit ${tokenId()} angemeldet.`);
  return K.openSaveAsStudent(data, sKey);
}
const tokenId = () => K.tokenId(token);

// ---------- Anmeldung ----------
async function tryLogin(raw) {
  const err = $('#loginError'); err.textContent = '';
  const norm = K.normalizeToken(raw);
  if (norm.length < 10) { err.textContent = 'Bitte gib deinen ganzen Code ein (z. B. 3A07-K7QM-X2PD-9HTR).'; return; }
  $('#loginBtn').disabled = true; $('#loginBtn').textContent = 'Prüfe Code …';
  try {
    const h = await K.tokenHash(norm);
    if (!CONFIG.tokenHashes.includes(h)) { err.textContent = 'Dieser Code ist nicht gültig. Kontrolliere die Buchstaben oder frage deine Lehrperson.'; return; }
    token = norm; sKey = await K.studentKey(norm);
    const id = tokenId();
    let loaded = null;
    try { const raw2 = localStorage.getItem('mathwelt3a_' + id); if (raw2) loaded = await K.openSaveAsStudent(JSON.parse(raw2), sKey); } catch (e) { console.warn(e); }
    S = loaded || newState(id);
    migrate(S);
    S.sessions.push({ start: Date.now(), end: Date.now() });
    $('#login').hidden = true;
    if (!loaded) showWelcome(); else startGame();
  } finally { $('#loginBtn').disabled = false; $('#loginBtn').textContent = 'Anmelden'; }
}
function migrate(st) {
  for (const b of BUILDINGS) if (!st.stats[b.id]) st.stats[b.id] = { 1: { c: 0, w: 0 }, 2: { c: 0, w: 0 }, 3: { c: 0, w: 0 }, recent: [] };
}
function showWelcome() {
  const box = $('#welcome'); box.hidden = false;
  $('#welcomeId').textContent = tokenId();
}

// QR-Code mit der Kamera lesen (wo der Browser es unterstützt)
async function scanQr() {
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
      if (codes.length) { const v = codes[0].rawValue; const m = v.match(/[#?&]t=([A-Za-z0-9-]+)/); $('#tokenInput').value = m ? m[1] : v; stop = true; tryLogin($('#tokenInput').value); }
    } catch { /* weiter versuchen */ }
    await new Promise(r => setTimeout(r, 250));
  }
  stream.getTracks().forEach(t => t.stop()); wrap.hidden = true;
}

// ---------- Spielstart ----------
function startGame() {
  $('#welcome').hidden = true; $('#game').hidden = false;
  const built = buildWorld(S.level); worldData = built;
  try { renderer = new Renderer($('#view'), built.world); }
  catch (e) { $('#game').innerHTML = `<div class="fatal">Die 3D-Welt kann nicht angezeigt werden: ${esc(e.message)}<br>Bitte verwende einen aktuellen Browser (Chrome, Edge, Firefox oder Safari).</div>`; return; }
  const p = S.pos || { x: 36.5, y: G + 1, z: 43.5, yaw: 0 };
  player = new Player(built.world, p.x, p.y + 0.2, p.z); player.yaw = p.yaw || 0;
  makeLabels(); updateHud(); paused = false;
  requestAnimationFrame(loop);
  setInterval(() => { if (!paused) saveLocal(); }, 30000);
  if (!localStorage.getItem('mathwelt3a_help_seen')) { showHelp(); try { localStorage.setItem('mathwelt3a_help_seen', '1'); } catch { } }
}

let last = performance.now(), inside = null;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!paused) {
    const turn = 2.2 * dt;
    if (keys.ArrowLeft) player.yaw -= turn; if (keys.ArrowRight) player.yaw += turn;
    player.update(dt, {
      fwd: keys.KeyW || keys.ArrowUp, back: keys.KeyS || keys.ArrowDown, left: keys.KeyA, right: keys.KeyD,
      jump: keys.Space, run: keys.ShiftLeft || keys.ShiftRight
    });
  }
  renderer.draw(player.camera());
  updateLabels();
  const b = buildingAt(worldData.meta, player.x, player.z);
  if (b !== inside) { inside = b; showPrompt(b); }
  requestAnimationFrame(loop);
}

// ---------- Beschriftungen über den Gebäuden ----------
const labelEls = {};
function stageProgress(id) {
  const st = S.stats[id]; return [1, 2, 3].map(s => (st[s].c >= 3 ? '★' : '☆')).join('');
}
function makeLabels() {
  const box = $('#labels'); box.innerHTML = '';
  for (const [id, m] of Object.entries(worldData.meta)) {
    const el = document.createElement('div'); el.className = 'label ' + (id === 'level' ? 'lv' : 'lu' + m.b.lu);
    box.appendChild(el); labelEls[id] = el;
  }
  refreshLabels();
}
function refreshLabels() {
  for (const [id, m] of Object.entries(worldData.meta)) {
    labelEls[id].innerHTML = id === 'level' ? `<b>Level-Turm</b><span>Level ${S.level} · ${esc(titleOf(S.level))}</span>`
      : `<b>${esc(m.b.name)}</b><span>LU ${m.b.lu} · ${stageProgress(id)}</span>`;
  }
}
function updateLabels() {
  for (const [id, m] of Object.entries(worldData.meta)) {
    const el = labelEls[id];
    const p = renderer.project(m.cx + 0.5, m.signY, (m.door === 'S' ? m.z1 : m.z0) + 0.5);
    const dist = Math.hypot(player.x - m.cx, player.z - m.cz);
    if (!p || dist > 48 || paused) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) scale(${Math.max(0.6, Math.min(1.1, 14 / p.d))})`;
    el.style.opacity = dist > 36 ? (48 - dist) / 12 : 1;
  }
}

// ---------- HUD ----------
function updateHud() {
  $('#hudId').textContent = S.id;
  $('#hudLevel').textContent = `Level ${S.level} · ${titleOf(S.level)}`;
  $('#hudCoins').textContent = S.coins;
  const cost = levelCost(S.level);
  $('#hudBar').style.width = Math.min(100, S.coins / cost * 100) + '%';
  $('#hudNext').textContent = S.coins >= cost ? 'Level-Aufstieg möglich: Gehe zum Level-Turm!' : `Noch ${cost - S.coins} Coins bis zum nächsten Level`;
  $('#saveBtn').classList.toggle('attention', S.unsavedSince >= 10);
}
function toast(msg, ms = 3500) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), ms);
}
function showPrompt(id) {
  const pr = $('#prompt');
  if (!id) { pr.hidden = true; return; }
  const name = id === 'level' ? 'Level-Turm' : BYID[id].name;
  pr.innerHTML = `<b>${esc(name)}</b> · Drücke <kbd>E</kbd> oder <button id="enterBtn">Hier klicken</button>`;
  pr.hidden = false; $('#enterBtn').onclick = () => openBuilding(id);
}

// ---------- Aufgaben-Panel ----------
function recommended(id) {
  const r = S.stats[id].recent || [];
  let s = r.length ? r[r.length - 1].s : 1;
  const lastSame = r.filter(x => x.s === s).slice(-3);
  if (lastSame.length === 3 && lastSame.every(x => x.ok)) s = Math.min(3, s + 1);
  const last2 = r.slice(-2);
  if (last2.length === 2 && last2.every(x => !x.ok && x.s === s)) s = Math.max(1, s - 1);
  if (s === 3 && !unlocked3(id)) s = 2;
  return s;
}
const unlocked3 = (id) => S.stats[id][2].c >= 3;

function openBuilding(id) {
  if (id === 'level') return openLevel();
  paused = true; document.exitPointerLock?.();
  const b = BYID[id];
  current = { id, stage: recommended(id) };
  $('#panel').hidden = false; $('#prompt').hidden = true;
  $('#pTitle').textContent = b.name;
  $('#pMeta').innerHTML = `LU ${b.lu} · ${esc(b.lz)} · ${esc(b.goal)}<br><span class="ref">${esc(b.ref)}</span>`;
  newTask();
}
function closePanel() {
  $('#panel').hidden = true; $('#levelPanel').hidden = true; current = null; paused = false; showPrompt(inside); refreshLabels();
}
function renderStages() {
  const id = current.id, rec = recommended(id);
  $('#pStages').innerHTML = [1, 2, 3].map(s => {
    const st = S.stats[id][s], locked = s === 3 && !unlocked3(id);
    return `<button class="stage ${s === current.stage ? 'on' : ''}" data-s="${s}" ${locked ? 'disabled title="Löse zuerst 3 Standard-Aufgaben richtig."' : ''}>
      <span class="stars">${STAGES[s].stars}</span>${STAGES[s].name}${locked ? ' (gesperrt)' : ''}
      <small>${st.c} richtig · ${STAGES[s].coins} Coins${s === rec ? ' · empfohlen' : ''}</small></button>`;
  }).join('');
  $('#pStages').querySelectorAll('button').forEach(btn => btn.onclick = () => { current.stage = Number(btn.dataset.s); newTask(); });
}
function newTask() {
  const b = BYID[current.id];
  current.task = b.gen(current.stage); current.tries = 0; current.hint = false; current.done = false; current.t0 = Date.now();
  renderStages();
  const t = current.task;
  $('#pQuestion').innerHTML = t.q;
  const parts = t.kind === 'multi' ? t.parts : [{ ...t, label: t.kind === 'num' ? 'Deine Antwort' : '' }];
  current.parts = parts;
  $('#pAnswer').innerHTML = parts.map((p, i) => p.kind === 'mc'
    ? `<fieldset class="mc"><legend>${esc(p.label || 'Wähle die richtige Antwort')}</legend>${p.options.map((o, j) => `<label><input type="radio" name="p${i}" value="${j}"> <span>${esc(o)}</span></label>`).join('')}</fieldset>`
    : `<label class="num">${esc(p.label)} <input id="p${i}" type="text" inputmode="decimal" autocomplete="off" placeholder="z. B. 7 oder −2,5">${p.unit ? ' ' + p.unit : (t.unit ? ' ' + t.unit : '')}</label>`).join('');
  $('#pFeedback').innerHTML = ''; $('#pFeedback').className = '';
  $('#checkBtn').hidden = false; $('#nextBtn').hidden = true; $('#hintBtn').hidden = false; $('#hintBtn').disabled = false;
  $('#pHint').hidden = true;
  const first = $('#pAnswer input[type=text]'); if (first) setTimeout(() => first.focus(), 30);
}
function readParts() {
  return current.parts.map((p, i) => p.kind === 'mc' ? (document.querySelector(`input[name=p${i}]:checked`)?.value ?? null) : $('#p' + i).value);
}
async function check() {
  if (!current || current.done) return;
  const vals = readParts();
  if (vals.some(v => v === null || v === '')) { $('#pFeedback').className = 'warn'; $('#pFeedback').textContent = 'Bitte beantworte alle Teile.'; return; }
  const results = current.parts.map((p, i) => checkPart(p, vals[i]));
  const ok = results.every(Boolean);
  current.tries++;
  const id = current.id, s = current.stage, t = current.task;
  if (ok || current.tries >= 2) {
    current.done = true;
    let coins = 0;
    if (ok) { coins = STAGES[s].coins; if (current.tries > 1 || current.hint) coins = Math.ceil(coins / 2); }
    S.coins += coins; S.earned += coins;
    S.stats[id][s][ok ? 'c' : 'w']++;
    const rec = S.stats[id].recent; rec.push({ s, ok }); if (rec.length > 10) rec.shift();
    const plain = t.q.replace(/<img[^>]*>|<svg[\s\S]*?<\/svg>|<table[\s\S]*?<\/table>/g, '[Grafik] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    S.log.push({ t: Date.now(), b: id, s, ok, tries: current.tries, hint: current.hint, ms: Date.now() - current.t0, coins, q: plain, a: vals.map((v, i) => String(current.parts[i].kind === 'mc' ? current.parts[i].options[v] : v).slice(0, 40)) });
    if (S.log.length > 3000) S.log.splice(0, S.log.length - 3000);
    S.unsavedSince++;
    $('#pFeedback').className = ok ? 'good' : 'bad';
    $('#pFeedback').innerHTML = ok
      ? `<b>Richtig!</b> +${coins} Coins${coins < STAGES[s].coins ? ' (halbe Belohnung wegen Lösungshilfe oder zweitem Versuch)' : ''}<div class="sol">${t.sol}</div>`
      : `<b>Leider nicht richtig.</b> So geht es:<div class="sol">${t.sol}</div>`;
    $('#checkBtn').hidden = true; $('#hintBtn').hidden = true; $('#nextBtn').hidden = false; $('#nextBtn').focus();
    updateHud(); renderStages(); await saveLocal();
    if (S.unsavedSince === 10) toast('Tipp: Speichere deinen Spielstand als Datei (Knopf «Speichern»).', 5000);
  } else {
    $('#pFeedback').className = 'bad';
    $('#pFeedback').innerHTML = `<b>Noch nicht ganz.</b> ${current.parts.length > 1 ? 'Kontrolliere: ' + results.map((r, i) => (r ? '' : esc(current.parts[i].label))).filter(Boolean).join(', ') + '. ' : ''}Du hast noch einen Versuch.`;
    if (!current.hint) showHint();
  }
}
function showHint() {
  current.hint = true; S.hints++;
  $('#pHint').innerHTML = `<b>Lösungshilfe:</b> ${current.task.hint}`; $('#pHint').hidden = false; $('#hintBtn').disabled = true;
}

// ---------- Level-Turm ----------
function openLevel() {
  paused = true; document.exitPointerLock?.();
  $('#levelPanel').hidden = false; $('#prompt').hidden = true; renderLevel();
}
function renderLevel() {
  const cost = levelCost(S.level), can = S.coins >= cost;
  $('#lvBody').innerHTML = `
    <p>Du bist <b>Level ${S.level}</b>: ${esc(titleOf(S.level))}. Du hast <b>${S.coins} Coins</b> (insgesamt verdient: ${S.earned}).</p>
    <p>Der Aufstieg auf Level ${S.level + 1} (${esc(titleOf(S.level + 1))}) kostet <b>${cost} Coins</b>. Mit jedem Level wächst die goldene Säule auf dem Dorfplatz.</p>
    <ol class="titles">${TITLES.map((t, i) => `<li class="${i + 1 <= S.level ? 'got' : ''}">Level ${i + 1}: ${esc(t)}</li>`).join('')}</ol>`;
  $('#lvUp').disabled = !can; $('#lvUp').textContent = can ? `Für ${cost} Coins aufsteigen` : `Noch ${cost - S.coins} Coins sammeln`;
}
async function levelUp() {
  const cost = levelCost(S.level); if (S.coins < cost) return;
  S.coins -= cost; S.level++;
  S.log.push({ t: Date.now(), b: 'level', s: 0, ok: true, tries: 0, hint: false, ms: 0, coins: -cost, q: `Aufstieg auf Level ${S.level}`, a: [] });
  setFamePillar(worldData.world, S.level); renderer.rebuild();
  renderLevel(); updateHud(); refreshLabels(); await saveLocal();
  toast(`Gratuliere! Du bist jetzt Level ${S.level}: ${titleOf(S.level)}.`);
}

// ---------- Karte ----------
const MAP_ORDER = ['level', ...BUILDINGS.map(b => b.id)];
function showMap() {
  paused = true; document.exitPointerLock?.();
  const cv = $('#mapCanvas'), g = cv.getContext('2d'), sc = cv.width / SIZE, w = worldData.world;
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const y = w.topY(x, z); g.fillStyle = MAP_COLORS[w.get(x, y, z)] || '#888'; g.fillRect(x * sc, z * sc, sc, sc);
  }
  g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
  MAP_ORDER.forEach((id, i) => {
    const m = worldData.meta[id], X = (m.cx + 0.5) * sc, Z = (m.cz + 0.5) * sc;
    g.fillStyle = id === 'level' ? '#e8b931' : m.b.lu === 11 ? '#a5432f' : '#6b5a2a';
    g.beginPath(); g.arc(X, Z, 13, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke();
    g.fillStyle = id === 'level' ? '#000' : '#fff'; g.fillText(id === 'level' ? 'L' : String(i), X, Z + 1);
  });
  g.save(); g.translate(player.x * sc, player.z * sc); g.rotate(player.yaw);
  g.fillStyle = '#ff2'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  $('#mapLegend').innerHTML = MAP_ORDER.map((id, i) => {
    const m = worldData.meta[id];
    const name = id === 'level' ? 'Level-Turm' : m.b.name;
    return `<li><button data-id="${id}"><span class="no ${id === 'level' ? 'lv' : 'lu' + m.b.lu}">${id === 'level' ? 'L' : i}</span>${esc(name)}${id === 'level' ? '' : `<small>LU ${m.b.lu} · ${stageProgress(id)}</small>`}</button></li>`;
  }).join('');
  $('#mapLegend').querySelectorAll('button').forEach(btn => btn.onclick = () => teleport(btn.dataset.id));
  $('#map').hidden = false;
}
function teleport(id) {
  const m = worldData.meta[id];
  const dz = m.door === 'S' ? m.z1 + 3 : m.z0 - 3;
  player.x = m.cx + 0.5; player.z = dz + 0.5; player.y = G + 1.2; player.vy = 0; player.pitch = 0;
  player.yaw = m.door === 'S' ? 0 : Math.PI;
  $('#map').hidden = true; paused = false;
}
function mapClick(ev) {
  const cv = $('#mapCanvas'), r = cv.getBoundingClientRect(), sc = cv.width / SIZE;
  const x = (ev.clientX - r.left) * (cv.width / r.width) / sc, z = (ev.clientY - r.top) * (cv.height / r.height) / sc;
  for (const [id, m] of Object.entries(worldData.meta)) {
    if (Math.abs(x - m.cx - 0.5) < 5 && Math.abs(z - m.cz - 0.5) < 5) return teleport(id);
  }
}
function showHelp() { paused = true; document.exitPointerLock?.(); $('#help').hidden = false; }

// ---------- Eingaben ----------
function overlayOpen() { return !$('#panel').hidden || !$('#levelPanel').hidden || !$('#map').hidden || !$('#help').hidden; }
function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (!$('#login').hidden || !$('#welcome').hidden) return;
    const typing = e.target.tagName === 'INPUT';
    if (e.code === 'Escape') { if (overlayOpen()) { $('#map').hidden = true; $('#help').hidden = true; closePanel(); } return; }
    if (!$('#panel').hidden) {
      if (e.code === 'Enter') { e.preventDefault(); if (current?.done) newTask(); else check(); }
      return;
    }
    if (overlayOpen() || typing) return;
    keys[e.code] = true;
    if (e.code === 'KeyE' && inside) openBuilding(inside);
    if (e.code === 'KeyM') showMap();
    if (e.code === 'KeyH') showHelp();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  const cv = $('#view');
  cv.addEventListener('click', () => { if (!paused) cv.requestPointerLock?.(); });
  document.addEventListener('mousemove', (e) => {
    if (paused) return;
    const locked = document.pointerLockElement === cv;
    if (locked || (e.buttons & 1)) {
      player.yaw += e.movementX * 0.0028; player.pitch -= e.movementY * 0.0028;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
    }
  });
  $('#checkBtn').onclick = check; $('#nextBtn').onclick = newTask; $('#hintBtn').onclick = showHint;
  $('#closeBtn').onclick = closePanel; $('#lvClose').onclick = closePanel; $('#lvUp').onclick = levelUp;
  $('#mapBtn').onclick = showMap; $('#mapClose').onclick = () => { $('#map').hidden = true; paused = false; };
  $('#mapCanvas').onclick = mapClick;
  $('#helpBtn').onclick = showHelp; $('#helpClose').onclick = () => { $('#help').hidden = true; paused = false; };
  $('#saveBtn').onclick = downloadSave;
  $('#logoutBtn').onclick = async () => { await saveLocal(); location.reload(); };
  window.addEventListener('beforeunload', () => { if (S) saveLocal(); });
}

// ---------- Initialisierung ----------
function init() {
  setupInput();
  $('#loginForm').onsubmit = (e) => { e.preventDefault(); tryLogin($('#tokenInput').value); };
  $('#scanBtn').onclick = scanQr;
  if (!('BarcodeDetector' in window)) $('#scanBtn').title = 'In diesem Browser nicht verfügbar: Code bitte eintippen.';
  // Code aus dem QR-Link übernehmen (…/index.html#t=CODE)
  const m = location.hash.match(/t=([A-Za-z0-9-]+)/); if (m) { $('#tokenInput').value = m[1]; history.replaceState(null, '', location.pathname); }
  $('#newGameBtn').onclick = () => startGame();
  $('#loadFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const st = await loadFile(f); S = st; migrate(S); S.sessions.push({ start: Date.now(), end: Date.now() }); await saveLocal(); startGame(); toast('Spielstand geladen.'); }
    catch (er) { $('#welcomeError').textContent = er.message || 'Die Datei konnte nicht gelesen werden.'; }
  };
}
init();
