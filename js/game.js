// MathWelt 3A – Spiellogik, Anmeldung, Speichern
import { Renderer, Player, MAP_COLORS } from './engine.js';
import { buildWorld, buildingAt, setFamePillar, G, SIZE, LEVEL_TOWER } from './world.js';
import { BUILDINGS, STAGES, WORLDS } from './tasks.js';
import { CONFIG } from './config.js';
import * as K from './crypto.js';
import * as C from './core.js';

const VIA = 'spiel';
const { TITLES, levelCost, titleOf, stageProgress: progressOf } = C;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BYID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

let token = null, sKey = null, S = null;            // Token, Schlüssel, Spielstand
let renderer, player, worldData, paused = true, current = null;
const keys = {};

// ---------- Spielstand ----------
async function saveLocal() {
  if (!S) return;
  if (player && S.world) S.posBy[S.world] = { x: player.x, y: player.y, z: player.z, yaw: player.yaw };
  await C.storeLocal(S, sKey);
}
async function downloadSave() {
  await saveLocal();
  await C.downloadSaveFile(S, sKey);
  S.unsavedSince = 0; await saveLocal(); updateHud();
  toast(CONFIG.saveUrl ? 'Spielstand-Datei gespeichert. Damit kannst du auf einem anderen Gerät weiterspielen.' : 'Spielstand-Datei gespeichert. Gib sie wie besprochen ab (z. B. in LearningView).');
}
// Speichern-Knopf: lädt den verschlüsselten Stand hoch. Ohne Worker oder bei einem Fehler wird die Datei heruntergeladen.
async function saveOnline() {
  if (!CONFIG.saveUrl) return downloadSave();
  const btn = $('#saveBtn'); if (btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Speichert …';
  try {
    await saveLocal();
    await C.uploadSave(S, token, sKey);
    S.unsavedSince = 0; await saveLocal(); updateHud();
    toast('Spielstand online gespeichert.');
  } catch (e) {
    console.warn('Online-Speichern nicht möglich', e);
    await downloadSave();
    toast('Online-Speichern hat nicht geklappt. Dein Spielstand wurde als Datei heruntergeladen: Gib sie bitte ab.', 8000);
  } finally { btn.disabled = false; btn.textContent = 'Speichern'; }
}
const tokenId = () => K.tokenId(token);

// ---------- Anmeldung ----------
async function tryLogin(raw) {
  const err = $('#loginError'); err.textContent = '';
  $('#loginBtn').disabled = true; $('#loginBtn').textContent = 'Prüfe Code …';
  try {
    const acc = await C.signIn(raw);
    token = acc.token; sKey = acc.sKey; S = acc.S;
    $('#login').hidden = true;
    if (acc.isNew) showWelcome(); else startGame();
  } catch (e) { err.textContent = e.message; }
  finally { $('#loginBtn').disabled = false; $('#loginBtn').textContent = 'Anmelden'; }
}
function showWelcome() {
  const box = $('#welcome'); box.hidden = false;
  $('#welcomeId').textContent = tokenId();
}

// ---------- Spielstart ----------
function startGame() {
  $('#welcome').hidden = true;
  showWorlds();
}

// ---------- Weltauswahl ----------
let openWorlds = C.knownWorlds(), worldsChecked = false, worldsTimer = null;

async function refreshWorlds() {
  ({ worlds: openWorlds, checked: worldsChecked } = await C.fetchWorlds());
}
function renderWorlds() {
  $('#worldCards').innerHTML = Object.values(WORLDS).map(w => {
    const solved = BUILDINGS.filter(b => b.lu === w.lu).reduce((a, b) => a + [1, 2, 3].reduce((n, k) => n + S.stats[b.id][k].c, 0), 0);
    const open = !!openWorlds[w.id];
    return `<div class="worldcard ${open ? 'open' : 'locked'}"><h3>${esc(w.name)}</h3><p>${esc(w.sub)}</p>
      <p class="small">${solved} Aufgaben richtig gelöst</p>
      ${open ? `<button class="primary" data-w="${w.id}">${S.world === w.id && player ? 'Weiterspielen' : 'Betreten'}</button>` : '<p class="lockmsg">Noch gesperrt. Deine Lehrperson schaltet diese Welt frei.</p>'}</div>`;
  }).join('');
  $('#worldCards').querySelectorAll('button[data-w]').forEach(btn => btn.onclick = () => enterWorld(btn.dataset.w));
  $('#worldsNote').textContent = worldsChecked ? '' : 'Die aktuelle Freigabe konnte nicht geprüft werden. Es wird der letzte bekannte Stand angezeigt.';
}
async function showWorlds() {
  paused = true; document.exitPointerLock?.();
  for (const k in keys) keys[k] = false;
  $('#worlds').hidden = false; $('#worldsBack').hidden = !player;
  renderWorlds();
  const poll = async () => { await refreshWorlds(); if (!$('#worlds').hidden) renderWorlds(); };
  clearInterval(worldsTimer); worldsTimer = setInterval(poll, 20000);
  await poll();
}
function closeWorlds() { clearInterval(worldsTimer); $('#worlds').hidden = true; }

let gameRunning = false;
async function enterWorld(id) {
  await saveLocal();
  closeWorlds();
  S.world = id; $('#game').hidden = false;
  const built = buildWorld(S.level, id); worldData = built;
  try {
    if (renderer) { renderer.world = built.world; renderer.rebuild(); }
    else renderer = new Renderer($('#view'), built.world);
    renderer.sky = WORLDS[id].sky;
  }
  catch (e) { $('#game').innerHTML = `<div class="fatal">Die 3D-Welt kann nicht angezeigt werden: ${esc(e.message)}<br>Bitte verwende einen aktuellen Browser (Chrome, Edge, Firefox oder Safari).</div>`; return; }
  const p = S.posBy[id] || { x: 36.5, y: G + 1, z: 43.5, yaw: 0 };
  player = new Player(built.world, p.x, p.y + 0.2, p.z); player.yaw = p.yaw || 0;
  inside = null; showPrompt(null);
  makeLabels(); updateHud(); paused = false; await saveLocal();
  toast(`Welt: ${WORLDS[id].name}`);
  if (!gameRunning) {
    gameRunning = true;
    requestAnimationFrame(loop);
    setInterval(() => { if (!paused) saveLocal(); }, 30000);
  }
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
const stageProgress = (id) => progressOf(S, id);
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
const recommended = (id) => C.recommended(S, id);
const unlocked3 = (id) => C.unlocked3(S, id);

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
  C.beginTask(current, b);
  renderStages();
  $('#pQuestion').innerHTML = current.task.q;
  $('#pAnswer').innerHTML = C.answerHtml(current);
  $('#pFeedback').innerHTML = ''; $('#pFeedback').className = '';
  $('#checkBtn').hidden = false; $('#nextBtn').hidden = true; $('#hintBtn').hidden = false; $('#hintBtn').disabled = false;
  $('#pHint').hidden = true;
  const first = $('#pAnswer input[type=text]'); if (first) setTimeout(() => first.focus(), 30);
}
async function check() {
  if (!current || current.done) return;
  const vals = C.readAnswers(current);
  if (vals.some(v => v === null || v === '')) { $('#pFeedback').className = 'warn'; $('#pFeedback').textContent = 'Bitte beantworte alle Teile.'; return; }
  const { ok, results, finished, coins } = C.gradeTask(S, current, vals, VIA);
  const s = current.stage, t = current.task;
  if (finished) {
    $('#pFeedback').className = ok ? 'good' : 'bad';
    $('#pFeedback').innerHTML = ok
      ? `<b>Richtig!</b> +${coins} Coins${coins < STAGES[s].coins ? ' (halbe Belohnung wegen Lösungshilfe oder zweitem Versuch)' : ''}<div class="sol">${t.sol}</div>`
      : `<b>Leider nicht richtig.</b> So geht es:<div class="sol">${t.sol}</div>`;
    $('#checkBtn').hidden = true; $('#hintBtn').hidden = true; $('#nextBtn').hidden = false; $('#nextBtn').focus();
    updateHud(); renderStages(); await saveLocal();
    if (S.unsavedSince === 10) toast(CONFIG.saveUrl ? 'Tipp: Speichere deinen Spielstand (Knopf «Speichern»).' : 'Tipp: Speichere deinen Spielstand als Datei (Knopf «Speichern»).', 5000);
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
  if (!C.buyLevel(S, VIA)) return;
  setFamePillar(worldData.world, S.level); renderer.rebuild();
  renderLevel(); updateHud(); refreshLabels(); await saveLocal();
  toast(`Gratuliere! Du bist jetzt Level ${S.level}: ${titleOf(S.level)}.`);
}

// ---------- Karte ----------
const mapOrder = () => ['level', ...BUILDINGS.filter(b => worldData.meta[b.id]).map(b => b.id)];
function showMap() {
  paused = true; document.exitPointerLock?.();
  const cv = $('#mapCanvas'), g = cv.getContext('2d'), sc = cv.width / SIZE, w = worldData.world;
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const y = w.topY(x, z); g.fillStyle = MAP_COLORS[w.get(x, y, z)] || '#888'; g.fillRect(x * sc, z * sc, sc, sc);
  }
  g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
  mapOrder().forEach((id, i) => {
    const m = worldData.meta[id], X = (m.cx + 0.5) * sc, Z = (m.cz + 0.5) * sc;
    g.fillStyle = id === 'level' ? '#e8b931' : m.b.lu === 11 ? '#a5432f' : '#6b5a2a';
    g.beginPath(); g.arc(X, Z, 13, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke();
    g.fillStyle = id === 'level' ? '#000' : '#fff'; g.fillText(id === 'level' ? 'L' : String(i), X, Z + 1);
  });
  g.save(); g.translate(player.x * sc, player.z * sc); g.rotate(player.yaw);
  g.fillStyle = '#ff2'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  $('#mapLegend').innerHTML = mapOrder().map((id, i) => {
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
    if (!$('#login').hidden || !$('#welcome').hidden || !$('#worlds').hidden) return;
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
  $('#saveBtn').onclick = saveOnline;
  $('#fileBtn').onclick = downloadSave;
  $('#worldsBtn').onclick = showWorlds;
  $('#worldsBack').onclick = () => { closeWorlds(); paused = false; };
  if (CONFIG.saveUrl) {
    $('#saveBtn').title = 'Spielstand online speichern';
    $('#fileBtn').hidden = false;
    $('#helpSave').textContent = 'Klicke am Ende der Lektion auf «Speichern». Für ein anderes Gerät kannst du mit «Als Datei» eine Datei mitnehmen.';
  }
  $('#logoutBtn').onclick = async () => { await saveLocal(); location.reload(); };
  window.addEventListener('beforeunload', () => { if (S) saveLocal(); });
}

// ---------- Initialisierung ----------
function init() {
  setupInput();
  $('#loginForm').onsubmit = (e) => { e.preventDefault(); tryLogin($('#tokenInput').value); };
  $('#scanBtn').onclick = () => C.scanQr((code) => { $('#tokenInput').value = code; tryLogin(code); });
  if (!('BarcodeDetector' in window)) $('#scanBtn').title = 'In diesem Browser nicht verfügbar: Code bitte eintippen.';
  // Code aus dem QR-Link übernehmen (…/index.html#t=CODE)
  const m = location.hash.match(/t=([A-Za-z0-9-]+)/); if (m) { $('#tokenInput').value = m[1]; history.replaceState(null, '', location.pathname); }
  $('#newGameBtn').onclick = () => startGame();
  $('#loadFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { S = await C.readSaveFile(f, token, sKey); await saveLocal(); startGame(); toast('Spielstand geladen.'); }
    catch (er) { $('#welcomeError').textContent = er.message || 'Die Datei konnte nicht gelesen werden.'; }
  };
}
init();
