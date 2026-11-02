// 像素幸存者 —— 俯视肉鸽。Canvas2D，无依赖。
// BUILD art-pass-2
// 像素网格与 pixelfx 精灵 1:1。整数缩放、整数相机、限色、1px 描边。
// 武器特效来自 pixelfx（MIT）：手枪/霰弹/飞刀/巨剑/回旋刀。英雄为同色板原创像素。
(() => {
'use strict';
const BUILD = 'pixelfx-grid-3';
const VW = 180, VH = 390;
const GAME_LEN = 300;
const TILE = 16, CHUNK = 8, CS = TILE * CHUNK;
const GRASS = 0, FOREST = 1, PATH = 2, SHALLOW = 4, WATER = 3;
// Colors taken from opaque pixelfx pixels (see docs/style-guide.md).
const PAL = {
  ink: '#0c0912', paper: '#f2f2f2', white: '#ffffff',
  grass: '#155a3f', grassD: '#113f26', grassL: '#2ba96c', leaf: '#59ff6a',
  dirt: '#3d531e', dirtD: '#1a130a',
  water: '#2f3b66', waterL: '#4a5d9a', foam: '#f2f2f2',
  coat: '#33406e', coatL: '#acc3f2',
  purple: '#392645', purpleL: '#5b3f66',
  red: '#ae1c2e', redL: '#ff9aa1', redD: '#2e0e15',
  orange: '#f2561d', gold: '#ffb236',
  skin: '#ffdddb', hair: '#2e2426',
};
const screen = document.getElementById('c');
const view = document.createElement('canvas');
view.width = VW; view.height = VH;
const ctx = view.getContext('2d');
ctx.imageSmoothingEnabled = false;
const safeEl = document.getElementById('safe');
let SCALE = 2, SAFE = { t: 0, r: 0, b: 0, l: 0 };
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  screen.width = Math.max(1, Math.round(innerWidth * dpr));
  screen.height = Math.max(1, Math.round(innerHeight * dpr));
  screen.style.width = innerWidth + 'px'; screen.style.height = innerHeight + 'px';
  const fit = Math.min(innerWidth / VW, innerHeight / VH);
  SCALE = Math.max(1, Math.floor(fit));
  if (safeEl) {
    const st = getComputedStyle(safeEl);
    SAFE = {
      t: (parseFloat(st.paddingTop) || 0) / SCALE,
      r: (parseFloat(st.paddingRight) || 0) / SCALE,
      b: (parseFloat(st.paddingBottom) || 0) / SCALE,
      l: (parseFloat(st.paddingLeft) || 0) / SCALE,
    };
  }
}
function present() {
  const sctx = screen.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  sctx.fillStyle = '#000';
  sctx.fillRect(0, 0, screen.width, screen.height);
  const dpr = screen.width / innerWidth;
  const dw = VW * SCALE * dpr, dh = VH * SCALE * dpr;
  const ox = Math.round((screen.width - dw) / 2), oy = Math.round((screen.height - dh) / 2);
  sctx.drawImage(view, 0, 0, VW, VH, ox, oy, dw, dh);
}
addEventListener('resize', resize); resize();
addEventListener('gesturestart', e => e.preventDefault());
addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
let fsDone = false;
function tryFs() {
  if (fsDone) return; fsDone = true;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) Promise.resolve(req.call(el)).catch(() => {});
}

// ---------- sprites ----------
const IMG = {}, CENTERS = {}, BOUNDS = {};
const CRITTERS = ['bat', 'slime', 'ghost', 'flying-skull', 'eyeball', 'wisp'];
const MEASURE = new Set([...CRITTERS, 'fireball', 'zap-hit', 'frost-nova', 'holy-pillar', 'shadow-tendrils', 'heart-pickup', 'xp-orb', 'level-up', 'chest-open', 'hit-spark', 'poof', 'bullet-tracer', 'energy-disc', 'sword-slash', 'dagger-flurry', 'heavy-cleave', 'muzzle-shotgun', 'muzzle-pistol']);
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
  const m = SHEETS[n]; if (!m) return;
  const c = document.createElement('canvas'); c.width = m.fw; c.height = m.fh;
  const g = c.getContext('2d', { willReadFrequently: true });
  CENTERS[n] = []; BOUNDS[n] = [];
  const step = m.fw * m.fh > 24000 ? 2 : 1;
  for (const [x, y] of m.xy) {
    g.clearRect(0, 0, m.fw, m.fh);
    g.drawImage(IMG[n], x, y, m.fw, m.fh, 0, 0, m.fw, m.fh);
    const d = g.getImageData(0, 0, m.fw, m.fh).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let j = 0; j < m.fh; j += step) for (let i = 0; i < m.fw; i += step) {
      if (d[(j * m.fw + i) * 4 + 3] > 28) {
        if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
      }
    }
    if (x1 < 0) { CENTERS[n].push([m.fw / 2, m.fh / 2]); BOUNDS[n].push({ x0: 0, y0: 0, x1: m.fw - 1, y1: m.fh - 1 }); }
    else {
      CENTERS[n].push([(x0 + x1) / 2, (y0 + y1) / 2]);
      BOUNDS[n].push({ x0: Math.max(0, x0 - step), y0: Math.max(0, y0 - step), x1: Math.min(m.fw - 1, x1 + step), y1: Math.min(m.fh - 1, y1 + step) });
    }
  }
}
function frameOf(n, t) {
  const m = SHEETS[n]; if (!m) return 0;
  const i = Math.floor(t * 1000 / m.dur);
  return m.loop ? ((i % m.n) + m.n) % m.n : Math.min(Math.max(0, i), m.n - 1);
}
const flashC = document.createElement('canvas'); flashC.width = 480; flashC.height = 480;
const flashG = flashC.getContext('2d');
function drawSprite(n, t, x, y, sc = 1, rot = 0, center = false, flip = false, alpha = 1, white = false) {
  const m = SHEETS[n], im = IMG[n]; if (!m || !im) return;
  const f = frameOf(n, t), [sx, sy] = m.xy[f];
  const o = center && CENTERS[n] ? CENTERS[n][f] : m.o;
  const scx = flip ? -sc : sc;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (rot) ctx.rotate(rot);
  ctx.scale(scx, sc);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, sx, sy, m.fw, m.fh, -o[0], -o[1], m.fw, m.fh);
  if (white && m.fw <= 480 && m.fh <= 480) {
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
  const t = m.n * 0.4 * m.dur / 1000, f = frameOf(n, t), [sx, sy] = m.xy[f];
  const b = (BOUNDS[n] && BOUNDS[n][f]) || { x0: 0, y0: 0, x1: m.fw - 1, y1: m.fh - 1 };
  const bw = Math.max(1, b.x1 - b.x0 + 1), bh = Math.max(1, b.y1 - b.y0 + 1);
  const sc = (size * 0.9) / Math.max(bw, bh), dw = Math.max(1, Math.round(bw * sc)), dh = Math.max(1, Math.round(bh * sc));
  ctx.save(); ctx.beginPath(); ctx.rect(boxX, boxY, size, size); ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, sx + b.x0, sy + b.y0, bw, bh, Math.round(boxX + (size - dw) / 2), Math.round(boxY + (size - dh) / 2), dw, dh);
  ctx.restore();
}

// ---------- hero: 1px grid + outline, same palette ----------
const HERO = [];
let heroOx = 22, heroOy = 46, shadowSpr = null, vignette = null;
function bakeOutlined(draw, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  draw(g);
  const img = g.getImageData(0, 0, W, H), d = img.data, o = new Uint8ClampedArray(d);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (d[i + 3] > 20) continue;
    let edge = false;
    if (d[i + 4] > 20 || d[i - 4] > 20 || d[i + W * 4 + 3] > 20 || d[i - W * 4 + 3] > 20) edge = true;
    if (edge) { o[i] = 0x0c; o[i + 1] = 0x09; o[i + 2] = 0x12; o[i + 3] = 255; }
  }
  img.data.set(o); g.putImageData(img, 0, 0); return c;
}
const HERO_ROWS = [
  ['...hh....', '..hhhh...', '..hkkh...', '..heeh...', '..hkkh...', '..rrrr...', '.cccccc..', '.ccLLccg.', '.ccccccg.', '..c..c...', '..p..p...', '..b..b...'],
  ['...hh....', '..hhhh...', '..hkkh...', '..heeh...', '..hkkh...', '..rrrr...', '.cccccc..', '.ccLLccg.', '.ccccccg.', '..c..c...', '.p.......', '..b......', '....p....', '.....b...'],
  ['...hh....', '..hhhh...', '..hkkh...', '..heeh...', '..hkkh...', '..rrrr...', '.cccccc..', '.ccLLccg.', '.ccccccg.', '..c..c...', '..p..p...', '..b..b...'],
  ['...hh....', '..hhhh...', '..hkkh...', '..heeh...', '..hkkh...', '..rrrr...', '.cccccc..', '.ccLLccg.', '.ccccccg.', '..c..c...', '......p..', '.......b.', '..p......', '...b.....'],
];
function paintHeroFrame(g, frame) {
  const map = { h: PAL.hair, k: PAL.skin, e: PAL.ink, r: PAL.red, c: PAL.coat, L: PAL.coatL, p: PAL.purple, b: PAL.ink, g: PAL.paper };
  const rows = HERO_ROWS[frame] || HERO_ROWS[0];
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const col = map[row[i]]; if (!col) continue; g.fillStyle = col; g.fillRect(2 + i, 2 + j, 1, 1); } });
}
function bakeArt() {
  for (let f = 0; f < 4; f++) HERO.push(bakeOutlined(g => paintHeroFrame(g, f), 16, 18));
  heroOx = 8; heroOy = 16;
  shadowSpr = document.createElement('canvas'); shadowSpr.width = 8; shadowSpr.height = 3;
  const sg = shadowSpr.getContext('2d'); sg.fillStyle = PAL.ink; sg.fillRect(1, 1, 6, 1); sg.fillRect(2, 0, 4, 1); sg.fillRect(2, 2, 4, 1);
  const blob = (g, cx, cy, r, col) => { g.fillStyle = col; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) g.fillRect(cx + xx, cy + yy, 1, 1); };
  const trees = [0, 1, 2].map(k => bakeOutlined(g => {
    g.fillStyle = PAL.dirtD; g.fillRect(6, 9, 2, 4);
    if (k === 1) { blob(g, 7, 6, 4, PAL.grassD); blob(g, 6, 5, 2, PAL.grassL); }
    else if (k === 2) { blob(g, 4, 8, 3, PAL.grassD); blob(g, 9, 7, 3, PAL.grass); g.fillStyle = PAL.red; g.fillRect(5, 7, 1, 1); }
    else { blob(g, 7, 6, 5, PAL.grassD); blob(g, 6, 5, 3, PAL.grass); g.fillStyle = PAL.grassL; g.fillRect(5, 4, 2, 1); }
  }, 16, 16));
  window.__TREES = trees;
  vignette = null;
}
function drawHero(x, y, frame, face, hurt) {
  const im = HERO[frame] || HERO[0];
  if (shadowSpr) ctx.drawImage(shadowSpr, Math.round(x - 16), Math.round(y - 2));
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(face >= 0 ? 1 : -1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, -heroOx, -heroOy);
  if (hurt) {
    flashG.setTransform(1, 0, 0, 1, 0, 0);
    flashG.globalCompositeOperation = 'source-over';
    flashG.clearRect(0, 0, im.width, im.height);
    flashG.drawImage(im, 0, 0);
    flashG.globalCompositeOperation = 'source-in';
    flashG.fillStyle = '#fff';
    flashG.fillRect(0, 0, im.width, im.height);
    ctx.drawImage(flashC, 0, 0, im.width, im.height, -heroOx, -heroOy, im.width, im.height);
  }
  ctx.restore();
}
function drawTree(t) {
  const im = window.__TREES[t.kind]; if (!im) return;
  ctx.drawImage(im, Math.round(t.x - 8), Math.round(t.y - 14));
}
function clipWade(x, y, depth, fn) {
  if (!depth) { fn(); return; }
  const cut = depth === 2 ? 5 : 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(x) - 36, Math.round(y) - 40, 72, 40 - cut);
  ctx.clip();
  fn();
  ctx.restore();
  ctx.fillStyle = PAL.foam;
  ctx.fillRect(Math.round(x) - 6, Math.round(y) - cut, 12, 1);
}

