// MathWelt 3A – kleine Voxel-Engine (WebGL, ohne externe Bibliotheken)

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, PLANKS: 4, LOG: 5, LEAVES: 6, GLASS: 7,
  BRICK: 8, PATH: 9, WATER: 10, GOLD: 11, COBBLE: 12, RED: 13, BLUE: 14, GREEN: 15,
  YELLOW: 16, PURPLE: 17, ORANGE: 18, WHITE: 19, DARKWOOD: 20, BOOKS: 21, LAMP: 22,
  CYAN: 23, PINK: 24, SANDSTONE: 25
};

// Kachel-Indizes im Texturatlas
const T = {
  grassTop: 0, grassSide: 1, dirt: 2, stone: 3, planks: 4, logSide: 5, logTop: 6, leaves: 7,
  glass: 8, brick: 9, path: 10, water: 11, gold: 12, cobble: 13, red: 14, blue: 15,
  green: 16, yellow: 17, purple: 18, orange: 19, white: 20, darkwood: 21, books: 22, lamp: 23,
  cyan: 24, pink: 25, sandTop: 26, sandSide: 27
};
const ATLAS_COLS = 8, TILE = 16;

// [oben, seite, unten]
const FACES = {
  [B.GRASS]: [T.grassTop, T.grassSide, T.dirt], [B.DIRT]: [T.dirt, T.dirt, T.dirt],
  [B.STONE]: [T.stone, T.stone, T.stone], [B.PLANKS]: [T.planks, T.planks, T.planks],
  [B.LOG]: [T.logTop, T.logSide, T.logTop], [B.LEAVES]: [T.leaves, T.leaves, T.leaves],
  [B.GLASS]: [T.glass, T.glass, T.glass], [B.BRICK]: [T.brick, T.brick, T.brick],
  [B.PATH]: [T.path, T.dirt, T.dirt], [B.WATER]: [T.water, T.water, T.water],
  [B.GOLD]: [T.gold, T.gold, T.gold], [B.COBBLE]: [T.cobble, T.cobble, T.cobble],
  [B.RED]: [T.red, T.red, T.red], [B.BLUE]: [T.blue, T.blue, T.blue],
  [B.GREEN]: [T.green, T.green, T.green], [B.YELLOW]: [T.yellow, T.yellow, T.yellow],
  [B.PURPLE]: [T.purple, T.purple, T.purple], [B.ORANGE]: [T.orange, T.orange, T.orange],
  [B.WHITE]: [T.white, T.white, T.white], [B.DARKWOOD]: [T.darkwood, T.darkwood, T.darkwood],
  [B.BOOKS]: [T.planks, T.books, T.planks], [B.LAMP]: [T.lamp, T.lamp, T.lamp],
  [B.CYAN]: [T.cyan, T.cyan, T.cyan], [B.PINK]: [T.pink, T.pink, T.pink],
  [B.SANDSTONE]: [T.sandTop, T.sandSide, T.sandTop]
};
// Blöcke, durch die man hindurchsehen kann (Nachbarflächen werden gezeichnet)
const SEE_THROUGH = new Set([B.AIR, B.LEAVES, B.GLASS]);
// Blöcke, durch die man nicht laufen kann
export function isSolid(t) { return t !== B.AIR; }

