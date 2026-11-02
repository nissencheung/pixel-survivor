// 像素幸存者 Demo —— 纯 Canvas2D，无依赖。
// 结构：Assets(图集) / Input(摇杆) / World(实体+技能) / UI(画布内界面)。
// 移植微信小游戏：canvas 换 wx.createCanvas()，Image 换 wx.createImage()，触摸换 wx.onTouchStart 等，Ads 换 wx 广告 API。
(() => {
'use strict';
const VW = 270, VH = 480;                 // 逻辑分辨率 9:16
const GAME_LEN = 300;                     // 5 分钟后 Boss
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

// ---------- Assets ----------
const IMG = {}, CENTERS = {};
const CRITTERS = ['bat', 'slime', 'ghost', 'flying-skull', 'eyeball', 'wisp'];
function loadAll(done) {
  const names = Object.keys(SHEETS); let left = names.length;
  for (const n of names) {
    const im = new Image(); im.onload = () => { IMG[n] = im; if (CRITTERS.includes(n)) trim(n); if (--left === 0) done(); };
    im.src = 'assets/' + n + '.png';
  }
}
// 小怪的帧里身体会飘动，算出每帧不透明像素的中心用于居中
function trim(n) {
  const m = SHEETS[n], c = document.createElement('canvas'); c.width = m.fw; c.height = m.fh;
  const g = c.getContext('2d', { willReadFrequently: true }); CENTERS[n] = [];
  for (const [x, y] of m.xy) {
    g.clearRect(0, 0, m.fw, m.fh); g.drawImage(IMG[n], x, y, m.fw, m.fh, 0, 0, m.fw, m.fh);
    const d = g.getImageData(0, 0, m.fw, m.fh).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let j = 0; j < m.fh; j++) for (let i = 0; i < m.fw; i++) if (d[(j * m.fw + i) * 4 + 3] > 60) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    CENTERS[n].push(x1 < 0 ? [m.fw / 2, m.fh / 2] : [(x0 + x1) / 2, (y0 + y1) / 2]);
  }
}
function frameOf(n, t) { const m = SHEETS[n]; const i = Math.floor(t * 1000 / m.dur); return m.loop ? i % m.n : Math.min(i, m.n - 1); }
// 画一帧：center=true 用像素中心，否则用效果 origin
function drawSprite(n, t, x, y, sc = 1, rot = 0, center = false, flip = false, alpha = 1) {
  const m = SHEETS[n], im = IMG[n]; if (!im) return;
  const f = frameOf(n, t), [sx, sy] = m.xy[f], o = center ? CENTERS[n][f] : m.o;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(flip ? -sc : sc, sc); ctx.globalAlpha = alpha;
  ctx.drawImage(im, sx, sy, m.fw, m.fh, -o[0], -o[1], m.fw, m.fh); ctx.restore();
}
const animDone = (n, t) => !SHEETS[n].loop && t * 1000 / SHEETS[n].dur >= SHEETS[n].n;

// ---------- Input：一指虚拟摇杆 + 键盘 ----------
const input = { jx: 0, jy: 0, active: false, bx: 0, by: 0, px: 0, py: 0, keys: {}, taps: [] };
function toView(e) { return [((e.clientX * DPR) - OX) / S, ((e.clientY * DPR) - OY) / S]; }
function pdown(x, y) { input.taps.push([x, y]); input.active = true; input.bx = input.px = x; input.by = input.py = y; }
function pmove(x, y) { if (!input.active) return; input.px = x; input.py = y; }
function pup() { input.active = false; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); pdown(...toView(e)); });
addEventListener('pointermove', e => pmove(...toView(e)));
addEventListener('pointerup', pup); addEventListener('pointercancel', pup);
addEventListener('keydown', e => { input.keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
function moveVec() {
  let x = 0, y = 0; const k = input.keys;
  if (k.a || k.arrowleft) x--; if (k.d || k.arrowright) x++; if (k.w || k.arrowup) y--; if (k.s || k.arrowdown) y++;
  if (input.active) { const dx = input.px - input.bx, dy = input.py - input.by, L = Math.hypot(dx, dy); if (L > 3) { const m = Math.min(1, L / 30); x = dx / L * m; y = dy / L * m; } }
  const L = Math.hypot(x, y); if (L > 1) { x /= L; y /= L; } return [x, y];
}

// ---------- 技能定义 ----------
const SKILLS = {
  fireball: { name: '火球术', icon: 'fireball', desc: l => `向最近敌人发射 ${1 + (l >= 3) + (l >= 5)} 枚火球，伤害 ${10 + l * 6}` },
  chain:    { name: '连锁闪电', icon: 'zap-hit', desc: l => `闪电弹跳 ${2 + l} 个敌人，伤害 ${8 + l * 5}` },
  frost:    { name: '冰霜新星', icon: 'frost-nova', desc: l => `周身冰爆，半径 ${40 + l * 8}，伤害 ${6 + l * 4} 并减速` },
  holy:     { name: '圣光柱', icon: 'holy-pillar', desc: l => `天降 ${l} 道圣光柱，伤害 ${25 + l * 10}` },
  shadow:   { name: '暗影触手', icon: 'shadow-tendrils', desc: l => `在敌群中召唤触手，持续伤害 ${4 + l * 3}/0.25秒` },
  speed:    { name: '疾风步', icon: 'wisp', passive: true, desc: l => `移动速度 +12%（当前 +${l * 12}%）` },
  vital:    { name: '生命之心', icon: 'heart-pickup', passive: true, desc: l => `最大生命 +25 并回满（当前 +${l * 25}）` },
  magnet:   { name: '磁力', icon: 'xp-orb', passive: true, desc: l => `拾取范围 +30%（当前 +${l * 30}%）` },
  haste:    { name: '奥术急速', icon: 'level-up', passive: true, desc: l => `技能冷却 -8%（当前 -${l * 8}%）` },
};
const MAXLV = 5;
const ENEMY = {  // 种类: 血量, 速度, 伤害, 缩放, 经验
  slime: { hp: 14, sp: 22, dmg: 6, sc: 0.45, xp: 1, r: 7 },
  bat: { hp: 10, sp: 38, dmg: 5, sc: 0.4, xp: 1, r: 7 },
  ghost: { hp: 30, sp: 26, dmg: 9, sc: 0.45, xp: 2, r: 8 },
  'flying-skull': { hp: 45, sp: 34, dmg: 12, sc: 0.42, xp: 3, r: 8 },
  wisp: { hp: 60, sp: 44, dmg: 12, sc: 0.4, xp: 4, r: 8 },
  eyeball: { hp: 3500, sp: 20, dmg: 25, sc: 1.3, xp: 0, r: 26, boss: true },
};

// ---------- 状态 ----------
let state = 'loading', G = null, best = +(localStorage.getItem('ps_best') || 0), coinsBank = +(localStorage.getItem('ps_coins') || 0);
function newGame() {
  G = {
    t: 0, p: { x: 0, y: 0, hp: 100, maxhp: 100, face: 1, inv: 0, walk: 0 },
    lv: 1, xp: 0, need: 5, skills: { fireball: 1 }, cd: {}, enemies: [], shots: [], orbs: [], fx: [], nums: [], zones: [], bolts: [],
    kills: 0, score: 0, coins: 0, spawnT: 0, boss: null, bossSpawned: false, revived: false, choices: null, shake: 0, chest: null,
  };
  state = 'play';
}
const lvOf = k => G.skills[k] || 0;
const cdMul = () => 1 - lvOf('haste') * 0.08;
function addFx(n, x, y, o = {}) { if (G.fx.length > 120) return; G.fx.push({ n, x, y, t: 0, sc: o.sc ?? 0.5, rot: o.rot || 0, a: o.a ?? 1 }); }
function num(x, y, v, crit) { if (G.nums.length > 60) G.nums.shift(); G.nums.push({ x, y, v, t: 0, crit }); }

function hurt(e, d) {
  if (e.dead) return;
  const crit = Math.random() < 0.12; if (crit) d *= 2;
  d = Math.round(d); e.hp -= d; e.flash = 0.08;
  if (crit) addFx('crit-number', e.x, e.y - 6, { sc: 0.35 }); else num(e.x, e.y - 8, d);
  if (e.hp <= 0) kill(e);
}
function kill(e) {
  e.dead = true; G.kills++; G.score += e.boss ? 5000 : ENEMY[e.k].xp * 10;
  addFx('poof', e.x, e.y + 6, { sc: e.boss ? 1 : 0.35 });
  if (e.boss) { addFx('big-explosion', e.x, e.y + 30, { sc: 0.6 }); G.shake = 0.6; G.chest = { x: e.x, y: e.y, t: 0, open: false }; return; }
  G.orbs.push({ x: e.x, y: e.y, v: ENEMY[e.k].xp, t: Math.random() * 2, kind: Math.random() < 0.015 ? 'heart' : 'xp' });
  if (Math.random() < 0.08) G.coins++;
}
function nearest(x, y, skip) {
  let b = null, bd = 1e9; for (const e of G.enemies) { if (e.dead || (skip && skip.has(e))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b ? [b, Math.sqrt(bd)] : [null, 1e9];
}

// ---------- 技能逻辑 ----------
function castSkills(dt) {
  const p = G.p;
  for (const k in G.skills) {
    if (SKILLS[k].passive) continue;
    G.cd[k] = (G.cd[k] ?? 0.5) - dt; if (G.cd[k] > 0) continue;
    const l = G.skills[k]; let ok = true;
    if (k === 'fireball') {
      const [t, d] = nearest(p.x, p.y); if (!t || d > 200) { ok = false; } else {
        const n = 1 + (l >= 3) + (l >= 5), base = Math.atan2(t.y - p.y, t.x - p.x);
        for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.25; G.shots.push({ x: p.x, y: p.y - 4, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, life: 1.5, dmg: 10 + l * 6, t: 0 }); }
        G.cd[k] = 0.9 * cdMul();
      }
    } else if (k === 'chain') {
      let [t, d] = nearest(p.x, p.y); if (!t || d > 150) ok = false; else {
        const hit = new Set(); let fx = p.x, fy = p.y - 4;
        for (let i = 0; i < 2 + l && t; i++) { hit.add(t); G.bolts.push({ x1: fx, y1: fy, x2: t.x, y2: t.y, t: 0.18 }); addFx('zap-hit', t.x, t.y, { sc: 0.3 }); hurt(t, 8 + l * 5); fx = t.x; fy = t.y; const r = nearest(fx, fy, hit); t = r[1] < 90 ? r[0] : null; }
        G.cd[k] = 1.6 * cdMul();
      }
    } else if (k === 'frost') {
      const R = 40 + l * 8; addFx('frost-nova', p.x, p.y + 20 * R / 104, { sc: R / 104 });
      G.zones.push({ x: p.x, y: p.y, r: R, dmg: 6 + l * 4, delay: 0.25, once: true, slow: 1.5 });
      G.cd[k] = 3.2 * cdMul();
    } else if (k === 'holy') {
      const alive = G.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < VW / 2 && Math.abs(e.y - p.y) < VH / 2);
      if (!alive.length) ok = false; else {
        for (let i = 0; i < l; i++) { const e = alive[(Math.random() * alive.length) | 0]; addFx('holy-pillar', e.x, e.y + 6, { sc: 0.35 }); G.zones.push({ x: e.x, y: e.y, r: 22, dmg: 25 + l * 10, delay: 0.5, once: true }); }
        G.cd[k] = 2.8 * cdMul();
      }
    } else if (k === 'shadow') {
      const [t, d] = nearest(p.x, p.y); if (!t || d > 160) ok = false; else {
        addFx('shadow-tendrils', t.x, t.y + 10, { sc: 0.4 });
        G.zones.push({ x: t.x, y: t.y, r: 30, dmg: 4 + l * 3, delay: 0.3, dur: 2.6, tick: 0.25 });
        G.cd[k] = 4 * cdMul();
      }
    }
    if (!ok) G.cd[k] = 0.2;
  }
}

// ---------- 刷怪 ----------
function spawn(k) {
  const a = Math.random() * Math.PI * 2, R = 280, d = ENEMY[k], hpMul = 1 + G.t / 120;
  const e = { k, x: G.p.x + Math.cos(a) * R * 0.75, y: G.p.y + Math.sin(a) * R, hp: d.hp * (d.boss ? 1 : hpMul), t: Math.random() * 3, slow: 0, flash: 0, boss: d.boss };
  e.maxhp = e.hp; G.enemies.push(e); return e;
}
function spawner(dt) {
  if (G.t >= GAME_LEN) { if (!G.bossSpawned) { G.bossSpawned = true; G.boss = spawn('eyeball'); G.shake = 0.4; } if (G.boss && !G.boss.dead && G.enemies.length < 40) { G.spawnT -= dt; if (G.spawnT < 0) { G.spawnT = 1.2; spawn('bat'); } } return; }
  const m = G.t / 60, rate = 0.9 + m * 1.6;      // 每秒刷怪数随时间上涨
  G.spawnT -= dt * rate; if (G.enemies.length > 160) return;
  while (G.spawnT < 0) {
    G.spawnT += 1; const pool = ['slime']; if (m > 0.5) pool.push('bat'); if (m > 1.5) pool.push('ghost'); if (m > 2.5) pool.push('flying-skull'); if (m > 3.5) pool.push('wisp');
    spawn(pool[(Math.random() * pool.length) | 0]);
  }
}

// ---------- 升级 ----------
function rollChoices() {
  const opts = Object.keys(SKILLS).filter(k => lvOf(k) < MAXLV);
  const out = []; while (out.length < 3 && opts.length) out.push(opts.splice((Math.random() * opts.length) | 0, 1)[0]);
  return out;
}
function pick(k) {
  G.skills[k] = lvOf(k) + 1;
  if (k === 'vital') { G.p.maxhp += 25; G.p.hp = G.p.maxhp; }
  G.choices = null; state = 'play';
}

// ---------- 更新 ----------
function update(dt) {
  const p = G.p; G.t += dt;
  const [mx, my] = moveVec(), sp = 60 * (1 + lvOf('speed') * 0.12);
  p.x += mx * sp * dt; p.y += my * sp * dt; if (mx) p.face = mx > 0 ? 1 : -1; p.walk += Math.hypot(mx, my) * dt; p.inv -= dt;
  spawner(dt); castSkills(dt);
  // 敌人
  for (const e of G.enemies) {
    if (e.dead) continue; const d = ENEMY[e.k]; e.t += dt; e.flash -= dt; e.slow -= dt;
    const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1, s = d.sp * (e.slow > 0 ? 0.45 : 1) * (1 + G.t / 600);
    e.x += dx / L * s * dt; e.y += dy / L * s * dt;
    if (L > 420 && !e.boss) { e.dead = true; continue; }       // 太远直接回收
    if (L < d.r + 6 && p.inv <= 0) { p.hp -= d.dmg; p.inv = 0.5; G.shake = 0.15; addFx('hit-spark', p.x, p.y, { sc: 0.3 }); }
  }
  // 简单分离，避免怪物叠成一团（只做相邻采样，O(n) 级别）
  const es = G.enemies; for (let i = 0; i < es.length; i++) { const a = es[i], b = es[(i * 7 + 3) % es.length]; if (a === b || a.dead || b.dead) continue; const dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy), m = ENEMY[a.k].r + ENEMY[b.k].r; if (L > 0 && L < m) { const k = (m - L) / L * 0.5; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; } }
  // 火球
  for (const s of G.shots) {
    s.t += dt; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    for (const e of G.enemies) if (!e.dead && Math.abs(e.x - s.x) < ENEMY[e.k].r + 4 && Math.abs(e.y - s.y) < ENEMY[e.k].r + 4) { hurt(e, s.dmg); addFx('hit-spark', s.x, s.y, { sc: 0.3, rot: Math.atan2(s.vy, s.vx) }); s.life = 0; break; }
  }
  G.shots = G.shots.filter(s => s.life > 0);
  // 范围伤害区
  for (const z of G.zones) {
    z.delay -= dt; if (z.delay > 0) continue;
    if (z.once) { for (const e of G.enemies) if (!e.dead && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + ENEMY[e.k].r) ** 2) { hurt(e, z.dmg); if (z.slow) e.slow = z.slow; } z.done = true; }
    else { z.dur -= dt; z.acc = (z.acc || 0) - dt; if (z.acc <= 0) { z.acc = z.tick; for (const e of G.enemies) if (!e.dead && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + ENEMY[e.k].r) ** 2) hurt(e, z.dmg); } if (z.dur <= 0) z.done = true; }
  }
  G.zones = G.zones.filter(z => !z.done);
  G.enemies = G.enemies.filter(e => !e.dead);
  // 经验球
  const mag = 28 * (1 + lvOf('magnet') * 0.3);
  for (const o of G.orbs) {
    o.t += dt; const dx = p.x - o.x, dy = p.y - o.y, L = Math.hypot(dx, dy);
    if (L < mag || o.pull) { o.pull = true; o.x += dx / (L || 1) * 200 * dt; o.y += dy / (L || 1) * 200 * dt; }
    if (L < 6) { o.got = true; if (o.kind === 'heart') { p.hp = Math.min(p.maxhp, p.hp + 30); } else { G.xp += o.v; } }
  }
  G.orbs = G.orbs.filter(o => !o.got); if (G.orbs.length > 300) G.orbs.splice(0, G.orbs.length - 300);
  if (G.xp >= G.need) { G.xp -= G.need; G.lv++; G.need = Math.floor(5 + G.lv * 3.5); addFx('level-up', p.x, p.y + 10, { sc: 0.45 }); G.choices = rollChoices(); if (G.choices.length) state = 'levelup'; }
  // 特效
  for (const f of G.fx) f.t += dt; G.fx = G.fx.filter(f => !animDone(f.n, f.t));
  for (const n of G.nums) n.t += dt; G.nums = G.nums.filter(n => n.t < 0.7);
  for (const b of G.bolts) b.t -= dt; G.bolts = G.bolts.filter(b => b.t > 0);
  G.shake = Math.max(0, G.shake - dt);
  // 宝箱 → 胜利
  if (G.chest) { const c = G.chest; c.t += dt; if (!c.open && Math.hypot(p.x - c.x, p.y - c.y) < 16) { c.open = true; c.ot = 0; G.coins += 50; G.score += 2000; } if (c.open) { c.ot += dt; if (c.ot > 3.2) endGame(true); } }
  if (p.hp <= 0) { p.hp = 0; endGame(false); }
}
function endGame(win) {
  state = win ? 'win' : 'dead'; G.win = win; G.score += Math.floor(G.t) * 5;
  if (G.score > best) { best = G.score; localStorage.setItem('ps_best', best); }
}
function revive() { const p = G.p; p.hp = p.maxhp; p.inv = 2; G.revived = true; for (const e of G.enemies) if (!e.boss && Math.hypot(e.x - p.x, e.y - p.y) < 120) kill(e); G.enemies = G.enemies.filter(e => !e.dead); addFx('holy-pillar', p.x, p.y + 8, { sc: 0.5 }); state = 'play'; }
function bankCoins(mul) { coinsBank += G.coins * mul; localStorage.setItem('ps_coins', coinsBank); G.banked = mul; }