// ---------- map ----------
function hash2(ix, iy) {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
const PONDS = [
  { x: 11, y: 8, rx: 4.2, ry: 2.8 },
  { x: 4, y: 18, rx: 5, ry: 3 },
  { x: -8, y: 6, rx: 4, ry: 3 },
  { x: 16, y: -4, rx: 4.5, ry: 3 },
];
function pondT(tx, ty) {
  const dx0 = tx - 5, dy0 = ty - 9;
  if (dx0 * dx0 + dy0 * dy0 < 5) return 9;
  let best = 9;
  for (const p of PONDS) { const dx = (tx - p.x) / p.rx, dy = (ty - p.y) / p.ry; best = Math.min(best, Math.hypot(dx, dy)); }
  return best;
}
function isWater(tx, ty) { return pondT(tx, ty) < 0.78; }
function isShallow(tx, ty) { const t = pondT(tx, ty); return t >= 0.78 && t < 1.02; }
function terrainAt(x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (isWater(tx, ty)) return WATER;
  if (isShallow(tx, ty)) return SHALLOW;
  if (isPath(tx, ty)) return PATH;
  if (inForest(tx, ty)) return FOREST;
  return GRASS;
}
function wetKind(x, y) { const t = terrainAt(x, y); return t === WATER ? 2 : t === SHALLOW ? 1 : 0; }
function playerWaterMul(x, y) { const w = wetKind(x, y); return w === 2 ? 0.45 : w === 1 ? 0.75 : 1; }
function enemyWaterMul(x, y) { const w = wetKind(x, y); return w === 2 ? 0.5 : w === 1 ? 0.75 : 1; }
function isPath(tx, ty) {
  const cx = 5 + Math.round(Math.sin(ty * 0.35) * 1);
  if (tx === cx || tx === cx + 1) return true;
  if ((ty === 16 || ty === 17) && tx > 0 && tx < 16) return true;
  return false;
}
function inForest(tx, ty) {
  const dx = tx - 5, dy = ty - 9;
  if (dx * dx + dy * dy < 10) return false;
  if (tx <= 1 && ty < 16 && ty > 2) return true;
  if (ty <= 4 && tx < 10) return true;
  return false;
}
function cellType(tx, ty) {
  if (isWater(tx, ty)) return WATER;
  if (isShallow(tx, ty)) return SHALLOW;
  if (isPath(tx, ty)) return PATH;
  if (inForest(tx, ty)) return FOREST;
  return GRASS;
}
const chunkCache = new Map();
function trimChunks(camX, camY) {
  while (chunkCache.size > 28) {
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
  const T = 16;
  if (tp === WATER) { g.fillStyle = PAL.water; g.fillRect(x, y, T, T); return; }
  if (tp === SHALLOW) {
    g.fillStyle = PAL.waterL; g.fillRect(x, y, T, T);
    g.fillStyle = PAL.foam;
    if (at(i, j - 1) === WATER) g.fillRect(x, y, T, 1);
    if (at(i, j + 1) === WATER) g.fillRect(x, y + T - 1, T, 1);
    if (at(i - 1, j) === WATER) g.fillRect(x, y, 1, T);
    if (at(i + 1, j) === WATER) g.fillRect(x + T - 1, y, 1, T);
    g.fillStyle = PAL.ink;
    if (at(i, j - 1) !== WATER && at(i, j - 1) !== SHALLOW) g.fillRect(x, y, T, 1);
    return;
  }
  if (tp === PATH) {
    g.fillStyle = PAL.dirt; g.fillRect(x, y, T, T);
    g.fillStyle = PAL.dirtD;
    if (at(i, j - 1) !== PATH) g.fillRect(x, y, T, 1);
    if (at(i, j + 1) !== PATH) g.fillRect(x, y + T - 1, T, 1);
    if (at(i - 1, j) !== PATH) g.fillRect(x, y, 1, T);
    if (at(i + 1, j) !== PATH) g.fillRect(x + T - 1, y, 1, T);
    return;
  }
  g.fillStyle = tp === FOREST ? PAL.grassD : PAL.grass;
  g.fillRect(x, y, T, T);
  if (h > 0.72) { g.fillStyle = PAL.grassL; g.fillRect(x + 3 + ((h * 8) | 0), y + 4 + ((hash2(tx, ty + 2) * 7) | 0), 1, 2); }
  if (tp === GRASS && h > 0.93) { g.fillStyle = PAL.red; g.fillRect(x + 6, y + 6, 2, 2); g.fillStyle = PAL.gold; g.fillRect(x + 6, y + 6, 1, 1); }
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
    if (tp === WATER || tp === SHALLOW) water.push({ x: tx * TILE, y: ty * TILE, tx, ty, deep: tp === WATER });
    else if (tp === FOREST) {
      const hh = hash2(tx + 11, ty + 19);
      if (hh < 0.16) trees.push({ x: tx * TILE + 16, y: ty * TILE + 30, kind: hh > 0.1 ? 2 : hh > 0.05 ? 1 : 0 });
    }
  }
  return { cv: cvn, trees, water, cx, cy };
}
function getChunk(cx, cy) {
  const k = cx + ',' + cy; let c = chunkCache.get(k);
  if (!c) { c = buildChunk(cx, cy); chunkCache.set(k, c); }
  return c;
}
function drawTerrain(camX, camY, treeOut) {
  const c0 = Math.floor((camX - VW / 2) / CS) - 1, c1 = Math.floor((camX + VW / 2) / CS) + 1;
  const r0 = Math.floor((camY - VH / 2) / CS) - 1, r1 = Math.floor((camY + VH / 2) / CS) + 1;
  const phase = (clock * 6) | 0;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const ch = getChunk(cx, cy);
    ctx.drawImage(ch.cv, cx * CS, cy * CS);
    ctx.fillStyle = PAL.coatL;
    for (let i = 0; i < ch.water.length; i++) {
      const w = ch.water[i];
      if (!w.deep || ((w.tx + w.ty + phase) & 3) !== 0) continue;
      ctx.fillRect(w.x + 2 + ((w.tx * 3 + phase * 2) & 7), w.y + 2 + ((w.ty * 5 + phase) & 7), 1, 1);
    }
    if (treeOut) {
      const x0 = camX - VW / 2 - 40, x1 = camX + VW / 2 + 40, y0 = camY - VH / 2 - 60, y1 = camY + VH / 2 + 20;
      for (const t of ch.trees) if (t.x > x0 && t.x < x1 && t.y > y0 && t.y < y1) treeOut.push(t);
    } else for (const t of ch.trees) drawTree(t);
  }
  trimChunks(camX, camY);
}

// ---------- input ----------
const input = { active: false, bx: 0, by: 0, px: 0, py: 0, keys: {}, taps: [] };
function toView(e) {
  const dpr = screen.width / innerWidth;
  const dw = VW * SCALE * dpr, dh = VH * SCALE * dpr;
  const ox = (screen.width - dw) / 2, oy = (screen.height - dh) / 2;
  return [(e.clientX * dpr - ox) / (SCALE * dpr), (e.clientY * dpr - oy) / (SCALE * dpr)];
}
function pdown(x, y, touch) {
  input.taps.push([x, y]);
  if (touch) { input.active = true; input.bx = input.px = x; input.by = input.py = y; }
}
function pmove(x, y) { if (!input.active) return; input.px = x; input.py = y; }
function pup() { input.active = false; }
screen.addEventListener('pointerdown', e => {
  tryFs(); Snd.ensure();
  if (e.pointerType === 'touch') e.preventDefault();
  pdown(...toView(e), e.pointerType === 'touch');
}, { passive: false });
addEventListener('pointermove', e => { if (input.active) pmove(...toView(e)); });
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
  if (input.active) {
    const dx = input.px - input.bx, dy = input.py - input.by, L = Math.hypot(dx, dy);
    if (L > 8) { const m = Math.min(1, L / 56); x = dx / L * m; y = dy / L * m; }
  }
  const L = Math.hypot(x, y); if (L > 1) { x /= L; y /= L; } return [x, y];
}

