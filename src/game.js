// 像素幸存者 Demo —— 纯 Canvas2D，无依赖。
// BUILD forest-lake-1
// 结构：程序化地图 / 图集 / 输入 / 战斗 / 手感 / 界面。
// 移植微信小游戏：canvas 换 wx.createCanvas()，Image 换 wx.createImage()，触摸换 wx.onTouchStart 等，Ads 换 wx 广告 API。
// 地图、英雄、界面像素与音效为本 Demo 原创；怪物与技能特效来自 pixelfx（MIT）。
(() => {
'use strict';
const BUILD = 'forest-lake-1';
const VW = 270, VH = 480;
const GAME_LEN = 300;
const TILE = 16, CHUNK = 10, CS = TILE * CHUNK;
const GRASS = 0, FOREST = 1, PATH = 2, WATER = 3;

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let S = 1, OX = 0, OY = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = innerWidth * DPR; cv.height = innerHeight * DPR;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  S = Math.min(cv.width / VW, cv.height / VH);
  OX = (cv.width - VW * S) / 2; OY = (cv.height - VH * S) / 2;
}
addEventListener('resize', resize); resize();

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// ---------- Assets ----------
const IMG = {}, CENTERS = {}, BOUNDS = {};
const CRITTERS = ['bat', 'slime', 'ghost', 'flying-skull', 'eyeball', 'wisp'];
const MEASURE = new Set([...CRITTERS, 'fireball', 'zap-hit', 'frost-nova', 'holy-pillar', 'shadow-tendrils', 'heart-pickup', 'xp-orb', 'level-up']);
function loadAll(done) {
  const names = Object.keys(SHEETS); let left = names.length;
  if (!left) { done(); return; }
  for (const n of names) {
    const im = new Image();
    im.onload = () => { IMG[n] = im; if (MEASURE.has(n)) measureSheet(n); if (--left === 0) done(); };
    im.onerror = () => { if (--left === 0) done(); };
    im.src = 'assets/' + n + '.png';
  }
}
function measureSheet(n) {
  const m = SHEETS[n], c = document.createElement('canvas'); c.width = m.fw; c.height = m.fh;
  const g = c.getContext('2d', { willReadFrequently: true });
  CENTERS[n] = []; BOUNDS[n] = [];
  const step = m.fw * m.fh > 18000 ? 2 : 1;
  for (const [x, y] of m.xy) {
    g.clearRect(0, 0, m.fw, m.fh);
    g.drawImage(IMG[n], x, y, m.fw, m.fh, 0, 0, m.fw, m.fh);
    const d = g.getImageData(0, 0, m.fw, m.fh).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let j = 0; j < m.fh; j += step) for (let i = 0; i < m.fw; i += step) {
      if (d[(j * m.fw + i) * 4 + 3] > 40) {
        if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
      }
    }
    if (x1 < 0) { CENTERS[n].push([m.fw / 2, m.fh / 2]); BOUNDS[n].push({ x0: 0, y0: 0, x1: m.fw - 1, y1: m.fh - 1 }); }
    else {
      x0 = Math.max(0, x0 - step); y0 = Math.max(0, y0 - step); x1 = Math.min(m.fw - 1, x1 + step); y1 = Math.min(m.fh - 1, y1 + step);
      CENTERS[n].push([(x0 + x1) / 2, (y0 + y1) / 2]); BOUNDS[n].push({ x0, y0, x1, y1 });
    }
  }
}
function frameOf(n, t) { const m = SHEETS[n]; const i = Math.floor(t * 1000 / m.dur); return m.loop ? ((i % m.n) + m.n) % m.n : Math.min(i, m.n - 1); }
const flashC = document.createElement('canvas'); flashC.width = 400; flashC.height = 400;
const flashG = flashC.getContext('2d');
function drawSprite(n, t, x, y, sc = 1, rot = 0, center = false, flip = false, alpha = 1, white = false) {
  const m = SHEETS[n], im = IMG[n]; if (!m || !im) return;
  const f = frameOf(n, t), [sx, sy] = m.xy[f];
  const o = center && CENTERS[n] ? CENTERS[n][f] : m.o;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); ctx.scale(flip ? -sc : sc, sc); ctx.globalAlpha = alpha;
  ctx.drawImage(im, sx, sy, m.fw, m.fh, -o[0], -o[1], m.fw, m.fh);
  if (white && m.fw <= 400 && m.fh <= 400) {
    flashG.setTransform(1, 0, 0, 1, 0, 0);
    flashG.globalCompositeOperation = 'source-over';
    flashG.clearRect(0, 0, m.fw, m.fh);
    flashG.drawImage(im, sx, sy, m.fw, m.fh, 0, 0, m.fw, m.fh);
    flashG.globalCompositeOperation = 'source-in';
    flashG.fillStyle = '#fff';
    flashG.fillRect(0, 0, m.fw, m.fh);
    ctx.drawImage(flashC, 0, 0, m.fw, m.fh, -o[0], -o[1], m.fw, m.fh);
  }
  ctx.restore();
}
const animDone = (n, t) => SHEETS[n] && !SHEETS[n].loop && t * 1000 / SHEETS[n].dur >= SHEETS[n].n;
function drawIcon(n, boxX, boxY, size) {
  const m = SHEETS[n], im = IMG[n]; if (!m || !im) return;
  const t = m.n * 0.42 * m.dur / 1000, f = frameOf(n, t), [sx, sy] = m.xy[f];
  const b = (BOUNDS[n] && BOUNDS[n][f]) || { x0: 0, y0: 0, x1: m.fw - 1, y1: m.fh - 1 };
  const bw = Math.max(1, b.x1 - b.x0 + 1), bh = Math.max(1, b.y1 - b.y0 + 1);
  const sc = (size * 0.88) / Math.max(bw, bh), dw = bw * sc, dh = bh * sc;
  ctx.save(); ctx.beginPath(); ctx.rect(boxX, boxY, size, size); ctx.clip();
  ctx.drawImage(im, sx + b.x0, sy + b.y0, bw, bh, boxX + (size - dw) / 2, boxY + (size - dh) / 2, dw, dh);
  ctx.restore();
}

