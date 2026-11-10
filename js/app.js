// MathWelt 3A – Lern-App: dieselben Aufgaben, Codes und Spielstände wie das Spiel, nach Themengebieten geordnet
import { BUILDINGS, STAGES, WORLDS } from './tasks.js';
import { CONFIG } from './config.js';
import * as C from './core.js';
import { BOSSES, mountFight, bossSvg } from './boss.js';

const VIA = 'app';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BYID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
const areaOf = (b) => Object.values(WORLDS).find(w => w.lu === b.lu);

let token = null, sKey = null, S = null, current = null;
let openWorlds = C.knownWorlds(), worldsChecked = false, worldsTimer = null, shownHash = null;

// ---------- Anmeldung ----------
async function tryLogin(raw) {
  const err = $('#loginError'), btn = $('#loginBtn');
  err.textContent = ''; btn.disabled = true; btn.textContent = 'Prüfe Code …';
  try {
    const acc = await C.signIn(raw);
    token = acc.token; sKey = acc.sKey; S = acc.S;
    $('#login').hidden = true;
    setTimeout(() => announceBadges(C.checkBadges(S, VIA)), 600);
    if (acc.isNew) { $('#welcomeId').textContent = S.id; $('#welcome').hidden = false; }
    else { start(); if (acc.fromOnline) toast('Dein online gespeicherter Lernstand wurde geladen.'); }
  } catch (e) { err.textContent = e.message; }
  finally { btn.disabled = false; btn.textContent = 'Anmelden'; }
}
function start() {
  $('#welcome').hidden = true; $('#shell').hidden = false;
  updateTop(); saveLocal();
  pollWorlds();
  worldsTimer = setInterval(pollWorlds, 20000);
  route();
}
async function pollWorlds() {
  const before = JSON.stringify(openWorlds);
  ({ worlds: openWorlds, checked: worldsChecked } = await C.fetchWorlds());
  if (viewName() === 'themen' && JSON.stringify(openWorlds) !== before) route();
  else if (viewName() === 'themen') $('#worldsNote').textContent = worldsNote();
}
const worldsNote = () => worldsChecked ? '' : 'Die aktuelle Freigabe konnte nicht geprüft werden. Es wird der letzte bekannte Stand angezeigt.';

// ---------- Speichern ----------
const saveLocal = () => C.storeLocal(S, sKey);
async function downloadSave() {
  await saveLocal();
  await C.downloadSaveFile(S, sKey);
  S.unsavedSince = 0; await saveLocal(); updateTop();
  toast(CONFIG.saveUrl ? 'Lernstand als Datei gespeichert.' : 'Lernstand als Datei gespeichert. Gib sie wie besprochen ab (z. B. in LearningView).');
}
async function saveOnline() {
  if (!CONFIG.saveUrl) return downloadSave();
  const btn = $('#saveBtn'); if (btn.disabled) return;
  btn.disabled = true; btn.textContent = 'Speichert …';
  try {
    await saveLocal();
    await C.uploadSave(S, token, sKey);
    S.unsavedSince = 0; await saveLocal(); updateTop();
    toast('Lernstand online gespeichert.');
  } catch (e) {
    console.warn('Online-Speichern nicht möglich', e);
    await downloadSave();
    toast('Online-Speichern hat nicht geklappt. Dein Lernstand wurde als Datei heruntergeladen: Gib sie bitte ab.', 8000);
  } finally { btn.disabled = false; btn.textContent = 'Speichern'; }
}

// ---------- Oberfläche ----------
function updateTop() {
  $('#topCoins').textContent = S.coins;
  $('#saveBtn').classList.toggle('attention', S.unsavedSince >= 10);
}
function announceBadges(list) {
  list.forEach((b, i) => setTimeout(() => toast(`${b.icon} ${b.tier === 'gold' ? 'Gold-Abzeichen' : 'Abzeichen'} «${b.name}» (${b.lz}) erhalten! +${b.coins} Coins`, 5000), i * 5200));
}
function toast(msg, ms = 3500) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), ms);
}
const viewName = () => location.hash.split('/')[1] || 'themen';