// ---------- audio ----------
const Snd = {
  ac: null, master: null, noise: null, muted: lsGet('ps_mute', '0') === '1', step: 0, acc: 0,
  ensure() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!this.ac) {
      try {
        this.ac = new AC(); this.master = this.ac.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(this.ac.destination);
        const len = this.ac.sampleRate, buf = this.ac.createBuffer(1, len, this.ac.sampleRate), data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; this.noise = buf;
      } catch (e) { this.ac = null; return; }
    }
    if (this.ac.state === 'suspended') this.ac.resume();
  },
  toggle() { this.muted = !this.muted; lsSet('ps_mute', this.muted ? '1' : '0'); this.ensure(); if (this.master) this.master.gain.value = this.muted ? 0 : 0.8; },
  tone(freq, dur, type, vol, delay, slide) {
    if (!this.ac || this.muted || !(freq > 0)) return;
    const t = this.ac.currentTime + (delay || 0), o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(Math.max(0.0001, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.03);
  },
  burst(dur, vol) {
    if (!this.ac || this.muted || !this.noise) return;
    const t = this.ac.currentTime, src = this.ac.createBufferSource(); src.buffer = this.noise;
    const f = this.ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * Math.max(0, this.noise.duration - dur - 0.01), dur);
  },
  play(name) {
    this.ensure(); if (!this.ac || this.muted) return;
    if (name === 'hit') { this.burst(0.03, 0.06); this.tone(240, 0.04, 'square', 0.03); }
    else if (name === 'crit') { this.tone(720, 0.06, 'square', 0.05); this.tone(1040, 0.07, 'square', 0.04, 0.04); }
    else if (name === 'kill') { this.burst(0.07, 0.08); this.tone(520, 0.1, 'triangle', 0.05, 0, 180); }
    else if (name === 'hurt') { this.tone(110, 0.14, 'sawtooth', 0.05); }
    else if (name === 'xp') this.tone(880, 0.04, 'square', 0.025);
    else if (name === 'heart') { this.tone(523, 0.08, 'triangle', 0.05); this.tone(784, 0.1, 'triangle', 0.04, 0.08); }
    else if (name === 'coin') { this.tone(988, 0.05, 'square', 0.035); this.tone(1318, 0.06, 'square', 0.03, 0.04); }
    else if (name === 'level') [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.045, i * 0.07));
    else if (name === 'wave') [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, i * 0.08));
    else if (name === 'ui') this.tone(740, 0.03, 'square', 0.03);
    else if (name === 'boss') { this.tone(90, 0.35, 'sawtooth', 0.05); this.tone(140, 0.3, 'square', 0.03, 0.05); }
    else if (name === 'wade') { this.burst(0.04, 0.05); this.tone(180, 0.05, 'triangle', 0.02); }
    else if (name === 'fizz') { this.burst(0.06, 0.07); this.tone(420, 0.08, 'square', 0.03, 0, 120); }
    else if (name === 'shot') { this.burst(0.05, 0.09); this.tone(180, 0.06, 'square', 0.04); }
  },
  music(dt) {
    if (!this.ac || this.muted) return;
    this.acc -= dt; if (this.acc > 0) return; this.acc += 0.38;
    const lead = [262, 0, 330, 294, 0, 392, 330, 0, 262, 294, 330, 0, 220, 262, 0, 196];
    const f = lead[this.step % lead.length]; this.step++;
    if (f) this.tone(f, 0.28, 'triangle', 0.022);
    if (this.step % 4 === 1) this.tone(98, 0.18, 'square', 0.014);
  },
};

