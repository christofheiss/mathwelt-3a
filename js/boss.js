// MathWelt 3A – Boss-Kampf: gemeinsame Regeln und Oberfläche für das Spiel (3D) und die Lern-App
// Gekämpft wird nur mit Aufgaben: Richtige Antworten treffen den Boss, falsche geben ihm einen Schild.
// Niemand verliert etwas. Jede Aufgabe zählt wie im Gebäude (Coins, Statistik, Abzeichen).
import { BUILDINGS, STAGES } from './tasks.js';
import * as C from './core.js';

const BYID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const BOSSES = {
  aj: {
    name: 'Nebel-Orakel', short: 'Orakel',
    intro: 'Das Orakel hüllt das Dorf in einen Nebel aus falschen Zahlen. Mit Daten und kritischen Fragen lichtest du ihn.',
    phases: [
      { name: 'Die Pyramiden-Maske', b: ['pyramide'], text: 'Das Orakel versteckt sich hinter Alterspyramiden. Lies sie genau!' },
      { name: 'Der Prozent-Nebel', b: ['prozent', 'zeit'], text: 'Der Nebel verwechselt absolute und relative Zahlen. Rechne mit Anteilen und Graphen!' },
      { name: 'Die Falschmeldungen', b: ['fakten'], text: 'Jetzt verbreitet es Schlagzeilen. Prüfe jede Aussage mit Daten!' },
    ],
  },
  gl: {
    name: 'Gleichungs-Golem', short: 'Golem',
    intro: 'Der Golem aus Stein bewacht das Dorf. Auf seiner Brust leuchtet ein Gleichheitszeichen. Nur wer Gleichungen beherrscht, bringt ihn ins Wanken.',
    phases: [
      { name: 'Die Waage-Fäuste', b: ['waage', 'umkehr'], text: 'Der Golem schwingt seine Waage-Fäuste. Löse Gleichungen mit Umformungen!' },
      { name: 'Der Klammer-Panzer', b: ['klammer', 'probe'], text: 'Er hüllt sich in einen Klammer-Panzer. Löse Klammern auf und mache die Probe!' },
      { name: 'Der Trick-Spiegel', b: ['detektiv', 'raetsel'], text: 'Er zeigt dir falsche Lösungswege und knifflige Rätsel. Durchschaue seine Tricks!' },
    ],
  },
};
export const BOSS_HP = 90, PHASE_HP = 30, HEAL = 5;
export const DAMAGE = { 1: 10, 2: 15, 3: 20 };          // ganze Treffer; mit Lösungshilfe oder im 2. Versuch halb
export const WIN_COINS = { first: 50, again: 10 };

export class Fight {
  // isOpen(building): Gesperrte Gebäude kommen im Kampf nicht vor
  constructor(S, w, via, isOpen = () => true) {
    this.S = S; this.w = w; this.via = via; this.boss = BOSSES[w]; this.isOpen = isOpen;
    this.hp = BOSS_HP; this.t0 = Date.now(); this.n = 0; this.right = 0; this.won = false; this.cur = null;
    this.wrongBy = [0, 0, 0];
    S.boss[w].fights++; S.boss[w].last = { t: Date.now(), hp: BOSS_HP, won: false };
  }
  get phase() { return this.hp > 2 * PHASE_HP ? 0 : this.hp > PHASE_HP ? 1 : 2; }
  next() {
    const ph = this.boss.phases[this.phase];
    const all = this.boss.phases.flatMap(p => p.b);
    let ids = ph.b.filter(id => this.isOpen(BYID[id]));
    if (!ids.length) ids = all.filter(id => this.isOpen(BYID[id]));   // Thema noch gesperrt: Aufgaben aus offenen Gebäuden
    if (!ids.length) ids = ph.b;
    const id = ids[this.n % ids.length];
    this.cur = { id, stage: C.recommended(this.S, id), ph: this.phase };
    C.beginTask(this.cur, BYID[id]);
    return this.cur;
  }
  grade(vals) {
    const cur = this.cur, S = this.S, before = this.phase;
    const r = C.gradeTask(S, cur, vals, this.via);
    if (!r.finished) return r;
    const entry = S.log[S.log.length - (1 + r.badges.length)];
    if (entry) { entry.boss = this.w; entry.ph = cur.ph + 1; }
    this.n++;
    const st = S.boss[this.w];
    if (r.ok) {
      this.right++; st.right[cur.ph]++;
      r.dmg = DAMAGE[cur.stage]; if (cur.tries > 1 || cur.hint) r.dmg = Math.ceil(r.dmg / 2);
      this.hp = Math.max(0, this.hp - r.dmg);
    } else {
      st.wrong[cur.ph]++; this.wrongBy[cur.ph]++;
      const top = BOSS_HP - PHASE_HP * cur.ph;            // Schild heilt nur innerhalb der Phase
      r.heal = Math.min(HEAL, top - this.hp); this.hp += r.heal;
    }
    st.last = { t: Date.now(), hp: this.hp, won: false };
    r.phaseChanged = this.phase !== before && this.hp > 0;
    if (this.hp <= 0 && !this.won) {
      this.won = true;
      const first = !st.wins;
      r.win = { coins: first ? WIN_COINS.first : WIN_COINS.again, first, ms: Date.now() - this.t0, n: this.n, right: this.right };
      st.wins++; st.last.won = true;
      if (!st.best || r.win.ms < st.best) st.best = r.win.ms;
      S.coins += r.win.coins; S.earned += r.win.coins;
      S.log.push({ t: Date.now(), b: 'boss', s: 0, ok: true, tries: 0, hint: false, ms: r.win.ms, coins: r.win.coins, q: `Boss besiegt: ${this.boss.name} (${this.n} Aufgaben)`, a: [], via: this.via, boss: this.w });
      S.unsavedSince++;
    }
    return r;
  }
  // Wo gab es in diesem Kampf die meisten Fehler? Für den Übungstipp nach dem Kampf.
  weakest() {
    const max = Math.max(...this.wrongBy); if (!max) return null;
    return this.boss.phases[this.wrongBy.indexOf(max)];
  }
}