// ---------- 程序化像素：地图、树、英雄、暗角 ----------
const TREES = [], HERO = [];
let vignette = null, shadowSpr = null;
function bake(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g); return c;
}
function blob(g, cx, cy, r, col) {
  g.fillStyle = col; const r2 = r * r;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r2) g.fillRect(cx + x, cy + y, 1, 1);
}
function tri(g, cx, top, h, col) {
  g.fillStyle = col;
  for (let i = 0; i < h; i++) { const w = Math.max(1, Math.floor((i + 1) * 0.9)); g.fillRect(cx - w, top + i, w * 2, 1); }
}
function paintHero(g, frame) {
  const bob = (frame === 1 || frame === 3) ? -1 : 0;
  g.fillStyle = '#3a2490'; g.fillRect(8, 1 + bob, 2, 2);
  g.fillStyle = '#6a48e8'; g.fillRect(6, 3 + bob, 6, 2);
  g.fillStyle = '#24145c'; g.fillRect(4, 5 + bob, 10, 1);
  g.fillStyle = '#4a30b0'; g.fillRect(5, 6 + bob, 8, 2);
  g.fillStyle = '#ffd2b0'; g.fillRect(6, 7 + bob, 6, 4);
  g.fillStyle = '#1a1020'; g.fillRect(7, 8 + bob, 1, 1); g.fillRect(10, 8 + bob, 1, 1);
  g.fillStyle = '#c47a62'; g.fillRect(8, 10 + bob, 2, 1);
  g.fillStyle = '#3a2788'; g.fillRect(4, 12 + bob, 10, 7);
  g.fillStyle = '#7a58f0'; g.fillRect(5, 12 + bob, 8, 2);
  g.fillStyle = '#ffd84a'; g.fillRect(7, 13 + bob, 4, 2);
  g.fillStyle = '#241456'; g.fillRect(3, 14 + bob, 2, 4); g.fillRect(13, 14 + bob, 2, 4);
  g.fillStyle = '#e45478'; g.fillRect(1, 13 + bob, 2, frame % 2 ? 4 : 3);
  g.fillStyle = '#2a1c12';
  if (frame === 1) { g.fillRect(5, 19, 2, 3); g.fillRect(11, 18, 2, 4); }
  else if (frame === 3) { g.fillRect(4, 18, 2, 4); g.fillRect(10, 19, 2, 3); }
  else { g.fillRect(6, 19, 2, 3); g.fillRect(10, 19, 2, 3); }
  g.fillStyle = '#4a3424';
  if (frame === 1) { g.fillRect(5, 22, 3, 1); g.fillRect(11, 22, 3, 1); }
  else if (frame === 3) { g.fillRect(3, 22, 3, 1); g.fillRect(10, 22, 3, 1); }
  else { g.fillRect(6, 22, 3, 1); g.fillRect(10, 22, 3, 1); }
  g.fillStyle = '#7a4e28'; g.fillRect(16, 8 + bob, 1, 14);
  g.fillStyle = '#9fd8ff'; g.fillRect(15, 5 + bob, 3, 3);
  g.fillStyle = '#fff'; g.fillRect(16, 6 + bob, 1, 1);
}
function bakeArt() {
  for (let f = 0; f < 4; f++) HERO.push(bake(22, 24, g => paintHero(g, f)));
  const kinds = [0, 1, 2];
  for (const kind of kinds) TREES.push(bake(28, 36, g => {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(6, 32, 16, 3); g.fillRect(8, 35, 12, 1);
    if (kind === 0) {
      g.fillStyle = '#6b4224'; g.fillRect(12, 18, 4, 14); g.fillStyle = '#8d5a32'; g.fillRect(12, 18, 1, 14);
      blob(g, 14, 16, 10, '#124e22'); blob(g, 13, 14, 8, '#1f8a34'); blob(g, 10, 12, 4, '#d6f08a');
    } else if (kind === 1) {
      g.fillStyle = '#5a3818'; g.fillRect(13, 22, 3, 10);
      tri(g, 14, 1, 11, '#0e4420'); tri(g, 14, 7, 12, '#176b30'); tri(g, 14, 13, 10, '#9ed85a');
    } else {
      blob(g, 9, 22, 7, '#145028'); blob(g, 18, 22, 6, '#1e7a32'); blob(g, 13, 18, 6, '#46b04a');
      g.fillStyle = '#ff7ab0'; g.fillRect(8, 18, 2, 2); g.fillRect(16, 16, 2, 2);
      g.fillStyle = '#ffe14a'; g.fillRect(12, 20, 2, 2);
    }
  }));
  shadowSpr = bake(16, 6, g => {
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.fillRect(2, 1, 12, 3); g.fillRect(4, 0, 8, 1); g.fillRect(4, 4, 8, 1); g.fillRect(1, 2, 1, 2); g.fillRect(14, 2, 1, 2);
  });
  vignette = bake(VW, VH, g => {
    const grd = g.createRadialGradient(VW / 2, VH * 0.42, VW * 0.25, VW / 2, VH * 0.48, VH * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.48)');
    g.fillStyle = grd; g.fillRect(0, 0, VW, VH);
    const sun = g.createLinearGradient(0, 0, 0, 90);
    sun.addColorStop(0, 'rgba(255,236,190,0.10)'); sun.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = sun; g.fillRect(0, 0, VW, 90);
  });
}
function hash2(ix, iy) {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0), b = hash2(x0 + 1, y0), c = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y) { return vnoise(x, y) * 0.62 + vnoise(x * 2.13 + 4, y * 2.13) * 0.28 + vnoise(x * 4.2 + 9, y * 4.2) * 0.1; }
const PONDS = [
  { x: 6.6, y: 1.2, rx: 5.1, ry: 3.6 },
  { x: -1.2, y: 15.2, rx: 5.4, ry: 3.4 },
  { x: -18, y: 7, rx: 6.6, ry: 4.6 },
  { x: 18, y: -13, rx: 6.2, ry: 4.4 },
  { x: 24, y: 22, rx: 8, ry: 5.4 },
  { x: -14, y: -16, rx: 6, ry: 4.2 },
];
function isWater(tx, ty) {
  if (tx * tx + ty * ty <= 2) return false;
  for (const p of PONDS) { const dx = (tx - p.x) / p.rx, dy = (ty - p.y) / p.ry; if (dx * dx + dy * dy < 1) return true; }
  const d2 = tx * tx + ty * ty;
  if (d2 > 26 * 26 && fbm(tx * 0.055 + 12, ty * 0.055 - 6) > 0.8) return true;
  return false;
}
function isPath(tx, ty) {
  const cx = Math.round(Math.sin(ty * 0.27) * 2);
  if (tx === cx || tx === cx - 1) return true;
  if ((ty === 16 || ty === 17) && tx > -6 && tx < 20) return true;
  if ((ty === -8 || ty === -7) && tx > -16 && tx < 8) return true;
  return false;
}
function inStartForest(tx, ty) {
  if (tx * tx + ty * ty < 16) return false;
  if (tx <= -4 && ty < 10 && ty > -11) return true;
  if (ty <= -5 && tx < 5 && tx > -14) return true;
  return false;
}
function cellType(tx, ty) {
  if (isWater(tx, ty)) return WATER;
  if (isPath(tx, ty)) return PATH;
  if (tx * tx + ty * ty < 14) return GRASS;
  if (inStartForest(tx, ty) || fbm(tx * 0.05 + 2, ty * 0.05) > 0.54) return FOREST;
  return GRASS;
}
const chunkCache = new Map();
function trimChunks(camX, camY) {
  while (chunkCache.size > 36) {
    let worst = null, best = -1;
    for (const [k, c] of chunkCache) {
      const dx = (c.cx + 0.5) * CS - camX, dy = (c.cy + 0.5) * CS - camY, d = dx * dx + dy * dy;
      if (d > best) { best = d; worst = k; }
    }
    if (!worst) break; chunkCache.delete(worst);
  }
}
function paintCell(g, x, y, tp, tx, ty, at, i, j) {
  const h = hash2(tx, ty);
  const wn = at(i, j - 1) === WATER, ws = at(i, j + 1) === WATER, ww = at(i - 1, j) === WATER, we = at(i + 1, j) === WATER;
  const shore = wn || ws || ww || we;
  if (tp === WATER) {
    g.fillStyle = hash2(tx + 3, ty + 7) > 0.55 ? '#1a568f' : '#1e6aab';
    g.fillRect(x, y, 16, 16);
    g.fillStyle = '#174e86'; g.fillRect(x, y + 12, 16, 4);
    g.fillStyle = '#3c96d4';
    const hy = 2 + ((hash2(tx + 1, ty + 4) * 8) | 0);
    g.fillRect(x + ((hash2(tx + 8, ty) * 7) | 0), y + hy, 3 + ((h * 4) | 0), 1);
    g.fillStyle = 'rgba(220,245,255,0.45)';
    g.fillRect(x + ((hash2(tx + 2, ty + 6) * 9) | 0), y + ((hy + 3) % 12), 2, 1);
    const inland = !shore && hash2(tx + 9, ty + 2) > 0.9;
    if (inland) {
      g.fillStyle = '#1c7a34'; g.fillRect(x + 5, y + 8, 6, 3);
      g.fillStyle = '#b6e86a'; g.fillRect(x + 6, y + 8, 3, 1);
      g.fillStyle = '#ff8ab8'; g.fillRect(x + 7, y + 7, 2, 2);
    }
    return;
  }
  if (tp === PATH) {
    g.fillStyle = h > 0.5 ? '#c49a58' : '#a67c42';
    g.fillRect(x, y, 16, 16);
    g.fillStyle = '#6e4c28';
    if (at(i, j - 1) !== PATH) g.fillRect(x, y, 16, 1);
    if (at(i, j + 1) !== PATH) g.fillRect(x, y + 15, 16, 1);
    if (at(i - 1, j) !== PATH) g.fillRect(x, y, 1, 16);
    if (at(i + 1, j) !== PATH) g.fillRect(x + 15, y, 1, 16);
    g.fillStyle = '#e2c48a'; g.fillRect(x + ((h * 11) | 0), y + ((hash2(tx, ty + 3) * 11) | 0), 2, 1);
    if (h > 0.72) { g.fillStyle = '#5c4030'; g.fillRect(x + 8, y + 9, 2, 2); }
    return;
  }
  const forest = tp === FOREST;
  const gn = fbm(tx * 0.22 + 3, ty * 0.22);
  g.fillStyle = forest ? (gn > 0.55 ? '#1d4e2a' : '#234f30') : (gn > 0.58 ? '#3a8f42' : gn > 0.42 ? '#31843c' : '#2c7636');
  g.fillRect(x, y, 16, 16);
  g.fillStyle = forest ? '#14381e' : '#226430';
  const tufts = 2 + ((h * 3) | 0);
  for (let t = 0; t < tufts; t++) g.fillRect(x + ((hash2(tx + t * 3, ty + 9) * 13) | 0), y + ((hash2(tx + 1, ty + t * 5) * 13) | 0), 2, 2);
  g.fillStyle = forest ? '#3e8a40' : '#a6e06a';
  if (h > 0.4) g.fillRect(x + ((hash2(tx + 4, ty) * 12) | 0), y + ((hash2(tx, ty + 4) * 12) | 0), 1, 2);
  const dist2 = tx * tx + ty * ty;
  if (!shore && !forest && h > (dist2 < 40 ? 0.55 : 0.9)) {
    const col = h > 0.86 ? '#ff7ab0' : h > 0.72 ? '#ffe14a' : '#fff6ea';
    const fx = x + 3 + ((hash2(tx, ty + 2) * 8) | 0), fy = y + 3 + ((hash2(tx + 2, ty) * 8) | 0);
    g.fillStyle = '#1f5a28'; g.fillRect(fx + 1, fy + 2, 1, 3);
    g.fillStyle = col; g.fillRect(fx, fy, 3, 2);
    g.fillStyle = '#ffe9a0'; g.fillRect(fx + 1, fy, 1, 1);
  } else if (forest && h > 0.12 && h < 0.18) {
    g.fillStyle = '#f4f4f4'; g.fillRect(x + 8, y + 10, 1, 3);
    g.fillStyle = '#e04048'; g.fillRect(x + 6, y + 8, 5, 3);
    g.fillStyle = '#fff'; g.fillRect(x + 7, y + 8, 1, 1);
  } else if (!shore && h < (forest ? 0.07 : 0.045) && dist2 > 8) {
    g.fillStyle = '#3e4652'; g.fillRect(x + 4, y + 8, 7, 5);
    g.fillStyle = '#8e98a6'; g.fillRect(x + 4, y + 8, 7, 2);
    g.fillStyle = '#e4eaf2'; g.fillRect(x + 5, y + 8, 2, 1);
  }
  if (shore) {
    g.fillStyle = '#efd7a2';
    if (wn) g.fillRect(x, y, 16, 3);
    if (ws) g.fillRect(x, y + 13, 16, 3);
    if (ww) g.fillRect(x, y, 3, 16);
    if (we) g.fillRect(x + 13, y, 3, 16);
    g.fillStyle = '#f7f3e4';
    if (wn) g.fillRect(x, y, 16, 1);
    if (ws) g.fillRect(x, y + 15, 16, 1);
    if (ww) g.fillRect(x, y, 1, 16);
    if (we) g.fillRect(x + 15, y, 1, 16);
    if (h > 0.4) {
      g.fillStyle = '#1d6a34'; g.fillRect(x + 5, y + 2, 1, 5); g.fillRect(x + 8, y + 3, 1, 4);
      g.fillStyle = '#8a6234'; g.fillRect(x + 5, y + 6, 1, 2);
    }
  }
}
function buildChunk(cx, cy) {
  const cvn = document.createElement('canvas'); cvn.width = CS; cvn.height = CS;
  const g = cvn.getContext('2d'); g.imageSmoothingEnabled = false;
  const T = CHUNK + 2, types = new Uint8Array(T * T);
  const at = (i, j) => types[(j + 1) * T + (i + 1)];
  for (let j = -1; j <= CHUNK; j++) for (let i = -1; i <= CHUNK; i++) types[(j + 1) * T + (i + 1)] = cellType(cx * CHUNK + i, cy * CHUNK + j);
  const trees = [], water = [];
  for (let j = 0; j < CHUNK; j++) for (let i = 0; i < CHUNK; i++) {
    const tx = cx * CHUNK + i, ty = cy * CHUNK + j, tp = at(i, j);
    paintCell(g, i * TILE, j * TILE, tp, tx, ty, at, i, j);
    if (tp === WATER) water.push({ x: tx * TILE, y: ty * TILE, tx, ty });
    else if (tp !== PATH && tx * tx + ty * ty > 10 && !(tx >= -1 && tx <= 1 && ty >= -1 && ty <= 1)) {
      const hh = hash2(tx + 11, ty + 19);
      const start = inStartForest(tx, ty);
      const chance = start ? 0.24 : tp === FOREST ? 0.18 : 0.03;
      if (hh < chance) {
        const k = hash2(tx + 4, ty + 8);
        trees.push({ x: tx * TILE + 8, y: ty * TILE + 15, kind: k > 0.66 ? 2 : k > 0.33 ? 1 : 0 });
      }
    }
  }
  return { cv: cvn, trees, water, cx, cy };
}
function getChunk(cx, cy) {
  const k = cx + ',' + cy;
  let c = chunkCache.get(k);
  if (!c) { c = buildChunk(cx, cy); chunkCache.set(k, c); }
  return c;
}
function drawTree(t) { const im = TREES[t.kind]; if (im) ctx.drawImage(im, Math.round(t.x - 14), Math.round(t.y - 35)); }
function drawShadow(x, y, sc) {
  if (!shadowSpr) return;
  const w = 16 * sc, h = 6 * sc;
  ctx.drawImage(shadowSpr, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
}
function drawTerrain(camX, camY, treeOut) {
  const c0 = Math.floor((camX - VW / 2) / CS) - 1, c1 = Math.floor((camX + VW / 2) / CS) + 1;
  const r0 = Math.floor((camY - VH / 2) / CS) - 1, r1 = Math.floor((camY + VH / 2) / CS) + 1;
  const phase = (clock * 9) | 0;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const ch = getChunk(cx, cy);
    ctx.drawImage(ch.cv, cx * CS, cy * CS);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < ch.water.length; i++) {
      const w = ch.water[i];
      if (((w.tx + w.ty * 3 + phase) & 1) !== 0) continue;
      const ox = (w.tx * 5 + phase * 3) & 15;
      ctx.fillRect(w.x + ox, w.y + 4 + ((w.ty * 3 + phase) & 7), 3, 1);
    }
    if (treeOut) {
      const x0 = camX - VW / 2 - 30, x1 = camX + VW / 2 + 30, y0 = camY - VH / 2 - 48, y1 = camY + VH / 2 + 16;
      for (const t of ch.trees) if (t.x > x0 && t.x < x1 && t.y > y0 && t.y < y1) treeOut.push(t);
    } else for (const t of ch.trees) drawTree(t);
  }
  trimChunks(camX, camY);
}
function drawHero(x, y, face, walk, inv) {
  const moving = walk > 0 && (G && state === 'play' ? Math.hypot(input.keys.a || input.keys.d || input.keys.arrowleft || input.keys.arrowright ? 1 : 0, 0) >= 0 : true);
  const frame = (walk > 0 ? (walk | 0) % 4 : 0);
  drawShadow(x, y + 1, 1.25);
  ctx.save();
  if (inv > 0 && ((clock * 16) | 0) % 2 === 0) ctx.globalAlpha = 0.38;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(face >= 0 ? 2 : -2, 2);
  ctx.drawImage(HERO[frame] || HERO[0], -9, -23);
  ctx.restore();
  if (((clock * 10) | 0) % 2 === 0) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + (face >= 0 ? 14 : -16)), Math.round(y - 34), 2, 2);
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(Math.round(x + (face >= 0 ? 13 : -15)), Math.round(y - 36), 2, 2);
  }
}