function route() {
  if (!S) return;
  shownHash = location.hash;
  const [, view, arg] = location.hash.split('/');
  current = null;
  document.querySelectorAll('nav a').forEach(a => {
    const on = a.dataset.nav === (view === 'thema' || view === 'boss' ? 'themen' : view || 'themen');
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (view === 'thema' && BYID[arg] && C.buildingOpen(openWorlds, BYID[arg])) renderTopic(arg);
  else if (view === 'boss' && BOSSES[arg] && C.bossOpen(S, openWorlds, arg)) renderBoss(arg);
  else if (view === 'level') renderLevel();
  else if (view === 'stand') renderStand();
  else renderThemes();
  window.scrollTo(0, 0);
}

// ---------- Themen ----------
const solvedIn = (id) => [1, 2, 3].reduce((n, k) => n + S.stats[id][k].c, 0);
function nextTopic() {
  const open = BUILDINGS.filter(b => C.buildingOpen(openWorlds, b));
  const unfinished = (b) => [1, 2, 3].some(k => S.stats[b.id][k].c < 3);
  const lastDone = [...S.log].reverse().find(l => BYID[l.b] && open.includes(BYID[l.b]) && unfinished(BYID[l.b]));
  return lastDone ? BYID[lastDone.b] : open.find(unfinished) || null;
}
function levelCard() {
  const cost = C.levelCost(S.level), ready = S.coins >= cost;
  return `<div class="levelcard">
    <div><span class="eyebrow">${esc(S.id)}</span><b class="lvl">Level ${S.level} · ${esc(C.titleOf(S.level))}</b></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${cost}" aria-valuenow="${Math.min(S.coins, cost)}" aria-label="Coins bis zum nächsten Level"><div style="width:${Math.min(100, S.coins / cost * 100)}%"></div></div>
    <p class="small">${ready ? 'Du kannst ein Level aufsteigen.' : `${S.coins} von ${cost} Coins bis Level ${S.level + 1}`}</p>
    ${ready ? '<a class="btn primary" href="#/level">Level aufsteigen</a>' : ''}
  </div>`;
}
function renderThemes() {
  const next = nextTopic();
  $('#main').innerHTML = `${levelCard()}
    ${next ? `<a class="continue" href="#/thema/${next.id}"><span class="eyebrow">Weiter üben</span><b>${esc(next.topic)}</b><span class="small">${esc(areaOf(next).name)} · empfohlen: ${STAGES[C.recommended(S, next.id)].stars} ${STAGES[C.recommended(S, next.id)].name}</span></a>` : ''}
    ${Object.values(WORLDS).map(areaHtml).join('')}
    <p id="worldsNote" class="small">${esc(worldsNote())}</p>`;
}
function areaHtml(w) {
  const open = !!openWorlds[w.id], topics = BUILDINGS.filter(b => b.lu === w.lu);
  return `<section class="area lu${w.lu} ${open ? '' : 'locked'}">
    <div class="areahead"><div><h2>${esc(w.name)}</h2><p class="small">${esc(w.sub)}</p></div>${open ? '' : '<span class="tag">Gesperrt</span>'}</div>
    ${open ? '' : '<p class="lockmsg">Deine Lehrperson schaltet dieses Themengebiet frei.</p>'}
    <ul class="topics">${topics.map(b => {
      const tOpen = open && C.buildingOpen(openWorlds, b);
      const inner = `<span class="tname">${esc(b.topic)}</span><span class="tgoal">${esc(b.goal)}</span>
        <span class="tstat">${open && !tOpen ? 'noch gesperrt' : `<span class="stars" aria-label="Niveaus geschafft: ${[1, 2, 3].filter(k => S.stats[b.id][k].c >= 3).length} von 3">${C.stageProgress(S, b.id)}</span> ${solvedIn(b.id)} richtig`}</span>`;
      return `<li>${tOpen ? `<a class="topic" href="#/thema/${b.id}">${inner}</a>` : `<div class="topic tlocked">${inner}</div>`}</li>`;
    }).join('')}
      ${open ? bossTopic(w.id) : ''}</ul>
  </section>`;
}

function bossTopic(w) {
  const B = BOSSES[w], st = S.boss[w], ready = C.bossOpen(S, openWorlds, w), n = C.badgeCount(S, w);
  const inner = `<span class="tname">Boss-Kampf: ${esc(B.name)}</span><span class="tgoal">${ready ? 'Alle Themen der Welt in drei Phasen' : `Erwacht, wenn deine Lehrperson ihn öffnet oder bei ${C.BOSS_BADGES} Abzeichen (du hast ${n})`}</span>
    <span class="tstat">${st.wins ? `besiegt ✓ ${st.wins}×` : ready ? 'bereit' : 'schläft'}</span>`;
  return `<li>${ready ? `<a class="topic boss" href="#/boss/${w}">${inner}</a>` : `<div class="topic tlocked">${inner}</div>`}</li>`;
}

// ---------- Boss ----------
function renderBoss(w) {
  $('#main').innerHTML = `<a class="back" href="#/themen">‹ Alle Themen</a><div id="bossRoot" class="panel bosspanel"></div>`;
  mountFight($('#bossRoot'), S, w, VIA, {
    pic: bossSvg, toast,
    isOpen: (b) => C.buildingOpen(openWorlds, b),
    save: async () => { updateTop(); await saveLocal(); },
    close: () => { location.hash = '#/themen'; },
  });
}

// ---------- Aufgaben ----------
function renderTopic(id) {
  const b = BYID[id];
  current = { id, stage: C.recommended(S, id) };
  $('#main').innerHTML = `
    <a class="back" href="#/themen">‹ Alle Themen</a>
    <div class="taskhead"><span class="eyebrow">${esc(areaOf(b).name)} · ${esc(b.lz)}</span><h1>${esc(b.topic)}</h1>
      <p class="small">${esc(b.goal)}</p><p class="ref">${esc(b.ref)}</p></div>
    <div id="pStages" class="stages" role="group" aria-label="Niveau"></div>
    <article class="taskcard">
      <div id="pQuestion" class="question"></div>
      <div id="pAnswer" class="answer"></div>
      <div id="pHint" class="hint" hidden></div>
      <div id="pFeedback" role="status"></div>
      <div class="actions">
        <button id="hintBtn">Lösungshilfe</button>
        <button id="checkBtn" class="primary">Prüfen</button>
        <button id="nextBtn" class="primary" hidden>Nächste Aufgabe</button>
      </div>
    </article>`;
  $('#checkBtn').onclick = check; $('#nextBtn').onclick = newTask; $('#hintBtn').onclick = showHint;
  newTask();
}
function renderStages() {
  const id = current.id, rec = C.recommended(S, id);
  $('#pStages').innerHTML = [1, 2, 3].map(s => {
    const st = S.stats[id][s], locked = s === 3 && !C.unlocked3(S, id);
    return `<button class="stage ${s === current.stage ? 'on' : ''}" data-s="${s}" ${s === current.stage ? 'aria-pressed="true"' : 'aria-pressed="false"'} ${locked ? 'disabled title="Löse zuerst 3 Standard-Aufgaben richtig."' : ''}>
      <span class="stars">${STAGES[s].stars}</span><span class="sname">${STAGES[s].name}</span>
      <small>${locked ? 'gesperrt' : `${st.c} richtig · ${STAGES[s].coins} Coins${s === rec ? ' · empfohlen' : ''}`}</small></button>`;
  }).join('');
  $('#pStages').querySelectorAll('button').forEach(btn => btn.onclick = () => { current.stage = Number(btn.dataset.s); newTask(); });
}
function newTask() {
  C.beginTask(current, BYID[current.id]);
  renderStages();
  $('#pQuestion').innerHTML = current.task.q;
  $('#pAnswer').innerHTML = C.answerHtml(current);
  $('#pFeedback').innerHTML = ''; $('#pFeedback').className = '';
  $('#checkBtn').hidden = false; $('#nextBtn').hidden = true; $('#hintBtn').hidden = false; $('#hintBtn').disabled = false;
  $('#pHint').hidden = true;
  const first = $('#pAnswer input[type=text]');
  if (first && matchMedia('(hover: hover)').matches) first.focus();
}
async function check() {
  if (!current || current.done) return;
  const vals = C.readAnswers(current), fb = $('#pFeedback');
  if (vals.some(v => v === null || v === '')) { fb.className = 'warn'; fb.textContent = 'Bitte beantworte alle Teile.'; return; }
  const r = C.gradeTask(S, current, vals, VIA), { stage: s, task: t } = current;
  if (r.finished) {
    fb.className = r.ok ? 'good' : 'bad';
    const note = r.coins >= STAGES[s].coins ? '' : r.under ? ' (weniger Coins: Die App empfiehlt dir ein höheres Niveau. Probiere ★★!)' : ' (halbe Belohnung wegen Lösungshilfe oder zweitem Versuch)';
    fb.innerHTML = r.ok
      ? `<b>Richtig!</b> +${r.coins} Coins${note}<div class="sol">${t.sol}</div>${r.probe ? C.probeHtml(current) : ''}`
      : `<b>Leider nicht richtig.</b> So geht es:<div class="sol">${t.sol}</div>`;
    if (r.probe) wireProbe();
    announceBadges(r.badges);
    $('#checkBtn').hidden = true; $('#hintBtn').hidden = true; $('#nextBtn').hidden = false; $('#nextBtn').focus({ preventScroll: true });
    updateTop(); renderStages(); await saveLocal();
    if (S.unsavedSince === 10) toast(CONFIG.saveUrl ? 'Tipp: Speichere deinen Lernstand (Knopf «Speichern»).' : 'Tipp: Speichere deinen Lernstand als Datei (Knopf «Speichern»).', 5000);
  } else {
    fb.className = 'bad';
    fb.innerHTML = `<b>Noch nicht ganz.</b> ${current.parts.length > 1 ? 'Kontrolliere: ' + r.results.map((ok, i) => (ok ? '' : esc(current.parts[i].label))).filter(Boolean).join(', ') + '. ' : ''}Du hast noch einen Versuch.`;
    if (!current.hint) showHint();
  }
  $('.actions').scrollIntoView({ block: 'nearest' });   // Rückmeldung steht direkt darüber
}
function wireProbe() {
  const go = async () => {
    const r = C.gradeProbe(S, current, $('#probeIn').value); if (!r) return;
    $('#probeIn').disabled = true; $('#probeBtn').disabled = true;
    $('#probeMsg').innerHTML = r.ok ? `<b class="ok">Probe stimmt! +${r.coins} Coins</b>` : `Nicht ganz: Beide Seiten ergeben ${r.value}.`;
    updateTop(); await saveLocal();
  };
  $('#probeBtn').onclick = go;
  $('#probeIn').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if ($('#probeIn').value.trim()) go(); else newTask(); } };
}
function showHint() {
  current.hint = true; S.hints++;
  $('#pHint').innerHTML = `<b>Lösungshilfe:</b> ${current.task.hint}`; $('#pHint').hidden = false; $('#hintBtn').disabled = true;
}

