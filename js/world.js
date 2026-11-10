// MathWelt 3A – Aufbau der Blockwelt
import { World, B } from './engine.js';
import { BUILDINGS, WORLDS } from './tasks.js';

export const SIZE = 72, HEIGHT = 26, G = 4; // Bodenhöhe: Gras auf y = G

let seed = 12345;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Gebäude-Standorte: Mittelpunkt (x,z), Tür nach Norden (N) oder Süden (S)
const SPOTS = {
  gl: {
    waage: [17, 27, 'S'], umkehr: [27, 27, 'S'], probe: [46, 27, 'S'],
    klammer: [27, 46, 'N'], raetsel: [46, 46, 'N'], detektiv: [56, 46, 'N'],
  },
  aj: { pyramide: [27, 27, 'S'], prozent: [46, 27, 'S'], zeit: [27, 46, 'N'], fakten: [46, 46, 'N'] },
};
export const PLAZA = { x: 36, z: 36 };
export const LEVEL_TOWER = { id: 'level', name: 'Level-Turm', x: 36, z: 22, door: 'S' };
// Boss-Arena im Nordosten (Weg vom Hauptweg nördlich am Level-Turm vorbei) und Klassen-Leuchtturm im Südwesten
export const ARENA = { id: 'boss', name: 'Boss-Arena', x: 58, z: 14, r: 7 };
export const CLASS_TOWER = { id: 'klasse', name: 'Klassen-Leuchtturm', x: 14, z: 54 };

function building(w, cx, cz, door, wall, accent, roof, h = 5, half = 4) {
  const x0 = cx - half, x1 = cx + half, z0 = cz - half, z1 = cz + half;
  w.fill(x0 - 1, G, z0 - 1, x1 + 1, G, z1 + 1, B.COBBLE);       // Fundament
  w.fill(x0, G, z0, x1, G, z1, B.PLANKS);                       // Boden
  w.fill(x0, G + 1, z0, x1, G + h, z1, wall);                   // Wände (danach aushöhlen)
  w.fill(x0 + 1, G + 1, z0 + 1, x1 - 1, G + h, z1 - 1, B.AIR);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) w.fill(x, G + 1, z, x, G + h, z, B.LOG);
  // Fenster
  for (let k = x0 + 2; k <= x1 - 2; k += 3) { w.fill(k, G + 2, z0, k, G + 3, z0, B.GLASS); w.fill(k, G + 2, z1, k, G + 3, z1, B.GLASS); }
  for (let k = z0 + 2; k <= z1 - 2; k += 3) { w.fill(x0, G + 2, k, x0, G + 3, k, B.GLASS); w.fill(x1, G + 2, k, x1, G + 3, k, B.GLASS); }
  // Tür
  const dz = door === 'S' ? z1 : z0;
  w.fill(cx - 1, G + 1, dz, cx + 1, G + 3, dz, B.AIR);
  w.fill(cx - 2, G + 4, dz, cx + 2, G + 4, dz, accent);
  w.fill(cx - 2, G + 1, dz, cx - 2, G + 3, dz, B.LOG); w.fill(cx + 2, G + 1, dz, cx + 2, G + 3, dz, B.LOG);
  // Dach: Rand + Stufen
  w.fill(x0 - 1, G + h + 1, z0 - 1, x1 + 1, G + h + 1, z1 + 1, accent);
  w.fill(x0, G + h + 2, z0, x1, G + h + 2, z1, roof);
  w.fill(x0 + 2, G + h + 3, z0 + 2, x1 - 2, G + h + 3, z1 - 2, roof);
  w.fill(cx - 1, G + h + 4, cz - 1, cx + 1, G + h + 4, cz + 1, accent);
  w.set(cx, G + h, cz, B.LAMP);
  // Weg vor der Tür
  const step = door === 'S' ? 1 : -1;
  for (let k = 1; k <= 6; k++) w.fill(cx - 1, G, dz + step * k, cx + 1, G, dz + step * k, B.PATH);
  return { x0, x1, z0, z1, dz, signY: G + h + 5.6 };
}

function tree(w, x, z) {
  const h = 4 + Math.floor(rnd() * 2);
  w.fill(x - 2, G + h - 1, z - 2, x + 2, G + h, z + 2, B.LEAVES);
  w.fill(x - 1, G + h + 1, z - 1, x + 1, G + h + 1, z + 1, B.LEAVES);
  w.set(x, G + h + 2, z, B.LEAVES);
  w.fill(x, G + 1, z, x, G + h, z, B.LOG);
}