// ---------- 绘制 ----------
const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px "PingFang SC","Microsoft YaHei",sans-serif`;
function txt(s, x, y, px, col = '#fff', align = 'center', bold = true) { ctx.font = font(px, bold); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(s, x, y); }
function btn(id, label, x, y, w, h, col = '#3a6ee8') {
  ctx.fillStyle = '#000a'; ctx.fillRect(x + 2, y + 2, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff3'; ctx.fillRect(x, y, w, 3);
  txt(label, x + w / 2, y + h / 2 + 1, 13); UI.push({ id, x, y, w, h });
}
let UI = [];
function drawBg(cx, cy) {
  ctx.fillStyle = '#1b2a22'; ctx.fillRect(0, 0, VW, VH);
  const T = 24, x0 = Math.floor((cx - VW / 2) / T) - 1, y0 = Math.floor((cy - VH / 2) / T) - 1;
  for (let j = y0; j < y0 + VH / T + 3; j++) for (let i = x0; i < x0 + VW / T + 3; i++) {
    const h = (i * 73856093 ^ j * 19349663) >>> 0, sx = Math.round(i * T - cx + VW / 2), sy = Math.round(j * T - cy + VH / 2);
    if ((i + j) & 1) { ctx.fillStyle = '#1f3027'; ctx.fillRect(sx, sy, T, T); }
    if (h % 5 === 0) { ctx.fillStyle = '#2f4a37'; ctx.fillRect(sx + h % 17, sy + (h >> 5) % 17, 2, 3); ctx.fillRect(sx + h % 17 + 3, sy + (h >> 5) % 17 + 1, 2, 2); }
    if (h % 23 === 0) { ctx.fillStyle = '#5a4a6a'; ctx.fillRect(sx + 8, sy + 10, 3, 2); }
  }
}
// 代码绘制的像素小法师
const HERO = ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '...ffff...', '...fefe...', '...ffff...', '..rrrrrr..', '.rrrrrrrr.', '.frrggrrf.', '..rrrrrr..', '..rrrrrr..', '..b....b..'];
const HC = { h: '#4b2c9a', f: '#f3c9a0', e: '#1a1020', r: '#6a3fd0', g: '#ffd84a', b: '#3a2410' };
function drawHero(x, y, face, walk, blink) {
  if (blink) return; const bob = Math.floor(walk * 8) % 2;
  ctx.fillStyle = '#0006'; ctx.fillRect(x - 5, y + 6, 10, 2);
  for (let j = 0; j < HERO.length; j++) for (let i = 0; i < 10; i++) { const c = HERO[j][face > 0 ? i : 9 - i]; if (c === '.') continue; ctx.fillStyle = HC[c]; ctx.fillRect(x - 5 + i, y - 6 + j - (j < 11 ? bob : 0), 1, 1); }
  ctx.fillStyle = '#9fe8ff'; ctx.fillRect(x + face * 6, y - 4 - bob, 1, 7); ctx.fillStyle = '#fff'; ctx.fillRect(x + face * 6 - 1, y - 6 - bob, 3, 2);
}
function drawWorld() {
  const p = G.p, sx = G.shake > 0 ? (Math.random() - 0.5) * 6 : 0, sy = G.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
  const cx = p.x + sx, cy = p.y + sy; drawBg(cx, cy);
  ctx.save(); ctx.translate(Math.round(VW / 2 - cx), Math.round(VH / 2 - cy));
  const vis = (x, y, m = 60) => Math.abs(x - p.x) < VW / 2 + m && Math.abs(y - p.y) < VH / 2 + m;
  for (const o of G.orbs) if (vis(o.x, o.y)) drawSprite(o.kind === 'heart' ? 'heart-pickup' : 'xp-orb', o.t, o.x, o.y + 4, o.kind === 'heart' ? 0.3 : 0.22);
  if (G.chest) { const c = G.chest; drawSprite('chest-open', c.open ? c.ot + 0.01 : 0, c.x, c.y + 8, 0.4); if (!c.open) txt('拾取宝箱', c.x, c.y - 22, 9, '#ffe680'); }
  for (const f of G.fx) if (f.n === 'shadow-tendrils' || f.n === 'frost-nova') drawSprite(f.n, f.t, f.x, f.y, f.sc, f.rot);
  const list = G.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of list) { if (!vis(e.x, e.y)) continue; const d = ENEMY[e.k]; drawSprite(e.k, e.t, e.x, e.y, d.sc, 0, true, e.x > p.x, e.flash > 0 ? 0.45 : 1); if (e.slow > 0) { ctx.fillStyle = '#8fdcff'; ctx.fillRect(e.x - 1, e.y - d.r - 3, 2, 2); } }
  drawHero(Math.round(p.x), Math.round(p.y), p.face, p.walk, p.inv > 0 && Math.floor(p.inv * 20) % 2);
  for (const s of G.shots) drawSprite('fireball', s.t, s.x, s.y, 0.3, Math.atan2(s.vy, s.vx));
  for (const b of G.bolts) { ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); for (let i = 1; i < 6; i++) { const k = i / 6; ctx.lineTo(b.x1 + (b.x2 - b.x1) * k + (Math.random() - 0.5) * 8, b.y1 + (b.y2 - b.y1) * k + (Math.random() - 0.5) * 8); } ctx.lineTo(b.x2, b.y2); ctx.stroke(); }
  for (const f of G.fx) if (f.n !== 'shadow-tendrils' && f.n !== 'frost-nova') drawSprite(f.n, f.t, f.x, f.y, f.sc, f.rot);
  for (const n of G.nums) { ctx.globalAlpha = 1 - n.t / 0.7; txt(String(n.v), n.x, n.y - n.t * 20, 8, '#fff'); ctx.globalAlpha = 1; }
  if (G.boss && !G.boss.dead && !vis(G.boss.x, G.boss.y, -20)) { const a = Math.atan2(G.boss.y - p.y, G.boss.x - p.x); txt('▶', p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, 12, '#ff5050'); }
  ctx.restore();
}
function drawHUD() {
  const p = G.p;
  ctx.fillStyle = '#0008'; ctx.fillRect(0, 0, VW, 6); ctx.fillStyle = '#7fe04a'; ctx.fillRect(0, 0, VW * G.xp / G.need, 6);
  txt(`Lv.${G.lv}`, 6, 15, 10, '#fff', 'left');
  const left = Math.max(0, GAME_LEN - G.t), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, '0');
  txt(G.t < GAME_LEN ? `${mm}:${ss}` : 'BOSS!', VW / 2, 16, 14, G.t < GAME_LEN ? '#fff' : '#ff5050');
  txt(`击杀 ${G.kills}`, VW - 6, 15, 10, '#fff', 'right'); txt(`金币 ${G.coins}`, VW - 6, 28, 10, '#ffd84a', 'right');
  ctx.fillStyle = '#000a'; ctx.fillRect(6, 24, 70, 7); ctx.fillStyle = '#e0303a'; ctx.fillRect(7, 25, 68 * p.hp / p.maxhp, 5); txt(`${Math.ceil(p.hp)}`, 41, 28, 7);
  let i = 0; for (const k in G.skills) { const x = 6 + i * 26, y = VH - 30; ctx.fillStyle = '#0009'; ctx.fillRect(x, y, 24, 24); drawSprite(SKILLS[k].icon, 0.4, x + 12, y + 12, 24 / Math.max(SHEETS[SKILLS[k].icon].fw, SHEETS[SKILLS[k].icon].fh) * 1.6, 0, CRITTERS.includes(SKILLS[k].icon) ? true : false); txt(String(G.skills[k]), x + 20, y + 20, 8, '#ffe680'); i++; }
  if (G.boss && !G.boss.dead) { ctx.fillStyle = '#000a'; ctx.fillRect(30, 40, VW - 60, 8); ctx.fillStyle = '#b02cd0'; ctx.fillRect(31, 41, (VW - 62) * G.boss.hp / G.boss.maxhp, 6); txt('深渊之眼', VW / 2, 54, 9, '#f0b0ff'); }
  btn('pause', 'II', VW - 26, 36, 20, 18, '#555');
  if (input.active && state === 'play') { ctx.strokeStyle = '#fff5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(input.bx, input.by, 30, 0, 7); ctx.stroke(); const dx = input.px - input.bx, dy = input.py - input.by, L = Math.hypot(dx, dy), m = Math.min(L, 30) / (L || 1); ctx.fillStyle = '#fff6'; ctx.beginPath(); ctx.arc(input.bx + dx * m, input.by + dy * m, 12, 0, 7); ctx.fill(); }
}
function panel(y, h) { ctx.fillStyle = '#000b'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#1a1530'; ctx.fillRect(16, y, VW - 32, h); ctx.strokeStyle = '#8a6cff'; ctx.lineWidth = 2; ctx.strokeRect(16, y, VW - 32, h); }
let titleT = 0;
function drawTitle() {
  drawBg(titleT * 10, 0); titleT += 1 / 60;
  drawSprite('bat', titleT, 60, 120, 0.6, 0, true); drawSprite('ghost', titleT, 210, 130, 0.6, 0, true, true); drawSprite('slime', titleT, 135, 330, 0.7, 0, true);
  drawSprite('fireball', titleT, 135, 200, 0.6);
  txt('像素幸存者', VW / 2, 160, 30, '#ffd84a'); txt('Pixel Survivor · Demo', VW / 2, 188, 11, '#c8b8ff', 'center', false);
  btn('start', '开始游戏', VW / 2 - 60, 380, 120, 34, '#e0603a'); btn('credits', '关于 / 致谢', VW / 2 - 60, 424, 120, 26, '#555');
  txt(`最高分 ${best}   金币 ${coinsBank}`, VW / 2, 362, 10, '#fff', 'center', false);
}
function drawCredits() {
  drawBg(0, 0); panel(40, 400);
  const L = ['关于 / 致谢', '', '像素特效 & 怪物素材：', 'pixelfx by Patch & Hugo Duprez', 'github.com/patch-gg/pixelfx', 'MIT License, Copyright (c) Patch', '部分特效改编自 Sprite Fusion', 'pixel art VFX (Hugo Duprez, MIT)', '', 'MIT 许可摘要：', '允许免费使用、复制、修改、合并、', '发布、分发、再许可和/或销售，', '须在所有副本中保留版权声明及本', '许可声明。软件按"原样"提供，不', '提供任何形式的担保。', '完整协议见 LICENSE-pixelfx.txt', '', '玩法/代码：Demo 原型'];
  L.forEach((s, i) => txt(s, VW / 2, 62 + i * 18, i === 0 ? 15 : 10, i === 0 ? '#ffd84a' : '#fff', 'center', i === 0));
  btn('back', '返回', VW / 2 - 45, 392, 90, 28);
}
function drawLevelUp() {
  panel(70, 340); txt('升级！选择一项', VW / 2, 92, 15, '#ffd84a');
  G.choices.forEach((k, i) => {
    const y = 112 + i * 96, s = SKILLS[k], l = lvOf(k) + 1; ctx.fillStyle = '#2b2350'; ctx.fillRect(26, y, VW - 52, 86); UI.push({ id: 'pick:' + k, x: 26, y, w: VW - 52, h: 86 });
    ctx.fillStyle = '#0006'; ctx.fillRect(32, y + 6, 46, 46); const ic = SHEETS[s.icon]; drawSprite(s.icon, 0.5, 55, y + 29, 46 / Math.max(ic.fw, ic.fh) * 1.5, 0, CRITTERS.includes(s.icon));
    txt(s.name, 86, y + 16, 13, '#fff', 'left'); txt(l === 1 ? '新！' : `Lv.${l}`, VW - 34, y + 16, 11, l === 1 ? '#7fe04a' : '#ffd84a', 'right');
    txt(s.passive ? '被动' : '主动技能', 86, y + 34, 9, '#a89cff', 'left', false);
    wrap(s.desc(l), 34, y + 62, VW - 72, 10);
  });
}
function wrap(s, x, y, w, px) { ctx.font = font(px); let line = '', yy = y; for (const ch of s) { if (ctx.measureText(line + ch).width > w) { txt(line, x, yy, px, '#ddd', 'left', false); line = ''; yy += px + 3; } line += ch; } txt(line, x, yy, px, '#ddd', 'left', false); }
function drawEnd() {
  const win = G.win; panel(90, 320); txt(win ? '胜利！' : '你倒下了', VW / 2, 120, 22, win ? '#ffd84a' : '#ff6060');
  if (win) drawSprite('coin-collect', (performance.now() / 1000) % 2.4, VW / 2 - 20, 200, 0.5);
  txt(`存活 ${Math.floor(G.t / 60)}分${Math.floor(G.t % 60)}秒   击杀 ${G.kills}`, VW / 2, 156, 11);
  txt(`得分 ${G.score}   最高 ${best}`, VW / 2, 176, 11, '#c8b8ff');
  txt(`本局金币 ${G.coins}`, VW / 2, 214, 13, '#ffd84a');
  let y = 240;
  if (!win && !G.revived) { btn('revive', '▶ 看广告复活（模拟）', 40, y, VW - 80, 34, '#2fa84f'); y += 44; }
  if (!G.banked) { btn('triple', '▶ 看广告 三倍金币（模拟）', 40, y, VW - 80, 34, '#d08a1a'); y += 44; btn('normal', '直接领取', 40, y, VW - 80, 26, '#555'); }
  else { txt(`已领取 ${G.coins * G.banked} 金币`, VW / 2, y + 12, 12, '#7fe04a'); y += 30; btn('again', '再来一局', 40, y, VW - 80, 32, '#e0603a'); btn('home', '返回首页', 40, y + 40, VW - 80, 26, '#555'); }
  txt('* 广告为占位 Mock，未接入真实广告', VW / 2, 398, 8, '#888', 'center', false);
}
function drawPause() { panel(150, 180); txt('暂停', VW / 2, 180, 18); btn('resume', '继续', 60, 210, VW - 120, 32, '#3a6ee8'); btn('home', '放弃并返回首页', 60, 254, VW - 120, 28, '#555'); }
function drawAd() { ctx.fillStyle = '#000e'; ctx.fillRect(0, 0, VW, VH); txt('【模拟激励视频广告】', VW / 2, VH / 2 - 20, 14, '#ffd84a'); txt(`${Math.ceil(Ads._active.t)} 秒后发放奖励`, VW / 2, VH / 2 + 10, 12); }

function handleTap(x, y) {
  if (Ads.busy) return;
  const b = UI.find(u => x >= u.x && x <= u.x + u.w && y >= u.y && y <= u.y + u.h); if (!b) return false;
  const id = b.id;
  if (id === 'start' || id === 'again') newGame();
  else if (id === 'credits') state = 'credits';
  else if (id === 'back' || id === 'home') { state = 'title'; }
  else if (id === 'pause') state = 'pause';
  else if (id === 'resume') state = 'play';
  else if (id.startsWith('pick:')) pick(id.slice(5));
  else if (id === 'revive') Ads.showRewarded('revive', ok => ok && revive());
  else if (id === 'triple') Ads.showRewarded('triple_reward', ok => ok && bankCoins(3));
  else if (id === 'normal') bankCoins(1);
  return true;
}

// ---------- 主循环 ----------
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = fpsN = 0; }
  for (const [x, y] of input.taps) { const hit = handleTap(x, y); if (hit) input.active = false; } input.taps.length = 0;
  Ads.update(dt);
  if (state === 'play' && !Ads.busy) update(dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(S, 0, 0, S, OX, OY); ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  UI = [];
  if (state === 'loading') { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, VW, VH); txt('加载中…', VW / 2, VH / 2, 14); }
  else if (state === 'title') drawTitle();
  else if (state === 'credits') drawCredits();
  else { drawWorld(); drawHUD(); if (state === 'levelup') { UI = []; drawLevelUp(); } else if (state === 'dead' || state === 'win') { UI = []; drawEnd(); } else if (state === 'pause') { UI = []; drawPause(); } }
  if (Ads.busy) drawAd();
  if (/[?&]debug/.test(location.search)) txt(`${fps}fps e${G ? G.enemies.length : 0}`, 4, VH - 40, 8, '#0f0', 'left');
  ctx.restore();
  requestAnimationFrame(frame);
}
loadAll(() => { state = 'title'; const q = location.search; if (/autostart/.test(q)) { newGame(); const m = q.match(/t=(\d+)/); if (m) { G.t = +m[1]; G.skills = { fireball: 3, chain: 2, frost: 2, holy: 2, shadow: 1 }; } } });
window.__game = () => ({ state, G });
requestAnimationFrame(frame);
})();