// ---------- Texturatlas prozedural erzeugen ----------
function makeAtlas() {
  const rows = Math.ceil(28 / ATLAS_COLS);
  const c = document.createElement('canvas');
  c.width = ATLAS_COLS * TILE; c.height = rows * TILE;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const px = (tile, x, y, rgb) => {
    const tx = (tile % ATLAS_COLS) * TILE, ty = Math.floor(tile / ATLAS_COLS) * TILE;
    g.fillStyle = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
    g.fillRect(tx + x, ty + y, 1, 1);
  };
  const vary = (rgb, amt) => { const k = 1 + (rnd() - 0.5) * amt; return rgb.map(v => Math.max(0, Math.min(255, v * k))); };
  const noise = (tile, rgb, amt = 0.25) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(tile, x, y, vary(rgb, amt)); };

  noise(T.grassTop, [96, 160, 64]);
  noise(T.dirt, [134, 96, 67]);
  noise(T.grassSide, [134, 96, 67]);
  for (let x = 0; x < TILE; x++) { const h = 3 + Math.floor(rnd() * 3); for (let y = 0; y < h; y++) px(T.grassSide, x, y, vary([96, 160, 64], 0.25)); }
  noise(T.stone, [128, 128, 128], 0.2);
  // Bretter
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const seam = y % 4 === 3 || (x === ((Math.floor(y / 4) * 5) % 16));
    px(T.planks, x, y, seam ? [120, 88, 50] : vary([168, 128, 78], 0.15));
    px(T.darkwood, x, y, seam ? [50, 34, 20] : vary([82, 58, 34], 0.15));
  }
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(T.logSide, x, y, vary(x % 4 === 0 ? [80, 60, 36] : [104, 80, 48], 0.15));
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    px(T.logTop, x, y, d > 6.5 ? [90, 68, 40] : (Math.floor(d) % 2 ? [176, 140, 90] : [150, 116, 72]));
  }
  // Blätter (mit Lücken)
  {
    const tx = (T.leaves % ATLAS_COLS) * TILE, ty = Math.floor(T.leaves / ATLAS_COLS) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (rnd() < 0.18) { g.clearRect(tx + x, ty + y, 1, 1); continue; }
      px(T.leaves, x, y, vary([60, 130, 50], 0.35));
    }
  }
  // Glas: Rahmen + transparente Mitte
  {
    const tx = (T.glass % ATLAS_COLS) * TILE, ty = Math.floor(T.glass / ATLAS_COLS) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      if (edge) px(T.glass, x, y, [210, 230, 240]);
      else if ((x === y + 3 || x === y + 4) && x < 12) px(T.glass, x, y, [235, 245, 250]);
      else g.clearRect(tx + x, ty + y, 1, 1);
    }
  }
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
    const mortar = y % 4 === 3 || (x + off) % 8 === 7;
    px(T.brick, x, y, mortar ? [190, 180, 170] : vary([160, 70, 55], 0.18));
  }
  noise(T.path, [190, 170, 120], 0.2);
  noise(T.water, [60, 110, 200], 0.12);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(T.gold, x, y, vary((x + y) % 7 === 0 ? [255, 240, 150] : [235, 190, 50], 0.12));
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const cell = ((Math.floor(x / 5) * 7 + Math.floor(y / 4) * 3) % 5);
    const edge = x % 5 === 0 || y % 4 === 0;
    px(T.cobble, x, y, edge ? [80, 80, 80] : vary([120 + cell * 6, 120 + cell * 6, 120 + cell * 6], 0.15));
  }
  const wool = (t, rgb) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(t, x, y, vary(rgb, (x + y) % 3 === 0 ? 0.22 : 0.1)); };
  wool(T.red, [180, 50, 45]); wool(T.blue, [50, 80, 170]); wool(T.green, [70, 130, 50]);
  wool(T.yellow, [230, 195, 50]); wool(T.purple, [130, 60, 160]); wool(T.orange, [225, 120, 40]);
  wool(T.white, [230, 230, 225]); wool(T.cyan, [40, 140, 150]); wool(T.pink, [220, 120, 150]);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    if (y % 8 === 0 || y % 8 === 7) { px(T.books, x, y, [150, 110, 64]); continue; }
    const colors = [[160, 40, 40], [40, 80, 150], [50, 120, 60], [190, 150, 50], [110, 50, 120]];
    px(T.books, x, y, x % 3 === 2 ? [40, 30, 20] : colors[(Math.floor(x / 3) + Math.floor(y / 8)) % 5]);
  }
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    px(T.lamp, x, y, d < 6 ? vary([255, 230, 150], 0.08) : vary([200, 150, 70], 0.15));
  }
  noise(T.sandTop, [220, 205, 150], 0.08);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(T.sandSide, x, y, y < 3 || y > 12 ? vary([200, 180, 125], 0.08) : vary([220, 205, 150], 0.08));
  return c;
}