// ---------- Input ----------
const input = { jx: 0, jy: 0, active: false, bx: 0, by: 0, px: 0, py: 0, keys: {}, taps: [] };
function toView(e) { return [((e.clientX * DPR) - OX) / S, ((e.clientY * DPR) - OY) / S]; }
function pdown(x, y) { input.taps.push([x, y]); input.active = true; input.bx = input.px = x; input.by = input.py = y; }
function pmove(x, y) { if (!input.active) return; input.px = x; input.py = y; }
function pup() { input.active = false; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); Snd.ensure(); pdown(...toView(e)); }, { passive: false });
addEventListener('pointermove', e => pmove(...toView(e)));
addEventListener('pointerup', pup); addEventListener('pointercancel', pup);
addEventListener('keydown', e => {
  const key = e.key.toLowerCase(); input.keys[key] = true; Snd.ensure();
  if (e.repeat) return;
  if (key === 'm') Snd.toggle();
  if (key === 'escape' || key === 'p') { if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
});
addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
function moveVec() {
  let x = 0, y = 0; const k = input.keys;
  if (k.a || k.arrowleft) x--; if (k.d || k.arrowright) x++; if (k.w || k.arrowup) y--; if (k.s || k.arrowdown) y++;
  if (input.active) { const dx = input.px - input.bx, dy = input.py - input.by, L = Math.hypot(dx, dy); if (L > 3) { const m = Math.min(1, L / 32); x = dx / L * m; y = dy / L * m; } }
  const L = Math.hypot(x, y); if (L > 1) { x /= L; y /= L; } return [x, y];
}

// ---------- Audio（WebAudio 合成，无外部文件） ----------
const Snd = {
  ac: null, master: null, noise: null, muted: lsGet('ps_mute', '0') === '1', step: 0, acc: 0,
  ensure() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!this.ac) {
      try {
        this.ac = new AC(); this.master = this.ac.createGain();
        this.master.gain.value = this.muted ? 0 : 0.85; this.master.connect(this.ac.destination);
        const len = this.ac.sampleRate, buf = this.ac.createBuffer(1, len, this.ac.sampleRate), data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.noise = buf;
      } catch (e) { this.ac = null; return; }
    }
    if (this.ac.state === 'suspended') this.ac.resume();
  },
  toggle() {
    this.muted = !this.muted; lsSet('ps_mute', this.muted ? '1' : '0');
    this.ensure(); if (this.master) this.master.gain.value = this.muted ? 0 : 0.85;
  },
  tone(freq, dur, type, vol, delay, slide) {
    if (!this.ac || this.muted || !(freq > 0)) return;
    const t = this.ac.currentTime + (delay || 0);
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(Math.max(0.0001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.03);
  },
  burst(dur, vol) {
    if (!this.ac || this.muted || !this.noise) return;
    const t = this.ac.currentTime, src = this.ac.createBufferSource(); src.buffer = this.noise;
    const f = this.ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 800;
    const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    const off = Math.random() * Math.max(0, this.noise.duration - dur - 0.01);
    src.start(t, off, dur);
  },
  play(name) {
    this.ensure(); if (!this.ac || this.muted) return;
    if (name === 'hit') { this.burst(0.035, 0.07); this.tone(210, 0.05, 'square', 0.035); }
    else if (name === 'crit') { this.burst(0.05, 0.09); this.tone(680, 0.07, 'square', 0.05); this.tone(980, 0.08, 'square', 0.04, 0.04); }
    else if (name === 'kill') { this.burst(0.08, 0.1); this.tone(520, 0.12, 'triangle', 0.06, 0, 160); }
    else if (name === 'hurt') { this.burst(0.1, 0.12); this.tone(98, 0.16, 'sawtooth', 0.055); }
    else if (name === 'xp') this.tone(920, 0.045, 'square', 0.03);
    else if (name === 'heart') { this.tone(523, 0.08, 'triangle', 0.055); this.tone(659, 0.1, 'triangle', 0.05, 0.06); this.tone(784, 0.12, 'triangle', 0.045, 0.12); }
    else if (name === 'coin') { this.tone(988, 0.05, 'square', 0.04); this.tone(1318, 0.07, 'square', 0.03, 0.045); }
    else if (name === 'level') [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.13, 'square', 0.05, i * 0.07));
    else if (name === 'wave') [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.055, i * 0.08));
    else if (name === 'combo') { this.tone(440, 0.06, 'square', 0.045); this.tone(660, 0.08, 'square', 0.04, 0.05); }
    else if (name === 'ui') this.tone(740, 0.035, 'square', 0.035);
    else if (name === 'boss') { this.tone(90, 0.4, 'sawtooth', 0.06); this.tone(140, 0.35, 'square', 0.035, 0.06); }
  },
  music(dt) {
    if (!this.ac || this.muted) return;
    this.acc -= dt; if (this.acc > 0) return; this.acc += 0.36;
    const lead = [262, 0, 330, 294, 0, 392, 330, 0, 262, 294, 330, 0, 220, 262, 0, 196];
    const f = lead[this.step % lead.length]; this.step++;
    if (f) this.tone(f, 0.3, 'triangle', 0.028);
    if (this.step % 4 === 1) this.tone(98, 0.2, 'square', 0.016);
  },
};

