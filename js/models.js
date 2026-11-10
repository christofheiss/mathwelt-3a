// MathWelt 3A – bewegliche Figuren aus Quadern: Boss (Golem, Orakel) und Begleiter aus dem Shop
// Jede Funktion gibt eine Liste von Quadern für Renderer.drawBoxes zurück. Vorne ist −z (wie die Kamera bei yaw = 0).
import { B } from './engine.js';

// Teil relativ zur Figur: Versatz (lx, ly, lz), halbe Grösse, Blocktyp, weitere Felder (rx, piv, shade)
function placer(X, Y, Z, yaw, shade = 1) {
  const c = Math.cos(yaw), s = Math.sin(yaw), out = [];
  const part = (lx, ly, lz, hx, hy, hz, t, extra = {}) => {
    out.push({ c: [X + lx * c - lz * s, Y + ly, Z + lx * s + lz * c], h: [hx, hy, hz], t, yaw, ...extra, shade: (extra.shade ?? 1) * shade });
  };
  return { part, out };
}

// Zustand: { x, y, z, yaw, t (Zeit in s), phase 0–2, sleep, hitT, slamT, shieldT, deadT }
export function golem(st) {
  const flash = st.hitT > 0 ? 1 + st.hitT * 3 : 1;
  const shade = st.sleep ? 0.55 : flash;
  let bob = st.sleep ? 0 : Math.sin(st.t * 2) * 0.08, swing = st.sleep ? 0 : Math.sin(st.t * 1.6) * 0.18, lean = 0;
  if (st.slamT > 0) {                      // Schlag: Arme hoch, dann auf den Boden
    const k = 1 - st.slamT;                // 0 → 1
    swing = 0; const raise = k < 0.6 ? -2.6 * (k / 0.6) : -2.6 + 2.6 * ((k - 0.6) / 0.4);
    st._raise = raise; bob += k < 0.6 ? k * 0.6 : (1 - k) * 0.9;
  } else st._raise = 0;
  if (st.hitT > 0) lean = st.hitT * 0.6;   // zurückweichen
  const back = lean * 0.8;
  const { part, out } = placer(st.x - Math.sin(st.yaw) * back, st.y + bob, st.z + Math.cos(st.yaw) * back, st.yaw, shade);
  const eye = st.sleep ? B.STONE : B.LAMP;
  part(-0.6, 0.9, 0, 0.45, 0.9, 0.45, B.STONE); part(0.6, 0.9, 0, 0.45, 0.9, 0.45, B.STONE);         // Beine
  part(0, 3.0, 0, 1.3, 1.2, 0.8, B.COBBLE);                                                           // Körper
  part(0, 3.35, -0.82, 0.62, 0.1, 0.04, B.GOLD); part(0, 2.85, -0.82, 0.62, 0.1, 0.04, B.GOLD);      // Gleichheitszeichen
  part(0, 4.9, 0, 0.75, 0.7, 0.7, B.STONE);                                                           // Kopf
  part(-0.3, 5.0, -0.72, 0.16, 0.12, 0.04, eye); part(0.3, 5.0, -0.72, 0.16, 0.12, 0.04, eye);         // Augen
  const arm = st._raise || swing;
  part(-1.75, 2.9, 0, 0.4, 1.2, 0.4, B.COBBLE, { rx: arm, piv: [0, 1.0, 0] });
  part(1.75, 2.9, 0, 0.4, 1.2, 0.4, B.COBBLE, { rx: st._raise || -swing, piv: [0, 1.0, 0] });
  if (st.phase >= 1) { part(-1.6, 4.25, 0, 0.6, 0.18, 0.6, B.BLUE); part(1.6, 4.25, 0, 0.6, 0.18, 0.6, B.BLUE); part(0, 3.0, -0.85, 1.0, 0.9, 0.04, B.BLUE, { shade: 0.9 }); part(0, 3.35, -0.9, 0.62, 0.1, 0.04, B.GOLD); part(0, 2.85, -0.9, 0.62, 0.1, 0.04, B.GOLD); }
  if (st.phase >= 2) { part(0, 5.85, 0, 0.8, 0.12, 0.8, B.CYAN); for (const k of [-0.6, 0, 0.6]) part(k, 6.15, 0, 0.12, 0.2, 0.12, B.GLASS); }
  addShield(part, st, 2.3, 3.0);
  return explode(out, st);
}