// ---------- weapons ----------
const RAR = {
  common: { name: '普通', col: '#d8d8e4', bg: '#242430', edge: '#9aa0ae' },
  uncommon: { name: '优秀', col: '#8ed070', bg: '#1a2c20', edge: '#3e8a48' },
  rare: { name: '稀有', col: '#8ec4f0', bg: '#16283c', edge: '#3a86c0' },
  epic: { name: '史诗', col: '#e0b0f0', bg: '#2c1838', edge: '#a060c0' },
  legend: { name: '传说', col: '#f0c040', bg: '#342810', edge: '#c89830' },
};
function mulD(v) { return Math.max(1, Math.round(v * ((G && G.dmgMul) || 1) * (1 + lvOf('crit') * 0.04))); }
const SKILLS = {
  pistol: { rarity: 'common', name: '手枪', icon: 'bullet-tracer', kind: 'gun', desc: l => `点射，伤害 ${mulD(10 + l * 4)}，等级越高弹数越多` },
  shot: { rarity: 'uncommon', name: '霰弹', icon: 'muzzle-shotgun', kind: 'gun', desc: l => `扇形霰弹，伤害 ${mulD(6 + l * 3)}` },
  smg: { rarity: 'rare', name: '冲锋枪', icon: 'bullet-tracer', kind: 'gun', desc: l => `高速连射，伤害 ${mulD(5 + l * 2)}` },
  knife: { rarity: 'uncommon', name: '飞刀', icon: 'dagger-flurry', kind: 'blade', desc: l => `身前刀扇，伤害 ${mulD(8 + l * 4)}` },
  disc: { rarity: 'rare', name: '回旋刀', icon: 'energy-disc', kind: 'blade', desc: l => `飞出后折返，伤害 ${mulD(9 + l * 4)}` },
  sword: { rarity: 'epic', name: '巨剑', icon: 'heavy-cleave', kind: 'blade', desc: l => `挥砍前方，伤害 ${mulD(16 + l * 6)}` },
  orbit: { rarity: 'epic', name: '环绕剑', icon: 'sword-slash', kind: 'blade', desc: l => `环绕 ${1 + l} 柄飞剑，持续切伤` },
  fireball: { rarity: 'common', name: '火球', icon: 'fireball', kind: 'magic', desc: l => `火球 ${1 + (l >= 3) + (l >= 5)} 枚，伤害 ${mulD(12 + l * 5)}` },
  chain: { rarity: 'rare', name: '雷电', icon: 'zap-hit', kind: 'magic', desc: l => `闪电弹跳 ${2 + l} 次，伤害 ${mulD(9 + l * 4)}` },
  speed: { rarity: 'uncommon', name: '疾风步', icon: 'wisp', passive: true, desc: l => `移速 +12%（合计 +${l * 12}%）` },
  vital: { rarity: 'common', name: '生命之心', icon: 'heart-pickup', passive: true, desc: l => `最大生命 +25 并回满` },
  magnet: { rarity: 'uncommon', name: '磁力', icon: 'xp-orb', passive: true, desc: l => `拾取范围 +30%` },
  haste: { rarity: 'rare', name: '奥术急速', icon: 'level-up', passive: true, desc: l => `冷却 -8%` },
  crit: { rarity: 'epic', name: '暴击', icon: 'crit-number', passive: true, desc: l => `暴击率 +4%（合计 +${l * 4}%），并提高伤害` },
};
const EVO = {
  pistolX: { rarity: 'legend', name: '连射手枪', icon: 'muzzle-pistol', kind: 'gun', evo: true, desc: () => '双发点射，冷却更短' },
  shotX: { rarity: 'legend', name: '龙息霰弹', icon: 'muzzle-shotgun', kind: 'gun', evo: true, desc: () => '更宽更烫的一轮霰弹' },
  smgX: { rarity: 'legend', name: '追踪弹幕', icon: 'bullet-tracer', kind: 'gun', evo: true, desc: () => '子弹轻微追踪' },
  knifeX: { rarity: 'legend', name: '刀扇', icon: 'dagger-flurry', kind: 'blade', evo: true, desc: () => '更宽的飞刀扇' },
  discX: { rarity: 'legend', name: '双回旋', icon: 'energy-disc', kind: 'blade', evo: true, desc: () => '两枚回旋刀' },
  swordX: { rarity: 'legend', name: '处刑巨剑', icon: 'heavy-cleave', kind: 'blade', evo: true, desc: () => '重劈，范围与伤害大增' },
  orbitX: { rarity: 'legend', name: '剑刃风暴', icon: 'sword-slash', kind: 'blade', evo: true, desc: () => '更多飞剑，转得更快' },
  fireX: { rarity: 'legend', name: '陨火', icon: 'fireball', kind: 'magic', evo: true, desc: () => '火球命中炸开' },
  chainX: { rarity: 'legend', name: '球状闪电', icon: 'chain-lightning', kind: 'magic', evo: true, desc: () => '弹跳更多，并留下电弧' },
};
Object.assign(SKILLS, EVO);
const EVOLVES = [
  { base: 'pistol', pass: 'haste', pl: 2, id: 'pistolX' },
  { base: 'shot', pass: 'vital', pl: 2, id: 'shotX' },
  { base: 'smg', pass: 'magnet', pl: 2, id: 'smgX' },
  { base: 'knife', pass: 'haste', pl: 2, id: 'knifeX' },
  { base: 'disc', pass: 'magnet', pl: 2, id: 'discX' },
  { base: 'sword', pass: 'crit', pl: 2, id: 'swordX' },
  { base: 'orbit', pass: 'speed', pl: 2, id: 'orbitX' },
  { base: 'fireball', pass: 'haste', pl: 2, id: 'fireX' },
  { base: 'chain', pass: 'magnet', pl: 2, id: 'chainX' },
];
const MAXLV = 5;
const ENEMY = {
  slime: { hp: 18, sp: 16, dmg: 6, sc: 1, xp: 2, r: 16, col: '#59ff6a' },
  bat: { hp: 14, sp: 26, dmg: 6, sc: 1, xp: 2, r: 14, col: '#8a608a' },
  ghost: { hp: 36, sp: 18, dmg: 9, sc: 1, xp: 4, r: 16, col: '#acc3f2' },
  'flying-skull': { hp: 52, sp: 22, dmg: 11, sc: 1, xp: 5, r: 16, col: '#ffb236' },
  wisp: { hp: 64, sp: 28, dmg: 10, sc: 1, xp: 6, r: 14, col: '#ffff8b' },
  eyeball: { hp: 2600, sp: 12, dmg: 18, sc: 1, xp: 0, r: 22, col: '#f2f2f2', boss: true },
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

let state = 'loading', G = null, best = +(lsGet('ps_best', '0') || 0), coinsBank = +(lsGet('ps_coins', '0') || 0);
let clock = 0, denyId = '', denyUntil = 0, lastHitSnd = 0, lastKillSnd = 0, lastXpSnd = 0;
function xpToNext(lv) { if (lv <= 3) return 4 + lv * 2; if (lv <= 7) return 10 + (lv - 3) * 5; return 30 + (lv - 7) * 8; }
function newGame() {
  const maxhp = 100 + (meta.hp || 0) * 15;
  G = {
    t: 0, p: { x: 80, y: 148, hp: maxhp, maxhp, face: 1, aim: 0, inv: 1.2, walk: 0, moving: 0, kbx: 0, kby: 0, hurt: 0, wet: 0, wade: 0 },
    lv: 1, xp: 0, need: xpToNext(1), skills: { pistol: 1 }, cd: { pistol: 0.2 }, cdMax: { pistol: 0.42 },
    enemies: [], shots: [], orbs: [], fx: [], nums: [], zones: [], bolts: [], parts: [], corpses: [], banners: [], blades: [],
    kills: 0, maxCombo: 0, combo: 0, comboT: 0, score: 0, coins: 0, dealt: 0,
    spawnT: 0, spawnPause: 0.6, boss: null, bossSpawned: false, revived: false, choices: null, evolved: {},
    shakeMag: 0, chest: null, hitStop: 0, hurtFlash: 0, goldFlash: 0, killPop: 0, coinPop: 0,
    heartT: 8, wave: 0, nextMark: 0, lvChest: 0, orbitA: 0,
    dmgMul: 1 + (meta.dmg || 0) * 0.08, magBonus: (meta.mag || 0) * 0.2,
    hasteBonus: (meta.haste || 0) * 0.05, healOnHit: (meta.heal || 0) * 2, greed: meta.greed || 0,
  };
  state = 'play';
}
const lvOf = k => (G && G.skills[k]) || 0;
function cdMul() { return Math.max(0.4, (1 - lvOf('haste') * 0.08) * (1 - ((G && G.hasteBonus) || 0))); }
function setCd(k, sec) { G.cd[k] = sec; G.cdMax[k] = Math.max(G.cdMax[k] || 0, sec); }
function addFx(n, x, y, o = {}) { if (!G || G.fx.length > 80 || !SHEETS[n]) return; G.fx.push({ n, x, y, t: 0, sc: o.sc ?? 1, rot: o.rot || 0 }); }
function num(x, y, v, crit, col) {
  if (!G || G.nums.length > 80) return;
  G.nums.push({ x: Math.round(x + (Math.random() * 10 - 5)), y, v: String(v), t: 0, crit: !!crit, col: col || (crit ? PAL.gold : PAL.paper) });
}
function burst(x, y, col, n, speed) {
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 160) return;
    const a = Math.random() * 6.2832, s = speed * (0.4 + Math.random());
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.28 + Math.random() * 0.25, col, g: 40 });
  }
}
function addShake(m) { G.shakeMag = Math.min(2.2, Math.max(G.shakeMag, m)); }
function bumpStop(t) { if (G.hitStop < t) G.hitStop = t; }
function banner(text, sub, col) {
  G.banners.push({ text, sub: sub || '', col: col || PAL.paper, t: 0, life: 1.5 });
  if (G.banners.length > 3) G.banners.shift();
}
function critChance() { return 0.1 + lvOf('crit') * 0.04; }
function hurt(e, d, sx, sy) {
  if (!e || e.dead) return;
  const crit = Math.random() < critChance(); if (crit) d *= 2;
  d = Math.max(1, Math.round(d)); e.hp -= d; e.flash = 0.1; G.dealt += d;
  const ang = Math.atan2(e.y - (sy == null ? G.p.y : sy), e.x - (sx == null ? G.p.x : sx));
  const mag = (crit || e.hp <= 0) ? 160 : 80;
  e.kbx = (e.kbx || 0) + Math.cos(ang) * mag; e.kby = (e.kby || 0) + Math.sin(ang) * mag;
  num(e.x, e.y - 28, d, crit);
  if (crit) { addShake(1.2); bumpStop(0.05); burst(e.x, e.y, PAL.gold, 8, 70); if (clock - lastHitSnd > 0.04) { lastHitSnd = clock; Snd.play('crit'); } }
  else { addShake(0.35); if (clock - lastHitSnd > 0.05) { lastHitSnd = clock; Snd.play('hit'); } }
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  if (!e || e.dead) return;
  e.dead = true; e.dying = e.boss ? 0.28 : 0.14; G.kills++; G.killPop = 0.16;
  G.score += e.boss ? 5000 : (ENEMY[e.k].xp || 1) * 10;
  if (G.comboT > 0) G.combo++; else G.combo = 1;
  G.comboT = 2.4; if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  bumpStop(e.boss ? 0.09 : 0.04); addShake(e.boss ? 2.2 : 1);
  if (e.boss || clock - lastKillSnd > 0.05) { lastKillSnd = clock; Snd.play('kill'); }
  burst(e.x, e.y, ENEMY[e.k].col, e.boss ? 24 : 10, e.boss ? 140 : 80);
  addFx('poof', e.x, e.y, { sc: 1 });
  G.corpses.push(e);
  if (G.combo >= 10 && G.combo % 10 === 0) { G.coins += 2; banner(`连击 x${G.combo}`, '经验提升', PAL.gold); }
  if (e.boss) {
    addFx('big-explosion', e.x, e.y, { sc: 1 }); G.coins += 20;
    banner('深渊之眼倒下了', '+20 金币', '#e0b0f0');
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
function aimAt(distMax) {
  const p = G.p, [t, d] = nearest(p.x, p.y);
  if (!t || d > distMax) return null;
  const a = Math.atan2(t.y - p.y, t.x - p.x);
  p.aim = a; if (Math.cos(a)) p.face = Math.cos(a) >= 0 ? 1 : -1;
  return { t, d, a };
}
function coneHurt(range, spread, dmg) {
  const p = G.p, a0 = p.aim;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.x - p.x, dy = e.y - p.y, L = Math.hypot(dx, dy);
    if (L > range + ENEMY[e.k].r) continue;
    let da = Math.atan2(dy, dx) - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < spread) hurt(e, dmg, p.x, p.y);
  }
}
function spawnShot(spr, a, speed, life, dmg, extra) {
  const p = G.p;
  G.shots.push(Object.assign({
    spr, x: p.x + Math.cos(a) * 18, y: p.y - 8 + Math.sin(a) * 18,
    vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, dmg, t: 0, r: 16, hit: null, back: false, age: 0,
  }, extra || {}));
}
function castSkills(dt) {
  const owned = Object.keys(G.skills);
  for (const k of owned) {
    const sk = SKILLS[k]; if (!sk || sk.passive || k === 'orbit' || k === 'orbitX') continue;
    G.cd[k] = (G.cd[k] ?? 0.15) - dt; if (G.cd[k] > 0) continue;
    const l = G.skills[k], x = !!sk.evo; let ok = true;
    if (k === 'pistol' || k === 'pistolX') {
      const aim = aimAt(460); if (!aim) ok = false; else {
        const n = (x ? 2 : 1) + (l >= 4 ? 1 : 0);
        addFx('muzzle-pistol', G.p.x + Math.cos(aim.a) * 20, G.p.y - 6 + Math.sin(aim.a) * 20, { rot: aim.a });
        for (let i = 0; i < n; i++) spawnShot('bullet-tracer', aim.a + (i - (n - 1) / 2) * 0.08, 520, 0.55, mulD((x ? 16 : 10) + l * 4));
        Snd.play('shot'); setCd(k, (x ? 0.28 : 0.4) * cdMul());
      }
    } else if (k === 'smg' || k === 'smgX') {
      const aim = aimAt(420); if (!aim) ok = false; else {
        const wob = (Math.random() - 0.5) * 0.18;
        addFx('muzzle-pistol', G.p.x + Math.cos(aim.a) * 16, G.p.y - 6, { rot: aim.a, sc: 1 });
        spawnShot('bullet-tracer', aim.a + wob, x ? 480 : 560, 0.4, mulD((x ? 8 : 5) + l * 2), x ? { home: true } : null);
        setCd(k, (x ? 0.09 : 0.12) * cdMul());
      }
    } else if (k === 'shot' || k === 'shotX') {
      const aim = aimAt(360); if (!aim) ok = false; else {
        addFx('muzzle-shotgun', G.p.x, G.p.y, { rot: aim.a });
        const pellets = (x ? 7 : 4) + Math.min(3, l);
        for (let i = 0; i < pellets; i++) spawnShot('bullet-tracer', aim.a + (i - (pellets - 1) / 2) * (x ? 0.16 : 0.12), 420, 0.28, mulD((x ? 8 : 6) + l * 2));
        Snd.play('shot'); setCd(k, (x ? 0.7 : 0.95) * cdMul());
      }
    } else if (k === 'knife' || k === 'knifeX') {
      const aim = aimAt(280); if (!aim) ok = false; else {
        const ox = Math.cos(aim.a) * 36, oy = Math.sin(aim.a) * 36;
        addFx('dagger-flurry', G.p.x + ox, G.p.y + oy, { rot: aim.a });
        coneHurt(x ? 150 : 110, x ? 1.1 : 0.7, mulD((x ? 12 : 8) + l * 4));
        setCd(k, (x ? 0.55 : 0.75) * cdMul());
      }
    } else if (k === 'disc' || k === 'discX') {
      const aim = aimAt(480); if (!aim) ok = false; else {
        const n = x ? 2 : 1;
        for (let i = 0; i < n; i++) spawnShot('energy-disc', aim.a + (i ? 0.4 : 0), 280, 1.6, mulD(9 + l * 4), { ret: 0.55, pierce: true, r: 22 });
        setCd(k, 1.15 * cdMul());
      }
    } else if (k === 'sword' || k === 'swordX') {
      const aim = aimAt(240); if (!aim) ok = false; else {
        addFx(k === 'swordX' ? 'heavy-cleave' : 'sword-slash', G.p.x, G.p.y, { rot: aim.a });
        coneHurt(k === 'swordX' ? 170 : 120, k === 'swordX' ? 1.3 : 0.9, mulD((k === 'swordX' ? 28 : 16) + l * 6));
        addShake(0.8); setCd(k, (k === 'swordX' ? 0.7 : 0.9) * cdMul());
      }
    } else if (k === 'fireball' || k === 'fireX') {
      const aim = aimAt(520); if (!aim) ok = false; else {
        const n = 1 + (l >= 3) + (l >= 5) + (k === 'fireX' ? 1 : 0);
        for (let i = 0; i < n; i++) spawnShot('fireball', aim.a + (i - (n - 1) / 2) * 0.2, 340, 1.1, mulD(12 + l * 5), { r: 20, boom: k === 'fireX' });
        setCd(k, 0.62 * cdMul());
      }
    } else if (k === 'chain' || k === 'chainX') {
      let [t, dist] = nearest(G.p.x, G.p.y);
      if (!t || dist > 340) ok = false; else {
        const hit = new Set(); let fx = G.p.x, fy = G.p.y - 10;
        const jumps = (k === 'chainX' ? 4 : 2) + l;
        for (let i = 0; i < jumps && t; i++) {
          hit.add(t); G.bolts.push({ x1: fx, y1: fy, x2: t.x, y2: t.y, t: 0.14 });
          addFx('zap-hit', t.x, t.y, { sc: 1 });
          const zap = mulD(9 + l * 4) * (wetKind(t.x, t.y) ? 1.5 : 1);
          hurt(t, zap, fx, fy); fx = t.x; fy = t.y;
          const r = nearest(fx, fy, hit); t = r[1] < 180 ? r[0] : null;
        }
        setCd(k, (k === 'chainX' ? 1.05 : 1.35) * cdMul());
      }
    }
    if (!ok) G.cd[k] = 0.12;
  }
}
function tickOrbit(dt) {
  const id = G.skills.orbitX ? 'orbitX' : G.skills.orbit ? 'orbit' : null;
  if (!id) { G.blades = []; return; }
  const l = G.skills[id], n = (id === 'orbitX' ? 4 : 1) + Math.min(4, l);
  const R = id === 'orbitX' ? 92 : 78;
  G.orbitA += dt * (id === 'orbitX' ? 3.4 : 2.3);
  G.blades = [];
  for (let i = 0; i < n; i++) {
    const a = G.orbitA + i * Math.PI * 2 / n;
    const x = G.p.x + Math.cos(a) * R, y = G.p.y + Math.sin(a) * R;
    G.blades.push({ x, y, a });
    for (const e of G.enemies) {
      if (e.dead) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < (28 + ENEMY[e.k].r) ** 2 && !(e.oh > 0)) {
        hurt(e, mulD(4 + l * 2), x, y); e.oh = 0.32;
      }
    }
  }
}
function checkEvo() {
  for (const e of EVOLVES) {
    if (G.evolved[e.base]) continue;
    if ((G.skills[e.base] || 0) >= 5 && lvOf(e.pass) >= e.pl) {
      G.evolved[e.base] = true;
      delete G.skills[e.base];
      G.skills[e.id] = 5;
      banner('进化  ' + SKILLS[e.id].name, '武器与被动共鸣', PAL.gold);
      addFx('chest-open', G.p.x, G.p.y - 10, { sc: 1 });
      Snd.play('level'); addShake(1);
    }
  }
}
function hpMul(t) { return t < 120 ? 0.62 + 0.38 * (t / 120) : 1 + (t - 120) / 115; }
function spdMul(t) { return t < 120 ? 0.8 + 0.2 * (t / 120) : 1 + (t - 120) / 420; }
function spawnRate(t) {
  if (t < 25) return 0.42; if (t < 60) return 0.42 + (t - 25) / 35 * 0.3;
  if (t < 120) return 0.72 + (t - 60) / 60 * 0.35; if (t < 180) return 1.05 + (t - 120) / 60 * 0.4;
  if (t < 240) return 1.45 + (t - 180) / 60 * 0.35; return 1.8;
}
function spawnCap(t) { if (t < 40) return 7; if (t < 90) return 12; if (t < 150) return 18; if (t < 240) return 28; return 36; }
function pickEnemy(t) {
  const pool = [{ k: 'slime', w: 7 }];
  if (t > 40) pool.push({ k: 'bat', w: 4 });
  if (t > 85) pool.push({ k: 'ghost', w: t < 120 ? 1 : 3 });
  if (t > 145) pool.push({ k: 'flying-skull', w: 2 });
  if (t > 200) pool.push({ k: 'wisp', w: 2 });
  let sum = 0; for (const p of pool) sum += p.w; let r = Math.random() * sum;
  for (const p of pool) { r -= p.w; if (r <= 0) return p.k; } return 'slime';
}
function spawn(k) {
  const a = Math.random() * Math.PI * 2, d = ENEMY[k];
  const rx = (d.boss ? 120 : 96) + Math.random() * 12;
  const ry = (d.boss ? 230 : 206) + Math.random() * 10;
  const e = { k, x: G.p.x + Math.cos(a) * rx, y: G.p.y + Math.sin(a) * ry, hp: d.hp * (d.boss ? 1 : hpMul(G.t)), t: Math.random() * 3, slow: 0, flash: 0, boss: !!d.boss, kbx: 0, kby: 0, oh: 0 };
  e.maxhp = e.hp; G.enemies.push(e); return e;
}
function spawner(dt) {
  if (G.spawnPause > 0) { G.spawnPause -= dt; return; }
  if (G.t >= GAME_LEN) {
    if (!G.bossSpawned) { G.bossSpawned = true; G.boss = spawn('eyeball'); addShake(2); banner('深渊之眼', '它从湖面升起', '#e0b0f0'); Snd.play('boss'); }
    if (G.boss && !G.boss.dead && G.enemies.length < 20) { G.spawnT -= dt; if (G.spawnT < 0) { G.spawnT = 1.6; spawn('bat'); } }
    return;
  }
  const cap = spawnCap(G.t); if (G.enemies.length >= cap) return;
  G.spawnT -= dt * spawnRate(G.t); let guard = 0;
  while (G.spawnT < 0 && G.enemies.length < cap && guard++ < 3) { G.spawnT += 1; spawn(pickEnemy(G.t)); }
}
function rollChoices() {
  const opts = Object.keys(SKILLS).filter(k => !SKILLS[k].evo && lvOf(k) < MAXLV);
  const out = []; while (out.length < 3 && opts.length) out.push(opts.splice((Math.random() * opts.length) | 0, 1)[0]);
  return out;
}
function pick(k) {
  G.skills[k] = lvOf(k) + 1;
  if (k === 'vital') { G.p.maxhp += 25; G.p.hp = G.p.maxhp; }
  G.choices = null; G.hitStop = 0; state = 'play'; checkEvo();
}
function update(dt) {
  const p = G.p; G.t += dt; checkEvo();
  const w = Math.floor(G.t / 30);
  if (w > G.wave && G.t < GAME_LEN) {
    G.wave = w; const bonus = 4 + w * 2; G.coins += bonus; G.coinPop = 0.2; G.spawnPause = 1;
    banner(`第 ${w} 波清除`, `+${bonus} 金币`, PAL.gold); Snd.play('wave'); addShake(0.6);
  }
  if (G.nextMark < MARKS.length && G.kills >= MARKS[G.nextMark]) {
    const n = MARKS[G.nextMark], c = MARK_COIN[G.nextMark]; G.nextMark++; G.coins += c;
    banner(`击杀 ${n}`, `+${c} 金币`, PAL.redL); Snd.play('coin');
  }
  G.heartT += dt;
  if (G.heartT > 34 && p.hp < p.maxhp * 0.82) {
    G.heartT = 0; const ang = Math.random() * 6.28, dist = 80 + Math.random() * 40;
    G.orbs.push({ x: p.x + Math.cos(ang) * dist, y: p.y + Math.sin(ang) * dist, v: 0, t: 0, kind: 'heart', pull: false, pullV: 0, trail: 0 });
  }
  const [mx, my] = moveVec(); const moving = Math.hypot(mx, my); p.moving = moving;
  if (moving > 0.15) { p.walk += dt * 10; p.aim = Math.atan2(my, mx); p.face = mx >= 0 ? 1 : -1; }
  const sp = 46 * (1 + lvOf('speed') * 0.12);
  const wm = playerWaterMul(p.x, p.y);
  p.wet = wetKind(p.x, p.y);
  p.kbx *= Math.pow(0.05, dt); p.kby *= Math.pow(0.05, dt);
  p.x += mx * sp * wm * dt + p.kbx * dt; p.y += my * sp * wm * dt + p.kby * dt;
  if (p.wet && moving > 0.2) {
    p.wade -= dt;
    if (p.wade <= 0) {
      p.wade = 0.16; Snd.play('wade');
      if (G.parts.length < 150) G.parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 18, vy: -8 - Math.random() * 10, life: 0.25, col: PAL.foam, g: 30 });
    }
  }
  p.inv -= dt; p.hurt = Math.max(0, p.hurt - dt);
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  spawner(dt); castSkills(dt); tickOrbit(dt);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = ENEMY[e.k]; e.t += dt; e.flash -= dt; e.oh = (e.oh || 0) - dt; e.slow = Math.max(0, e.slow - dt);
    const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1;
    e.wet = wetKind(e.x, e.y);
    const s = d.sp * enemyWaterMul(e.x, e.y) * (e.slow > 0 ? 0.45 : 1) * (e.boss ? 1 : spdMul(G.t));
    e.kbx *= Math.pow(0.05, dt); e.kby *= Math.pow(0.05, dt);
    e.x += dx / L * s * dt + e.kbx * dt; e.y += dy / L * s * dt + e.kby * dt;
    if (L > 1100 && !e.boss) { e.dead = true; continue; }
    if (L < d.r + 8 && p.inv <= 0) {
      let dmg = d.dmg;
      if (!e.boss && G.t < 120) dmg = Math.max(1, Math.round(d.dmg * (0.65 + 0.35 * G.t / 120)));
      p.hp -= dmg; if (G.healOnHit) p.hp = Math.min(p.maxhp, p.hp + G.healOnHit);
      p.inv = 0.9; p.hurt = 0.12; p.kbx = -dx / L * 140; p.kby = -dy / L * 140;
      G.hurtFlash = 0.4; addShake(1.4); bumpStop(0.04); Snd.play('hurt');
      num(p.x, p.y - 36, '-' + dmg, false, PAL.red);
      if (p.hp < 0) p.hp = 0;
    }
  }
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) {
    const a = es[i], b = es[(i * 7 + 3) % es.length];
    if (!a || !b || a === b || a.dead || b.dead || a.boss || b.boss) continue;
    const dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy), m = ENEMY[a.k].r + ENEMY[b.k].r;
    if (L > 0 && L < m) { const k = (m - L) / L * 0.45; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
  }
  for (const s of G.shots) {
    s.t += dt; s.age += dt; s.life -= dt;
    if (s.home) {
      const [t] = nearest(s.x, s.y);
      if (t) { const a = Math.atan2(t.y - s.y, t.x - s.x); s.vx += Math.cos(a) * 360 * dt; s.vy += Math.sin(a) * 360 * dt; }
      const sp = Math.hypot(s.vx, s.vy); if (sp > 560) { s.vx *= 560 / sp; s.vy *= 560 / sp; }
    }
    if (s.ret && !s.back && s.age > s.ret) { s.vx *= -1; s.vy *= -1; s.back = true; s.hit = new Set(); }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if ((s.spr === 'fireball' || s.boom) && terrainAt(s.x, s.y) === WATER) {
      burst(s.x, s.y, PAL.coatL, 5, 16); Snd.play('fizz'); s.life = 0; continue;
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (s.hit && s.hit.has(e)) continue;
      const rr = ENEMY[e.k].r + (s.r || 16);
      if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < rr * rr) {
        hurt(e, s.dmg, s.x - s.vx, s.y - s.vy);
        addFx('hit-spark', s.x, s.y, { rot: Math.atan2(s.vy, s.vx) });
        if (s.boom) {
          addFx('small-explosion', e.x, e.y, { sc: 1 });
          for (const o of G.enemies) if (!o.dead && o !== e && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 80 * 80) hurt(o, Math.round(s.dmg * 0.35), e.x, e.y);
        }
        if (s.pierce || s.ret) { s.hit = s.hit || new Set(); s.hit.add(e); }
        else { s.life = 0; break; }
      }
    }
  }
  G.shots = G.shots.filter(s => s.life > 0);
  for (const z of G.zones) {
    z.delay -= dt; if (z.delay > 0) continue;
    for (const e of G.enemies) if (!e.dead && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + ENEMY[e.k].r) ** 2) hurt(e, z.dmg, z.x, z.y);
    z.done = true;
  }
  G.zones = G.zones.filter(z => !z.done);
  G.enemies = G.enemies.filter(e => !e.dead);
  for (let i = G.corpses.length - 1; i >= 0; i--) {
    const c = G.corpses[i]; c.dying -= dt; c.x += (c.kbx || 0) * dt; c.y += (c.kby || 0) * dt;
    if (c.dying <= 0) G.corpses.splice(i, 1);
  }
  const mag = 40 * (1 + lvOf('magnet') * 0.3 + (G.magBonus || 0));
  for (const o of G.orbs) {
    o.t += dt; const dx = p.x - o.x, dy = p.y - o.y, L = Math.hypot(dx, dy) || 1;
    const pull = L < mag || o.pull || o.t > 0.9;
    if (pull) {
      if (L < mag) o.pull = true;
      const spd = o.pull ? Math.min(520, (o.pullV = (o.pullV || 120) + 900 * dt)) : 140;
      o.x += dx / L * spd * dt; o.y += dy / L * spd * dt;
      if (o.pull) { o.trail -= dt; if (o.trail <= 0) { o.trail = 0.04; if (G.parts.length < 160) G.parts.push({ x: o.x, y: o.y, vx: 0, vy: 0, life: 0.2, col: '#b8ff6a', g: 0 }); } }
    }
    if (Math.hypot(p.x - o.x, p.y - o.y) < 16) {
      o.got = true;
      if (o.kind === 'heart') { const heal = Math.max(18, Math.round(p.maxhp * 0.28)); p.hp = Math.min(p.maxhp, p.hp + heal); num(p.x, p.y - 20, '+' + heal, false, '#8dff9a'); Snd.play('heart'); }
      else { G.xp += o.v; if (clock - lastXpSnd > 0.05) { lastXpSnd = clock; Snd.play('xp'); } }
    }
  }
  G.orbs = G.orbs.filter(o => !o.got);
  if (G.orbs.length > 200) G.orbs.splice(0, G.orbs.length - 200);
  let ups = 0;
  while (G.xp >= G.need && ups < 3) { G.xp -= G.need; G.lv++; G.need = xpToNext(G.lv); ups++; }
  if (ups) {
    G.goldFlash = 0.35; addShake(0.8); Snd.play('level');
    banner('升级！', 'Lv.' + G.lv, PAL.gold);
    G.lvChest = 0.7; state = 'lvchest';
  }
  if (G.chest) {
    const c = G.chest; c.t += dt;
    if (!c.open && Math.hypot(p.x - c.x, p.y - c.y) < 28) { c.open = true; c.ot = 0; G.coins += 50; G.score += 2000; Snd.play('coin'); }
    if (c.open) { c.ot = (c.ot || 0) + dt; if (c.ot > 2.4) endGame(true); }
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
  for (const e of G.enemies) if (!e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 180) kill(e);
  G.enemies = G.enemies.filter(e => !e.dead);
  addFx('holy-pillar', p.x, p.y, { sc: 1 }); state = 'play';
}
function bankCoins(mul) { coinsBank += G.coins * mul; lsSet('ps_coins', String(coinsBank)); G.banked = mul; Snd.play('coin'); }
function buyMeta(id) {
  const m = META_DEFS.find(x => x.id === id); if (!m) return;
  const lv = meta[id] || 0; if (lv >= m.max) return;
  const cost = m.cost(lv);
  if (coinsBank < cost) { denyId = id; denyUntil = clock + 0.35; Snd.play('hurt'); return; }
  coinsBank -= cost; meta[id] = lv + 1; saveMeta(); lsSet('ps_coins', String(coinsBank)); Snd.play('coin');
}
function tickVisual(dt) {
  if (!G) return;
  G.goldFlash = Math.max(0, (G.goldFlash || 0) - dt);
  G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - dt);
  G.killPop = Math.max(0, (G.killPop || 0) - dt);
  G.shakeMag *= Math.pow(0.05, dt); if (G.shakeMag < 0.05) G.shakeMag = 0;
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
  G.nums = G.nums.filter(n => n.t < 0.7);
  for (const b of G.bolts) b.t -= dt;
  G.bolts = G.bolts.filter(b => b.t > 0);
}