// ---------- 技能 / 敌人 / 元进度 ----------
const RAR = {
  common: { name: '普通', col: '#d8d8e4', bg: '#2a2c36', edge: '#aeb4c4' },
  uncommon: { name: '优秀', col: '#9aee78', bg: '#173222', edge: '#3dba6a' },
  rare: { name: '稀有', col: '#9ad4ff', bg: '#16283f', edge: '#4aa6f0' },
  epic: { name: '史诗', col: '#e4b6ff', bg: '#301848', edge: '#b46af0' },
  legend: { name: '传说', col: '#ffd84a', bg: '#3a3014', edge: '#f0a020' },
};
function fireN(l) { return 1 + (l >= 2) + (l >= 4) + (l >= 5); }
function mulD(v) { return Math.round(v * ((G && G.dmgMul) || 1)); }
const SKILLS = {
  fireball: { rarity: 'common', name: '火球术', icon: 'fireball', desc: l => `发射 ${fireN(l)} 枚火球，伤害 ${mulD(12 + l * 6)}` },
  chain: { rarity: 'rare', name: '连锁闪电', icon: 'zap-hit', desc: l => `闪电弹跳 ${3 + l} 次，伤害 ${mulD(10 + l * 5)}` },
  frost: { rarity: 'uncommon', name: '冰霜新星', icon: 'frost-nova', desc: l => `冰爆半径 ${48 + l * 8}，伤害 ${mulD(8 + l * 4)} 并减速` },
  holy: { rarity: 'epic', name: '圣光柱', icon: 'holy-pillar', desc: l => `召唤 ${l} 道圣光，伤害 ${mulD(28 + l * 12)}` },
  shadow: { rarity: 'epic', name: '暗影触手', icon: 'shadow-tendrils', desc: l => `触手每跳伤害 ${mulD(6 + l * 3)}，持续数秒` },
  speed: { rarity: 'uncommon', name: '疾风步', icon: 'wisp', passive: true, desc: l => `移动速度 +12%（合计 +${l * 12}%）` },
  vital: { rarity: 'common', name: '生命之心', icon: 'heart-pickup', passive: true, desc: l => `最大生命 +25 并回满（合计 +${l * 25}）` },
  magnet: { rarity: 'uncommon', name: '磁力', icon: 'xp-orb', passive: true, desc: l => `拾取范围 +30%（合计 +${l * 30}%）` },
  haste: { rarity: 'rare', name: '奥术急速', icon: 'level-up', passive: true, desc: l => `技能冷却 -8%（合计 -${l * 8}%）` },
};
const MAXLV = 5;
const ENEMY = {
  slime: { hp: 16, sp: 20, dmg: 5, sc: 0.48, xp: 2, r: 7, col: '#7dff6a' },
  bat: { hp: 12, sp: 34, dmg: 5, sc: 0.42, xp: 2, r: 7, col: '#d2c0ff' },
  ghost: { hp: 30, sp: 24, dmg: 8, sc: 0.46, xp: 4, r: 8, col: '#d8f0ff' },
  'flying-skull': { hp: 44, sp: 30, dmg: 10, sc: 0.44, xp: 5, r: 8, col: '#ffe0b0' },
  wisp: { hp: 56, sp: 38, dmg: 9, sc: 0.42, xp: 6, r: 8, col: '#ffe14a' },
  eyeball: { hp: 2200, sp: 18, dmg: 16, sc: 1.25, xp: 0, r: 26, col: '#e060ff', boss: true },
};
const META_DEFS = [
  { id: 'hp', name: '强壮体魄', desc: '最大生命 +15', max: 5, cost: lv => 12 + lv * 10 },
  { id: 'dmg', name: '锋利法术', desc: '造成伤害 +8%', max: 5, cost: lv => 16 + lv * 14 },
  { id: 'mag', name: '磁力靴', desc: '拾取范围 +20%', max: 4, cost: lv => 10 + lv * 10 },
  { id: 'haste', name: '奥术残响', desc: '冷却缩短 5%', max: 4, cost: lv => 14 + lv * 12 },
  { id: 'heal', name: '治愈之风', desc: '受击后回复 2 生命', max: 3, cost: lv => 18 + lv * 16 },
  { id: 'greed', name: '寻宝直觉', desc: '金币更容易掉落', max: 4, cost: lv => 12 + lv * 12 },
];
const MARKS = [10, 25, 50, 100, 160, 230, 320, 450];
const MARK_COIN = [4, 6, 10, 16, 20, 24, 30, 40];
function loadMeta() {
  try { return Object.assign({ hp: 0, dmg: 0, mag: 0, haste: 0, heal: 0, greed: 0 }, JSON.parse(lsGet('ps_meta', '{}')) || {}); }
  catch (e) { return { hp: 0, dmg: 0, mag: 0, haste: 0, heal: 0, greed: 0 }; }
}
let meta = loadMeta();
function saveMeta() { lsSet('ps_meta', JSON.stringify(meta)); }
function metaRanks() { return META_DEFS.reduce((s, m) => s + (meta[m.id] || 0), 0); }

