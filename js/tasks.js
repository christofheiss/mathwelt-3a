// MathWelt 3A – Aufgaben-Generatoren nach mathbuch 3, LU 11 und LU 10
// Jede Aufgabe gibt es auf drei Niveaus: 1 = Grundanspruch, 2 = Standard, 3 = Erweiterung

// ---------- Hilfsfunktionen ----------
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nz = (a, b) => { let v; do { v = ri(a, b); } while (v === 0); return v; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

export function fmt(n) {
  if (typeof n === 'string') return n;
  const r = Math.round(n * 1000) / 1000;
  let s;
  if (Number.isInteger(r)) {
    s = Math.abs(r).toString();
    if (Math.abs(r) >= 10000) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else s = Math.abs(r).toString().replace('.', ',');
  return (r < 0 ? '−' : '') + s;
}
function frac(p, q) {
  if (q < 0) { p = -p; q = -q; }
  const g = gcd(p, q); p /= g; q /= g;
  return q === 1 ? fmt(p) : `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
}
// Linearer Term a·x + b als Text
function lin(a, b, v = 'x') {
  let s = '';
  if (a !== 0) s = a === 1 ? v : a === -1 ? '−' + v : fmt(a) + v;
  if (b !== 0) s += s ? (b > 0 ? ' + ' + fmt(b) : ' − ' + fmt(-b)) : fmt(b);
  return s || '0';
}
const sgn = (n) => (n < 0 ? ' − ' + fmt(-n) : ' + ' + fmt(n));
const vx = (c) => (c === 1 ? 'x' : c === -1 ? '−x' : fmt(c) + 'x');
const op = (s) => `<span class="op">| ${s}</span>`;

// Antwort einlesen: «x = 2,5», «−3», «7/3», «12 %»
export function parseAnswer(str) {
  if (str == null) return NaN;
  let s = String(str).trim().toLowerCase()
    .replace(/[−–]/g, '-').replace(/\s|'|’| /g, '').replace(/%$/, '')
    .replace(/^[a-z]+=/, '').replace(',', '.');
  if (/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/.test(s)) { const [p, q] = s.split('/').map(Number); return q === 0 ? NaN : p / q; }
  if (/^-?\d+(\.\d+)?$/.test(s) || /^-?\.\d+$/.test(s)) return Number(s);
  return NaN;
}

// ---------- Grafiken (Canvas -> Bild) ----------
function canvasImg(w, h, drawFn) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.font = '12px system-ui, sans-serif'; g.textBaseline = 'middle';
  drawFn(g);
  return `<img class="chart" src="${c.toDataURL('image/png')}" width="${w}" height="${h}" alt="Diagramm">`;
}

const AGE = ['0–9', '10–19', '20–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80+'];
function pyramidImg(title, men, women, opts = {}) {
  const W = 560, H = 330, mid = W / 2, top = 40, rowH = 28, maxV = opts.max || 400, half = 210;
  return canvasImg(W, H, (g) => {
    g.fillStyle = '#222'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText(title, mid, 16);
    g.font = '12px system-ui';
    g.fillStyle = '#2f5ea8'; g.fillText('Männer', mid - half / 2 - 20, 32); g.fillStyle = '#c0503c'; g.fillText('Frauen', mid + half / 2 + 20, 32);
    const step = opts.grid || 50;
    g.strokeStyle = '#ddd'; g.lineWidth = 1; g.fillStyle = '#666'; g.font = '10px system-ui';
    for (let v = 0; v <= maxV; v += step) {
      const dx = v / maxV * half;
      for (const x of [mid - 30 - dx, mid + 30 + dx]) { g.beginPath(); g.moveTo(x, top - 4); g.lineTo(x, top + rowH * 9); g.stroke(); }
      if (v % (step * 2) === 0 || step >= 100) { g.fillText(v, mid - 30 - dx, top + rowH * 9 + 10); g.fillText(v, mid + 30 + dx, top + rowH * 9 + 10); }
    }
    for (let i = 0; i < 9; i++) {
      const y = top + rowH * (8 - i) + 3, hh = rowH - 6;
      g.fillStyle = '#2f5ea8'; const wm = men[i] / maxV * half; g.fillRect(mid - 30 - wm, y, wm, hh);
      g.fillStyle = '#c0503c'; const ww = women[i] / maxV * half; g.fillRect(mid + 30, y, ww, hh);
      g.fillStyle = '#222'; g.font = '11px system-ui'; g.textAlign = 'center'; g.fillText(AGE[i], mid, y + hh / 2);
      if (opts.labels) {
        g.font = '10px system-ui'; g.textAlign = 'right'; g.fillText(men[i], mid - 34 - wm, y + hh / 2);
        g.textAlign = 'left'; g.fillText(women[i], mid + 34 + ww, y + hh / 2);
      }
    }
    g.textAlign = 'center'; g.fillStyle = '#444'; g.font = '11px system-ui';
    g.fillText('Anzahl Personen', mid, H - 12);
  });
}

function lineImg(title, years, series, yLabel, opts = {}) {
  const W = 560, H = 320, L = 60, R = 20, T = 40, Bt = 50;
  const all = series.flatMap(s => s.v);
  let lo = opts.min ?? Math.floor(Math.min(...all) / 10) * 10, hi = opts.max ?? Math.ceil(Math.max(...all) / 10) * 10;
  if (hi === lo) hi = lo + 10;
  const step = opts.step || Math.max(1, Math.round((hi - lo) / 5));
  const X = (i) => L + (W - L - R) * (i / (years.length - 1));
  const Y = (v) => T + (H - T - Bt) * (1 - (v - lo) / (hi - lo));
  return canvasImg(W, H, (g) => {
    g.fillStyle = '#222'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText(title, W / 2, 16);
    g.font = '10px system-ui'; g.strokeStyle = '#ddd';
    for (let v = lo; v <= hi + 1e-9; v += step) {
      g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke();
      g.fillStyle = '#666'; g.textAlign = 'right'; g.fillText(fmt(v), L - 6, Y(v));
    }
    years.forEach((yr, i) => { g.textAlign = 'center'; g.fillStyle = '#666'; g.fillText(yr, X(i), H - Bt + 14); });
    g.save(); g.translate(14, (T + H - Bt) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = '#444'; g.font = '11px system-ui'; g.fillText(yLabel, 0, 0); g.restore();
    g.fillStyle = '#444'; g.textAlign = 'center'; g.font = '11px system-ui'; g.fillText('Jahr', W / 2, H - 14);
    const cols = ['#c0503c', '#2f5ea8', '#3c8a46'];
    series.forEach((s, k) => {
      g.strokeStyle = cols[k]; g.fillStyle = cols[k]; g.lineWidth = 2.2; g.beginPath();
      s.v.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.stroke();
      s.v.forEach((v, i) => {
        g.beginPath(); g.arc(X(i), Y(v), 3.5, 0, 7); g.fill();
        if (opts.labels) { g.font = '10px system-ui'; g.textAlign = 'center'; g.fillText(fmt(v), X(i), Y(v) + (k === 0 ? -11 : 13)); }
      });
      if (series.length > 1) { g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText(s.name, L + 8 + k * 110, T - 12); }
    });
  });
}

function table(head, rows) {
  return `<table class="data"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${typeof c === 'number' ? fmt(c) : c}</td>`).join('')}</tr>`).join('')}</table>`;
}

// Waage-Bild (SVG) für x + a = b
function scaleSvg(nx, a, b) {
  const cube = (x, y, t) => `<g><rect x="${x}" y="${y}" width="22" height="22" rx="3" fill="${t === 'x' ? '#e1a32f' : '#5b8bd0'}" stroke="#333"/><text x="${x + 11}" y="${y + 15}" text-anchor="middle" font-size="12" fill="#fff" font-weight="bold">${t === 'x' ? 'x' : ''}</text></g>`;
  const group = (cx, items) => {
    let out = ''; const per = 6;
    items.forEach((t, i) => { const col = i % per, row = Math.floor(i / per); out += cube(cx - per * 12 + col * 24, 70 - row * 24, t); });
    return out;
  };
  const left = [...Array(nx).fill('x'), ...Array(Math.min(a, 18)).fill('1')];
  const right = Array(Math.min(b, 24)).fill('1');
  return `<svg class="waage" viewBox="0 0 420 150" width="420" height="150">
    <polygon points="200,145 220,145 210,100" fill="#8a6a40"/><rect x="40" y="96" width="340" height="6" fill="#6b4f2e"/>
    <rect x="40" y="92" width="150" height="4" fill="#999"/><rect x="230" y="92" width="150" height="4" fill="#999"/>
    ${group(115, left)}${group(305, right)}
    <text x="115" y="125" text-anchor="middle" font-size="13">${lin(nx, a)}</text>
    <text x="305" y="125" text-anchor="middle" font-size="13">${b}</text>
  </svg><div class="small">Orange = x, blau = 1 Einheit${a > 18 || b > 24 ? ' (nicht alle Einheiten gezeichnet)' : ''}</div>`;
}

// ---------- Gebäude und Aufgaben ----------
export const BUILDINGS = [
  // LU 11 Gleichungen lösen
  {
    id: 'waage', lu: 11, name: 'Waage-Werkstatt', lz: 'LZ1', color: 'YELLOW',
    goal: 'Gleichungen mit + und − lösen (Waagemodell, Umformung 1 und 2)',
    ref: 'mathbuch 3, S. 30 Lösungshilfen · S. 31 A2–A4',
    gen(stage) {
      if (stage === 1) {
        const x = ri(2, 15), a = ri(2, 12), b = x + a;
        const t = pick(['plus', 'plus', 'minus']);
        if (t === 'plus') return {
          q: `Löse die Gleichung.<div class="eq">x + ${a} = ${b}</div>${scaleSvg(1, a, b)}`, kind: 'num', answer: x,
          hint: `Nimm auf beiden Seiten ${a} weg (Umformung 2), dann bleibt x allein.`,
          sol: `<div class="eq">x + ${a} = ${b} ${op('− ' + a)}<br>x = ${x}</div>`
        };
        const y = ri(12, 40), c = ri(3, 11);
        return { q: `Löse die Gleichung.<div class="eq">x − ${c} = ${y - c}</div>`, kind: 'num', answer: y,
          hint: `Addiere auf beiden Seiten ${c} (Umformung 1).`, sol: `<div class="eq">x − ${c} = ${y - c} ${op('+ ' + c)}<br>x = ${y}</div>` };
      }
      if (stage === 2) {
        const x = nz(-15, 15), a = nz(-20, 20), b = x + a;
        const form = pick(['xa', 'ax', 'minus']);
        if (form === 'minus') {
          const c = ri(5, 25), x2 = nz(-10, 30), r = c - x2;
          return { q: `Löse die Gleichung.<div class="eq">${c} − x = ${fmt(r)}</div>`, kind: 'num', answer: x2,
            hint: `Addiere zuerst x auf beiden Seiten, dann subtrahiere ${fmt(r)}. Oder: Welche Zahl muss ich von ${c} subtrahieren, damit ${fmt(r)} herauskommt?`,
            sol: `<div class="eq">${c} − x = ${fmt(r)} ${op('+ x')}<br>${c} = ${lin(1, r)} ${op(r < 0 ? '+ ' + fmt(-r) : '− ' + fmt(r))}<br>${fmt(c - r)} = x</div>` };
        }
        const left = form === 'xa' ? lin(1, a) : `${fmt(a)} + x`;
        return { q: `Löse die Gleichung (ganze Zahlen).<div class="eq">${left} = ${fmt(b)}</div>`, kind: 'num', answer: x,
          hint: `Rechne auf beiden Seiten ${a > 0 ? '− ' + a : '+ ' + (-a)}. Achte auf das Vorzeichen.`,
          sol: `<div class="eq">${left} = ${fmt(b)} ${op(a > 0 ? '− ' + a : '+ ' + (-a))}<br>x = ${fmt(x)}</div>` };
      }
      // Stufe 3: Dezimalzahlen und Brüche
      if (Math.random() < 0.5) {
        const x = ri(-40, 60) / 10, a = nz(-50, 50) / 10, b = Math.round((x + a) * 10) / 10;
        return { q: `Löse die Gleichung (Dezimalzahlen).<div class="eq">${lin(1, a)} = ${fmt(b)}</div>`, kind: 'num', answer: x,
          hint: `Rechne auf beiden Seiten ${a > 0 ? '− ' + fmt(a) : '+ ' + fmt(-a)}.`, sol: `<div class="eq">x = ${fmt(b)} ${a > 0 ? '− ' + fmt(a) : '+ ' + fmt(-a)} = ${fmt(x)}</div>` };
      }
      const q = pick([2, 3, 4, 5, 6]), q2 = pick([2, 3, 4, 6]);
      let p1, p2; do { p1 = nz(-7, 7); } while (gcd(p1, q) !== 1); do { p2 = nz(-9, 9); } while (gcd(p2, q2) !== 1);
      const xv = p2 / q2 - p1 / q;
      return { q: `Löse die Gleichung (Brüche). Du darfst als Bruch (z. B. 5/6) oder Dezimalzahl antworten.<div class="eq">x ${p1 < 0 ? '−' : '+'} ${Math.abs(p1)}/${q} = ${p2 < 0 ? '−' : ''}${Math.abs(p2)}/${q2}</div>`, kind: 'num', answer: xv, tol: 0.011,
        hint: `Subtrahiere ${frac(p1, q)} auf beiden Seiten. Mache die Brüche gleichnamig (Nenner ${q * q2 / gcd(q, q2)}).`,
        sol: `<div class="eq">x = ${frac(p2, q2)} − (${frac(p1, q)}) = ${frac(p2 * q - p1 * q2, q * q2)}</div>` };
    }
  },
  {
    id: 'umkehr', lu: 11, name: 'Umkehr-Turm', lz: 'LZ1', color: 'ORANGE',
    goal: 'Gleichungen mit · und : sowie ax + b = c lösen (Umformung 3 und 4)',
    ref: 'mathbuch 3, S. 30 Kärtchen 3 und 4 · S. 31 A2 E–H, A3',
    gen(stage) {
      if (stage === 1) {
        if (Math.random() < 0.6) {
          const a = ri(2, 12), x = ri(2, 15);
          return { q: `Löse die Gleichung.<div class="eq">${a}x = ${a * x}</div>`, kind: 'num', answer: x,
            hint: `Dividiere beide Seiten durch ${a} (Umformung 4).`, sol: `<div class="eq">${a}x = ${a * x} ${op(': ' + a)}<br>x = ${x}</div>` };
        }
        const a = ri(2, 9), r = ri(2, 12);
        return { q: `Löse die Gleichung.<div class="eq">x : ${a} = ${r}</div>`, kind: 'num', answer: a * r,
          hint: `Multipliziere beide Seiten mit ${a} (Umformung 3).`, sol: `<div class="eq">x : ${a} = ${r} ${op('· ' + a)}<br>x = ${a * r}</div>` };
      }
      if (stage === 2) {
        const a = ri(2, 9), x = nz(-10, 12), b = nz(-20, 20), c = a * x + b;
        return { q: `Löse die Gleichung Schritt für Schritt.<div class="eq">${lin(a, b)} = ${fmt(c)}</div>`, kind: 'num', answer: x,
          hint: `Zuerst ${b > 0 ? b + ' subtrahieren' : (-b) + ' addieren'}, dann durch ${a} dividieren.`,
          sol: `<div class="eq">${lin(a, b)} = ${fmt(c)} ${op(b > 0 ? '− ' + b : '+ ' + (-b))}<br>${a}x = ${fmt(c - b)} ${op(': ' + a)}<br>x = ${fmt(x)}</div>` };
      }
      if (Math.random() < 0.5) {
        const a = nz(-9, -2), b = nz(-20, 20), num = nz(-30, 30), c = num + b; // a x = num -> x = num/a
        return { q: `Löse die Gleichung. Das Resultat kann ein Bruch sein (z. B. −7/3).<div class="eq">${lin(a, b)} = ${fmt(c)}</div>`, kind: 'num', answer: num / a, tol: 0.011,
          hint: `Erst ${b > 0 ? '− ' + b : '+ ' + (-b)}, dann durch (${a}) dividieren. Minus geteilt durch minus gibt plus.`,
          sol: `<div class="eq">${vx(a)} = ${fmt(num)} ${op(': (' + fmt(a) + ')')}<br>x = ${frac(num, a)}</div>` };
      }
      const a = ri(2, 6), b = nz(-9, 9), x = a * nz(-6, 8), c = x / a + b;
      return { q: `Löse die Gleichung.<div class="eq">x/${a} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${fmt(c)}</div>`, kind: 'num', answer: x,
        hint: `Zuerst ${b > 0 ? '− ' + b : '+ ' + (-b)}, dann beide Seiten mit ${a} multiplizieren.`,
        sol: `<div class="eq">x/${a} = ${fmt(c - b)} ${op('· ' + a)}<br>x = ${fmt(x)}</div>` };
    }
  },
  {
    id: 'probe', lu: 11, name: 'Proben-Labor', lz: 'LZ2', color: 'CYAN',
    goal: 'Eine Lösung mit der Probe überprüfen',
    ref: 'mathbuch 3, S. 32 A6 B, A7',
    gen(stage) {
      let eqText, L, R, x;
      if (stage === 1) { const a = ri(2, 9), b = nz(-15, 15); x = ri(-5, 10); const c = a * x + b; eqText = `${lin(a, b)} = ${fmt(c)}`; L = (k) => a * k + b; R = () => c; }
      else if (stage === 2) { const a = ri(3, 9), c = ri(1, a - 1), b = nz(-15, 15); x = nz(-8, 10); const d = (a - c) * x + b; eqText = `${lin(a, b)} = ${lin(c, d)}`; L = (k) => a * k + b; R = (k) => c * k + d; }
      else { const a = ri(2, 5), b = nz(-6, 6), c = ri(1, 7), d0 = nz(-12, 12); x = nz(-6, 8); const d = a * (x + b) - c * x; eqText = `${a}(${lin(1, b)}) = ${lin(c, d)}`; L = (k) => a * (k + b); R = (k) => c * k + d; void d0; }
      const correct = Math.random() < 0.5;
      const k = correct ? x : x + pick([-2, -1, 1, 2]);
      const lv = L(k), rv = R(k);
      return {
        q: `Ein Schüler behauptet: Die Lösung der Gleichung ist <b>x = ${fmt(k)}</b>.<div class="eq">${eqText}</div>Mache die Probe: Setze x = ${fmt(k)} in die ursprüngliche Gleichung ein.`,
        kind: 'multi', parts: [
          { label: 'Wert der linken Seite', kind: 'num', answer: lv },
          { label: 'Wert der rechten Seite', kind: 'num', answer: rv },
          { label: 'Stimmt die Lösung?', kind: 'mc', options: ['Ja, die Lösung stimmt.', 'Nein, die Lösung stimmt nicht.'], answer: lv === rv ? 0 : 1 }
        ],
        hint: `Ersetze jedes x durch ${fmt(k)} und rechne beide Seiten getrennt aus. Punkt vor Strich, Klammern zuerst.`,
        sol: `Links: ${fmt(lv)}, rechts: ${fmt(rv)}. ${lv === rv ? 'Beide Seiten sind gleich, die Lösung stimmt.' : `Die Seiten sind verschieden, die Lösung stimmt nicht (richtig wäre x = ${fmt(x)}).`}`
      };
    }
  },
  {
    id: 'klammer', lu: 11, name: 'Klammer-Mine', lz: 'LZ1 · LZ4', color: 'BLUE',
    goal: 'Variable auf beiden Seiten und Gleichungen mit Klammern lösen',
    ref: 'mathbuch 3, S. 30 Kärtchen 5 · S. 31 A5',
    gen(stage) {
      if (stage === 1) {
        const c = ri(1, 6), a = c + ri(1, 5), x = nz(-8, 10), b = nz(-15, 15), d = (a - c) * x + b;
        return { q: `Löse die Gleichung (Variable auf beiden Seiten).<div class="eq">${lin(a, b)} = ${lin(c, d)}</div>`, kind: 'num', answer: x,
          hint: `Bringe alle x auf eine Seite: Rechne auf beiden Seiten − ${c}x.`,
          sol: `<div class="eq">${lin(a, b)} = ${lin(c, d)} ${op('− ' + vx(c))}<br>${lin(a - c, b)} = ${fmt(d)} ${op(b > 0 ? '− ' + b : '+ ' + (-b))}<br>${lin(a - c, 0)} = ${fmt(d - b)}${a - c !== 1 ? ' ' + op(': ' + (a - c)) + '<br>x = ' + fmt(x) : ''}</div>` };
      }
      if (stage === 2) {
        const a = ri(2, 6), b = nz(-7, 7), c = ri(1, 9), x = nz(-6, 9);
        if (c === a) return this.gen(2);
        const d = a * (x + b) - c * x;
        return { q: `Löse die Gleichung. Löse zuerst die Klammer auf.<div class="eq">${a}(${lin(1, b)}) = ${lin(c, d)}</div>`, kind: 'num', answer: x,
          hint: `Klammer auflösen: ${a}·x und ${a}·${b < 0 ? '(' + fmt(b) + ')' : b}. Dann x auf eine Seite bringen.`,
          sol: `<div class="eq">${lin(a, a * b)} = ${lin(c, d)} ${op('− ' + vx(c))}<br>${lin(a - c, a * b)} = ${fmt(d)} ${op(a * b > 0 ? '− ' + a * b : '+ ' + (-a * b))}<br>${lin(a - c, 0)} = ${fmt(d - a * b)}${a - c !== 1 ? ' ' + op(': ' + (a - c < 0 ? '(' + fmt(a - c) + ')' : a - c)) + '<br>x = ' + fmt(x) : ''}</div>` };
      }
      const a = ri(2, 6), b = nz(-6, 6), c = ri(2, 5), d = nz(-6, 6), e = ri(1, 6), x = nz(-6, 8);
      const k = a - c - e; if (k === 0) return this.gen(3);
      const f = a * (x + b) - c * (x - d) - e * x;
      return { q: `Löse die Gleichung (wie mathbuch S. 31 A5 B/C).<div class="eq">${a}(${lin(1, b)}) − ${c}(${lin(1, -d)}) = ${lin(e, f)}</div>`, kind: 'num', answer: x,
        hint: `Beide Klammern auflösen. Achtung: Minus vor der Klammer ändert alle Vorzeichen in der Klammer!`,
        sol: `<div class="eq">${a}x${sgn(a * b)} − ${c}x${sgn(c * d)} = ${lin(e, f)}<br>${lin(a - c, a * b + c * d)} = ${lin(e, f)} ${op('− ' + vx(e))}<br>${lin(k, a * b + c * d)} = ${fmt(f)} ${op((a * b + c * d) > 0 ? '− ' + (a * b + c * d) : '+ ' + (-(a * b + c * d)))}<br>${lin(k, 0)} = ${fmt(f - a * b - c * d)}${k !== 1 ? ' ' + op(': ' + (k < 0 ? '(' + fmt(k) + ')' : k)) + '<br>x = ' + fmt(x) : ''}</div>` };
    }
  },
  {
    id: 'raetsel', lu: 11, name: 'Rätsel-Bibliothek', lz: 'LZ3', color: 'BOOKS',
    goal: 'Sachsituationen und Zahlenrätsel in Gleichungen übersetzen',
    ref: 'mathbuch 3, S. 32 A8 Zahlenrätsel',
    gen(stage) {
      const a = ri(2, 7), b = ri(2, 15), x = ri(2, 15);
      const variants = [
        { t: `Ich denke mir eine Zahl. Ich multipliziere sie mit ${a} und addiere ${b}. Ich erhalte ${a * x + b}.`, eq: `${a}x + ${b} = ${a * x + b}`, wrong: [`${a}(x + ${b}) = ${a * x + b}`, `${a}x − ${b} = ${a * x + b}`, `x + ${a}·${b} = ${a * x + b}`], ans: x },
        { t: `Wenn ich das ${['', '', 'Doppelte', 'Dreifache', 'Vierfache', 'Fünffache', 'Sechsfache', 'Siebenfache'][a]} einer Zahl um ${b} verkleinere, erhalte ich ${a * x - b}.`, eq: `${a}x − ${b} = ${a * x - b}`, wrong: [`${a}(x − ${b}) = ${a * x - b}`, `${b} − ${a}x = ${a * x - b}`, `${a}x + ${b} = ${a * x - b}`], ans: x },
        { t: `Ich addiere zu einer Zahl ${b} und multipliziere das Ergebnis mit ${a}. Ich erhalte ${a * (x + b)}.`, eq: `${a}(x + ${b}) = ${a * (x + b)}`, wrong: [`${a}x + ${b} = ${a * (x + b)}`, `x + ${b}·${a} = ${a * (x + b)}`, `${a}x = ${a * (x + b)} + ${b}`], ans: x }
      ];
      if (stage === 1) {
        const v = pick(variants); const opts = shuffle([v.eq, ...v.wrong]);
        return { q: `Welche Gleichung passt zum Rätsel?<div class="quote">${v.t}</div>`, kind: 'mc', options: opts, answer: opts.indexOf(v.eq),
          hint: 'Lies Schritt für Schritt: Was passiert zuerst mit der Zahl x? Wenn zuerst addiert und dann multipliziert wird, braucht es eine Klammer.',
          sol: `Die passende Gleichung ist <b>${v.eq}</b>.` };
      }
      if (stage === 2) {
        const v = pick(variants);
        return { q: `Stelle eine Gleichung auf und löse sie. Wie heisst die gesuchte Zahl?<div class="quote">${v.t}</div>`, kind: 'num', answer: v.ans,
          hint: `Die Gleichung lautet ${v.eq}. Löse sie jetzt mit Umformungen.`, sol: `${v.eq} → x = ${v.ans}` };
      }
      const t = pick(['mutter', 'folge', 'geschwister', 'zukunft']);
      if (t === 'mutter') {
        const k = ri(3, 5), kid = ri(6, 14), sum = kid * (k + 1);
        return { q: `<div class="quote">Eine Mutter ist ${k}-mal so alt wie ihre Tochter. Zusammen sind sie ${sum} Jahre alt.</div>Wie alt ist die Tochter?`, kind: 'num', answer: kid,
          hint: `Tochter = x, Mutter = ${k}x. Zusammen: x + ${k}x = ${sum}.`, sol: `x + ${k}x = ${sum} → ${k + 1}x = ${sum} → x = ${kid}. Die Tochter ist ${kid} Jahre alt.` };
      }
      if (t === 'folge') {
        const n = ri(12, 60), s = 3 * n + 3;
        return { q: `<div class="quote">Die Summe von drei aufeinanderfolgenden natürlichen Zahlen ist ${s}.</div>Wie heisst die kleinste der drei Zahlen?`, kind: 'num', answer: n,
          hint: 'Nenne die kleinste Zahl x. Die anderen sind x + 1 und x + 2.', sol: `x + (x + 1) + (x + 2) = ${s} → 3x + 3 = ${s} → x = ${n}` };
      }
      if (t === 'geschwister') {
        const tim = ri(8, 16), d = ri(2, 5), s = tim + (tim + d) + 2 * tim;
        return { q: `<div class="quote">Lena ist ${d} Jahre älter als Tim. Mia ist doppelt so alt wie Tim. Zusammen sind die drei ${s} Jahre alt.</div>Wie alt ist Tim?`, kind: 'num', answer: tim,
          hint: `Tim = x, Lena = x + ${d}, Mia = 2x.`, sol: `x + (x + ${d}) + 2x = ${s} → 4x + ${d} = ${s} → x = ${tim}` };
      }
      const son = ri(5, 12), yrs = ri(2, 8), dad = 2 * (son + yrs) - yrs;
      return { q: `<div class="quote">Ein Vater ist heute ${dad} Jahre alt. In ${yrs} Jahren ist er doppelt so alt wie sein Sohn.</div>Wie alt ist der Sohn heute?`, kind: 'num', answer: son,
        hint: `Sohn heute = x. In ${yrs} Jahren: Vater ${dad} + ${yrs}, Sohn x + ${yrs}.`, sol: `${dad + yrs} = 2(x + ${yrs}) → ${dad + yrs} = 2x + ${2 * yrs} → x = ${son}` };
    }
  },
  {
    id: 'detektiv', lu: 11, name: 'Detektiv-Büro', lz: 'LZ4', color: 'DARKWOOD',
    goal: 'Fehler in Lösungswegen finden und korrigieren',
    ref: 'mathbuch 3, S. 32 A6 A (Lösungswege überprüfen)',
    gen(stage) {
      // Korrekter Weg für a x + b = c x + d bzw. a(x + b) = c x + d
      const x = nz(-6, 9);
      let lines = [], wrongLine;
      if (stage < 3) {
        const c = ri(1, 5), a = c + ri(2, 5), b = nz(-12, 12), d = (a - c) * x + b, k = a - c;
        const kinds = ['sub', 'add', 'div'];
        const err = pick(kinds);
        lines.push({ t: `${lin(a, b)} = ${lin(c, d)}`, o: '− ' + vx(c) });
        if (err === 'sub') { // Fehler in Zeile 2: Koeffizient falsch
          const k2 = a + c; lines.push({ t: `${lin(k2, b)} = ${fmt(d)}`, o: (b > 0 ? '− ' + b : '+ ' + (-b)) }); lines.push({ t: `${lin(k2, 0)} = ${fmt(d - b)}`, o: ': ' + k2 }); lines.push({ t: `x = ${frac(d - b, k2)}` }); wrongLine = 2;
        } else if (err === 'add') { // Fehler in Zeile 3: falsches Vorzeichen beim Umformen
          lines.push({ t: `${lin(k, b)} = ${fmt(d)}`, o: (b > 0 ? '− ' + b : '+ ' + (-b)) }); lines.push({ t: `${lin(k, 0)} = ${fmt(d + b)}`, o: ': ' + k }); lines.push({ t: `x = ${frac(d + b, k)}` }); wrongLine = 3;
        } else { // Fehler in Zeile 4: multipliziert statt dividiert
          lines.push({ t: `${lin(k, b)} = ${fmt(d)}`, o: (b > 0 ? '− ' + b : '+ ' + (-b)) }); lines.push({ t: `${lin(k, 0)} = ${fmt(d - b)}`, o: ': ' + k }); lines.push({ t: `x = ${fmt((d - b) * k)}` }); wrongLine = 4;
        }
      } else {
        const a = ri(2, 6), b = nz(-6, 6), c = ri(1, a - 1 || 1), k = a - c, d = a * (x + b) - c * x;
        if (k === 0) return this.gen(3);
        const err = pick(['klammer', 'vorzeichen']);
        lines.push({ t: `${a}(${lin(1, b)}) = ${lin(c, d)}`, o: 'Klammer auflösen' });
        if (err === 'klammer') { // nur das erste Glied multipliziert
          lines.push({ t: `${lin(a, b)} = ${lin(c, d)}`, o: '− ' + vx(c) }); lines.push({ t: `${lin(k, b)} = ${fmt(d)}`, o: b > 0 ? '− ' + b : '+ ' + (-b) }); lines.push({ t: `${lin(k, 0)} = ${fmt(d - b)}`, o: ': ' + k }); lines.push({ t: `x = ${frac(d - b, k)}` }); wrongLine = 2;
        } else {
          const ab = a * b;
          lines.push({ t: `${lin(a, ab)} = ${lin(c, d)}`, o: '− ' + vx(c) }); lines.push({ t: `${lin(k, ab)} = ${fmt(d)}`, o: ab > 0 ? '− ' + ab : '+ ' + (-ab) }); lines.push({ t: `${lin(k, 0)} = ${fmt(d + ab)}`, o: ': ' + k }); lines.push({ t: `x = ${frac(d + ab, k)}` }); wrongLine = 4;
        }
      }
      const name = pick(['Lena', 'Noah', 'Mia', 'Luca', 'Elena', 'Jan']);
      const html = `<div class="eq steps">${lines.map((l, i) => `<div><span class="ln">Zeile ${i + 1}</span> ${l.t} ${l.o ? op(l.o) : ''}</div>`).join('')}</div>`;
      const opts = lines.slice(1).map((_, i) => `Zeile ${i + 2}`);
      const parts = [{ label: 'In welcher Zeile steckt der Fehler?', kind: 'mc', options: opts, answer: wrongLine - 2 }];
      if (stage >= 2) parts.push({ label: 'Wie lautet die richtige Lösung? x =', kind: 'num', answer: x });
      return { q: `${name} hat diese Gleichung gelöst. Leider steckt genau ein Fehler im Lösungsweg.${html}`, kind: 'multi', parts,
        hint: 'Kontrolliere jede Zeile: Wurde die Umformung rechts auf beiden Seiten richtig ausgeführt? Bei Klammern: Wird jedes Glied multipliziert?',
        sol: `Der Fehler steckt in Zeile ${wrongLine}. Die richtige Lösung ist x = ${fmt(x)}.` };
    }
  },
  // LU 10 Alt und Jung
  {
    id: 'pyramide', lu: 10, name: 'Pyramiden-Museum', lz: 'LZ5', color: 'SANDSTONE',
    goal: 'Alterspyramiden lesen und interpretieren',
    ref: 'mathbuch 3, S. 26 A1 · S. 27 A3',
    gen(stage) {
      const town = pick(['Talwil', 'Seedorf', 'Bergmatt', 'Rüttenen', 'Hohfluh', 'Grünau']);
      const shape = pick(['Pyramide', 'Glocke', 'Urne']);
      const base = {
        Pyramide: [380, 340, 300, 260, 220, 180, 130, 80, 30],
        Glocke: [250, 250, 260, 260, 250, 230, 190, 130, 50],
        Urne: [150, 170, 200, 240, 290, 320, 280, 200, 90]
      }[shape];
      const unit = stage === 1 ? 50 : 10;
      const r = (v) => Math.max(unit, Math.round(v * (0.85 + Math.random() * 0.3) / unit) * unit);
      const men = base.map(r), women = base.map((v, i) => r(v * (i >= 6 ? 1.25 : 1)));
      const max = Math.max(...men, ...women) > 400 ? 500 : 400;
      const img = (labels) => pyramidImg(`Alterspyramide ${town} (fiktive Daten)`, men, women, { labels, max, grid: 50 });
      if (stage === 1) {
        if (Math.random() < 0.5) {
          const arr = Math.random() < 0.5 ? women : men, who = arr === women ? 'Frauen' : 'Männer';
          const mx = Math.max(...arr); if (arr.filter(v => v === mx).length > 1) return this.gen(1);
          const opts = AGE.map(a => a + ' Jahre');
          return { q: `${img(false)}In welcher Altersklasse leben am meisten ${who}?`, kind: 'mc', options: opts, answer: arr.indexOf(mx),
            hint: `Suche den längsten ${who === 'Frauen' ? 'roten (rechts)' : 'blauen (links)'} Balken.`, sol: `Am meisten ${who}: ${AGE[arr.indexOf(mx)]} Jahre (${mx}).` };
        }
        const i = ri(0, 8), arr = Math.random() < 0.5 ? women : men, who = arr === women ? 'Frauen' : 'Männer';
        return { q: `${img(false)}Wie viele ${who} sind ${AGE[i]} Jahre alt? Lies am Gitter ab.`, kind: 'num', answer: arr[i],
          hint: 'Die Gitterlinien sind in 50er-Schritten. Folge dem Balkenende senkrecht nach unten zur Achse.', sol: `${arr[i]} ${who}` };
      }
      if (stage === 2) {
        const t = pick(['form', 'sum', 'mehr']);
        if (t === 'form') {
          const opts = ['Pyramide (viele Junge, wenige Alte)', 'Glocke (ungefähr gleich viele in allen Altersklassen bis 60)', 'Urne (weniger Junge als Personen mittleren Alters)'];
          return { q: `${img(true)}Welche Form hat diese Alterspyramide?`, kind: 'mc', options: opts, answer: ['Pyramide', 'Glocke', 'Urne'].indexOf(shape),
            hint: 'Vergleiche die untersten Balken (Kinder) mit den Balken in der Mitte (30–59 Jahre).', sol: `Es ist die Form «${shape}».` };
        }
        if (t === 'sum') {
          const i = ri(3, 8);
          return { q: `${img(true)}Wie viele Personen (Männer und Frauen zusammen) sind ${AGE[i]} Jahre alt?`, kind: 'num', answer: men[i] + women[i],
            hint: 'Addiere den Wert des blauen und des roten Balkens.', sol: `${men[i]} + ${women[i]} = ${men[i] + women[i]}` };
        }
        const n = men.filter((m, i) => women[i] > m).length;
        return { q: `${img(true)}In wie vielen Altersklassen leben mehr Frauen als Männer?`, kind: 'num', answer: n,
          hint: 'Vergleiche in jeder Zeile den roten mit dem blauen Wert.', sol: `In ${n} Altersklassen.` };
      }
      const total = men.reduce((s, v) => s + v, 0) + women.reduce((s, v) => s + v, 0);
      if (Math.random() < 0.5) {
        const old = men.slice(6).reduce((s, v) => s + v, 0) + women.slice(6).reduce((s, v) => s + v, 0);
        return { q: `${img(true)}Wie viel Prozent der Bevölkerung sind 60 Jahre und älter? Runde auf ganze Prozent.`, kind: 'num', answer: Math.round(old / total * 100), tol: 1.01,
          hint: 'Rechne zuerst die Gesamtbevölkerung und die Anzahl der Personen ab 60 aus. Anteil = Teil : Ganzes · 100.',
          sol: `Ab 60: ${old} Personen, total ${total}. ${old} : ${total} ≈ ${fmt(Math.round(old / total * 1000) / 10)} %` };
      }
      const young = men[0] + men[1] + women[0] + women[1];
      return { q: `${img(true)}Wie viel Prozent der Bevölkerung sind jünger als 20 Jahre? Runde auf ganze Prozent.`, kind: 'num', answer: Math.round(young / total * 100), tol: 1.01,
        hint: 'Addiere die Klassen 0–9 und 10–19 (Männer und Frauen). Teile durch die Gesamtbevölkerung.',
        sol: `Unter 20: ${young} Personen, total ${total}. Anteil ≈ ${fmt(Math.round(young / total * 1000) / 10)} %` };
    }
  },
  {
    id: 'prozent', lu: 10, name: 'Prozent-Markt', lz: 'LZ6', color: 'GREEN',
    goal: 'Absolute und relative Angaben unterscheiden und berechnen',
    ref: 'mathbuch 3, S. 28 A7 · S. 29 A8',
    gen(stage) {
      const town = pick(['Talwil', 'Seedorf', 'Bergmatt', 'Rüttenen', 'Hohfluh', 'Grünau']);
      if (stage === 1) {
        const G = pick([200, 400, 500, 800, 1000, 2000, 2500, 4000, 5000]), p = pick([5, 10, 15, 20, 25, 30, 40, 50]), W = G * p / 100;
        const grp = pick(['über 65 Jahre alt', 'jünger als 20 Jahre', 'zwischen 20 und 64 Jahre alt']);
        return { q: `In ${town} leben ${fmt(G)} Personen. ${fmt(W)} davon sind ${grp}.<br>Wie viel Prozent der Bevölkerung sind das?`, kind: 'num', answer: p, unit: '%',
          hint: `Anteil = Teil : Ganzes. Also ${fmt(W)} : ${fmt(G)}, dann mal 100.`, sol: `${fmt(W)} : ${fmt(G)} = ${fmt(p / 100)} = ${p} %` };
      }
      if (stage === 2) {
        if (Math.random() < 0.5) {
          const G = pick([1200, 2500, 3600, 4500, 6000, 8400]), p = pick([4, 6, 8, 12, 15, 18, 22, 25]), W = G * p / 100;
          return { q: `In ${town} leben ${fmt(G)} Personen. ${p} % davon sind über 80 Jahre alt.<br>Wie viele Personen sind über 80?`, kind: 'num', answer: W,
            hint: `${p} % von ${fmt(G)} = ${fmt(G)} · ${p} : 100`, sol: `${fmt(G)} · ${fmt(p / 100)} = ${fmt(W)}` };
        }
        const p = pick([4, 5, 8, 10, 12, 15, 20]), G = pick([1500, 2000, 3000, 4000, 6000]), W = G * p / 100;
        return { q: `In ${town} sind ${fmt(W)} Personen jünger als 10 Jahre. Das sind ${p} % der Bevölkerung.<br>Wie viele Einwohnerinnen und Einwohner hat ${town}?`, kind: 'num', answer: G,
          hint: `${p} % entsprechen ${fmt(W)} Personen. Wie viele Personen sind 1 %? Und 100 %?`, sol: `1 % = ${fmt(W)} : ${p} = ${fmt(W / p)}, 100 % = ${fmt(G)}` };
      }
      if (Math.random() < 0.55) {
        // Falle: absolut mehr, aber relativ weniger
        const GA = pick([8000, 9000, 10000, 12000]), pA = pick([14, 15, 16, 18]), GB = pick([3000, 4000, 4500, 5000]), pB = pA + pick([3, 4, 5, 6]);
        const WA = GA * pA / 100, WB = GB * pB / 100;
        const opts = [`Gemeinde A, weil dort mehr Senioren leben (${fmt(WA)} Personen).`, `Gemeinde B, weil der Anteil dort grösser ist (${pB} %).`, 'Beide gleich, man kann nur absolute Zahlen vergleichen.', `Gemeinde A, weil sie mehr Einwohner hat.`];
        return { q: table(['', 'Einwohner total', 'davon über 65'], [['Gemeinde A', GA, WA], ['Gemeinde B', GB, WB]]) + 'In welcher Gemeinde ist der <b>Anteil</b> der über 65-Jährigen grösser?', kind: 'mc', options: opts, answer: 1,
          hint: 'Berechne für beide Gemeinden den Anteil in Prozent. Die grössere Anzahl bedeutet nicht automatisch den grösseren Anteil.',
          sol: `A: ${fmt(WA)} : ${fmt(GA)} = ${pA} %, B: ${fmt(WB)} : ${fmt(GB)} = ${pB} %. Der Anteil ist in B grösser.` };
      }
      const a = ri(600, 1200), ch = pick([-30, -25, -20, -15, 10, 15, 20, 25, 40]), b = Math.round(a * (1 + ch / 100));
      return { q: `Die Zahl der Jugendlichen in ${town} veränderte sich in zehn Jahren von ${fmt(a)} auf ${fmt(b)}.<br>Um wie viel Prozent hat sie ${b < a ? 'abgenommen' : 'zugenommen'}? Runde auf ganze Prozent.`, kind: 'num', answer: Math.abs(Math.round((b - a) / a * 100)), tol: 1.01, unit: '%',
        hint: 'Veränderung = neu − alt. Prozentuale Veränderung = Veränderung : alter Wert · 100.', sol: `(${fmt(b)} − ${fmt(a)}) : ${fmt(a)} ≈ ${fmt(Math.round((b - a) / a * 1000) / 10)} %` };
    }
  },
  {
    id: 'zeit', lu: 10, name: 'Zeit-Observatorium', lz: 'LZ7', color: 'PURPLE',
    goal: 'Entwicklungen aus Tabellen und Graphen ablesen und beschreiben',
    ref: 'mathbuch 3, S. 28 A6 (G, D), A7 · S. 29 A8',
    gen(stage) {
      const years = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
      const ds = pick(['ew', 'alt', 'geb']);
      let title, yl, v, unitTxt, step;
      if (ds === 'ew') { title = 'Einwohner einer Gemeinde (fiktiv)'; yl = 'Einwohner'; let s = ri(18, 30) * 100; v = years.map(() => (s += ri(-2, 8) * 100)); unitTxt = 'Einwohner'; step = 500; }
      else if (ds === 'alt') { title = 'Anteil der über 65-Jährigen in % (fiktiv)'; yl = 'Anteil in %'; let s = ri(9, 11); v = years.map(() => (s += ri(0, 3))); unitTxt = 'Prozentpunkte'; step = 2; }
      else { title = 'Geburten pro Jahr in einer Region (fiktiv)'; yl = 'Geburten'; let s = ri(30, 40) * 10; v = years.map(() => Math.max(100, (s += ri(-6, 3) * 10))); unitTxt = 'Geburten'; step = 50; }
      const lo = Math.floor(Math.min(...v) / step) * step - step, hi = Math.ceil(Math.max(...v) / step) * step + step;
      const img = lineImg(title, years, [{ name: '', v }], yl, { labels: stage >= 2, min: Math.max(0, lo), max: hi, step });
      if (stage === 1) {
        const i = ri(0, 6);
        const v2 = v.slice(); // ablesen: Werte liegen nicht immer auf Gitter -> Beschriftung zeigen
        return { q: lineImg(title, years, [{ name: '', v: v2 }], yl, { labels: true, min: Math.max(0, lo), max: hi, step }) + `Welchen Wert zeigt der Graph im Jahr ${years[i]}?`, kind: 'num', answer: v[i],
          hint: `Suche auf der waagrechten Achse das Jahr ${years[i]} und lies den Punkt darüber ab.`, sol: `${years[i]}: ${fmt(v[i])}` };
      }
      if (stage === 2) {
        if (Math.random() < 0.5) {
          const i = ri(0, 3), j = ri(i + 2, 6);
          return { q: img + `Um wie viel hat sich der Wert von ${years[i]} bis ${years[j]} verändert? (Abnahme mit Minus angeben)`, kind: 'num', answer: v[j] - v[i],
            hint: 'Veränderung = späterer Wert − früherer Wert.', sol: `${fmt(v[j])} − ${fmt(v[i])} = ${fmt(v[j] - v[i])} ${unitTxt}` };
        }
        const diffs = v.slice(1).map((x, i) => x - v[i]); const mx = Math.max(...diffs);
        if (diffs.filter(d => d === mx).length > 1) return this.gen(2);
        const opts = years.slice(1).map((y, i) => `${years[i]} bis ${y}`);
        return { q: img + 'In welchem Zeitraum war die Zunahme am grössten?', kind: 'mc', options: opts, answer: diffs.indexOf(mx),
          hint: 'Wo steigt die Linie am steilsten? Berechne die Unterschiede zwischen benachbarten Punkten.', sol: `Grösste Zunahme: ${opts[diffs.indexOf(mx)]} (+${fmt(mx)})` };
      }
      const first = v[0], last = v[6], d = last - first;
      if (Math.random() < 0.5) {
        return { q: img + `Wie gross war die durchschnittliche Veränderung pro Jahr zwischen 1960 und 2020? Runde auf eine Dezimale.`, kind: 'num', answer: Math.round(d / 60 * 10) / 10, tol: 0.11,
          hint: 'Gesamtveränderung durch die Anzahl Jahre (60) teilen.', sol: `(${fmt(last)} − ${fmt(first)}) : 60 ≈ ${fmt(Math.round(d / 60 * 10) / 10)}` };
      }
      const up = d > 0, dbl = last >= 2 * first;
      const correct = `Von 1960 bis 2020 ${up ? 'nahm' : 'sank'} der Wert insgesamt von ${fmt(first)} auf ${fmt(last)} ${up ? 'zu' : 'ab'}${dbl ? ' und hat sich mehr als verdoppelt' : ''}.`;
      const wrong = [
        `Der Wert ${up ? 'sank' : 'stieg'} von 1960 bis 2020 ständig.`,
        `Der Wert ${dbl ? 'hat sich nicht verdoppelt' : 'hat sich mehr als verdoppelt'}.`,
        'Der Wert stieg in jedem Jahrzehnt um gleich viel.'
      ];
      const opts = shuffle([correct, ...wrong]);
      return { q: img + 'Welche Aussage beschreibt die Entwicklung richtig?', kind: 'mc', options: opts, answer: opts.indexOf(correct),
        hint: 'Vergleiche den ersten und den letzten Wert. Prüfe auch, ob die Abstände zwischen den Punkten gleich sind.', sol: correct };
    }
  },
  {
    id: 'fakten', lu: 10, name: 'Faktencheck-Redaktion', lz: 'LZ8', color: 'RED',
    goal: 'Statistische Aussagen mit Daten prüfen und kritisch hinterfragen',
    ref: 'mathbuch 3, S. 27 A4 · S. 28 A6 · S. 29 A8',
    gen(stage) {
      const town = pick(['Talwil', 'Seedorf', 'Bergmatt', 'Rüttenen', 'Hohfluh', 'Grünau']);
      const MC3 = ['Die Aussage stimmt.', 'Die Aussage stimmt nicht.', 'Mit diesen Daten nicht überprüfbar.'];
      if (stage === 1) {
        const a = ri(40, 120) * 10, t = pick(['halb', 'doppelt', 'gestiegen']);
        let b, claim, truth;
        if (t === 'halb') { b = Math.random() < 0.5 ? a / 2 : Math.round(a * (0.6 + Math.random() * 0.25) / 10) * 10; claim = 'Die Anzahl der Jugendlichen hat sich halbiert.'; truth = b === a / 2 ? 0 : 1; }
        else if (t === 'doppelt') { b = Math.random() < 0.5 ? a * 2 : Math.round(a * (1.4 + Math.random() * 0.4) / 10) * 10; claim = 'Die Anzahl der über 80-Jährigen hat sich verdoppelt.'; truth = b === a * 2 ? 0 : 1; }
        else { b = a + pick([-1, 1]) * ri(3, 20) * 10; claim = 'Die Anzahl der Kinder unter 10 Jahren ist gestiegen.'; truth = b > a ? 0 : 1; }
        const grp = t === 'halb' ? 'Jugendliche (10–19)' : t === 'doppelt' ? 'über 80-Jährige' : 'Kinder unter 10';
        return { q: table(['Gemeinde ' + town, '2014', '2024'], [[grp, a, b]]) + `<div class="quote">${claim}</div>Stimmt die Aussage?`, kind: 'mc', options: MC3.slice(0, 2), answer: truth,
          hint: t === 'halb' ? `Halbiert hiesse: ${fmt(a)} : 2 = ${fmt(a / 2)}.` : t === 'doppelt' ? `Verdoppelt hiesse: ${fmt(a)} · 2 = ${fmt(a * 2)}.` : 'Vergleiche den Wert 2024 mit dem Wert 2014.',
          sol: `2014: ${fmt(a)}, 2024: ${fmt(b)}. ${truth === 0 ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'}` };
      }
      if (stage === 2) {
        const G1 = ri(40, 60) * 100, G2 = G1 + ri(5, 20) * 100;
        const p1 = ri(15, 20), p2 = p1 + pick([-3, -2, 2, 3]);
        const s1 = Math.round(G1 * p1 / 100), s2 = Math.round(G2 * p2 / 100);
        const t = pick(['anteil', 'anzahl', 'grund']);
        const tbl = table(['Gemeinde ' + town, '2010', '2020'], [['Einwohner total', G1, G2], ['davon über 65', s1, s2]]);
        if (t === 'anteil') {
          const truth = (s2 / G2 > s1 / G1) ? 0 : 1;
          return { q: tbl + '<div class="quote">Der Anteil der über 65-Jährigen ist gestiegen.</div>Stimmt die Aussage?', kind: 'mc', options: MC3, answer: truth,
            hint: 'Berechne für beide Jahre den Anteil in % (über 65 : total · 100). Die Anzahl allein genügt nicht.', sol: `2010: ${fmt(Math.round(s1 / G1 * 1000) / 10)} %, 2020: ${fmt(Math.round(s2 / G2 * 1000) / 10)} %. ${truth === 0 ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'}` };
        }
        if (t === 'anzahl') {
          const truth = s2 > s1 ? 0 : 1;
          return { q: tbl + '<div class="quote">Es leben heute mehr über 65-Jährige in der Gemeinde als 2010.</div>Stimmt die Aussage?', kind: 'mc', options: MC3, answer: truth,
            hint: 'Hier geht es um die Anzahl (absolut), nicht um den Anteil.', sol: `2010: ${fmt(s1)}, 2020: ${fmt(s2)}. ${truth === 0 ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'}` };
        }
        return { q: tbl + '<div class="quote">Die Zahl der älteren Menschen hat sich verändert, weil viele junge Familien weggezogen sind.</div>Stimmt die Aussage?', kind: 'mc', options: MC3, answer: 2,
          hint: 'Zeigt die Tabelle etwas über Gründe oder über Zu- und Wegzüge?', sol: 'Die Tabelle enthält keine Angaben zu Gründen oder Umzügen. Die Aussage ist mit diesen Daten nicht überprüfbar.' };
      }
      const H = pick([
        { h: 'Immer mehr alte Menschen – Kosten explodieren!', good: 'Ist nur die Anzahl oder auch der Anteil der älteren Menschen gestiegen, und in welchem Zeitraum?', bad: ['Warum schreibt die Zeitung so etwas?', 'Sind alte Menschen glücklich?', 'Wie heisst die Journalistin?'] },
        { h: 'Jugendliche verschwinden aus den Dörfern!', good: 'Wie viele Jugendliche lebten früher und heute dort, und wie gross ist ihr Anteil an der Bevölkerung?', bad: ['Wollen Jugendliche lieber in der Stadt wohnen?', 'Ist das Dorf schön?', 'Welche Zeitung hat das geschrieben?'] },
        { h: 'Rekord: Noch nie lebten so viele über 100-Jährige in der Schweiz!', good: 'Wie viele über 100-Jährige gibt es genau, und wie hat sich ihr Anteil an der Gesamtbevölkerung entwickelt?', bad: ['Was essen über 100-Jährige?', 'Ist das eine gute Nachricht?', 'Wer ist die älteste Person der Welt?'] },
        { h: 'Geburten brechen ein – die Schweiz stirbt aus!', good: 'Um wie viel sind die Geburten gesunken, und wie entwickelt sich die Gesamtbevölkerung (z. B. durch Zuwanderung)?', bad: ['Wollen die Leute keine Kinder mehr?', 'Ist die Schlagzeile übertrieben?', 'Wie viele Kinder hat die Journalistin?'] }
      ]);
      const opts = shuffle([H.good, ...H.bad]);
      return { q: `<div class="quote headline">${H.h}</div>Welche Frage ist eine <b>kritische, statistische</b> Frage, mit der man die Schlagzeile mit Daten überprüfen kann?`, kind: 'mc', options: opts, answer: opts.indexOf(H.good),
        hint: 'Eine statistische Frage fragt nach Zahlen, Anteilen, Zeiträumen oder Datenquellen, nicht nach Meinungen.', sol: `Gute Frage: «${H.good}»` };
    }
  }
];

export const STAGES = { 1: { name: 'Grundanspruch', stars: '★', coins: 5 }, 2: { name: 'Standard', stars: '★★', coins: 10 }, 3: { name: 'Erweiterung', stars: '★★★', coins: 20 } };

// Antwort prüfen; gibt true/false (bzw. pro Teil ein Array) zurück
export function checkPart(part, value) {
  if (part.kind === 'mc') return Number(value) === part.answer;
  const v = parseAnswer(value); if (Number.isNaN(v)) return false;
  return Math.abs(v - part.answer) <= (part.tol ?? 1e-6);
}