export function oracle(st) {
  const flash = st.hitT > 0 ? 1 + st.hitT * 3 : 1, shade = st.sleep ? 0.55 : flash;
  let bob = st.sleep ? 0.6 : 1.0 + Math.sin(st.t * 1.8) * 0.35;
  if (st.slamT > 0) bob += Math.sin((1 - st.slamT) * Math.PI) * 1.2;
  const { part, out } = placer(st.x, st.y + bob, st.z, st.yaw, shade);
  const eye = st.sleep ? B.DARKWOOD : B.LAMP;
  part(0, 0.5, 0, 1.4, 0.45, 1.4, B.PURPLE, { shade: st.phase >= 1 ? 0.7 : 1 });     // Saum
  part(0, 2.2, 0, 1.05, 1.3, 1.05, B.PURPLE);                                       // Gewand
  part(0, 4.2, 0, 0.75, 0.7, 0.75, B.WHITE);                                        // Kopf
  part(0, 4.15, -0.78, 0.62, 0.42, 0.04, B.SANDSTONE);                              // Maske
  part(-0.28, 4.25, -0.83, 0.13, 0.1, 0.03, eye); part(0.28, 4.25, -0.83, 0.13, 0.1, 0.03, eye);
  part(-1.35, 2.6, -0.3, 0.3, 0.3, 0.3, B.PINK); part(1.35, 2.6, -0.3, 0.3, 0.3, 0.3, B.PINK);   // Hände
  if (st.phase >= 2) part(0, 2.5, -1.1, 0.7, 0.45, 0.04, B.WHITE, { shade: 1.1 });   // Schlagzeile auf der Brust
  // Datenwürfel kreisen um das Orakel
  const n = st.sleep ? 0 : 3 + st.phase;
  for (let i = 0; i < n; i++) {
    const a = st.t * (0.9 + i * 0.1) + i * 2.1, r = 2.4;
    out.push({ c: [st.x + Math.cos(a) * r, st.y + bob + 2.4 + Math.sin(st.t * 2 + i) * 0.6, st.z + Math.sin(a) * r], h: [0.22, 0.22, 0.22], t: [B.CYAN, B.YELLOW, B.GREEN, B.ORANGE, B.RED][i], yaw: a, shade });
  }
  addShield(part, st, 2.2, 2.4);
  return explode(out, st);
}

function addShield(part, st, r, y) {
  if (!(st.shieldT > 0)) return;
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + st.t;
    part(Math.cos(a) * r, y + Math.sin(st.t * 4 + k) * 0.3, Math.sin(a) * r, 0.18, 1.4, 0.18, B.GLASS, { shade: 0.8 + st.shieldT });
  }
}

// Besiegt: Teile fliegen auseinander und fallen, danach goldene Funken
function explode(boxes, st) {
  if (st.deadT == null) return boxes;
  const k = st.deadT;                       // Sekunden seit dem Sieg
  if (k > 2.4) return confetti(st, k);
  return boxes.map((b, i) => {
    const dx = b.c[0] - st.x, dz = b.c[2] - st.z, a = i * 1.7;
    const vx = dx * 1.2 + Math.cos(a) * 1.5, vz = dz * 1.2 + Math.sin(a) * 1.5, vy = 4 + (i % 4);
    return { ...b, c: [b.c[0] + vx * k, Math.max(st.y + b.h[1], b.c[1] + vy * k - 6 * k * k), b.c[2] + vz * k], yaw: (b.yaw || 0) + k * (i % 3 + 1), shade: 1.2 }
  }).concat(confetti(st, k));
}
function confetti(st, k) {
  if (k > 6) return [];
  const out = [];
  for (let i = 0; i < 24; i++) {
    const a = i * 0.9 + k * 0.5, r = 1 + (i % 5) * 0.5 + k * 0.3;
    out.push({ c: [st.x + Math.cos(a) * r, st.y + 1 + ((i * 0.37 + k * 1.3) % 6), st.z + Math.sin(a) * r], h: [0.1, 0.1, 0.1], t: i % 3 ? B.GOLD : B.LAMP, yaw: a * 3, shade: 1.3 });
  }
  return out;
}

// ---------- Begleiter aus dem Shop ----------
export function pet(kind, p) {           // p: { x, y, z, yaw, t }
  const { part, out } = placer(p.x, p.y, p.z, p.yaw);
  const hop = Math.abs(Math.sin(p.t * 5)) * 0.25;
  if (kind === 'pet_wuerfel') {
    part(0, 0.3 + hop, 0, 0.3, 0.3, 0.3, B.YELLOW);
    part(-0.12, 0.38 + hop, -0.31, 0.06, 0.06, 0.02, B.DARKWOOD); part(0.12, 0.38 + hop, -0.31, 0.06, 0.06, 0.02, B.DARKWOOD);
  } else if (kind === 'pet_vogel') {
    const fly = 1.6 + Math.sin(p.t * 3) * 0.2, flap = Math.sin(p.t * 14) * 0.7;
    part(0, fly, 0, 0.2, 0.18, 0.3, B.RED);
    part(0, fly + 0.18, -0.28, 0.15, 0.14, 0.14, B.RED);
    part(0, fly + 0.15, -0.46, 0.05, 0.04, 0.06, B.ORANGE);
    part(-0.3, fly + 0.05, 0, 0.18, 0.03, 0.16, B.BLUE, { rx: flap * 0.3 }); part(0.3, fly + 0.05, 0, 0.18, 0.03, 0.16, B.BLUE, { rx: -flap * 0.3 });
    part(0, fly - 0.02, 0.36, 0.1, 0.03, 0.1, B.YELLOW);
  } else if (kind === 'pet_robo') {
    const h = hop * 0.4;
    part(-0.12, 0.15, 0, 0.08, 0.15, 0.08, B.STONE); part(0.12, 0.15, 0, 0.08, 0.15, 0.08, B.STONE);
    part(0, 0.5 + h, 0, 0.25, 0.22, 0.18, B.WHITE);
    part(0, 0.9 + h, 0, 0.2, 0.17, 0.17, B.WHITE);
    part(-0.08, 0.93 + h, -0.18, 0.05, 0.04, 0.02, B.CYAN); part(0.08, 0.93 + h, -0.18, 0.05, 0.04, 0.02, B.CYAN);
    part(0, 1.15 + h, 0, 0.02, 0.08, 0.02, B.STONE); part(0, 1.25 + h, 0, 0.05, 0.05, 0.05, B.RED, { shade: 1.3 });
  }
  return out;
}