// ---------- 状态 ----------
let state = 'loading', G = null, best = +(lsGet('ps_best', '0') || 0), coinsBank = +(lsGet('ps_coins', '0') || 0);
let clock = 0, denyId = '', denyUntil = 0, lastHitSnd = 0, lastKillSnd = 0, lastXpSnd = 0;
function xpToNext(lv) {
  if (lv <= 3) return 4 + lv * 2;
  if (lv <= 7) return 10 + (lv - 3) * 5;
  return 30 + (lv - 7) * 8;
}
function newGame() {
  const maxhp = 100 + (meta.hp || 0) * 15;
  G = {
    t: 0, p: { x: 8, y: 8, hp: maxhp, maxhp, face: 1, inv: 1.15, walk: 0, moving: 0, kbx: 0, kby: 0 },
    lv: 1, xp: 0, need: xpToNext(1), skills: { fireball: 1 }, cd: { fireball: 0.25 }, cdMax: { fireball: 0.58 },
    enemies: [], shots: [], orbs: [], fx: [], nums: [], zones: [], bolts: [], parts: [], corpses: [], banners: [],
    kills: 0, maxCombo: 0, combo: 0, comboT: 0, score: 0, coins: 0, dealt: 0,
    spawnT: 0, spawnPause: 0.7, boss: null, bossSpawned: false, revived: false, choices: null,
    shakeMag: 0, chest: null, hitStop: 0, hurtFlash: 0, goldFlash: 0, killPop: 0, coinPop: 0,
    heartT: 8, wave: 0, nextMark: 0,
    dmgMul: 1 + (meta.dmg || 0) * 0.08,
    magBonus: (meta.mag || 0) * 0.2,
    hasteBonus: (meta.haste || 0) * 0.05,
    healOnHit: (meta.heal || 0) * 2,
    greed: meta.greed || 0,
  };
  state = 'play';
}
const lvOf = k => (G && G.skills[k]) || 0;
function cdMul() { return Math.max(0.45, (1 - lvOf('haste') * 0.08) * (1 - ((G && G.hasteBonus) || 0))); }
function setCd(k, sec) { G.cd[k] = sec; G.cdMax[k] = sec; }
function addFx(n, x, y, o = {}) { if (!G || G.fx.length > 70) return; G.fx.push({ n, x, y, t: 0, sc: o.sc ?? 0.5, rot: o.rot || 0 }); }
function num(x, y, v, crit, col) {
  if (!G) return; if (G.nums.length > 70) G.nums.shift();
  G.nums.push({ x: x + (Math.random() * 8 - 4), y, v: String(v), t: 0, crit: !!crit, col: col || (crit ? '#ffd84a' : '#fff') });
}
function burst(x, y, col, n, speed, g) {
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 170) return;
    const a = Math.random() * 6.283185, s = speed * (0.35 + Math.random());
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2, life: 0.25 + Math.random() * 0.28, col, g: g == null ? 28 : g });
  }
}
function addShake(m) { G.shakeMag = Math.min(6, Math.max(G.shakeMag, m)); }
function bumpStop(t) { if (G.hitStop < t) G.hitStop = t; }
function banner(text, sub, col) {
  G.banners.push({ text, sub: sub || '', col: col || '#fff', t: 0, life: 1.65 });
  if (G.banners.length > 4) G.banners.shift();
}
function hurt(e, d, sx, sy) {
  if (!e || e.dead) return;
  const crit = Math.random() < 0.16; if (crit) d *= 2;
  d = Math.max(1, Math.round(d)); e.hp -= d; e.flash = 0.12; G.dealt += d;
  const ang = Math.atan2(e.y - (sy == null ? G.p.y : sy), e.x - (sx == null ? G.p.x : sx));
  const mag = (crit || e.hp <= 0) ? 120 : 62;
  e.kbx = (e.kbx || 0) + Math.cos(ang) * mag; e.kby = (e.kby || 0) + Math.sin(ang) * mag;
  num(e.x, e.y - 10, d, crit);
  if (crit) { addShake(1.7); bumpStop(0.055); burst(e.x, e.y, '#fff6c8', 6, 46, 0); if (clock - lastHitSnd > 0.045) { lastHitSnd = clock; Snd.play('crit'); } }
  else { addShake(0.45); if (clock - lastHitSnd > 0.05) { lastHitSnd = clock; Snd.play('hit'); } }
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  if (!e || e.dead) return;
  e.dead = true; e.dying = e.boss ? 0.28 : 0.16; G.kills++; G.killPop = 0.18;
  G.score += e.boss ? 5000 : (ENEMY[e.k].xp || 1) * 10;
  if (G.comboT > 0) G.combo++; else G.combo = 1;
  G.comboT = 2.5; if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  bumpStop(e.boss ? 0.1 : 0.045); addShake(e.boss ? 5 : 2.1);
  if (e.boss || clock - lastKillSnd > 0.06) { lastKillSnd = clock; Snd.play('kill'); }
  burst(e.x, e.y, ENEMY[e.k].col, e.boss ? 26 : 12, e.boss ? 100 : 62, 20);
  addFx('poof', e.x, e.y + 4, { sc: e.boss ? 0.7 : 0.28 });
  G.corpses.push(e);
  if (G.combo >= 10 && G.combo % 10 === 0) { G.coins += 2; banner(`连击 x${G.combo}`, '经验提升', '#ffd84a'); Snd.play('combo'); }
  if (e.boss) {
    addFx('big-explosion', e.x, e.y + 16, { sc: 0.55 }); G.coins += 20; G.coinPop = 0.25;
    banner('深渊之眼倒下了', '+20 金币', '#f0b0ff');
    G.chest = { x: e.x, y: e.y, t: 0, open: false }; return;
  }
  const gain = Math.max(1, Math.round(ENEMY[e.k].xp * (1 + Math.min(G.combo, 12) * 0.07)));
  const heart = Math.random() < (G.p.hp < G.p.maxhp * 0.45 ? 0.12 : 0.05);
  G.orbs.push({ x: e.x, y: e.y, v: gain, t: Math.random() * 2, kind: heart ? 'heart' : 'xp', pull: false, pullV: 0, trail: 0 });
  if (G.kills <= 3 || Math.random() < 0.16 * (1 + G.greed * 0.18)) { G.coins++; G.coinPop = 0.2; Snd.play('coin'); }
}
function nearest(x, y, skip) {
  let b = null, bd = 1e9;
  for (const e of G.enemies) {
    if (e.dead || (skip && skip.has(e))) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; }
  }
  return b ? [b, Math.sqrt(bd)] : [null, 1e9];
}
function castSkills(dt) {
  const p = G.p;
  for (const k in G.skills) {
    if (SKILLS[k].passive) continue;
    G.cd[k] = (G.cd[k] ?? 0.2) - dt; if (G.cd[k] > 0) continue;
    const l = G.skills[k]; let ok = true;
    if (k === 'fireball') {
      const [t, dist] = nearest(p.x, p.y);
      if (!t || dist > 240) ok = false; else {
        const n = fireN(l), base = Math.atan2(t.y - p.y, t.x - p.x), dmg = mulD(12 + l * 6);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.22;
          G.shots.push({ x: p.x + Math.cos(a) * 8, y: p.y - 8, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, life: 1.25, dmg, t: 0 });
        }
        setCd(k, 0.58 * cdMul());
      }
    } else if (k === 'chain') {
      let [t, dist] = nearest(p.x, p.y);
      if (!t || dist > 175) ok = false; else {
        const hit = new Set(); let fx = p.x, fy = p.y - 6; const dmg = mulD(10 + l * 5);
        for (let i = 0; i < 3 + l && t; i++) {
          hit.add(t); G.bolts.push({ x1: fx, y1: fy, x2: t.x, y2: t.y, t: 0.16 });
          addFx('zap-hit', t.x, t.y, { sc: 0.28 }); hurt(t, dmg, fx, fy); fx = t.x; fy = t.y;
          const r = nearest(fx, fy, hit); t = r[1] < 104 ? r[0] : null;
        }
        setCd(k, 1.25 * cdMul());
      }
    } else if (k === 'frost') {
      const R = 48 + l * 8;
      addFx('frost-nova', p.x, p.y + 8, { sc: R / 130 });
      G.zones.push({ x: p.x, y: p.y, r: R, dmg: mulD(8 + l * 4), delay: 0.2, once: true, slow: 1.6 });
      setCd(k, 2.5 * cdMul());
    } else if (k === 'holy') {
      const alive = G.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < VW / 2 + 30 && Math.abs(e.y - p.y) < VH / 2 + 30);
      if (!alive.length) ok = false; else {
        for (let i = 0; i < l; i++) {
          const e = alive[(Math.random() * alive.length) | 0];
          addFx('holy-pillar', e.x, e.y + 4, { sc: 0.32 });
          G.zones.push({ x: e.x, y: e.y, r: 26, dmg: mulD(28 + l * 12), delay: 0.32, once: true });
        }
        setCd(k, 2.3 * cdMul());
      }
    } else if (k === 'shadow') {
      const [t, dist] = nearest(p.x, p.y);
      if (!t || dist > 185) ok = false; else {
        addFx('shadow-tendrils', t.x, t.y + 8, { sc: 0.42 });
        G.zones.push({ x: t.x, y: t.y, r: 34, dmg: mulD(6 + l * 3), delay: 0.18, dur: 2.5, tick: 0.25 });
        setCd(k, 3.2 * cdMul());
      }
    }
    if (!ok) G.cd[k] = 0.12;
  }
}
function hpMul(t) { return t < 120 ? 0.62 + 0.38 * (t / 120) : 1 + (t - 120) / 115; }
function spdMul(t) { return t < 120 ? 0.78 + 0.22 * (t / 120) : 1 + (t - 120) / 420; }
function spawnRate(t) {
  if (t < 25) return 0.48;
  if (t < 60) return 0.48 + (t - 25) / 35 * 0.32;
  if (t < 120) return 0.8 + (t - 60) / 60 * 0.35;
  if (t < 180) return 1 + (t - 120) / 60 * 0.55;
  if (t < 240) return 1.55 + (t - 180) / 60 * 0.45;
  return 2 + Math.min(0.7, (t - 240) / 80);
}
function spawnCap(t) { if (t < 40) return 8; if (t < 90) return 14; if (t < 150) return 24; if (t < 240) return 40; return 58; }
function pickEnemy(t) {
  const pool = [{ k: 'slime', w: 7 }];
  if (t > 40) pool.push({ k: 'bat', w: 4 });
  if (t > 85) pool.push({ k: 'ghost', w: t < 120 ? 1 : 3 });
  if (t > 145) pool.push({ k: 'flying-skull', w: 2 });
  if (t > 200) pool.push({ k: 'wisp', w: 2 });
  let sum = 0; for (const p of pool) sum += p.w;
  let r = Math.random() * sum;
  for (const p of pool) { r -= p.w; if (r <= 0) return p.k; }
  return 'slime';
}
function spawn(k) {
  const a = Math.random() * Math.PI * 2, d = ENEMY[k];
  const rx = (d.boss ? 200 : 148) + Math.random() * 40;
  const ry = (d.boss ? 300 : 246) + Math.random() * 28;
  const e = {
    k, x: G.p.x + Math.cos(a) * rx, y: G.p.y + Math.sin(a) * ry,
    hp: d.hp * (d.boss ? 1 : hpMul(G.t)), t: Math.random() * 3, slow: 0, flash: 0, boss: !!d.boss, kbx: 0, kby: 0,
  };
  e.maxhp = e.hp; G.enemies.push(e); return e;
}
function spawner(dt) {
  if (G.spawnPause > 0) { G.spawnPause -= dt; return; }
  if (G.t >= GAME_LEN) {
    if (!G.bossSpawned) { G.bossSpawned = true; G.boss = spawn('eyeball'); addShake(4.5); banner('深渊之眼', '它从湖面升起', '#f0b0ff'); Snd.play('boss'); }
    if (G.boss && !G.boss.dead && G.enemies.length < 28) { G.spawnT -= dt; if (G.spawnT < 0) { G.spawnT = 1.5; spawn('bat'); } }
    return;
  }
  const cap = spawnCap(G.t);
  if (G.enemies.length >= cap) return;
  G.spawnT -= dt * spawnRate(G.t);
  let guard = 0;
  while (G.spawnT < 0 && G.enemies.length < cap && guard++ < 3) { G.spawnT += 1; spawn(pickEnemy(G.t)); }
}
function rollChoices() {
  const opts = Object.keys(SKILLS).filter(k => lvOf(k) < MAXLV);
  const out = []; while (out.length < 3 && opts.length) out.push(opts.splice((Math.random() * opts.length) | 0, 1)[0]);
  return out;
}
function pick(k) {
  G.skills[k] = lvOf(k) + 1;
  if (k === 'vital') { G.p.maxhp += 25; G.p.hp = G.p.maxhp; }
  G.choices = null; G.hitStop = 0; state = 'play';
}
function update(dt) {
  const p = G.p; G.t += dt;
  const w = Math.floor(G.t / 30);
  if (w > G.wave && G.t < GAME_LEN) {
    G.wave = w; const bonus = 4 + w * 2; G.coins += bonus; G.coinPop = 0.25; G.spawnPause = 1.05;
    banner(`第 ${w} 波清除`, `+${bonus} 金币`, '#ffe14a'); Snd.play('wave'); addShake(1.1);
  }
  if (G.nextMark < MARKS.length && G.kills >= MARKS[G.nextMark]) {
    const n = MARKS[G.nextMark], c = MARK_COIN[G.nextMark]; G.nextMark++; G.coins += c; G.coinPop = 0.25;
    banner(`击杀达到 ${n}`, `+${c} 金币`, '#ffd0ea'); Snd.play('coin');
  }
  G.heartT += dt;
  if (G.heartT > 34 && p.hp < p.maxhp * 0.82) {
    G.heartT = 0; const ang = Math.random() * 6.28, dist = 56 + Math.random() * 24;
    G.orbs.push({ x: p.x + Math.cos(ang) * dist, y: p.y + Math.sin(ang) * dist, v: 0, t: 0, kind: 'heart', pull: false, pullV: 0, trail: 0 });
  }
  const [mx, my] = moveVec();
  const moving = Math.hypot(mx, my);
  p.moving = moving;
  if (moving > 0.12) p.walk += dt * 12;
  const sp = 68 * (1 + lvOf('speed') * 0.12);
  p.kbx *= Math.pow(0.05, dt); p.kby *= Math.pow(0.05, dt);
  p.x += mx * sp * dt + p.kbx * dt; p.y += my * sp * dt + p.kby * dt;
  if (mx) p.face = mx > 0 ? 1 : -1;
  p.inv -= dt;
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  spawner(dt); castSkills(dt);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = ENEMY[e.k]; e.t += dt; e.flash -= dt; e.slow = Math.max(0, e.slow - dt);
    const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1;
    const sm = e.boss ? 1 : spdMul(G.t);
    const s = d.sp * (e.slow > 0 ? 0.42 : 1) * sm;
    e.kbx *= Math.pow(0.045, dt); e.kby *= Math.pow(0.045, dt);
    e.x += dx / L * s * dt + e.kbx * dt; e.y += dy / L * s * dt + e.kby * dt;
    if (L > 720 && !e.boss) { e.dead = true; continue; }
    if (L < d.r + 5 && p.inv <= 0) {
      let dmg = d.dmg;
      if (!e.boss && G.t < 120) dmg = Math.max(1, Math.round(d.dmg * (0.65 + 0.35 * G.t / 120)));
      else if (!e.boss) dmg = Math.round(d.dmg * (1 + (G.t - 120) / 520));
      p.hp -= dmg; if (G.healOnHit) p.hp = Math.min(p.maxhp, p.hp + G.healOnHit);
      p.inv = 0.9; p.kbx = -dx / L * 90; p.kby = -dy / L * 90;
      G.hurtFlash = 0.55; addShake(2.6); bumpStop(0.05); Snd.play('hurt');
      addFx('hit-spark', p.x, p.y, { sc: 0.32 }); num(p.x, p.y - 16, '-' + dmg, false, '#ff8b98');
      if (p.hp < 0) p.hp = 0;
    }
  }
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) {
    const a = es[i], b = es[(i * 7 + 3) % es.length];
    if (a === b || a.dead || b.dead || a.boss || b.boss) continue;
    const dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy), m = ENEMY[a.k].r + ENEMY[b.k].r;
    if (L > 0 && L < m) { const k = (m - L) / L * 0.5; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
  }
  for (const s of G.shots) {
    s.t += dt; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const rr = ENEMY[e.k].r + 5;
      if (Math.abs(e.x - s.x) < rr && Math.abs(e.y - s.y) < rr) {
        hurt(e, s.dmg, s.x - s.vx, s.y - s.vy);
        addFx('hit-spark', s.x, s.y, { sc: 0.28, rot: Math.atan2(s.vy, s.vx) });
        s.life = 0; break;
      }
    }
  }
  G.shots = G.shots.filter(s => s.life > 0);
  for (const z of G.zones) {
    z.delay -= dt; if (z.delay > 0) continue;
    if (z.once) {
      for (const e of G.enemies) if (!e.dead && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + ENEMY[e.k].r) ** 2) { hurt(e, z.dmg, z.x, z.y); if (z.slow) e.slow = Math.max(e.slow, z.slow); }
      z.done = true;
    } else {
      z.dur -= dt; z.acc = (z.acc || 0) - dt;
      if (z.acc <= 0) { z.acc = z.tick; for (const e of G.enemies) if (!e.dead && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + ENEMY[e.k].r) ** 2) hurt(e, z.dmg, z.x, z.y); }
      if (z.dur <= 0) z.done = true;
    }
  }
  G.zones = G.zones.filter(z => !z.done);
  G.enemies = G.enemies.filter(e => !e.dead);
  for (let i = G.corpses.length - 1; i >= 0; i--) {
    const c = G.corpses[i]; c.dying -= dt; c.x += c.kbx * dt; c.y += c.kby * dt;
    c.kbx *= Math.pow(0.08, dt); c.kby *= Math.pow(0.08, dt);
    if (c.dying <= 0) G.corpses.splice(i, 1);
  }
  const mag = 78 * (1 + lvOf('magnet') * 0.3 + (G.magBonus || 0));
  for (const o of G.orbs) {
    o.t += dt; const dx = p.x - o.x, dy = p.y - o.y, L = Math.hypot(dx, dy) || 1;
    const near = L < mag;
    const drift = !near && (o.t > 2.2 || (o.t > 0.8 && L < 230));
    if (near || o.pull || drift) {
      if (near) o.pull = true;
      const spd = o.pull || near ? Math.min(360, (o.pullV = Math.min(360, (o.pullV || 80) + 720 * dt))) : (o.t > 2.2 ? 130 : 76);
      o.x += dx / L * spd * dt; o.y += dy / L * spd * dt;
      if (o.pull || near) {
        o.trail -= dt;
        if (o.trail <= 0) { o.trail = 0.03; if (G.parts.length < 170) G.parts.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, life: 0.22, col: o.kind === 'heart' ? '#ff9ab0' : '#c6ff7a', g: 0 }); }
      }
    }
    if (Math.hypot(p.x - o.x, p.y - o.y) < 11) {
      o.got = true;
      if (o.kind === 'heart') {
        const heal = Math.max(16, Math.round(p.maxhp * 0.28));
        p.hp = Math.min(p.maxhp, p.hp + heal); num(p.x, p.y - 12, '+' + heal, false, '#8dff9a'); Snd.play('heart'); burst(o.x, o.y, '#ff8aa8', 6, 30, 0);
      } else {
        G.xp += o.v;
        if (clock - lastXpSnd > 0.05) { lastXpSnd = clock; Snd.play('xp'); }
      }
    }
  }
  G.orbs = G.orbs.filter(o => !o.got); if (G.orbs.length > 240) G.orbs.splice(0, G.orbs.length - 240);
  let ups = 0;
  while (G.xp >= G.need && ups < 3) { G.xp -= G.need; G.lv++; G.need = xpToNext(G.lv); ups++; }
  if (ups) {
    addFx('level-up', p.x, p.y + 6, { sc: 0.5 });
    burst(p.x, p.y - 10, '#ffd84a', 16, 70, -10);
    G.goldFlash = 0.45; addShake(1.4); Snd.play('level'); banner('升级！', `达到 Lv.${G.lv}`, '#ffd84a');
    G.choices = rollChoices(); if (G.choices.length) state = 'levelup';
  }
  if (G.chest) {
    const c = G.chest; c.t += dt;
    if (!c.open && Math.hypot(p.x - c.x, p.y - c.y) < 18) { c.open = true; c.ot = 0; G.coins += 50; G.score += 2000; Snd.play('coin'); }
    if (c.open) { c.ot += dt; if (c.ot > 2.6) endGame(true); }
  }
  if (p.hp <= 0 && state === 'play') { p.hp = 0; endGame(false); }
}
function endGame(win) {
  if (state === 'dead' || state === 'win') return;
  state = win ? 'win' : 'dead'; G.win = win; G.score += Math.floor(G.t) * 5;
  if (G.score > best) { best = G.score; lsSet('ps_best', String(best)); }
}
function revive() {
  const p = G.p; p.hp = p.maxhp; p.inv = 1.6; G.revived = true;
  for (const e of G.enemies) if (!e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 130) kill(e);
  G.enemies = G.enemies.filter(e => !e.dead);
  addFx('holy-pillar', p.x, p.y + 8, { sc: 0.5 }); state = 'play';
}
function bankCoins(mul) { coinsBank += G.coins * mul; lsSet('ps_coins', String(coinsBank)); G.banked = mul; Snd.play('coin'); }
function buyMeta(id) {
  const m = META_DEFS.find(x => x.id === id); if (!m) return;
  const lv = meta[id] || 0; if (lv >= m.max) return;
  const cost = m.cost(lv);
  if (coinsBank < cost) { denyId = id; denyUntil = clock + 0.4; Snd.play('hurt'); return; }
  coinsBank -= cost; meta[id] = lv + 1; saveMeta(); lsSet('ps_coins', String(coinsBank)); Snd.play('coin');
}
function tickVisual(dt) {
  if (!G) return;
  G.goldFlash = Math.max(0, (G.goldFlash || 0) - dt);
  G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - dt);
  G.killPop = Math.max(0, (G.killPop || 0) - dt);
  G.coinPop = Math.max(0, (G.coinPop || 0) - dt);
  G.shakeMag *= Math.pow(0.04, dt); if (G.shakeMag < 0.04) G.shakeMag = 0;
  for (const b of G.banners) b.t += dt;
  if (G.banners.length && G.banners[0].t >= G.banners[0].life) G.banners.shift();
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => !animDone(f.n, f.t));
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i]; q.life -= dt;
    if (q.life <= 0) { G.parts[i] = G.parts[G.parts.length - 1]; G.parts.pop(); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt;
  }
  for (const n of G.nums) n.t += dt;
  G.nums = G.nums.filter(n => n.t < 0.78);
  for (const b of G.bolts) b.t -= dt;
  G.bolts = G.bolts.filter(b => b.t > 0);
}