// Durchschnittsfarbe pro Block (für die Karte)
export const MAP_COLORS = {
  [B.GRASS]: '#60a040', [B.DIRT]: '#866043', [B.STONE]: '#808080', [B.PLANKS]: '#a8804e', [B.LOG]: '#68502e',
  [B.LEAVES]: '#3c8232', [B.GLASS]: '#cfe6f0', [B.BRICK]: '#a04637', [B.PATH]: '#bea978', [B.WATER]: '#3c6ec8',
  [B.GOLD]: '#ebbe32', [B.COBBLE]: '#787878', [B.RED]: '#b4322d', [B.BLUE]: '#3250aa', [B.GREEN]: '#468232',
  [B.YELLOW]: '#e6c332', [B.PURPLE]: '#823ca0', [B.ORANGE]: '#e17828', [B.WHITE]: '#e6e6e1', [B.DARKWOOD]: '#523a22',
  [B.BOOKS]: '#8a5a3a', [B.LAMP]: '#f0d080', [B.CYAN]: '#288c96', [B.PINK]: '#dc7896', [B.SANDSTONE]: '#dccd96'
};

// ---------- Welt ----------
export class World {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.data = new Uint8Array(sx * sy * sz);
  }
  idx(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  get(x, y, z) { return this.inside(x, y, z) ? this.data[this.idx(x, y, z)] : (y < 0 ? B.STONE : B.AIR); }
  set(x, y, z, t) { if (this.inside(x, y, z)) this.data[this.idx(x, y, z)] = t; }
  fill(x0, y0, z0, x1, y1, z1, t) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, t);
  }
  topY(x, z) { for (let y = this.sy - 1; y >= 0; y--) if (this.get(x, y, z) !== B.AIR) return y; return -1; }
}

// ---------- Mathematik-Helfer ----------
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function viewMatrix(px, py, pz, yaw, pitch) {
  // Kamera schaut in Richtung (sin(yaw)cos(p), sin(p), -cos(yaw)cos(p))
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const fx = sy * cp, fy = sp, fz = -cy * cp;           // vorwärts
  const rx = cy, ry = 0, rz = sy;                       // rechts
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx; // oben
  return new Float32Array([
    rx, ux, -fx, 0,
    ry, uy, -fy, 0,
    rz, uz, -fz, 0,
    -(rx * px + ry * py + rz * pz), -(ux * px + uy * py + uz * pz), (fx * px + fy * py + fz * pz), 1
  ]);
}
function mul(a, b) { // a*b, spaltenweise
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
  }
  return o;
}

// Flächen eines Würfels: Normale, 4 Ecken (gegen Uhrzeigersinn von aussen), Helligkeit, Kacheltyp (0 oben,1 Seite,2 unten)
const FACE_DEFS = [
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0, k: 0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.5, k: 2 },
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.8, k: 1 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.8, k: 1 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.65, k: 1 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.65, k: 1 }
];