const fmtMs = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)} min ${s % 60} s`; };

// Oberfläche des Kampfes in einem Container. hooks: hit(dmg, hp), miss(heal, hp), phase(p), win(info), close(), save(), toast(msg)
export function mountFight(root, S, w, via, hooks = {}) {
  const boss = BOSSES[w];
  let fight = null;
  const $ = (s) => root.querySelector(s);
  const call = (k, ...a) => hooks[k] && hooks[k](...a);

  function intro() {
    const st = S.boss[w];
    root.innerHTML = `<div class="boss-ui">
      <header><div><span class="eyebrow">Boss-Kampf</span><h2>${esc(boss.name)}</h2></div><button class="x" data-act="close">Zurück</button></header>
      ${hooks.pic ? `<div class="boss-pic">${hooks.pic(w, 'idle')}</div>` : ''}
      <p>${esc(boss.intro)}</p>
      <ol class="boss-phases">${boss.phases.map((p, i) => `<li><b>Phase ${i + 1}: ${esc(p.name)}</b><span>${p.b.map(id => esc(BYID[id].name)).join(' · ')}</span></li>`).join('')}</ol>
      <p class="small">Jede richtige Antwort trifft: ★ ${DAMAGE[1]}, ★★ ${DAMAGE[2]}, ★★★ ${DAMAGE[3]} Schaden (mit Lösungshilfe oder im 2. Versuch die Hälfte). Bei einer falschen Antwort baut der Boss einen Schild auf (+${HEAL}). Du verlierst nichts. Das Niveau passt sich dir an.</p>
      <p class="small">Sieg: ${WIN_COINS.first} Coins beim ersten Mal, danach ${WIN_COINS.again} Coins. Dazu gibt es die Coins für jede Aufgabe.${st.wins ? ` Du hast den ${esc(boss.short)} schon ${st.wins}-mal besiegt${st.best ? ` (Bestzeit ${fmtMs(st.best)})` : ''}.` : ''}</p>
      <div class="actions"><button class="primary" data-act="start">Kampf beginnen</button></div>
    </div>`;
  }
  function fightView() {
    root.innerHTML = `<div class="boss-ui fighting">
      <header><div><span class="eyebrow">Boss-Kampf</span><h2>${esc(boss.name)}</h2></div><button class="x" data-act="close">Kampf verlassen</button></header>
      <div class="boss-hp" role="meter" aria-label="Lebenspunkte des Bosses" aria-valuemin="0" aria-valuemax="${BOSS_HP}"><div class="fill"></div><i style="left:33.33%"></i><i style="left:66.66%"></i><b class="hpnum"></b></div>
      <p class="boss-phase"></p>
      ${hooks.pic ? '<div class="boss-pic"></div>' : ''}
      <div class="question"></div><div class="answer"></div>
      <div class="hint" hidden></div><div class="feedback" role="status"></div>
      <div class="actions"><button data-act="hint">Lösungshilfe</button><button class="primary" data-act="check">Angreifen (Enter)</button><button class="primary" data-act="next" hidden>Weiter (Enter)</button></div>
    </div>`;
  }
  function renderHp(anim) {
    const pct = fight.hp / BOSS_HP * 100;
    $('.boss-hp .fill').style.width = pct + '%';
    $('.boss-hp').setAttribute('aria-valuenow', fight.hp);
    $('.hpnum').textContent = `${fight.hp} / ${BOSS_HP}`;
    const ph = boss.phases[fight.phase];
    $('.boss-phase').innerHTML = `<b>Phase ${fight.phase + 1}: ${esc(ph.name)}</b> · ${esc(ph.text)}`;
    if (hooks.pic) $('.boss-pic').innerHTML = hooks.pic(w, anim || 'idle', fight.phase);
  }
  function task() {
    const cur = fight.next();
    renderHp();
    $('.question').innerHTML = `<p class="small">${esc(BYID[cur.id].name)} · ${STAGES[cur.stage].stars} ${STAGES[cur.stage].name}</p>` + cur.task.q;
    $('.answer').innerHTML = C.answerHtml(cur);
    $('.feedback').innerHTML = ''; $('.feedback').className = 'feedback';
    $('.hint').hidden = true;
    $('[data-act=check]').hidden = false; $('[data-act=next]').hidden = true; $('[data-act=hint]').hidden = false; $('[data-act=hint]').disabled = false;
    const first = $('.answer input[type=text]'); if (first && matchMedia('(hover: hover)').matches) setTimeout(() => first.focus(), 30);
  }
  function hint() {
    const cur = fight.cur; if (!cur || cur.done || cur.hint) return;
    cur.hint = true; S.hints++;
    $('.hint').innerHTML = `<b>Lösungshilfe:</b> ${cur.task.hint}`; $('.hint').hidden = false; $('[data-act=hint]').disabled = true;
  }
  function check() {
    const cur = fight.cur; if (!cur || cur.done) return;
    const vals = C.readAnswers(cur, root), fb = $('.feedback');
    if (vals.some(v => v === null || v === '')) { fb.className = 'feedback warn'; fb.textContent = 'Bitte beantworte alle Teile.'; return; }
    const r = fight.grade(vals);
    if (!r.finished) {
      fb.className = 'feedback bad';
      fb.innerHTML = `<b>Daneben!</b> ${cur.parts.length > 1 ? 'Kontrolliere: ' + r.results.map((ok, i) => (ok ? '' : esc(cur.parts[i].label))).filter(Boolean).join(', ') + '. ' : ''}Du hast noch einen Versuch.`;
      if (!cur.hint) hint();
      return;
    }
    const extra = r.badges.map(b => ` <span class="badge-new">${b.icon} ${b.tier === 'gold' ? 'Gold-Abzeichen' : 'Abzeichen'} ${esc(b.name)} (+${b.coins})</span>`).join('');
    if (r.ok) {
      fb.className = 'feedback good';
      fb.innerHTML = `<b>Treffer! −${r.dmg}</b> · +${r.coins} Coins${extra}<div class="sol">${cur.task.sol}</div>`;
      call('hit', r.dmg, fight.hp);
    } else {
      fb.className = 'feedback bad';
      fb.innerHTML = `<b>Der ${esc(boss.short)} wehrt ab${r.heal ? ` und baut einen Schild auf (+${r.heal})` : ''}.</b> So geht es:<div class="sol">${cur.task.sol}</div>`;
      call('miss', r.heal, fight.hp);
    }
    renderHp(r.ok ? 'hit' : 'shield');
    if (r.phaseChanged) { call('phase', fight.phase); call('toast', `Phase ${fight.phase + 1}: ${boss.phases[fight.phase].name}`); }
    $('[data-act=check]').hidden = true; $('[data-act=hint]').hidden = true; $('[data-act=next]').hidden = false;
    $('[data-act=next]').textContent = r.win ? 'Zum Sieg (Enter)' : 'Weiter (Enter)';
    $('[data-act=next]').focus({ preventScroll: true });
    if (r.win) { fight.pendingWin = r.win; call('win', r.win); }
    call('save');
  }
  function victory() {
    const v = fight.pendingWin, weak = fight.weakest();
    root.innerHTML = `<div class="boss-ui win">
      <header><div><span class="eyebrow">Sieg!</span><h2>${esc(boss.name)} besiegt</h2></div><button class="x" data-act="close">Zurück</button></header>
      ${hooks.pic ? `<div class="boss-pic">${hooks.pic(w, 'dead')}</div>` : ''}
      <div class="tiles"><div><b>+${v.coins}</b><span>Sieg-Coins${v.first ? ' (erster Sieg)' : ''}</span></div><div><b>${v.right} / ${v.n}</b><span>Aufgaben richtig</span></div><div><b>${fmtMs(v.ms)}</b><span>Kampfzeit</span></div></div>
      <p>${weak ? `Am meisten Mühe hattest du in der Phase «${esc(weak.name)}». Übe dazu im Gebäude ${weak.b.map(id => '«' + esc(BYID[id].name) + '»').join(' oder ')}.` : 'Kein einziger Fehler. Stark!'}</p>
      <div class="actions"><button data-act="start">Nochmals kämpfen</button><button class="primary" data-act="close">Zurück ins Dorf</button></div>
    </div>`;
  }
  root.onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
    if (act === 'close') { root.innerHTML = ''; call('close', fight); return; }
    if (act === 'start') { fight = new Fight(S, w, via, hooks.isOpen); fightView(); task(); call('start', fight); return; }
    if (act === 'hint') hint();
    if (act === 'check') check();
    if (act === 'next') { if (fight.pendingWin) victory(); else task(); }
  };
  root.onkeydown = (e) => {
    if (e.key !== 'Enter' || !fight || ['BUTTON', 'A'].includes(e.target.tagName)) return;
    e.preventDefault();
    if (fight.pendingWin && fight.cur.done) victory();
    else if (fight.cur?.done) task(); else check();
  };
  intro();
  return { get fight() { return fight; } };
}

// Einfaches Bild für die Lern-App (SVG), passend zu den Figuren im 3D-Spiel
export function bossSvg(w, anim = 'idle', phase = 0) {
  const flash = anim === 'hit' ? ' hit' : anim === 'shield' ? ' shield' : anim === 'dead' ? ' dead' : '';
  if (w === 'gl') {
    const plate = phase >= 1 ? '<rect x="38" y="52" width="24" height="10" fill="#3250aa"/><rect x="98" y="52" width="24" height="10" fill="#3250aa"/>' : '';
    const mirror = phase >= 2 ? '<rect x="66" y="6" width="28" height="10" fill="#7fd6e0" stroke="#288c96"/>' : '';
    return `<svg class="boss-svg${flash}" viewBox="0 0 160 170" width="160" height="170" aria-hidden="true">
      ${mirror}<rect x="58" y="16" width="44" height="40" fill="#8a8a8a" stroke="#555"/>
      <rect x="66" y="30" width="10" height="7" fill="#f0d080"/><rect x="84" y="30" width="10" height="7" fill="#f0d080"/>
      <rect x="44" y="58" width="72" height="62" fill="#787878" stroke="#555"/>
      <rect x="64" y="74" width="32" height="6" fill="#ebbe32"/><rect x="64" y="88" width="32" height="6" fill="#ebbe32"/>
      <rect class="arm" x="22" y="58" width="20" height="62" fill="#787878" stroke="#555"/><rect class="arm" x="118" y="58" width="20" height="62" fill="#787878" stroke="#555"/>
      ${plate}<rect x="52" y="120" width="22" height="44" fill="#8a8a8a" stroke="#555"/><rect x="86" y="120" width="22" height="44" fill="#8a8a8a" stroke="#555"/>
      ${anim === 'shield' ? '<ellipse cx="80" cy="90" rx="74" ry="82" fill="none" stroke="#5fc9d6" stroke-width="5" opacity=".8"/>' : ''}
    </svg>`;
  }
  const orbit = ['#288c96', '#e6c332', '#468232'].map((c, i) => `<rect class="orb o${i}" x="${20 + i * 55}" y="${30 + (i % 2) * 70}" width="14" height="14" fill="${c}"/>`).join('');
  return `<svg class="boss-svg float${flash}" viewBox="0 0 160 170" width="160" height="170" aria-hidden="true">
    <rect x="58" y="14" width="44" height="40" fill="#e6e6e1" stroke="#999"/><rect x="62" y="26" width="36" height="20" fill="#dccd96"/>
    <rect x="68" y="31" width="8" height="6" fill="#f0d080"/><rect x="84" y="31" width="8" height="6" fill="#f0d080"/>
    <rect x="46" y="56" width="68" height="70" fill="#823ca0" stroke="#5a2a70"/><rect x="34" y="124" width="92" height="22" fill="#823ca0" stroke="#5a2a70" opacity="${phase >= 1 ? 0.6 : 1}"/>
    ${phase >= 2 ? '<rect x="66" y="70" width="28" height="18" fill="#fff" stroke="#b4322d"/><text x="80" y="83" text-anchor="middle" font-size="10" fill="#b4322d">!!!</text>' : ''}
    ${orbit}
    ${anim === 'shield' ? '<ellipse cx="80" cy="85" rx="74" ry="80" fill="none" stroke="#5fc9d6" stroke-width="5" opacity=".8"/>' : ''}
  </svg>`;
}