// ---------- 绘制 ----------
const DIG = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
  '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
  'x': '101010010010101', ':': '000010000010000', ' ': '000000000000000',
};
function pxText(str, x, y, col, scale, align) {
  scale = scale || 2; const gap = scale, cw = 3 * scale + gap, w = str.length * cw - gap;
  let ox = align === 'right' ? x - w : align === 'left' ? x : x - ((w / 2) | 0);
  const draw = (dx, dy, c) => {
    ctx.fillStyle = c; let x0 = ox + dx;
    for (const ch of String(str)) {
      const g = DIG[ch] || DIG[' '];
      for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(x0 + (i % 3) * scale, y + dy + ((i / 3) | 0) * scale, scale, scale);
      x0 += cw;
    }
  };
  draw(scale, scale, '#140c18'); draw(0, 0, col);
}
const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px "PingFang SC","Microsoft YaHei",sans-serif`;
function txt(s, x, y, px, col = '#fff', align = 'center', bold = true) {
  ctx.font = font(px, bold); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (px <= 10) {
    ctx.fillStyle = '#0c1020';
    ctx.fillText(s, x + 1, y); ctx.fillText(s, x - 1, y); ctx.fillText(s, x, y + 1); ctx.fillText(s, x, y - 1);
    ctx.fillStyle = col; ctx.fillText(s, x, y); return;
  }
  ctx.lineWidth = px >= 18 ? 4 : 3; ctx.strokeStyle = '#0c1020'; ctx.strokeText(s, x, y);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function box(x, y, w, h, bg, edge) {
  ctx.fillStyle = '#07080f'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = edge || '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(x, y, w, 1);
}
function btn(id, label, x, y, w, h, col = '#3a6ee8') {
  box(x, y, w, h, col, '#ffe1a0');
  txt(label, x + w / 2, y + h / 2 + 1, h >= 32 ? 14 : 12);
  UI.push({ id, x, y, w, h });
}
function drawHeart(x, y) {
  ctx.fillStyle = '#ff4b5e';
  ctx.fillRect(x + 1, y, 2, 1); ctx.fillRect(x + 4, y, 2, 1);
  ctx.fillRect(x, y + 1, 7, 2); ctx.fillRect(x + 1, y + 3, 5, 1); ctx.fillRect(x + 2, y + 4, 3, 1); ctx.fillRect(x + 3, y + 5, 1, 1);
}
function pips(x, y, n, max, col) {
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = '#8a84a8'; ctx.fillRect(x + i * 8, y, 6, 6);
    ctx.fillStyle = i < n ? col : '#1a1630'; ctx.fillRect(x + i * 8 + 1, y + 1, 4, 4);
  }
}
let UI = [];
function drawWorld() {
  const p = G.p;
  const camX = p.x + (Math.random() - 0.5) * 2 * G.shakeMag;
  const camY = p.y + (Math.random() - 0.5) * 2 * G.shakeMag;
  ctx.save();
  ctx.translate(Math.round(VW / 2 - camX), Math.round(VH / 2 - camY));
  const trees = [];
  drawTerrain(camX, camY, trees);
  const see = (x, y, m = 48) => Math.abs(x - camX) < VW / 2 + m && Math.abs(y - camY) < VH / 2 + m;
  for (const o of G.orbs) if (see(o.x, o.y)) drawSprite(o.kind === 'heart' ? 'heart-pickup' : 'xp-orb', o.t, o.x, o.y + 3, o.kind === 'heart' ? 0.38 : 0.3);
  if (G.chest) {
    const c = G.chest; drawShadow(c.x, c.y + 6, 1.3);
    drawSprite('chest-open', c.open ? c.ot + 0.01 : 0, c.x, c.y + 6, 0.42);
    if (!c.open) txt('拾取宝箱', c.x, c.y - 24, 10, '#ffe680');
  }
  for (const f of G.fx) if (f.n === 'shadow-tendrils' || f.n === 'frost-nova') drawSprite(f.n, f.t, f.x, f.y, f.sc, f.rot);
  const pile = [{ y: p.y, k: 'p' }];
  for (const t of trees) pile.push({ y: t.y, k: 't', o: t });
  for (const e of G.enemies) if (!e.dead && see(e.x, e.y, 70)) pile.push({ y: e.y, k: 'e', o: e });
  for (const c of G.corpses) if (see(c.x, c.y, 70)) pile.push({ y: c.y, k: 'c', o: c });
  pile.sort((a, b) => a.y - b.y);
  for (const it of pile) {
    if (it.k === 't') drawTree(it.o);
    else if (it.k === 'p') drawHero(p.x, p.y, p.face, p.moving > 0.12 ? p.walk : 0, p.inv);
    else drawEnemy(it.o);
  }
  for (const s of G.shots) drawSprite('fireball', s.t, s.x, s.y, 0.34, Math.atan2(s.vy, s.vx));
  for (const b of G.bolts) {
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    for (let i = 1; i < 6; i++) { const k = i / 6; ctx.lineTo(b.x1 + (b.x2 - b.x1) * k + (Math.random() - 0.5) * 8, b.y1 + (b.y2 - b.y1) * k + (Math.random() - 0.5) * 8); }
    ctx.lineTo(b.x2, b.y2); ctx.strokeStyle = 'rgba(120,220,255,0.45)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#f4ffff'; ctx.lineWidth = 1; ctx.stroke();
  }
  for (const f of G.fx) if (f.n !== 'shadow-tendrils' && f.n !== 'frost-nova') drawSprite(f.n, f.t, f.x, f.y, f.sc, f.rot);
  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 3));
    ctx.fillStyle = q.col; const s = q.life > 0.22 ? 2 : 1;
    ctx.fillRect(q.x | 0, q.y | 0, s, s);
  }
  ctx.globalAlpha = 1;
  for (const n of G.nums) {
    const sc = (n.crit ? 3 : 2) + (n.t < 0.08 ? 1 : 0);
    const rise = n.t < 0.12 ? (n.t / 0.12) * 6 : 6 + (n.t - 0.12) * 26;
    ctx.globalAlpha = n.t > 0.48 ? Math.max(0, 1 - (n.t - 0.48) / 0.3) : 1;
    pxText(n.v, n.x, n.y - rise, n.col, sc, 'center');
  }
  ctx.globalAlpha = 1;
  if (G.combo >= 5) pxText('x' + G.combo, p.x, p.y - 48, '#ffd84a', 2, 'center');
  if (G.boss && !G.boss.dead && !see(G.boss.x, G.boss.y, -10)) {
    const a = Math.atan2(G.boss.y - p.y, G.boss.x - p.x);
    txt('▶', p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 90, 12, '#ff5050');
  }
  ctx.restore();
  if (vignette) ctx.drawImage(vignette, 0, 0);
  if (G.hurtFlash > 0) { ctx.fillStyle = `rgba(160,16,28,${Math.min(0.4, G.hurtFlash * 0.7)})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.goldFlash > 0) { ctx.fillStyle = `rgba(255,214,120,${G.goldFlash * 0.4})`; ctx.fillRect(0, 0, VW, VH); }
}
function drawEnemy(e) {
  const d = ENEMY[e.k];
  const white = e.dying > 0 ? ((e.dying * 24) | 0) % 2 === 0 : e.flash > 0;
  const sc = d.sc * (e.dying ? 1.12 : 1) * (e.flash > 0 ? 1.08 : 1);
  drawShadow(e.x, e.y + 2, d.boss ? 2.8 : 1.05);
  drawSprite(e.k, e.t, e.x, e.y, sc, 0, true, e.x > G.p.x, 1, white);
  if (!e.dying && e.hp < e.maxhp && e.hp > 0 && !d.boss) {
    ctx.fillStyle = '#14080c'; ctx.fillRect(e.x - 8, e.y - d.r - 8, 16, 3);
    ctx.fillStyle = '#ff4458'; ctx.fillRect(e.x - 7, e.y - d.r - 7, 14 * Math.max(0, e.hp / e.maxhp), 1);
  }
  if (e.slow > 0 && !e.dying) { ctx.fillStyle = '#bfefff'; ctx.fillRect(e.x - 2, e.y - d.r - 12, 4, 2); }
}
function drawHUD() {
  const p = G.p;
  ctx.fillStyle = 'rgba(6,14,16,0.62)'; ctx.fillRect(0, 0, VW, 36);
  ctx.fillStyle = '#120c1c'; ctx.fillRect(0, 0, VW, 6);
  const xpw = (VW - 2) * Math.min(1, G.xp / Math.max(1, G.need));
  ctx.fillStyle = '#7a4cff'; ctx.fillRect(1, 1, xpw, 4);
  ctx.fillStyle = '#ead8ff'; ctx.fillRect(1, 1, xpw, 1);
  drawHeart(4, 10);
  ctx.fillStyle = '#2a0c12'; ctx.fillRect(14, 10, 108, 8);
  const hpw = 106 * Math.max(0, p.hp) / p.maxhp;
  ctx.fillStyle = p.hp / p.maxhp < 0.3 ? '#ff5a3a' : '#ef3044';
  ctx.fillRect(15, 11, hpw, 6);
  ctx.fillStyle = '#ffd0d4'; ctx.fillRect(15, 11, hpw, 2);
  const left = Math.max(0, GAME_LEN - G.t);
  if (G.t < GAME_LEN) pxText(`${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, 196, 9, '#fff', 2, 'left');
  else txt('BOSS', 214, 16, 12, '#ff6060', 'left');
  txt(`Lv.${G.lv}`, 6, 28, 10, '#fff', 'left');
  txt(`第${(G.t >= GAME_LEN ? G.wave : G.wave + 1)}波`, 52, 28, 10, '#c8ffd8', 'left');
  txt(`击杀 ${G.kills}`, VW - 78, 28, G.killPop > 0 ? 12 : 10, '#fff', 'right');
  ctx.fillStyle = '#e8a020'; ctx.fillRect(VW - 28, 24, 6, 6);
  ctx.fillStyle = '#ffe38a'; ctx.fillRect(VW - 27, 25, 2, 2);
  txt(String(G.coins), VW - 8, 28, 10, '#ffd84a', 'right');
  let extra = 40;
  if (G.combo >= 2) {
    box(VW / 2 - 34, 40, 68, 16, '#3a2810', '#ffd84a');
    pxText('x' + G.combo, VW / 2, 43, '#ffd84a', 2, 'center');
    extra = 60;
  }
  if (G.boss && !G.boss.dead) {
    ctx.fillStyle = '#140818'; ctx.fillRect(36, extra, VW - 72, 8);
    ctx.fillStyle = '#c044e0'; ctx.fillRect(37, extra + 1, (VW - 74) * Math.max(0, G.boss.hp) / G.boss.maxhp, 6);
    txt('深渊之眼', VW / 2, extra + 16, 9, '#f0b0ff');
  }
  ctx.fillStyle = 'rgba(6,14,16,0.55)'; ctx.fillRect(0, VH - 40, VW, 40);
  let i = 0;
  for (const k in G.skills) {
    const x = 6 + i * 32, y = VH - 34;
    box(x, y, 28, 28, '#161028', '#8d7ad0');
    drawIcon(SKILLS[k].icon, x + 2, y + 2, 24);
    if (!SKILLS[k].passive && (G.cd[k] || 0) > 0.05) {
      const max = G.cdMax[k] || 1, h = 24 * Math.min(1, G.cd[k] / max);
      ctx.fillStyle = 'rgba(4,6,12,0.62)'; ctx.fillRect(x + 2, y + 2, 24, h);
    }
    txt(String(G.skills[k]), x + 23, y + 23, 8, '#ffe7a0', 'right');
    i++;
  }
  btn('pause', 'Ⅱ', VW - 52, 40, 22, 20, '#3a3a48');
  btn('mute', Snd.muted ? '静' : '音', VW - 26, 40, 22, 20, Snd.muted ? '#6a3038' : '#245c40');
  if (input.active && state === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(input.bx, input.by, 28, 0, 7); ctx.stroke();
    const dx = input.px - input.bx, dy = input.py - input.by, L = Math.hypot(dx, dy) || 1, m = Math.min(L, 28) / L;
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(input.bx + dx * m, input.by + dy * m, 10, 0, 7); ctx.fill();
  }
}
function drawBanners() {
  const b = G && G.banners[0]; if (!b) return;
  const u = b.t / b.life;
  const a = u < 0.12 ? u / 0.12 : (u > 0.72 ? (1 - u) / 0.28 : 1);
  const sc = 0.86 + Math.min(1, u * 8) * 0.14;
  ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(VW / 2, 96); ctx.scale(sc, sc);
  const w = Math.max(132, b.text.length * 15);
  box(-w / 2, -16, w, b.sub ? 40 : 28, '#161028', b.col);
  txt(b.text, 0, b.sub ? -4 : 0, 14, b.col);
  if (b.sub) txt(b.sub, 0, 14, 10, '#fff', 'center', false);
  ctx.restore();
}
function backdrop(camX, camY) {
  ctx.save(); ctx.translate(Math.round(VW / 2 - camX), Math.round(VH / 2 - camY));
  drawTerrain(camX, camY, null); ctx.restore();
  if (vignette) ctx.drawImage(vignette, 0, 0);
}
function drawTitle() {
  const camX = Math.sin(clock * 0.22) * 96;
  const camY = 16 + Math.sin(clock * 0.16) * 54;
  backdrop(camX, camY);
  ctx.fillStyle = 'rgba(6,10,18,0.42)'; ctx.fillRect(0, 0, VW, VH);
  drawHero(VW / 2, 268, 1, clock * 6, 0);
  for (let i = 0; i < 7; i++) {
    const fx = (Math.sin(clock * 0.65 + i * 1.3) * 0.5 + 0.5) * (VW - 8) + 4;
    const fy = (Math.cos(clock * 0.5 + i * 1.7) * 0.5 + 0.5) * (VH - 20);
    ctx.fillStyle = i % 2 ? '#ffe9a0' : '#c6ff8a'; ctx.fillRect(fx, fy, 2, 2);
  }
  txt('像素幸存者', VW / 2, 78, 26, '#ffd84a');
  txt('森林 · 湖畔', VW / 2, 108, 13, '#efe4ff', 'center', false);
  txt(`最高 ${best}    金币 ${coinsBank}`, VW / 2, 338, 11, '#fff', 'center', false);
  if (metaRanks()) txt(`永久强化 ${metaRanks()} 级`, VW / 2, 356, 10, '#9aee78', 'center', false);
  btn('start', '开始游戏', VW / 2 - 62, 372, 124, 34, '#e0603a');
  btn('upgrades', '永久强化', VW / 2 - 62, 412, 124, 26, '#3a4ec0');
  btn('credits', '关于 / 致谢', VW / 2 - 62, 444, 124, 24, '#3a3a48');
  btn('mute', Snd.muted ? '静音' : '音效', VW - 64, 12, 52, 20, Snd.muted ? '#6a3038' : '#245c40');
}
function drawCredits() {
  backdrop(0, 0); ctx.fillStyle = 'rgba(4,8,16,0.82)'; ctx.fillRect(0, 0, VW, VH);
  const L = [
    ['关于 / 致谢', 15, '#ffd84a'],
    ['像素特效与怪物素材', 11, '#fff'],
    ['pixelfx by Patch & Hugo Duprez', 9, '#d8d0ff'],
    ['github.com/patch-gg/pixelfx', 9, '#d8d0ff'],
    ['MIT License, Copyright (c) Patch', 9, '#d8d0ff'],
    ['部分特效改编自 Sprite Fusion', 10, '#fff'],
    ['pixel art VFX（Hugo Duprez, MIT）', 9, '#d8d0ff'],
    ['地图、英雄与界面像素', 11, '#fff'],
    ['本 Demo 原创程序化绘制', 10, '#c8ffd0'],
    ['音效与音乐：WebAudio 实时合成', 10, '#c8ffd0'],
    ['MIT 许可摘要', 12, '#ffd84a'],
    ['允许免费使用、复制、修改、合并、', 9, '#eee'],
    ['发布、分发、再许可和/或销售，', 9, '#eee'],
    ['须保留版权声明及本许可声明。', 9, '#eee'],
    ['软件按“原样”提供，不作任何担保。', 9, '#eee'],
    ['全文见 LICENSE-pixelfx.txt', 9, '#bbb'],
  ];
  L.forEach((r, i) => txt(r[0], VW / 2, 28 + i * 22, r[1], r[2], 'center', i === 0));
  btn('back', '返回', VW / 2 - 46, 440, 92, 26);
}
function drawShop() {
  backdrop(40, -20); ctx.fillStyle = 'rgba(4,8,16,0.8)'; ctx.fillRect(0, 0, VW, VH);
  txt('永久强化', VW / 2, 22, 18, '#ffd84a');
  txt(`持有金币 ${coinsBank}`, VW / 2, 42, 11, '#ffe7a0');
  META_DEFS.forEach((m, i) => {
    const y = 58 + i * 58, lv = meta[m.id] || 0, maxed = lv >= m.max, cost = m.cost(lv);
    const deny = denyId === m.id && clock < denyUntil;
    box(12, y, VW - 24, 52, '#1a1630', maxed ? '#ffd84a' : '#7a68d8');
    txt(m.name, 22, y + 14, 12, '#fff', 'left');
    pips(22, y + 28, lv, m.max, '#ffd84a');
    txt(m.desc, 22 + m.max * 8 + 8, y + 32, 10, '#d0c6ff', 'left', false);
    box(VW - 78, y + 14, 54, 24, maxed ? '#333844' : deny ? '#7a2430' : '#c48820', '#ffe1a0');
    txt(maxed ? '已满' : cost + '金', VW - 51, y + 26, 10, '#fff');
    if (!maxed) UI.push({ id: 'buy:' + m.id, x: 12, y, w: VW - 24, h: 52 });
  });
  btn('back', '返回', VW / 2 - 50, 442, 100, 26, '#3a3a48');
}
function drawLevelUp() {
  ctx.fillStyle = 'rgba(4,6,14,0.74)'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 10; i++) {
    const a = clock * 1.4 + i, rad = 28 + (i % 4) * 6;
    ctx.fillStyle = i % 2 ? '#ffd84a' : '#fff6d0';
    ctx.fillRect(VW / 2 + Math.cos(a) * rad, 30 + Math.sin(a) * 8, 2, 2);
  }
  txt('升级！', VW / 2, 28, 20, '#ffd84a');
  txt('选择一项强化', VW / 2, 50, 11, '#efe4ff', 'center', false);
  G.choices.forEach((k, i) => {
    const y = 68 + i * 128, s = SKILLS[k], r = RAR[s.rarity], l = lvOf(k) + 1;
    box(16, y, VW - 32, 118, r.bg, r.edge);
    ctx.fillStyle = r.edge; ctx.fillRect(16, y, 4, 118);
    box(26, y + 10, 46, 46, '#0c0a14', r.edge);
    drawIcon(s.icon, 29, y + 13, 40);
    txt(s.name, 80, y + 22, 13, '#fff', 'left');
    txt(r.name, 80, y + 40, 10, r.col, 'left');
    txt(l === 1 ? '新技能' : 'Lv.' + l, VW - 28, y + 22, 11, l === 1 ? '#9aee78' : '#ffd84a', 'right');
    txt(s.passive ? '被动' : '主动', VW - 28, y + 40, 10, '#d2c8ff', 'right', false);
    wrap(s.desc(l), 26, y + 78, VW - 58, 11);
    UI.push({ id: 'pick:' + k, x: 16, y, w: VW - 32, h: 118 });
  });
}
function wrap(s, x, y, w, px) {
  ctx.font = font(px, false); let line = '', yy = y;
  for (const ch of s) {
    if (ctx.measureText(line + ch).width > w) { txt(line, x, yy, px, '#f2f2f6', 'left', false); line = ''; yy += px + 4; }
    line += ch;
  }
  if (line) txt(line, x, yy, px, '#f2f2f6', 'left', false);
}
function drawEnd() {
  const win = G.win;
  ctx.fillStyle = 'rgba(4,6,14,0.94)'; ctx.fillRect(0, 0, VW, VH);
  box(18, 28, VW - 36, 424, '#171426', win ? '#ffd84a' : '#ff6874');
  txt(win ? '你活下来了' : '你倒下了', VW / 2, 52, 20, win ? '#ffd84a' : '#ff7078');
  const rows = [
    ['存活', `${Math.floor(G.t / 60)}分${String(Math.floor(G.t % 60)).padStart(2, '0')}秒`],
    ['等级', 'Lv.' + G.lv],
    ['击杀', String(G.kills)],
    ['最高连击', 'x' + (G.maxCombo || 0)],
    ['波次', '第 ' + (G.wave + 1) + ' 波'],
    ['造成伤害', String(G.dealt)],
    ['得分', `${G.score} / 最高 ${best}`],
  ];
  rows.forEach((r, i) => {
    const y = 78 + i * 20;
    txt(r[0], 36, y, 11, '#c8b8ff', 'left', false);
    txt(r[1], VW - 36, y, 11, '#fff', 'right');
  });
  txt(`本局金币 ${G.coins}`, VW / 2, 230, 14, '#ffd84a');
  let y = 252;
  if (!win && !G.revived) { btn('revive', '看广告复活（模拟）', 36, y, VW - 72, 32, '#2fa84f'); y += 40; }
  if (!G.banked) {
    btn('triple', '看广告 三倍金币', 36, y, VW - 72, 30, '#d08a1a'); y += 36;
    btn('normal', '直接领取', 36, y, VW - 72, 26, '#3a3a48');
  } else {
    txt(`已领取 ${G.coins * G.banked} 金币`, VW / 2, y + 8, 12, '#9aee78');
    y += 28;
    btn('again', '再来一局', 36, y, VW - 72, 32, '#e0603a');
    btn('home', '返回首页', 36, y + 38, VW - 72, 26, '#3a3a48');
  }
  txt('广告为占位 Mock，未接入真实广告', VW / 2, 436, 8, '#9aa', 'center', false);
}
function drawPause() {
  ctx.fillStyle = 'rgba(4,6,14,0.72)'; ctx.fillRect(0, 0, VW, VH);
  box(36, 150, VW - 72, 200, '#171426', '#8d7ad0');
  txt('暂停', VW / 2, 178, 18, '#ffd84a');
  btn('resume', '继续', 56, 206, VW - 112, 32, '#3a6ee8');
  btn('mute', Snd.muted ? '打开音效' : '关闭音效', 56, 246, VW - 112, 28, '#245c40');
  btn('home', '返回首页', 56, 284, VW - 112, 28, '#3a3a48');
}
function drawAd() {
  ctx.fillStyle = 'rgba(0,0,0,0.86)'; ctx.fillRect(0, 0, VW, VH);
  txt('模拟激励视频', VW / 2, VH / 2 - 16, 14, '#ffd84a');
  txt(`${Math.ceil(Ads._active.t)} 秒后发放奖励`, VW / 2, VH / 2 + 12, 12);
}
function handleTap(x, y) {
  if (Ads.busy) return false;
  const b = UI.find(u => x >= u.x && x <= u.x + u.w && y >= u.y && y <= u.y + u.h);
  if (!b) return false;
  const id = b.id;
  if (id !== 'mute') Snd.play('ui');
  if (id === 'start' || id === 'again') newGame();
  else if (id === 'credits') state = 'credits';
  else if (id === 'upgrades') state = 'upgrades';
  else if (id === 'back' || id === 'home') state = 'title';
  else if (id === 'pause') state = 'pause';
  else if (id === 'resume') state = 'play';
  else if (id === 'mute') Snd.toggle();
  else if (id.startsWith('pick:')) pick(id.slice(5));
  else if (id.startsWith('buy:')) buyMeta(id.slice(4));
  else if (id === 'revive') Ads.showRewarded('revive', ok => ok && revive());
  else if (id === 'triple') Ads.showRewarded('triple_reward', ok => ok && bankCoins(3));
  else if (id === 'normal') bankCoins(1);
  return true;
}

let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60, msAcc = 0, msN = 0, frameMs = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  const t0 = performance.now();
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN ? Math.round(fpsN / fpsAcc) : 60; fpsAcc = 0; fpsN = 0; }
  for (const [x, y] of input.taps) { if (handleTap(x, y)) input.active = false; }
  input.taps.length = 0;
  Ads.update(dt);
  if (Snd.ac) Snd.music(dt);
  if (G && state === 'play' && !Ads.busy) {
    if (G.hitStop > 0) { G.hitStop -= dt; G.p.inv -= dt; }
    else update(dt);
  }
  if (G) tickVisual(G.hitStop > 0 ? dt * 0.12 : dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(S, 0, 0, S, OX, OY); ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  UI = [];
  if (state === 'loading') { ctx.fillStyle = '#102018'; ctx.fillRect(0, 0, VW, VH); txt('加载中…', VW / 2, VH / 2, 14); }
  else if (state === 'title') drawTitle();
  else if (state === 'credits') drawCredits();
  else if (state === 'upgrades') drawShop();
  else {
    const modal = state === 'levelup' || state === 'dead' || state === 'win' || state === 'pause';
    drawWorld();
    if (!modal) { drawHUD(); drawBanners(); }
    if (state === 'levelup') { UI = []; drawLevelUp(); }
    else if (state === 'dead' || state === 'win') { UI = []; drawEnd(); }
    else if (state === 'pause') { UI = []; drawPause(); }
  }
  if (Ads.busy) drawAd();
  if (/[?&]debug/.test(location.search)) txt(fps + 'fps ' + frameMs.toFixed(1) + 'ms', 4, VH - 48, 8, '#9f9', 'left', false);
  ctx.restore();
  const work = performance.now() - t0; msAcc += work; msN++;
  if (msN >= 20) { frameMs = msAcc / msN; msAcc = 0; msN = 0; }
  requestAnimationFrame(frame);
}
bakeArt();
loadAll(() => {
  state = 'title';
  const q = location.search;
  if (/autostart/.test(q)) {
    newGame();
    const m = q.match(/[?&]t=(\d+)/);
    if (m) {
      G.t = +m[1]; G.wave = Math.floor(G.t / 30);
      G.lv = Math.min(18, 1 + Math.floor(G.t / 28)); G.need = xpToNext(G.lv);
      G.skills = { fireball: 3, chain: 2, frost: 2, holy: 2, shadow: 1 };
    }
  }
});
window.__BUILD = BUILD;
window.__game = () => ({
  get state() { return state; },
  get fps() { return fps; },
  get frameMs() { return frameMs; },
  G: () => G,
  open(s) { state = s; },
  setKey(k, v) { input.keys[k] = !!v; },
  step(dt) { if (state === 'play' && !Ads.busy) { if (G.hitStop > 0) { G.hitStop -= dt; G.p.inv -= dt; } else update(dt); } if (G) tickVisual(dt); return state; },
  choose(i) { if (state === 'levelup' && G && G.choices && G.choices[i]) pick(G.choices[i]); },
  build: BUILD,
});
requestAnimationFrame(frame);
})();