function arena(w) {
  const { x: ax, z: az, r } = ARENA;
  for (let z = az - r - 1; z <= az + r + 1; z++) for (let x = ax - r - 1; x <= ax + r + 1; x++) {
    const d = Math.hypot(x - ax, z - az);
    if (d <= r + 0.5) { w.fill(x, G + 1, z, x, HEIGHT - 1, z, B.AIR); w.set(x, G, z, d > r - 1.5 ? B.STONE : (x + z) % 2 ? B.COBBLE : B.STONE); }
  }
  // Säulen mit Laternen im Kreis, Lücke im Westen als Eingang
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2; if (Math.abs(Math.cos(a) + 1) < 0.2) continue;
    const x = Math.round(ax + Math.cos(a) * r), z = Math.round(az + Math.sin(a) * r);
    w.fill(x, G + 1, z, x, G + 4, z, B.COBBLE); w.set(x, G + 5, z, B.LAMP);
  }
  // Sockel des Bosses
  w.fill(ax - 1, G, az - 1, ax + 1, G, az + 1, B.GOLD);
  // Weg vom Hauptweg (x = 35–37) zur Arena
  w.fill(38, G, az - 1, ax - r, G, az + 1, B.PATH);
  return { x0: ax - r + 1, x1: ax + r, z0: az - r + 1, z1: az + r, cx: ax, cz: az, door: 'S', signY: G + 9 };
}

export function buildWorld(level = 1, worldId = 'gl', opts = {}) {
  seed = worldId === 'aj' ? 54321 : 12345;
  const w = new World(SIZE, HEIGHT, SIZE);
  // Gelände
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const edge = Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z);
    let top = G;
    if (edge < 4) top = G + (4 - edge) + Math.floor(rnd() * 2);       // Hügel am Rand
    w.fill(x, 0, z, x, 1, z, B.STONE); w.fill(x, 2, z, x, top - 1, z, B.DIRT); w.set(x, top, z, edge < 2 ? B.STONE : B.GRASS);
  }
  // Hauptwege
  w.fill(4, G, 35, SIZE - 5, G, 37, B.PATH);
  w.fill(35, G, 4, 37, G, SIZE - 5, B.PATH);
  // Platz
  w.fill(32, G, 32, 40, G, 40, worldId === 'aj' ? B.SANDSTONE : B.COBBLE);
  w.fill(33, G, 33, 39, G, 39, B.PATH);
  // Brunnen in der Mitte
  w.fill(34, G + 1, 34, 38, G + 1, 38, B.COBBLE); w.fill(35, G + 1, 35, 37, G + 1, 37, B.WATER);

  const meta = {};
  const accentOf = (name) => B[name] ?? B.WHITE;
  for (const b of BUILDINGS.filter(x => x.lu === WORLDS[worldId].lu)) {
    const [cx, cz, door] = SPOTS[worldId][b.id];
    const wall = b.lu === 11 ? B.BRICK : B.SANDSTONE;
    const accent = b.color === 'BOOKS' ? B.DARKWOOD : accentOf(b.color);
    const r = building(w, cx, cz, door, wall, accent, b.lu === 11 ? B.DARKWOOD : B.PLANKS);
    // Innenausstattung
    if (b.id === 'raetsel') { w.fill(r.x0 + 1, G + 1, r.z0 + 1, r.x0 + 1, G + 3, r.z1 - 1, B.BOOKS); w.fill(r.x1 - 1, G + 1, r.z0 + 1, r.x1 - 1, G + 3, r.z1 - 1, B.BOOKS); w.fill(cx - 1, G + 1, door === 'S' ? r.z0 + 1 : r.z1 - 1, cx + 1, G + 3, door === 'S' ? r.z0 + 1 : r.z1 - 1, B.BOOKS); }
    else { const tz = door === 'S' ? r.z0 + 2 : r.z1 - 2; w.set(cx, G + 1, tz, accent); w.set(cx - 1, G + 1, tz, B.PLANKS); w.set(cx + 1, G + 1, tz, B.PLANKS); }
    meta[b.id] = { ...r, cx, cz, door, b };
  }
  // Level-Turm
  {
    const { x, z } = LEVEL_TOWER;
    const r = building(w, x, z, 'S', B.STONE, B.GOLD, B.COBBLE, 9, 3);
    meta.level = { ...r, cx: x, cz: z, door: 'S', b: LEVEL_TOWER };
  }
  // Ruhmes-Säule auf dem Platz: wächst mit dem Level
  setFamePillar(w, level, opts.top);
  // Boss-Arena und Klassen-Leuchtturm
  meta.boss = { ...arena(w), b: ARENA };
  {
    const { x, z } = CLASS_TOWER;
    w.fill(x - 3, G, z - 3, x + 3, G, z + 3, B.COBBLE); w.fill(x - 2, G + 1, z - 2, x + 2, G + 1, z + 2, B.STONE);
    w.fill(x, G, z - 4, x + 1, G, 38, B.PATH);   // Weg nach Norden zum Hauptweg
    const top = setClassTower(w, opts.classStage || 0);
    meta.klasse = { x0: x - 4, x1: x + 3, z0: z - 4, z1: z + 3, cx: x, cz: z, door: 'S', signY: top + 2, b: CLASS_TOWER };
  }
  // Teich in der Welt «Alt und Jung»
  if (worldId === 'aj') { w.fill(60, G, 58, 66, G, 63, B.WATER); w.fill(61, G, 57, 65, G, 57, B.WATER); }
  // Bäume
  const busy = (x, z) => {
    if (Math.abs(x - 36) < 9 && Math.abs(z - 36) < 9) return true;
    if (Math.abs(z - 36) < 4 || Math.abs(x - 36) < 4) return true;
    for (const m of Object.values(meta)) if (x > m.x0 - 4 && x < m.x1 + 4 && z > m.z0 - 4 && z < m.z1 + 4) return true;
    if (x > 57 && z > 54 && x < 69 && z < 66) return true;
    if (x > ARENA.x - ARENA.r - 3 && z > ARENA.z - ARENA.r - 3 && z < ARENA.z + ARENA.r + 3) return true;     // Arena
    if (x > 36 && Math.abs(z - ARENA.z) < 4) return true;                                                     // Weg zur Arena
    if (Math.abs(x - CLASS_TOWER.x) < 7 && Math.abs(z - CLASS_TOWER.z) < 7) return true;                       // Leuchtturm
    if (Math.abs(x - CLASS_TOWER.x) < 4 && z > 36 && z < CLASS_TOWER.z) return true;
    return x < 6 || z < 6 || x > SIZE - 7 || z > SIZE - 7;
  };
  for (let i = 0; i < 70; i++) {
    const x = 6 + Math.floor(rnd() * (SIZE - 12)), z = 6 + Math.floor(rnd() * (SIZE - 12));
    if (!busy(x, z) && w.get(x, G + 1, z) === B.AIR) tree(w, x, z);
  }
  // Blumen / Laternen entlang der Wege
  for (let k = 8; k < SIZE - 8; k += 8) {
    if (Math.abs(k - 36) < 8) continue;
    w.fill(k, G + 1, 34, k, G + 2, 34, B.LOG); w.set(k, G + 3, 34, B.LAMP);
    if (k < 15 || k > 28) { w.fill(34, G + 1, k, 34, G + 2, k, B.LOG); w.set(34, G + 3, k, B.LAMP); }
  }
  return { world: w, meta };
}

