// MathWelt 3A – Masterview für die Lehrperson
import { BUILDINGS, STAGES, WORLDS } from './tasks.js';
import { CONFIG } from './config.js';
import * as K from './crypto.js';
import { titleOf, BADGES, CLASS_STAGES, classInfo, migrate } from './core.js';
import { BOSSES } from './boss.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BYID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

let dongle = null, priv = null;
const students = new Map();   // id -> Spielstand
let selected = null;

// ---------- Entsperren ----------
let dongleFileData = null;
$('#dongleFile').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  $('#dongleName').textContent = f.name;
  try { dongleFileData = JSON.parse(await f.text()); } catch { dongleFileData = null; $('#lockError').textContent = 'Die Datei ist keine gültige Dongle-Datei.'; }
};
$('#unlockForm').onsubmit = async (e) => {
  e.preventDefault(); $('#lockError').textContent = '';
  if (!dongleFileData) { $('#lockError').textContent = 'Bitte zuerst die Dongle-Datei wählen.'; return; }
  $('#unlockBtn').disabled = true; $('#unlockBtn').textContent = 'Prüfe …';
  try {
    const content = await K.openDongle(dongleFileData, $('#pw').value);
    if (content.privateKey.n !== CONFIG.teacherPublicKey.n) throw new Error('Dieser Dongle gehört nicht zu dieser MathWelt-Installation.');
    priv = await K.importPrivate(content.privateKey);
    dongle = content; dongle.names = dongle.names || {}; dongle.tokens = dongle.tokens || [];
    $('#pw').value = ''; $('#lock').hidden = true; $('#app').hidden = false;
    render(); loadWorlds();
  } catch (er) { $('#lockError').textContent = er.message; }
  finally { $('#unlockBtn').disabled = false; $('#unlockBtn').textContent = 'Entsperren'; }
};
$('#lockBtn').onclick = () => location.reload();

// ---------- Spielstände laden ----------
async function addSave(text) {
  const data = JSON.parse(text);
  if (data.app !== 'mathwelt-3a') throw new Error('keine MathWelt-Datei');
  const st = await K.openSaveAsTeacher(data, priv);
  migrate(st);                         // ergänzt neue Felder, übernimmt alte Abzeichen-Nummern
  const prev = students.get(st.id);
  if (!prev || (st.lastSave || 0) >= (prev.lastSave || 0)) students.set(st.id, st);
}
function showLoadResult(ok, errs) {
  $('#status').innerHTML = `${ok} Spielstand/-stände geladen, ${students.size} Schüler/innen in der Übersicht.` + (errs.length ? `<br><span class="error">${errs.map(esc).join('<br>')}</span>` : '');
  render();
}
$('#saves').onchange = async (e) => {
  let ok = 0; const errs = [];
  for (const f of e.target.files) {
    try { await addSave(await f.text()); ok++; }
    catch (er) { errs.push(`${f.name}: ${er.message || 'nicht lesbar'}`); }
  }
  e.target.value = '';
  showLoadResult(ok, errs);
};