// ---------- Renderer ----------
const VS = `
attribute vec3 aPos; attribute vec2 aUV; attribute float aShade;
uniform mat4 uMVP; uniform vec3 uEye;
varying vec2 vUV; varying float vShade; varying float vDist;
void main(){ vUV=aUV; vShade=aShade; vDist=distance(aPos,uEye); gl_Position=uMVP*vec4(aPos,1.0); }`;
const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec3 uSky; uniform float uFogNear; uniform float uFogFar;
varying vec2 vUV; varying float vShade; varying float vDist;
void main(){
  vec4 c=texture2D(uTex,vUV); if(c.a<0.5) discard;
  vec3 col=c.rgb*vShade;
  float f=clamp((vDist-uFogNear)/(uFogFar-uFogNear),0.0,1.0);
  gl_FragColor=vec4(mix(col,uSky,f),1.0);
}`;

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas; this.world = world;
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL wird von diesem Browser nicht unterstützt.');
    this.gl = gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    this.prog = p; gl.useProgram(p);
    this.loc = {
      aPos: gl.getAttribLocation(p, 'aPos'), aUV: gl.getAttribLocation(p, 'aUV'), aShade: gl.getAttribLocation(p, 'aShade'),
      uMVP: gl.getUniformLocation(p, 'uMVP'), uEye: gl.getUniformLocation(p, 'uEye'), uTex: gl.getUniformLocation(p, 'uTex'),
      uSky: gl.getUniformLocation(p, 'uSky'), uFogNear: gl.getUniformLocation(p, 'uFogNear'), uFogFar: gl.getUniformLocation(p, 'uFogFar')
    };
    const atlas = makeAtlas();
    this.atlasCanvas = atlas;
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.atlasW = atlas.width; this.atlasH = atlas.height;
    this.buf = gl.createBuffer(); this.count = 0; this.ebuf = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    this.sky = [0.55, 0.75, 0.95];
    this.rebuild();
  }

  uvOf(tile) {
    const u0 = (tile % ATLAS_COLS) * TILE / this.atlasW, v0 = Math.floor(tile / ATLAS_COLS) * TILE / this.atlasH;
    const du = TILE / this.atlasW, dv = TILE / this.atlasH, e = 0.0005;
    return [u0 + e, v0 + e, u0 + du - e, v0 + dv - e];
  }

  rebuild() {
    const w = this.world, out = [];
    const uvOf = (tile) => this.uvOf(tile), F = FACE_DEFS;
    for (let y = 0; y < w.sy; y++) for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) {
      const t = w.data[w.idx(x, y, z)]; if (!t) continue;
      const faces = FACES[t] || FACES[B.STONE];
      for (const f of F) {
        const nb = w.get(x + f.n[0], y + f.n[1], z + f.n[2]);
        if (!SEE_THROUGH.has(nb) || (nb === t && t !== B.LEAVES)) continue;
        if (y + f.n[1] < 0) continue;
        const [u0, v0, u1, v1] = uvOf(faces[f.k]);
        // UV: Seiten mit v nach oben
        const uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
        const shade = t === B.LAMP ? 1.25 : f.s;
        const P = f.c.map(c => [x + c[0], y + c[1], z + c[2]]);
        const order = [0, 1, 2, 0, 2, 3];
        for (const i of order) out.push(P[i][0], P[i][1], P[i][2], uv[i][0], uv[i][1], shade);
      }
    }
    const arr = new Float32Array(out);
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    this.count = arr.length / 6;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(this.canvas.clientWidth * dpr), h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  draw(cam) {
    this.resize();
    const gl = this.gl, L = this.loc;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(this.sky[0], this.sky[1], this.sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = perspective(70 * Math.PI / 180, this.canvas.width / this.canvas.height, 0.05, 200);
    const view = viewMatrix(cam.x, cam.y, cam.z, cam.yaw, cam.pitch);
    this.mvp = mul(proj, view);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(L.uMVP, false, this.mvp);
    gl.uniform3f(L.uEye, cam.x, cam.y, cam.z);
    gl.uniform3f(L.uSky, ...this.sky); gl.uniform1f(L.uFogNear, 35); gl.uniform1f(L.uFogFar, 70);
    gl.uniform1i(L.uTex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(L.aUV); gl.vertexAttribPointer(L.aUV, 2, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(L.aShade); gl.vertexAttribPointer(L.aShade, 1, gl.FLOAT, false, 24, 20);
    gl.drawArrays(gl.TRIANGLES, 0, this.count);
  }

  // Bewegliche Quader (Boss, Begleiter), nach draw() aufrufen.
  // Quader: { c: [x,y,z] Mitte, h: [hx,hy,hz] halbe Grösse, t: Blocktyp, yaw (um die senkrechte Achse),
  //           rx (Kippen um die eigene x-Achse um den Drehpunkt piv, z. B. für Arme), piv: [x,y,z] relativ zur Mitte, shade }
  drawBoxes(boxes) {
    if (!boxes.length) return;
    const out = [];
    for (const bx of boxes) {
      const faces = FACES[bx.t] || FACES[B.STONE];
      const cy = Math.cos(bx.yaw || 0), sy = Math.sin(bx.yaw || 0), rx = bx.rx || 0, cr = Math.cos(rx), sr = Math.sin(rx);
      const piv = bx.piv || [0, 0, 0], [hx, hy, hz] = bx.h, [X, Y, Z] = bx.c;
      const tf = (c) => {
        let x = (c[0] * 2 - 1) * hx, y = (c[1] * 2 - 1) * hy, z = (c[2] * 2 - 1) * hz;
        if (rx) { const yy = y - piv[1], zz = z - piv[2]; y = piv[1] + yy * cr - zz * sr; z = piv[2] + yy * sr + zz * cr; }
        return [X + x * cy - z * sy, Y + y, Z + x * sy + z * cy];
      };
      for (const f of FACE_DEFS) {
        const [u0, v0, u1, v1] = this.uvOf(faces[f.k]);
        const uv = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
        const shade = f.s * (bx.shade ?? 1) * (bx.t === B.LAMP ? 1.25 : 1);
        const P = f.c.map(tf);
        for (const i of [0, 1, 2, 0, 2, 3]) out.push(P[i][0], P[i][1], P[i][2], uv[i][0], uv[i][1], shade);
      }
    }
    const gl = this.gl, L = this.loc;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ebuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(L.aUV, 2, gl.FLOAT, false, 24, 12);
    gl.vertexAttribPointer(L.aShade, 1, gl.FLOAT, false, 24, 20);
    gl.drawArrays(gl.TRIANGLES, 0, out.length / 6);
  }

  // Weltpunkt -> Bildschirmpunkt (CSS-Pixel); null wenn hinter der Kamera
  project(x, y, z) {
    const m = this.mvp; if (!m) return null;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    return { x: (cx / cw * 0.5 + 0.5) * this.canvas.clientWidth, y: (1 - (cy / cw * 0.5 + 0.5)) * this.canvas.clientHeight, d: cw };
  }
}

// ---------- Spielfigur ----------
export class Player {
  constructor(world, x, y, z) {
    this.w = world; this.x = x; this.y = y; this.z = z;
    this.vx = 0; this.vy = 0; this.vz = 0; this.yaw = 0; this.pitch = 0; this.onGround = false;
    this.r = 0.3; this.h = 1.75; this.eye = 1.6;
  }
  collides(x, y, z) {
    const r = this.r;
    for (let bx = Math.floor(x - r); bx <= Math.floor(x + r); bx++)
      for (let by = Math.floor(y); by <= Math.floor(y + this.h - 0.01); by++)
        for (let bz = Math.floor(z - r); bz <= Math.floor(z + r); bz++)
          if (isSolid(this.w.get(bx, by, bz)) || bx < 0 || bz < 0 || bx >= this.w.sx || bz >= this.w.sz) return true;
    return false;
  }
  update(dt, input) {
    const speed = input.run ? 7 : 4.5;
    let mx = 0, mz = 0;
    if (input.fwd) mz += 1; if (input.back) mz -= 1; if (input.left) mx -= 1; if (input.right) mx += 1;
    const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const wx = (sy * mz + cy * mx) * speed, wz = (-cy * mz + sy * mx) * speed;
    this.vx = wx; this.vz = wz;
    this.vy -= 25 * dt; if (this.vy < -30) this.vy = -30;
    if (input.jump && this.onGround) { this.vy = 8.2; this.onGround = false; }
    // Achsenweise bewegen; kleine Stufen (1 Block) automatisch hochsteigen
    const tryMove = (dx, dz) => {
      if (!this.collides(this.x + dx, this.y, this.z + dz)) { this.x += dx; this.z += dz; return; }
      if (this.onGround && !this.collides(this.x + dx, this.y + 1.01, this.z + dz) && !this.collides(this.x, this.y + 1.01, this.z)) {
        this.y += 1.01; this.x += dx; this.z += dz;
      }
    };
    tryMove(this.vx * dt, 0); tryMove(0, this.vz * dt);
    const ny = this.y + this.vy * dt;
    if (this.collides(this.x, ny, this.z)) {
      if (this.vy < 0) { this.y = Math.floor(ny) + 1; this.onGround = true; }
      this.vy = 0;
    } else { this.y = ny; this.onGround = false; }
    if (this.y < -10) { this.y = 30; }
  }
  camera() { return { x: this.x, y: this.y + this.eye, z: this.z, yaw: this.yaw, pitch: this.pitch }; }
}