// ---------- draw ----------
const DIG = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
  '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000',
  'x': '101010010010101', ':': '000010000010000', ' ': '000000000000000',
};
function pxText(str, x, y, col, scale, align) {
  const gap = scale, cw = 3 * scale + gap, w = String(str).length * cw - gap;
  let ox = align === 'right' ? x - w : align === 'left' ? x : x - (w / 2 | 0);
  const draw = (dx, dy, c) => {
    ctx.fillStyle = c; let x0 = ox + dx;
    for (const ch of String(str)) {
      const g = DIG[ch] || DIG[' '];
      for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(x0 + (i % 3) * scale, y + dy + ((i / 3) | 0) * scale, scale, scale);
      x0 += cw;
    }
  };
  draw(scale, scale, PAL.ink); draw(0, 0, col);
}
const GLY = new Map();
try {
  const face = new FontFace('FusionPixel', 'url(assets/fusion-pixel-8.ttf)');
  face.load().then(f => { document.fonts.add(f); GLY.clear(); }).catch(() => {});
} catch (e) {}
const ASC = {
  '0': '111101101101111', '1': '010010010010010', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
  '8': '111101111101111', '9': '111101111001111',
  'A': '010101111101101', 'B': '110101110101110', 'C': '111100100100111', 'D': '110101101101110',
  'E': '111100111100111', 'F': '111100111100100', 'G': '111100101101111', 'H': '101101111101101',
  'I': '111010010010111', 'J': '111001001001110', 'K': '101101110101101', 'L': '100100100100111',
  'M': '101111101101101', 'N': '101111111101101', 'O': '111101101101111', 'P': '111101111100100',
  'Q': '111101101111011', 'R': '111101110101101', 'S': '111100111001111', 'T': '111010010010010',
  'U': '101101101101111', 'V': '101101101010010', 'W': '101101101111101', 'X': '101101010101101',
  'Y': '101101010010010', 'Z': '111001010100111',
  '+': '000010111010000', '-': '000000111000000', 'x': '101010010101101', ':': '000010000010000',
  '.': '000000000000010', '/': '001001010100100', ' ': '000000000000000',
};
function glyphOf(ch) {
  const u = ASC[ch] || ASC[ch.toUpperCase()];
  if (u && u.length === 15) return { w: 3, h: 5, bits: u.split('').map(Number) };
  if (GLY.has(ch)) return GLY.get(ch);
  const w = 8, h = 8, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const ready = document.fonts && document.fonts.check && document.fonts.check('8px FusionPixel');
  g.font = ready ? '8px FusionPixel' : '8px sans-serif';
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, w / 2, h / 2 + (ready ? 0 : 1));
  const d = g.getImageData(0, 0, w, h).data, bits = [];
  for (let i = 0; i < w * h; i++) bits.push(d[i * 4 + 3] > (ready ? 40 : 140) ? 1 : 0);
  const rec = { w, h, bits };
  if (ready) GLY.set(ch, rec);
  return rec;
}
function textWidth(s, scale) { let w = 0; for (const ch of String(s)) w += (glyphOf(ch).w + 1) * scale; return Math.max(0, w - scale); }
function txt(s, x, y, px, col = PAL.paper, align = 'center') {
  const scale = px >= 16 ? 2 : 1;
  const str = String(s);
  const tw = textWidth(str, scale);
  let ox = align === 'right' ? Math.round(x - tw) : align === 'left' ? Math.round(x) : Math.round(x - tw / 2);
  const gh = glyphOf(str[0] || ' ').h * scale;
  const oy = Math.round(y - gh / 2);
  ctx.fillStyle = col || PAL.paper;
  for (const ch of str) {
    const g = glyphOf(ch);
    for (let i = 0; i < g.bits.length; i++) if (g.bits[i]) ctx.fillRect(ox + (i % g.w) * scale, oy + ((i / g.w) | 0) * scale, scale, scale);
    ox += (g.w + 1) * scale;
  }
}
function box(x, y, w, h, bg, edge) {
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = edge || PAL.gold; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(244,240,232,0.16)'; ctx.fillRect(x, y, w, 1);
}
function btn(id, label, x, y, w, h, col = '#3a4a78') {
  box(x, y, w, h, col, PAL.gold); txt(label, x + w / 2, y + h / 2 + 1, h >= 48 ? 18 : 15);
  UI.push({ id, x, y, w, h });
}
let UI = [];
function drawWorld() {
  const p = G.p;
  const sx = Math.round((Math.random() - 0.5) * 2 * G.shakeMag);
  const sy = Math.round((Math.random() - 0.5) * 2 * G.shakeMag);
  const camX = Math.round(p.x) + sx, camY = Math.round(p.y) + sy;
  ctx.save();
  ctx.translate(Math.round(VW / 2 - camX), Math.round(VH / 2 - camY));
  const trees = [];
  drawTerrain(camX, camY, trees);
  const see = (x, y, m = 80) => Math.abs(x - camX) < VW / 2 + m && Math.abs(y - camY) < VH / 2 + m;
  for (const o of G.orbs) if (see(o.x, o.y)) drawSprite(o.kind === 'heart' ? 'heart-pickup' : 'xp-orb', o.t, o.x, o.y, 1);
  if (G.chest) {
    const c = G.chest;
    drawSprite('chest-open', c.open ? (c.ot || 0) : 0, c.x, c.y, 1);
    if (!c.open) txt('宝箱', c.x, c.y - 70, 14, PAL.gold);
  }
  for (const f of G.fx) if (f.n === 'shadow-tendrils' || f.n === 'frost-nova' || f.n === 'dagger-flurry') drawSprite(f.n, f.t, f.x, f.y, f.sc, f.rot);
  const pile = [{ y: p.y, k: 'p' }];
  for (const t of trees) pile.push({ y: t.y, k: 't', o: t });
  for (const e of G.enemies) if (!e.dead && see(e.x, e.y, 120)) pile.push({ y: e.y, k: 'e', o: e });
  for (const c of G.corpses) if (see(c.x, c.y, 80)) pile.push({ y: c.y, k: 'c', o: c });
  pile.sort((a, b) => a.y - b.y);
  for (const it of pile) {
    if (it.k === 't') drawTree(it.o);
    else if (it.k === 'p') {
      const fr = p.moving > 0.15 ? 1 + ((p.walk | 0) % 3) : 0;
      if (!(p.inv > 0.05 && p.hurt <= 0 && ((clock * 16) | 0) % 2 === 0)) clipWade(p.x, p.y, p.wet, () => drawHero(p.x, p.y, fr, p.face, p.hurt > 0));
    } else drawEnemy(it.o);
  }
  // i-frame blink: redraw hero transparent by not drawing — handled above only for hurt white. Add alpha blink:
  for (const b of G.blades) drawSprite('energy-disc', clock, b.x, b.y, 1, b.a);
  for (const s of G.shots) drawSprite(s.spr, s.t, s.x, s.y, 1, Math.atan2(s.vy, s.vx));
  for (const b of G.bolts) {
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    for (let i = 1; i < 5; i++) { const k = i / 5; ctx.lineTo(b.x1 + (b.x2 - b.x1) * k + (Math.random() - 0.5) * 10, b.y1 + (b.y2 - b.y1) * k + (Math.random() - 0.5) * 10); }
    ctx.lineTo(b.x2, b.y2); ctx.strokeStyle = '#9ad4ff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = PAL.paper; ctx.lineWidth = 1; ctx.stroke();
  }
  for (const f of G.fx) if (f.n !== 'shadow-tendrils' && f.n !== 'frost-nova' && f.n !== 'dagger-flurry') drawSprite(f.n, f.t, f.x, f.y, f.sc, f.rot);
  for (const q of G.parts) { if (q.life < 0.08) continue; ctx.fillStyle = q.col; ctx.fillRect(q.x | 0, q.y | 0, 1, 1); }
  for (const n of G.nums) {
    const sc = (n.crit ? 3 : 2);
    const rise = n.t < 0.1 ? 4 : 4 + (n.t - 0.1) * 36;
    ctx.globalAlpha = n.t > 0.4 ? Math.max(0, 1 - (n.t - 0.4) / 0.3) : 1;
    pxText(n.v, n.x, n.y - rise, n.col, sc, 'center');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawEnemy(e) {
  const d = ENEMY[e.k];
  const white = e.dying ? ((e.dying * 20) | 0) % 2 === 0 : e.flash > 0;
  if (shadowSpr && !e.wet) ctx.drawImage(shadowSpr, Math.round(e.x - 4), Math.round(e.y + 1));
  clipWade(e.x, e.y, e.wet || 0, () => drawSprite(e.k, e.t, e.x, e.y, d.sc, 0, true, e.x > G.p.x, 1, white));
  if (!e.dying && e.hp < e.maxhp && !d.boss) {
    ctx.fillStyle = PAL.ink; ctx.fillRect(e.x - 16, e.y - d.r - 10, 32, 4);
    ctx.fillStyle = PAL.red; ctx.fillRect(e.x - 15, e.y - d.r - 9, 30 * Math.max(0, e.hp / e.maxhp), 2);
  }
}
function hudTop() { return Math.max(12, SAFE.t); }
function drawHUD() {
  const p = G.p, top = Math.max(1, SAFE.t | 0);
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, top, VW, 3);
  ctx.fillStyle = PAL.purpleL; ctx.fillRect(1, top + 1, Math.max(0, (VW - 2) * Math.min(1, G.xp / Math.max(1, G.need))), 1);
  ctx.fillStyle = PAL.ink; ctx.fillRect(2, top + 5, 36, 3);
  ctx.fillStyle = PAL.red; ctx.fillRect(3, top + 6, 34 * Math.max(0, p.hp) / p.maxhp, 1);
  txt('L' + G.lv, 2, top + 14, 8, PAL.paper, 'left');
  const left = Math.max(0, GAME_LEN - G.t);
  if (G.t < GAME_LEN) pxText(Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'), VW / 2, top + 6, PAL.paper, 1, 'center');
  else txt('BOSS', VW / 2, top + 12, 8, PAL.red);
  txt('杀' + G.kills, VW - 2, top + 12, 8, PAL.paper, 'right');
  txt('金' + G.coins, VW - 2, top + 22, 8, PAL.gold, 'right');
  if (p.wet === 2) txt('深水', 40, top + 14, 8, PAL.coatL, 'left');
  else if (p.wet === 1) txt('浅水', 40, top + 14, 8, PAL.foam, 'left');
  if (G.combo >= 2) pxText('x' + G.combo, VW / 2, top + 20, PAL.gold, 1, 'center');
  if (G.boss && !G.boss.dead) {
    ctx.fillStyle = PAL.ink; ctx.fillRect(30, top + 26, VW - 60, 4);
    ctx.fillStyle = PAL.purpleL; ctx.fillRect(31, top + 27, (VW - 62) * Math.max(0, G.boss.hp) / G.boss.maxhp, 2);
    txt('深渊之眼', VW / 2, top + 36, 8, PAL.coatL);
  }
  const bot = VH - Math.max(2, SAFE.b | 0) - 18;
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, bot - 1, VW, 19);
  let i = 0;
  for (const k in G.skills) {
    const x = 2 + (i % 9) * 18, y = bot;
    ctx.fillStyle = PAL.coat; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.ink; ctx.fillRect(x, y, 16, 1);
    drawIcon(SKILLS[k].icon, x + 1, y + 1, 14);
    if (!SKILLS[k].passive && (G.cd[k] || 0) > 0.05) {
      const h = 14 * Math.min(1, G.cd[k] / (G.cdMax[k] || 1));
      ctx.fillStyle = PAL.ink; ctx.fillRect(x + 1, y + 1, 14, h);
    }
    txt(SKILLS[k].evo ? '*' : String(G.skills[k]), x + 15, y + 14, 8, PAL.gold, 'right');
    i++;
  }
  btn('pause', '停', VW - 28, top + 18, 12, 12, PAL.purple);
  btn('mute', Snd.muted ? '静' : '音', VW - 14, top + 18, 12, 12, Snd.muted ? PAL.redD : PAL.grassD);
  if (input.active && state === 'play') {
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(input.bx - 10, input.by - 1, 20, 2); ctx.fillRect(input.bx - 1, input.by - 10, 2, 20);
    const dx = input.px - input.bx, dy = input.py - input.by, L = Math.hypot(dx, dy) || 1, m = Math.min(L, 10) / L;
    ctx.fillStyle = PAL.gold; ctx.fillRect(Math.round(input.bx + dx * m) - 2, Math.round(input.by + dy * m) - 2, 4, 4);
  }
}
function drawBanners() {
  const b = G && G.banners[0]; if (!b) return;
  const u = b.t / b.life, a = u < 0.12 ? u / 0.12 : u > 0.7 ? (1 - u) / 0.3 : 1;
  ctx.save(); ctx.globalAlpha = Math.max(0, a);
  const y = hudTop() + 130;
  const w = Math.min(VW - 8, Math.max(80, b.text.length * 9));
  box(VW / 2 - w / 2, y, w, b.sub ? 22 : 14, PAL.ink, b.col);
  txt(b.text, VW / 2, y + (b.sub ? 16 : 18), 16, b.col);
  if (b.sub) txt(b.sub, VW / 2, y + 36, 13, PAL.paper, 'center', false);
  ctx.restore();
}
function backdrop(camX, camY) {
  ctx.save(); ctx.translate(Math.round(VW / 2 - camX), Math.round(VH / 2 - camY));
  drawTerrain(camX, camY, null); ctx.restore();
}
function drawTitle() {
  const camX = 96 + Math.sin(clock * 0.2) * 12, camY = 150;
  backdrop(camX, camY);
  drawHero(VW / 2, 150, (clock * 8 | 0) % 2 ? 1 : 0, 1, false);
  txt('像素幸存者', VW / 2, 36, 8, PAL.gold);
  txt('湖水减速 雷击湿身', VW / 2, 52, 8, PAL.coatL);
  txt('最高' + best + ' 金' + coinsBank, VW / 2, 250, 8, PAL.paper);
  btn('start', '开始', VW / 2 - 36, 270, 72, 20, PAL.red);
  btn('upgrades', '强化', VW / 2 - 36, 296, 72, 18, PAL.coat);
  btn('credits', '致谢', VW / 2 - 36, 320, 72, 18, PAL.purple);
  btn('mute', Snd.muted ? '静' : '音', VW - 22, 4, 16, 14, Snd.muted ? PAL.redD : PAL.grassD);
}
function drawCredits() {
  backdrop(160, 280); ctx.fillStyle = 'rgba(20,16,24,0.88)'; ctx.fillRect(0, 0, VW, VH);
  const lines = [
    ['关于 / 致谢', 22, PAL.gold],
    ['怪物、火球、雷电、宝箱、经验', 15, PAL.paper],
    ['以及手枪、霰弹、飞刀、巨剑、回旋刀', 15, PAL.paper],
    ['特效来自 pixelfx', 15, '#d8d0f0'],
    ['Patch & Hugo Duprez · MIT', 14, '#d8d0f0'],
    ['github.com/patch-gg/pixelfx', 13, '#b7b0d8'],
    ['允许使用、修改、分发，须保留版权声明。', 13, PAL.paper],
    ['软件按“原样”提供，不作担保。', 13, PAL.paper],
    ['全文见 LICENSE-pixelfx.txt', 13, '#aaa'],
    ['地图、英雄与音效为本 Demo 原创，', 14, '#b7e0a8'],
    ['与特效共用同一套限色与 1px 网格。', 14, '#b7e0a8'],
  ];
  lines.forEach((r, i) => txt(r[0], VW / 2, 16 + i * 28, 8, r[2]));
  btn('back', '返回', VW / 2 - 24, VH - 22, 48, 16, PAL.purple);
}
function drawShop() {
  backdrop(100, 140); ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, VW, VH);
  txt('永久强化', VW / 2, 12, 8, PAL.gold);
  txt('金' + coinsBank, VW / 2, 24, 8, PAL.gold);
  META_DEFS.forEach((m, i) => {
    const y = 36 + i * 52, lv = meta[m.id] || 0, maxed = lv >= m.max, cost = m.cost(lv);
    const deny = denyId === m.id && clock < denyUntil;
    box(6, y, VW - 12, 46, PAL.purple, maxed ? PAL.gold : PAL.coatL);
    txt(m.name, 12, y + 12, 8, PAL.paper, 'left');
    txt(m.desc, 12, y + 28, 8, PAL.coatL, 'left');
    for (let p = 0; p < m.max; p++) { ctx.fillStyle = p < lv ? PAL.gold : PAL.ink; ctx.fillRect(12 + p * 6, y + 36, 4, 4); }
    box(VW - 42, y + 10, 30, 16, maxed ? PAL.purple : deny ? PAL.redD : PAL.dirt, PAL.gold);
    txt(maxed ? '满' : String(cost), VW - 27, y + 18, 8, PAL.paper);
    if (!maxed) UI.push({ id: 'buy:' + m.id, x: 6, y, w: VW - 12, h: 46 });
  });
  btn('back', '返回', VW / 2 - 24, VH - 22, 48, 16, PAL.purple);
}
function drawLevelUp() {
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, VW, VH);
  txt('升级', VW / 2, 12, 8, PAL.gold);
  const choices = G.choices || [];
  choices.forEach((k, i) => {
    const y = 24 + i * 100, s = SKILLS[k], r = RAR[s.rarity] || RAR.common, l = lvOf(k) + 1;
    box(8, y, VW - 16, 92, r.bg, r.edge);
    ctx.fillStyle = r.edge; ctx.fillRect(8, y, 2, 92);
    ctx.fillStyle = PAL.ink; ctx.fillRect(14, y + 8, 28, 28);
    drawIcon(s.icon, 16, y + 10, 24);
    txt(s.name, 48, y + 14, 8, PAL.paper, 'left');
    txt(r.name, 48, y + 26, 8, r.col, 'left');
    txt(l === 1 ? '新' : 'L' + l, VW - 14, y + 14, 8, PAL.gold, 'right');
    wrap(s.desc(l), 14, y + 48, VW - 28);
    UI.push({ id: 'pick:' + k, x: 8, y, w: VW - 16, h: 92 });
  });
  btn('reroll', '广告换一批', VW / 2 - 40, VH - 28, 80, 18, PAL.dirt);
}
function wrap(s, x, y, w) {
  let line = '', yy = y;
  for (const ch of s) {
    if (textWidth(line + ch, 1) > w && line) { txt(line, x, yy, 8, PAL.paper, 'left'); line = ''; yy += 9; }
    line += ch;
  }
  if (line) txt(line, x, yy, 8, PAL.paper, 'left');
}
function drawChestPop() {
  ctx.fillStyle = 'rgba(20,16,24,0.45)'; ctx.fillRect(0, 0, VW, VH);
  const t = Math.max(0, 0.7 - (G.lvChest || 0));
  drawSprite('chest-open', t, VW / 2, VH / 2 + 20, 1);
  txt('升级', VW / 2, VH / 2 - 120, 28, PAL.gold);
}
function drawEnd() {
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, VW, VH);
  const win = G.win;
  txt(win ? '你活下来了' : '你倒下了', VW / 2, 16, 8, win ? PAL.gold : PAL.red);
  const rows = [
    ['时间', Math.floor(G.t / 60) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0')],
    ['等级', 'L' + G.lv], ['击杀', String(G.kills)], ['连击', 'x' + (G.maxCombo || 0)],
    ['波次', String(G.wave + 1)], ['伤害', String(G.dealt)], ['得分', String(G.score)],
  ];
  rows.forEach((r, i) => { const y = 36 + i * 14; txt(r[0], 16, y, 8, PAL.coatL, 'left'); txt(r[1], VW - 16, y, 8, PAL.paper, 'right'); });
  txt('金币' + G.coins, VW / 2, 150, 8, PAL.gold);
  let y = 170;
  if (!win && !G.revived) { btn('revive', '广告复活', 30, y, VW - 60, 18, PAL.grass); y += 22; }
  if (!G.banked) {
    btn('double', '广告双倍', 30, y, VW - 60, 18, PAL.dirt); y += 22;
    btn('normal', '领取', 30, y, VW - 60, 16, PAL.purple);
  } else {
    txt('已领' + (G.coins * G.banked), VW / 2, y, 8, PAL.grassL);
    btn('again', '再来', 30, y + 16, VW - 60, 18, PAL.red);
    btn('home', '首页', 30, y + 38, VW - 60, 16, PAL.purple);
  }
}
function drawPause() {
  ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, VW, VH);
  txt('暂停', VW / 2, VH / 2 - 40, 8, PAL.gold);
  btn('resume', '继续', 40, VH / 2 - 20, VW - 80, 18, PAL.coat);
  btn('mute', Snd.muted ? '开音' : '静音', 40, VH / 2 + 4, VW - 80, 16, PAL.grassD);
  btn('home', '首页', 40, VH / 2 + 26, VW - 80, 16, PAL.purple);
}
function drawAd() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, VW, VH);
  txt('模拟激励视频', VW / 2, VH / 2 - 20, 20, PAL.gold);
  txt(Math.ceil(Ads._active.t) + ' 秒后发放奖励', VW / 2, VH / 2 + 20, 16);
}
function handleTap(x, y) {
  if (Ads.busy) return false;
  const b = [...UI].reverse().find(u => x >= u.x && x <= u.x + u.w && y >= u.y && y <= u.y + u.h);
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
  else if (id === 'reroll') Ads.showRewarded('reroll_upgrade', ok => { if (ok && state === 'levelup') G.choices = rollChoices(); });
  else if (id === 'revive') Ads.showRewarded('revive', ok => { if (ok) revive(); });
  else if (id === 'double') Ads.showRewarded('double_reward', ok => { if (ok) bankCoins(2); });
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
  if (G && state === 'lvchest') {
    G.lvChest -= dt;
    if (G.lvChest <= 0) { G.choices = rollChoices(); state = G.choices.length ? 'levelup' : 'play'; }
  } else if (G && state === 'play' && !Ads.busy) {
    if (G.hitStop > 0) { G.hitStop -= dt; G.p.inv -= dt; }
    else update(dt);
  }
  if (G) tickVisual(G.hitStop > 0 ? dt * 0.15 : dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  UI = [];
  if (state === 'loading') { ctx.fillStyle = PAL.grassD; ctx.fillRect(0, 0, VW, VH); txt('加载中', VW / 2, VH / 2, 18); }
  else if (state === 'title') drawTitle();
  else if (state === 'credits') drawCredits();
  else if (state === 'upgrades') drawShop();
  else {
    const modal = state === 'levelup' || state === 'dead' || state === 'win' || state === 'pause' || state === 'lvchest';
    drawWorld();
    if (!modal) { drawHUD(); drawBanners(); }
    if (state === 'lvchest') drawChestPop();
    else if (state === 'levelup') { UI = []; drawLevelUp(); }
    else if (state === 'dead' || state === 'win') { UI = []; drawEnd(); }
    else if (state === 'pause') { UI = []; drawPause(); }
  }
  if (Ads.busy) drawAd();
  if (/[?&]debug/.test(location.search)) txt(fps + ' ' + frameMs.toFixed(1), 2, VH - 20, 8, PAL.leaf, 'left');
  present();
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
      G.skills = { pistol: 5, shot: 3, sword: 3, fireball: 3, chain: 2, haste: 2, magnet: 2 };
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
  step(dt) {
    if (state === 'lvchest') { G.lvChest -= dt; if (G.lvChest <= 0) { G.choices = rollChoices(); state = G.choices.length ? 'levelup' : 'play'; } }
    else if (state === 'play' && !Ads.busy) { if (G.hitStop > 0) { G.hitStop -= dt; G.p.inv -= dt; } else update(dt); }
    if (G) tickVisual(dt); return state;
  },
  choose(i) { if (state === 'levelup' && G && G.choices && G.choices[i]) pick(G.choices[i]); },
  build: BUILD,
});
requestAnimationFrame(frame);
})();