// ---------- Level ----------
function renderLevel() {
  const cost = C.levelCost(S.level), can = S.coins >= cost;
  $('#main').innerHTML = `<h1>Level</h1>
    <div class="panel">
      <p>Du bist <b>Level ${S.level}</b>: ${esc(C.titleOf(S.level))}. Du hast <b>${S.coins} Coins</b> (insgesamt verdient: ${S.earned}).</p>
      <p>Der Aufstieg auf Level ${S.level + 1} (${esc(C.titleOf(S.level + 1))}) kostet <b>${cost} Coins</b>. Dein Level gilt auch im 3D-Spiel.</p>
      <button id="lvUp" class="primary" ${can ? '' : 'disabled'}>${can ? `Für ${cost} Coins aufsteigen` : `Noch ${cost - S.coins} Coins sammeln`}</button>
    </div>
    <ol class="titles">${C.TITLES.map((t, i) => `<li class="${i + 1 <= S.level ? 'got' : ''}"><span>Level ${i + 1}</span>${esc(t)}</li>`).join('')}</ol>
    <h2>Abzeichen</h2>
    <p class="small">Ein Abzeichen pro Lernziel: ${C.BADGE_NEED.silver} Aufgaben ab ★★ im ersten Versuch ohne Lösungshilfe (+${C.BADGE_COINS.silver} Coins). Gold: ${C.BADGE_NEED.gold} davon auf ★★★ (+${C.BADGE_COINS.gold} Coins).</p>
    ${badgesHtml()}
    <h2>Shop</h2>
    <p class="small">Nur fürs Aussehen, sichtbar im 3D-Spiel. Du entscheidest: aufsteigen oder etwas kaufen.</p>
    <ul class="shop">${C.SHOP.map(it => {
      const have = S.items.includes(it.id), on = S.equip[it.kind] === it.id;
      return `<li><b>${esc(it.name)}</b><span class="small">${esc(it.desc)}</span>${have ? `<button data-eq="${it.id}">${on ? 'Ablegen' : 'Benutzen'}</button>` : `<button data-buy="${it.id}" ${S.coins >= it.price ? '' : 'disabled'}>${it.price} Coins</button>`}</li>`;
    }).join('')}</ul>`;
  $('#main').querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { if (C.buyItem(S, b.dataset.buy, VIA)) { updateTop(); await saveLocal(); renderLevel(); toast('Gekauft! Du siehst es im 3D-Spiel.'); } });
  $('#main').querySelectorAll('[data-eq]').forEach(b => b.onclick = async () => { C.equipItem(S, b.dataset.eq); await saveLocal(); renderLevel(); });
  $('#lvUp').onclick = async () => {
    if (!C.buyLevel(S, VIA)) return;
    updateTop(); await saveLocal(); renderLevel();
    toast(`Gratuliere! Du bist jetzt Level ${S.level}: ${C.titleOf(S.level)}.`);
  };
}