// ---------- Online-Spielstände (privates GitHub-Repo, Lesezugriff liegt verschlüsselt im Dongle) ----------
async function github(path, readToken, accept) {
  const res = await fetch(`https://api.github.com/repos/${dongle.cloud.repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${readToken}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store',
  });
  if (res.status === 404 && path === 'saves') return null;   // noch nichts gespeichert
  if (res.status === 401 || res.status === 403) throw new Error('GitHub lehnt den Lesezugriff ab. Ist der Schlüssel abgelaufen?');
  if (res.status === 404) throw new Error('Das Daten-Repo wurde nicht gefunden. Hat der Schlüssel Zugriff darauf?');
  if (!res.ok) throw new Error(`GitHub antwortet mit Fehler ${res.status}.`);
  return res;
}
async function loadOnline() {
  const btn = $('#cloudBtn'); btn.disabled = true; $('#status').textContent = 'Lade Online-Spielstände …';
  try {
    const list = await github('saves', dongle.cloud.token, 'application/vnd.github+json');
    const files = list ? (await list.json()).filter(f => f.type === 'file' && f.name.endsWith('.mw3a')) : [];
    let ok = 0; const errs = [];
    const results = await Promise.allSettled(files.map(async f => {
      const res = await github('saves/' + encodeURIComponent(f.name), dongle.cloud.token, 'application/vnd.github.raw+json');
      await addSave(await res.text());
    }));
    results.forEach((r, i) => { if (r.status === 'fulfilled') ok++; else errs.push(`${files[i].name}: ${r.reason?.message || 'nicht lesbar'}`); });
    showLoadResult(ok, errs);
  } catch (er) {
    $('#status').innerHTML = `<span class="error">${esc(er.message || 'Laden nicht möglich.')}</span>`;
  } finally { btn.disabled = false; }
}
$('#cloudBtn').onclick = () => {
  if (dongle.cloud?.token && dongle.cloud?.repo) return loadOnline();
  $('#clRepo').value = dongle.cloud?.repo || CONFIG.dataRepo || ''; $('#clToken').value = ''; $('#clError').textContent = '';
  $('#cloudDlg').hidden = false;
};
$('#clClose').onclick = () => { $('#cloudDlg').hidden = true; };
$('#clSave').onclick = async () => {
  const repo = $('#clRepo').value.trim(), tok = $('#clToken').value.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { $('#clError').textContent = 'Das Repo braucht die Form name/repo.'; return; }
  if (!tok) { $('#clError').textContent = 'Bitte den Lese-Schlüssel eingeben.'; return; }
  const before = dongle.cloud; dongle.cloud = { repo, token: tok };
  try { await github('saves', tok, 'application/vnd.github+json'); }
  catch (er) { dongle.cloud = before; $('#clError').textContent = er.message; return; }
  $('#clToken').value = ''; $('#cloudDlg').hidden = true;
  await loadOnline();
  $('#status').insertAdjacentHTML('beforeend', '<br><b>Wichtig:</b> Speichere jetzt den Dongle neu («Dongle speichern»), sonst musst du den Lese-Schlüssel beim nächsten Mal wieder eingeben.');
};

// ---------- Freigabe: Welten, Gebäude, Boss, Klassen-Coins ----------
let worldState = { ...CONFIG.worlds };
function renderWorldToggles(busy = false) {
  const dis = busy || !CONFIG.saveUrl ? 'disabled' : '';
  $('#worldToggles').innerHTML = Object.values(WORLDS).map(w => {
    const on = !!worldState[w.id], bossOn = !!worldState['boss_' + w.id];
    const chips = BUILDINGS.filter(b => b.lu === w.lu).map(b => {
      const bOn = worldState[b.id] !== false;
      return `<button class="chip ${bOn ? 'on' : 'off'}" data-k="${b.id}" title="${bOn ? 'Klicken zum Sperren' : 'Klicken zum Öffnen'}" ${dis}>${bOn ? '✓' : '✕'} ${esc(b.name)}</button>`;
    }).join('');
    return `<div class="worldtoggle"><span><b>${esc(w.name)}</b> · ${esc('LU ' + w.lu)}</span>
      <span class="st ${on ? 'on' : 'off'}">${on ? 'offen' : 'gesperrt'}</span>
      <button data-k="${w.id}" ${on ? '' : 'class="primary"'} ${dis}>${on ? 'Welt sperren' : 'Welt freischalten'}</button>
      <button data-k="boss_${w.id}" class="${bossOn ? '' : 'primary'}" ${dis}>${bossOn ? `${esc(BOSSES[w.id].name)} schlafen lassen` : `${esc(BOSSES[w.id].name)} für alle wecken`}</button></div>
      <div class="chips">${chips}</div>`;
  }).join('');
  $('#worldToggles').querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k, isB = !!BYID[k];
    setSwitch({ [k]: isB ? worldState[k] === false : !worldState[k] }, describe(k, isB ? worldState[k] === false : !worldState[k]));
  });
  const k = classInfo(worldState), sum = classSum();
  $('#classInfo').innerHTML = `Klassen-Leuchtturm: <b>${k.total} Coins</b> übertragen (Stufe ${k.stage} von ${CLASS_STAGES}). In den geladenen Spielständen: <b>${sum} Coins</b>${students.size ? '' : ' (zuerst Spielstände laden)'}.`;
  $('#classBtn').disabled = busy || !CONFIG.saveUrl || !students.size || sum <= k.total;
}
function describe(k, on) {
  if (WORLDS[k]) return `«${WORLDS[k].name}» ist jetzt ${on ? 'offen' : 'gesperrt'}.`;
  if (k.startsWith('boss_')) return `${BOSSES[k.slice(5)].name}: ${on ? 'für alle geweckt' : 'schläft wieder (ausser bei 3 Abzeichen)'}.`;
  return `«${BYID[k].name}» ist jetzt ${on ? 'offen' : 'gesperrt'}.`;
}
// Summe der verdienten Coins aller geladenen Spielstände (nur die Zahl geht an den Worker)
const classSum = () => [...students.values()].reduce((a, st) => a + (st.earned || 0), 0);
$('#classBtn').onclick = () => {
  const total = Math.max(classSum(), classInfo(worldState).total);
  setSwitch({ klasse: total }, `Klassen-Leuchtturm: ${total} Coins übertragen.`);
};
async function workerJson(path, opts) {
  let res;
  try { res = await fetch(new URL(path, CONFIG.saveUrl), { cache: 'no-store', ...opts }); }
  catch { throw new Error('Der Worker ist nicht erreichbar. Prüfe die Internetverbindung.'); }
  if (!res.ok) throw new Error(`Der Worker antwortet mit Fehler ${res.status}. Ist der neuste Worker-Code bei Cloudflare eingesetzt?`);
  return res.json();
}
async function loadWorlds() {
  renderWorldToggles();
  if (!CONFIG.saveUrl) { $('#worldMsg').textContent = 'Ohne Worker gilt die Einstellung worlds in js/config.js.'; return; }
  try { worldState = { ...CONFIG.worlds, ...(await workerJson('/worlds')).worlds }; renderWorldToggles(); $('#worldMsg').textContent = ''; }
  catch (er) { $('#worldMsg').innerHTML = `<span class="error">${esc(er.message)}</span>`; }
}
async function setSwitch(patch, msg) {
  renderWorldToggles(true); $('#worldMsg').textContent = 'Speichere …';
  try {
    const { challenge, exp, ticket } = await workerJson('/worlds/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const answer = await K.openChallenge(challenge, priv);
    const want = { ...worldState, ...patch };
    const res = await workerJson('/worlds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer, exp, ticket, worlds: want }) });
    worldState = { ...CONFIG.worlds, ...res.worlds };
    const lost = Object.keys(patch).filter(k => res.worlds[k] !== patch[k]);
    $('#worldMsg').innerHTML = lost.length
      ? '<span class="error">Der Worker hat die Änderung nicht übernommen. Setze den neuen Worker-Code bei Cloudflare ein (worker/README.md, «Worker-Code aktualisieren»).</span>'
      : `${esc(msg)} Die Klasse sieht es innert etwa einer Minute im Spiel und in der App.`;
  } catch (er) { $('#worldMsg').innerHTML = `<span class="error">${esc(er.message || 'Speichern nicht möglich.')}</span>`; }
  renderWorldToggles();
}

// ---------- Auswertung ----------
function summary(st) {
  let c = 0, w = 0;
  for (const b of BUILDINGS) for (const s of [1, 2, 3]) { c += st.stats[b.id]?.[s]?.c || 0; w += st.stats[b.id]?.[s]?.w || 0; }
  const ms = st.log.reduce((a, l) => a + Math.min(l.ms || 0, 10 * 60000), 0);
  const lastAct = st.log.length ? st.log[st.log.length - 1].t : st.lastSave;
  const hints = st.log.filter(l => l.hint).length;
  const tasks = st.log.filter(l => BYID[l.b]), inApp = tasks.filter(l => l.via === 'app').length;
  const badges = BADGES.filter(b => st.badges?.[b.lz]?.silver).length, gold = BADGES.filter(b => st.badges?.[b.lz]?.gold).length;
  const boss = Object.keys(BOSSES).map(w => st.boss?.[w]?.wins ? BOSSES[w].short + ' ✓' : '').filter(Boolean).join(' · ') || '–';
  return { c, w, n: c + w, rate: c + w ? c / (c + w) : null, ms, lastAct, hints, access: tasks.length ? `Spiel ${tasks.length - inApp} · App ${inApp}` : '–', badges, gold, boss };
}
// Name eines Log-Eintrags (Gebäude oder Sonderereignis)
const logName = (l) => BYID[l.b]?.name || { level: 'Level-Turm', badge: 'Abzeichen', shop: 'Shop', boss: 'Boss-Sieg' }[l.b] || l.b;
function bcell(st, id) {
  const s = st.stats[id]; if (!s) return { txt: '–', cls: 'n' };
  const c = s[1].c + s[2].c + s[3].c, w = s[1].w + s[2].w + s[3].w;
  if (!c && !w) return { txt: '–', cls: 'n', rate: null };
  const top = s[3].c >= 3 ? 3 : s[2].c >= 3 ? 2 : s[1].c >= 3 ? 1 : 0;
  const rate = c / (c + w);
  return { txt: `${top ? STAGES[top].stars : '·'} ${Math.round(rate * 100)}%`, cls: rate >= 0.8 ? 'g' : rate >= 0.5 ? 'y' : 'r', rate, n: c + w };
}
const fmtTime = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
const fmtDate = (t) => t ? new Date(t).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';

function render() {
  const list = [...students.values()].sort((a, b) => a.id.localeCompare(b.id));
  // Klassenübersicht
  const all = list.map(summary);
  const tot = all.reduce((a, s) => a + s.n, 0), cor = all.reduce((a, s) => a + s.c, 0);
  const lz = {};
  for (const st of list) for (const b of BUILDINGS) {
    const s = st.stats[b.id]; if (!s) continue;
    for (const key of b.lz.split(' · ')) {
      lz[key] = lz[key] || { c: 0, n: 0 };
      for (const k of [1, 2, 3]) { lz[key].c += s[k].c; lz[key].n += s[k].c + s[k].w; }
    }
  }
  $('#classSummary').innerHTML = list.length ? `
    <div class="tile"><b>${list.length}</b><span>Spielstände geladen</span></div>
    <div class="tile"><b>${tot}</b><span>gelöste Aufgaben (Klasse)</span></div>
    <div class="tile"><b>${tot ? Math.round(cor / tot * 100) + ' %' : '–'}</b><span>Trefferquote Klasse</span></div>
    <div class="tile"><b>${(list.reduce((a, s) => a + s.level, 0) / list.length).toFixed(1)}</b><span>durchschnittliches Level</span></div>
    ${Object.keys(BOSSES).map(w => `<div class="tile"><b>${list.filter(st => st.boss?.[w]?.wins).length} / ${list.length}</b><span>${esc(BOSSES[w].name)} besiegt</span></div>`).join('')}
    ${BADGES.map(b => `<div class="tile"><b>${list.filter(st => st.badges?.[b.lz]?.silver).length}</b><span>${b.icon} ${esc(b.lz)} Abzeichen</span></div>`).join('')}
    ${Object.entries(lz).sort().map(([k, v]) => `<div class="tile ${v.n ? (v.c / v.n >= 0.8 ? 'g' : v.c / v.n >= 0.5 ? 'y' : 'r') : ''}"><b>${v.n ? Math.round(v.c / v.n * 100) + ' %' : '–'}</b><span>${esc(k)} · ${v.n} Aufgaben</span></div>`).join('')}` : '';
  // Tabelle
  const head = `<thead><tr><th>ID</th><th>Name (nur im Dongle)</th><th>Level</th><th>Coins</th><th>verdient</th><th>Aufgaben</th><th>Treffer</th><th>Hilfen</th><th>Lernzeit</th><th>Zugang</th><th>letzte Aktivität</th><th title="Abzeichen (davon Gold) von 8">Abzeichen</th><th>Boss</th>
    ${BUILDINGS.map(b => `<th class="b" title="${esc(b.topic)}">${b.lu === 11 ? 'LU11' : 'LU10'} ${esc(b.name)}</th>`).join('')}</tr></thead>`;
  const ids = new Set([...list.map(s => s.id), ...Object.keys(dongle.names)]);
  const rows = [...ids].sort().map(id => {
    const st = students.get(id);
    const nameInput = `<input class="name" data-id="${esc(id)}" value="${esc(dongle.names[id] || '')}" placeholder="—">`;
    if (!st) return `<tr class="missing"><td><b>${esc(id)}</b></td><td>${nameInput}</td><td colspan="${11 + BUILDINGS.length}" class="n">keine Datei geladen</td></tr>`;
    const s = summary(st);
    return `<tr data-id="${esc(id)}" class="${selected === id ? 'sel' : ''}"><td><b>${esc(id)}</b></td><td>${nameInput}</td><td>${st.level}</td><td>${st.coins}</td><td>${st.earned}</td>
      <td>${s.c}/${s.n}</td><td class="${s.rate == null ? 'n' : s.rate >= .8 ? 'g' : s.rate >= .5 ? 'y' : 'r'}">${s.rate == null ? '–' : Math.round(s.rate * 100) + ' %'}</td>
      <td>${s.hints}</td><td>${fmtTime(s.ms)}</td><td>${s.access}</td><td>${fmtDate(s.lastAct)}</td><td>${s.badges}${s.gold ? ` (${s.gold})` : ''}</td><td>${esc(s.boss)}</td>
      ${BUILDINGS.map(b => { const c = bcell(st, b.id); return `<td class="cell ${c.cls}">${c.txt}</td>`; }).join('')}</tr>`;
  }).join('');
  $('#overview').innerHTML = head + `<tbody>${rows || `<tr><td colspan="${13 + BUILDINGS.length}" class="n">Noch keine Daten.</td></tr>`}</tbody>`;
  if (dongle) renderWorldToggles();
  $('#overview').querySelectorAll('tbody tr[data-id]').forEach(tr => tr.onclick = (e) => { if (e.target.tagName !== 'INPUT') { selected = tr.dataset.id; render(); showDetail(selected); } });
  $('#overview').querySelectorAll('input.name').forEach(inp => inp.onchange = () => { dongle.names[inp.dataset.id] = inp.value.trim(); });
}

function showDetail(id) {
  const st = students.get(id); if (!st) return;
  const s = summary(st), name = dongle.names[id];
  const byB = BUILDINGS.map(b => {
    const x = st.stats[b.id];
    return `<tr><td>LU ${b.lu}</td><td>${esc(b.name)}</td><td>${esc(b.topic)}</td><td>${esc(b.lz)}</td>${[1, 2, 3].map(k => `<td>${x[k].c} / ${x[k].c + x[k].w}</td>`).join('')}</tr>`;
  }).join('');
  const log = st.log.slice().reverse().slice(0, 200).map(l => `<tr><td>${fmtDate(l.t)}</td><td>${l.via === 'app' ? 'App' : 'Spiel'}</td><td>${esc(logName(l))}${l.boss && BYID[l.b] ? ` <span class="small">(Boss, Phase ${l.ph})</span>` : ''}</td>
    <td>${l.s ? STAGES[l.s].stars : ''}</td><td class="${l.ok ? 'ok' : 'no'}">${BYID[l.b] ? (l.ok ? 'richtig' : 'falsch') : ''}</td><td>${l.tries || ''}${l.hint ? ' · Hilfe' : ''}</td>
    <td>${l.coins > 0 ? '+' : ''}${l.coins}</td><td>${l.ms ? Math.round(l.ms / 1000) + ' s' : ''}</td><td title="${esc(l.q)}">${esc((l.q || '').slice(0, 70))}</td><td>${esc((l.a || []).join(' | '))}</td></tr>`).join('');
  const sessions = (st.sessions || []).slice(-10).reverse().map(x => `<li>${fmtDate(x.start)} – ${x.end ? new Date(x.end).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '?'}</li>`).join('');
  $('#detail').hidden = false;
  $('#detail').innerHTML = `
    <h2>${esc(id)}${name ? ' · ' + esc(name) : ''}: Level ${st.level} (${esc(titleOf(st.level))})</h2>
    <p class="small">Spielstand vom ${fmtDate(st.lastSave)} · ${s.c} von ${s.n} Aufgaben richtig · ${st.coins} Coins (verdient ${st.earned}) · Lernzeit ${fmtTime(s.ms)}</p>
    <div class="cols">
      <div><h2>Gebäude / Themen und Niveaus (richtig / bearbeitet)</h2>
        <div class="tw"><table class="grid"><thead><tr><th>LU</th><th>Gebäude</th><th>Thema in der App</th><th>Lernziel</th><th>★ Grund</th><th>★★ Standard</th><th>★★★ Erweiterung</th></tr></thead><tbody>${byB}</tbody></table></div></div>
      <div><h2>Letzte Sitzungen</h2><ul>${sessions || '<li>–</li>'}</ul></div>
    </div>
    <div class="cols">
      <div><h2>Abzeichen</h2><ul class="badges">${BADGES.map(b => { const h = st.badges?.[b.lz] || {}; return `<li class="${h.gold ? 'gold' : h.silver ? 'silver' : ''}"><i>${b.icon}</i><b>${esc(b.lz)} ${esc(b.name)}</b><span>${h.gold ? 'Gold ' + fmtDate(h.gold) : h.silver ? fmtDate(h.silver) : 'noch nicht'}</span></li>`; }).join('')}</ul></div>
      <div><h2>Boss-Kämpfe (richtig / falsch pro Phase)</h2><table class="grid"><thead><tr><th>Boss</th><th>Kämpfe</th><th>Siege</th><th>Bestzeit</th>${[1, 2, 3].map(k => `<th>Phase ${k}</th>`).join('')}</tr></thead><tbody>
        ${Object.keys(BOSSES).map(w => { const x = st.boss?.[w]; if (!x) return ''; return `<tr><td>${esc(BOSSES[w].name)}</td><td>${x.fights}</td><td>${x.wins}</td><td>${x.best ? Math.round(x.best / 1000) + ' s' : '–'}</td>${[0, 1, 2].map(k => `<td title="${esc(BOSSES[w].phases[k].name)}" class="${x.wrong[k] > x.right[k] ? 'r' : ''}">${x.right[k]} / ${x.wrong[k]}</td>`).join('')}</tr>`; }).join('')}</tbody></table>
        <p class="small">Probe-Bonus: ${st.probes?.ok || 0} von ${st.probes?.n || 0} Proben richtig. Shop: ${(st.items || []).length} Gegenstände.</p></div>
    </div>
    <h2>Lernaktivitäten (neueste zuerst, max. 200)</h2>
    <div class="tw log"><table class="grid"><thead><tr><th>Zeit</th><th>Zugang</th><th>Gebäude</th><th>Niveau</th><th>Ergebnis</th><th>Versuche</th><th>Coins</th><th>Dauer</th><th>Aufgabe</th><th>Antwort</th></tr></thead><tbody>${log}</tbody></table></div>`;
  $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- CSV ----------
$('#csvBtn').onclick = () => {
  const head = ['ID', 'Name', 'Level', 'Coins', 'verdient', 'richtig', 'bearbeitet', 'Trefferquote', 'Hilfen', 'Lernzeit_min', 'Zugang', 'letzte_Aktivitaet', 'Abzeichen', 'Gold', 'Boss_besiegt', 'Proben_richtig', ...BUILDINGS.flatMap(b => [1, 2, 3].map(k => `${b.name} N${k} richtig/bearbeitet`))];
  const lines = [head];
  for (const st of [...students.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const s = summary(st);
    lines.push([st.id, dongle.names[st.id] || '', st.level, st.coins, st.earned, s.c, s.n, s.rate == null ? '' : Math.round(s.rate * 100) + '%', s.hints, Math.round(s.ms / 60000), s.access, fmtDate(s.lastAct), s.badges, s.gold, s.boss, st.probes?.ok || 0,
      ...BUILDINGS.flatMap(b => [1, 2, 3].map(k => `${st.stats[b.id][k].c}/${st.stats[b.id][k].c + st.stats[b.id][k].w}`))]);
  }
  const csv = '﻿' + lines.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv' }), `MathWelt3A_Uebersicht_${new Date().toISOString().slice(0, 10)}.csv`);
};
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Tokens ----------
$('#tokensBtn').onclick = () => { $('#tokensDlg').hidden = false; $('#tokOut').innerHTML = ''; };
$('#tokClose').onclick = () => { $('#tokensDlg').hidden = true; };
$('#tokMake').onclick = async () => {
  const ids = $('#tokIds').value.split(/[,;\s]+/).map(s => K.normalizeToken(s).slice(0, 4)).filter(s => s.length === 4);
  if (!ids.length) { $('#tokOut').innerHTML = '<p class="error">Bitte IDs mit 4 Zeichen angeben, z. B. 3A19.</p>'; return; }
  const made = [];
  for (const id of ids) { const t = K.newToken(id); made.push({ id, token: t, hash: await K.tokenHash(t) }); dongle.tokens.push({ id, token: t }); }
  $('#tokOut').innerHTML = made.map(m => `<div class="tokcard">${esc(m.id)}: ${esc(m.token)}</div>`).join('') +
    `<p>In <code>js/config.js</code> bei <code>tokenHashes</code> ergänzen:</p><pre class="hashes">${made.map(m => `    '${m.hash}', // ${m.id}`).join('\n')}</pre>
     <p class="small">Die Codes sind jetzt im Dongle vermerkt. Speichere den Dongle neu (Knopf «Dongle speichern»), damit sie nicht verloren gehen.</p>`;
};

// ---------- Dongle neu speichern ----------
$('#dongleBtn').onclick = () => { $('#dongleDlg').hidden = false; $('#dgError').textContent = ''; };
$('#dgClose').onclick = () => { $('#dongleDlg').hidden = true; };
$('#dgSave').onclick = async () => {
  const a = $('#pw1').value, b = $('#pw2').value;
  if (a.length < 10) { $('#dgError').textContent = 'Das Passwort braucht mindestens 10 Zeichen.'; return; }
  if (a !== b) { $('#dgError').textContent = 'Die beiden Passwörter sind verschieden.'; return; }
  const file = await K.makeDongle({ ...dongle, updated: Date.now() }, a);
  download(new Blob([JSON.stringify(file)], { type: 'application/json' }), 'MathWelt3A_Lehrer.dongle.mw3akey');
  $('#pw1').value = ''; $('#pw2').value = ''; $('#dongleDlg').hidden = true;
};

// ---------- Alles zurücksetzen ----------
// Der Worker ersetzt das Daten-Repo durch einen leeren Stand (nur worlds.json mit reset-Zeitpunkt).
$('#resetBtn').onclick = () => {
  $('#rsConfirm').value = ''; $('#rsError').textContent = ''; $('#rsGo').disabled = true;
  $('#resetDlg').hidden = false;
  if (!CONFIG.saveUrl) $('#rsError').textContent = 'Ohne Worker (saveUrl in js/config.js) gibt es nichts online zu löschen.';
};
$('#rsClose').onclick = () => { $('#resetDlg').hidden = true; };
$('#rsCsv').onclick = () => $('#csvBtn').click();
$('#rsConfirm').oninput = () => { $('#rsGo').disabled = !CONFIG.saveUrl || $('#rsConfirm').value.trim().toUpperCase() !== 'LEER'; };
$('#rsGo').onclick = async () => {
  if ($('#rsConfirm').value.trim().toUpperCase() !== 'LEER') return;
  const btn = $('#rsGo'); btn.disabled = true; btn.textContent = 'Setze zurück …'; $('#rsError').textContent = '';
  try {
    const { challenge, exp, ticket } = await workerJson('/worlds/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const answer = await K.openChallenge(challenge, priv);
    const res = await workerJson('/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer, exp, ticket, keepWorlds: $('#rsKeep').checked }) });
    worldState = { ...CONFIG.worlds, ...res.worlds };
    students.clear(); selected = null; $('#detail').hidden = true;
    $('#resetDlg').hidden = true;
    render(); renderWorldToggles();
    $('#status').textContent = `Zurückgesetzt am ${new Date(res.worlds.reset).toLocaleString('de-CH')}. Das Daten-Repo ist leer. Die Klasse beginnt beim nächsten Anmelden neu (offene Spiele innert etwa einer Minute).`;
  } catch (er) {
    $('#rsError').textContent = /Fehler 40[14]/.test(er.message) ? 'Der Worker kennt «Zurücksetzen» noch nicht. Setze den neuen Worker-Code bei Cloudflare ein.' : (er.message || 'Zurücksetzen nicht möglich.');
  } finally { btn.textContent = 'Endgültig zurücksetzen'; btn.disabled = $('#rsConfirm').value.trim().toUpperCase() !== 'LEER'; }
};