// Spitze der Säule aus dem Shop
const TOPS = { top_kristall: B.CYAN, top_flamme: B.ORANGE, top_rose: B.PINK };
export function setFamePillar(w, level, top = null) {
  const x = 36, z = 36;
  w.fill(x, G + 2, z, x, HEIGHT - 1, z, B.AIR);
  const h = Math.min(level, HEIGHT - G - 4);
  w.fill(x, G + 2, z, x, G + 1 + h, z, B.GOLD);
  w.set(x, G + 2 + h, z, TOPS[top] ?? B.LAMP);
}

// Klassen-Leuchtturm: wächst um 2 Blöcke pro Stufe (0–10), rot-weiss gestreift, ganz oben ein Licht
export function setClassTower(w, stage) {
  const { x, z } = CLASS_TOWER;
  w.fill(x - 1, G + 2, z - 1, x + 1, HEIGHT - 1, z + 1, B.AIR);
  for (let k = 0; k < stage; k++) w.fill(x - 1, G + 2 + 2 * k, z - 1, x + 1, G + 3 + 2 * k, z + 1, k % 2 ? B.RED : B.WHITE);
  const top = G + 2 + 2 * stage;
  if (stage >= 10) { w.fill(x - 1, top - 1, z - 1, x + 1, top - 1, z + 1, B.GOLD); w.set(x, top - 1, z, B.LAMP); }
  else w.set(x, top, z, B.LAMP);
  return top;
}

// In welchem Gebäude steht die Spielfigur?
export function buildingAt(meta, px, pz) {
  for (const [id, m] of Object.entries(meta)) {
    if (px > m.x0 + 1 && px < m.x1 && pz > m.z0 + 1 && pz < m.z1) return id;
  }
  return null;
}