function badgesHtml() {
  return `<ul class="badges">${C.BADGES.map(b => {
    const p = C.badgeProgress(S, b.lz), have = S.badges[b.lz] || {};
    const sub = have.gold ? 'Gold!' : have.silver ? `Gold: ${p.gold} / ${C.BADGE_NEED.gold} auf ★★★` : `${p.silver} / ${C.BADGE_NEED.silver} ab ★★`;
    return `<li class="${have.gold ? 'gold' : have.silver ? 'silver' : ''}" title="${esc(b.goal)}"><i>${b.icon}</i><b>${esc(b.name)}</b><span>${b.lz} · ${sub}</span></li>`;
  }).join('')}</ul>`;
}

// ---------- Mein Stand ----------
const fmtDate = (t) => new Date(t).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function renderStand() {
  let c = 0, w = 0;
  for (const b of BUILDINGS) for (const k of [1, 2, 3]) { c += S.stats[b.id][k].c; w += S.stats[b.id][k].w; }
  const minutes = Math.round(S.log.reduce((a, l) => a + Math.min(l.ms || 0, 600000), 0) / 60000);
  const rows = (w0) => BUILDINGS.filter(b => b.lu === w0.lu).map(b => `<tr><th scope="row">${esc(b.topic)}</th>${[1, 2, 3].map(k => { const x = S.stats[b.id][k]; return `<td>${x.c} / ${x.c + x.w}</td>`; }).join('')}</tr>`).join('');
  const recent = S.log.slice().reverse().filter(l => BYID[l.b]).slice(0, 15).map(l => `<li><span class="dot ${l.ok ? 'ok' : 'no'}">${l.ok ? 'richtig' : 'falsch'}</span><span>${esc(BYID[l.b].topic)} ${STAGES[l.s].stars}</span><span class="small">${fmtDate(l.t)} · ${l.coins > 0 ? '+' + l.coins : 0} Coins</span></li>`).join('');
  $('#main').innerHTML = `<h1>Mein Stand</h1>
    <div class="tiles">
      <div><b>${c}</b><span>richtig gelöst</span></div>
      <div><b>${c + w ? Math.round(c / (c + w) * 100) + ' %' : '–'}</b><span>Trefferquote</span></div>
      <div><b>${S.earned}</b><span>Coins verdient</span></div>
      <div><b>${minutes} min</b><span>Lernzeit</span></div>
    </div>
    ${Object.values(WORLDS).map(w0 => `<h2>${esc(w0.name)}</h2><div class="tablewrap"><table><thead><tr><th scope="col">Richtig / bearbeitet</th><th scope="col">★</th><th scope="col">★★</th><th scope="col">★★★</th></tr></thead><tbody>${rows(w0)}</tbody></table></div>`).join('')}
    <h2>Abzeichen</h2>${badgesHtml()}
    <h2>Boss-Kämpfe</h2>
    <div class="tiles">${Object.keys(BOSSES).map(w0 => { const st = S.boss[w0]; return `<div><b>${st.wins ? 'besiegt ✓' : '–'}</b><span>${esc(BOSSES[w0].name)} · ${st.fights} ${st.fights === 1 ? 'Kampf' : 'Kämpfe'}, ${st.wins} ${st.wins === 1 ? 'Sieg' : 'Siege'}</span></div>`; }).join('')}
      <div><b>${S.probes.ok} / ${S.probes.n}</b><span>Proben richtig (Bonus)</span></div></div>
    <h2>Klassen-Leuchtturm</h2>
    ${(() => { const k = C.classInfo(openWorlds); return `<div class="panel"><div class="bar big" style="width:100%"><div style="width:${k.stage / C.CLASS_STAGES * 100}%"></div></div><p>Stufe ${k.stage} von ${C.CLASS_STAGES}: Die Klasse hat ${k.total} Coins verdient${k.next ? `, nächste Stufe bei ${k.next}` : ''}. Dein Beitrag: ${S.earned} Coins.</p></div>`; })()}
    <h2>Zuletzt gelöst</h2>
    ${recent ? `<ul class="recent">${recent}</ul>` : '<p class="small">Noch keine Aufgaben gelöst.</p>'}
    <h2>Konto</h2>
    <div class="panel">
      <p>Angemeldet als <b>${esc(S.id)}</b>. Dein Lernstand wird auf diesem Gerät gespeichert. Klicke am Ende der Lektion auf <b>Speichern</b>, damit deine Lehrperson ihn sieht und du auf anderen Geräten weiterlernen kannst.</p>
      <div class="actions left">
        <button id="fileBtn">Als Datei speichern</button>
        <a class="btn" href="index.html">Zum 3D-Spiel</a>
        <button id="logoutBtn">Abmelden</button>
      </div>
    </div>
    <details class="panel"><summary>So funktioniert die App</summary>
      <p>Jedes Thema hat Aufgaben auf drei Niveaus: <b>★ Grundanspruch</b> (5 Coins), <b>★★ Standard</b> (10 Coins) und <b>★★★ Erweiterung</b> (20 Coins). Die Erweiterung öffnet sich, wenn du 3 Standard-Aufgaben richtig gelöst hast.</p>
      <p>Du hast zwei Versuche. Mit einer Lösungshilfe oder im zweiten Versuch gibt es die halbe Belohnung. Auf ★, wenn die App schon ★★ empfiehlt, gibt es weniger Coins. Unter <b>Level</b> tauschst du Coins gegen ein höheres Level, siehst deine Abzeichen und den Shop.</p>
      <p>Jede Welt hat einen <b>Boss</b>. Du besiegst ihn mit richtigen Antworten. Er erwacht, wenn deine Lehrperson ihn öffnet oder wenn du 3 Abzeichen der Welt hast.</p>
    </details>`;
  $('#fileBtn').onclick = downloadSave;
  $('#logoutBtn').onclick = async () => { await saveLocal(); history.replaceState(null, '', location.pathname); location.reload(); };
}

// ---------- Initialisierung ----------
function init() {
  $('#loginForm').onsubmit = (e) => { e.preventDefault(); tryLogin($('#tokenInput').value); };
  $('#scanBtn').onclick = () => C.scanQr((code) => { $('#tokenInput').value = code; tryLogin(code); });
  if (!('BarcodeDetector' in window)) $('#scanBtn').title = 'In diesem Browser nicht verfügbar: Code bitte eintippen.';
  const m = location.hash.match(/t=([A-Za-z0-9-]+)/); if (m) { $('#tokenInput').value = m[1]; history.replaceState(null, '', location.pathname); }
  $('#newGameBtn').onclick = start;
  $('#loadFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { S = await C.readSaveFile(f, token, sKey); await saveLocal(); start(); toast('Lernstand geladen.'); }
    catch (er) { $('#welcomeError').textContent = er.message || 'Die Datei konnte nicht gelesen werden.'; }
  };
  $('#saveBtn').onclick = saveOnline;
  window.addEventListener('hashchange', () => { if (location.hash !== shownHash) route(); });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !current || ['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName)) return;
    e.preventDefault();
    if (current.done) newTask(); else check();
  });
  window.addEventListener('beforeunload', () => { if (S) saveLocal(); });
}
init();
