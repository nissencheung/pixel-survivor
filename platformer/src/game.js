// 像素湖影 — 横版动作。逻辑分辨率 480×270，最近邻放大。无依赖。
(() => {
  'use strict';
  const VW = 480, VH = 270, GROUND = 208;
  const FONT = '"WenQuanYi Micro Hei","Droid Sans Fallback",sans-serif';
  const Q = new URLSearchParams(location.search);
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  const buf = document.createElement('canvas');
  buf.width = VW; buf.height = VH;
  const b = buf.getContext('2d');
  const flashC = document.createElement('canvas');
  flashC.width = 512; flashC.height = 512;
  const flashG = flashC.getContext('2d');

  window.SHEETS = Object.assign(window.SHEETS || {}, window.FXSHEETS || {});
  const SHEETS = window.SHEETS;
  const IMG = {};
  const PX = window.__PX = { errors: [], fps: 0, frames: 0, state: 'loading', ready: false, fx: 0, level: 0, weapon: '', hp: 0 };
  addEventListener('error', (e) => PX.errors.push(String(e.message || e.error)));
  addEventListener('unhandledrejection', (e) => PX.errors.push(String(e.reason)));

  const EDEF = {
    slime: { sc: 0.52, hp: 34, dmg: 8, sp: 30, fly: 0, hw: 11, hh: 10, lift: 14 },
    bat: { sc: 0.5, hp: 18, dmg: 7, sp: 44, fly: 1, hw: 11, hh: 8, lift: 10 },
    ghost: { sc: 0.5, hp: 38, dmg: 8, sp: 28, fly: 1, hw: 11, hh: 11, lift: 12 },
    'flying-skull': { sc: 0.44, hp: 30, dmg: 9, sp: 34, fly: 1, hw: 11, hh: 11, lift: 16 },
    eyeball: { sc: 0.92, hp: 230, dmg: 10, sp: 24, fly: 1, hw: 20, hh: 16, lift: 22 },
  };
  const ORDER = ['sword', 'hammer', 'spear', 'gun', 'rocket'];
  const WEAPONS = {
    sword: {
      name: '长剑', snd: 'sword', speed: 138,
      combo: [
        { dmg: 12, kb: 120, reach: 38, h: 22, y: 24, hit: 0.08, dur: 0.28, chain: 0.14, stop: 0.045, shake: 2.4, fx: [{ n: 'sword-combo', t0: 0, t1: 0.48, sc: 1, follow: 1, glow: 1 }] },
        { dmg: 15, kb: 150, reach: 42, h: 24, y: 24, hit: 0.08, dur: 0.3, chain: 0.16, stop: 0.05, shake: 3, fx: [{ n: 'double-slash', sc: 1, follow: 1, glow: 1 }] },
        { dmg: 22, kb: 190, reach: 36, h: 28, y: 28, hit: 0.1, dur: 0.4, chain: 9, stop: 0.065, shake: 4.5, aoe: 44, fx: [{ n: 'spin-slash', sc: 1.08, follow: 1, glow: 1 }] },
      ],
      skill: { dmg: 26, kb: 210, aoe: 56, reach: 34, h: 30, y: 30, hit: 0.1, dur: 0.46, cd: 4, stop: 0.07, shake: 5, fx: [{ n: 'uppercut', sc: 1.05, follow: 1, glow: 1 }, { n: 'spin-slash', sc: 1.18, follow: 1, glow: 1 }] },
    },
    hammer: {
      name: '重锤', snd: 'hammer', speed: 96,
      combo: [
        { dmg: 28, kb: 290, reach: 48, h: 26, y: 22, hit: 0.3, dur: 0.54, chain: 0.34, stop: 0.09, shake: 6.5, fx: [{ n: 'hammer-smash', sc: 1.05, follow: 1, glow: 1 }] },
        { dmg: 34, kb: 330, reach: 52, h: 28, y: 24, hit: 0.24, dur: 0.5, chain: 0.3, stop: 0.09, shake: 7, fx: [{ n: 'heavy-cleave', sc: 1.02, follow: 1, glow: 1 }] },
        { dmg: 42, kb: 380, aoe: 64, reach: 42, h: 24, y: 18, hit: 0.22, dur: 0.58, chain: 9, stop: 0.1, shake: 8, fx: [{ n: 'ground-slam', sc: 0.72, follow: 1, glow: 1 }] },
      ],
      skill: { dmg: 50, kb: 420, aoe: 82, hit: 0.18, dur: 0.52, cd: 5, stop: 0.11, shake: 9, fx: [{ n: 'ground-slam', sc: 0.86, follow: 1, glow: 1 }, { n: 'impact-frame', screen: 1, life: 0.26 }] },
    },
    spear: {
      name: '枪鞭', snd: 'spear', speed: 132,
      combo: [
        { dmg: 13, kb: 90, reach: 88, h: 12, y: 18, hit: 0.06, dur: 0.24, chain: 0.12, stop: 0.03, shake: 1.6, fx: [{ n: 'thrust', sc: 1, follow: 1, glow: 1 }] },
        { dmg: 16, kb: 140, reach: 76, h: 18, y: 12, hit: 0.1, dur: 0.32, chain: 0.16, stop: 0.04, shake: 2.4, fx: [{ n: 'spear-sweep', sc: 1, follow: 1, glow: 1 }] },
        { dmg: 18, kb: 120, reach: 100, h: 14, y: 18, hit: 0.08, dur: 0.32, chain: 9, stop: 0.045, shake: 2.6, fx: [{ n: 'whip-crack', sc: 1.06, follow: 1, glow: 1 }] },
      ],
      skill: { dmg: 24, kb: 160, reach: 104, h: 18, y: 18, hit: 0.08, dur: 0.38, cd: 3.6, stop: 0.05, shake: 3.2, fx: [{ n: 'whip-crack', sc: 1.16, follow: 1, glow: 1 }, { n: 'thrust', sc: 1, follow: 1, glow: 1 }] },
    },
    gun: {
      name: '火枪', snd: 'gun', speed: 126,
      combo: [
        { shot: 'pistol', hit: 9, dur: 0.2, chain: 0.1, stop: 0.02, shake: 1.2, fx: [] },
        { shot: 'smg', hit: 9, dur: 0.42, chain: 0.18, stop: 0.02, shake: 1.6, fx: [] },
        { shot: 'shotgun', hit: 9, dur: 0.42, chain: 9, stop: 0.04, shake: 3.4, fx: [] },
      ],
      skill: { shot: 'shotgun', hit: 9, dur: 0.4, cd: 3.2, stop: 0.05, shake: 4, fx: [] },
    },
    rocket: {
      name: '火箭筒', snd: 'rocket', speed: 110,
      combo: [{ rocket: 1, hit: 9, dur: 0.95, chain: 9, stop: 0, shake: 0, fx: [] }],
      skill: { rocket: 2, hit: 9, dur: 1.05, cd: 2.8, stop: 0, shake: 0, fx: [] },
    },
  };

  const LEVELS = [
    {
      name: '晴林湖畔', theme: 'sun', seed: 3, len: 2200, goal: 2060,
      gaps: [[900, 1400]],
      plats: [{ x: 500, y: 160, w: 72 }, { x: 990, y: 162, w: 104 }, { x: 1150, y: 116, w: 84 }, { x: 1290, y: 162, w: 92 }, { x: 1580, y: 156, w: 84 }, { x: 1760, y: 114, w: 70 }],
      checks: [64, 760, 1480],
      coins: [180, 240, 340, 430, 560, 680, 760, 1030, 1190, 1330, 1620, 1790, 1920, 2000].map((x, i) => ({ x, y: [160, GROUND, GROUND, GROUND, 160, GROUND, GROUND, 162, 116, 162, 156, 114, GROUND, GROUND][i] })),
      hearts: [{ x: 740, y: GROUND }, { x: 1680, y: GROUND }],
      enemies: [{ k: 'slime', x: 230 }, { k: 'slime', x: 450 }, { k: 'bat', x: 1060, y: 92 }, { k: 'bat', x: 1230, y: 74 }, { k: 'slime', x: 1560 }, { k: 'slime', x: 1880 }, { k: 'bat', x: 1960, y: 96 }],
      weapons: [{ id: 'hammer', x: 640 }],
      shrine: { x: 1980 },
      groves: [{ x: 380 }, { x: 1700 }],
    },
    {
      name: '雷雨栈道', theme: 'storm', seed: 8, len: 2360, goal: 2220, lightning: true,
      gaps: [[700, 1080], [1560, 1900]],
      plats: [{ x: 760, y: 158, w: 96 }, { x: 910, y: 112, w: 84 }, { x: 1620, y: 156, w: 100 }, { x: 1760, y: 112, w: 78 }],
      movers: [{ a: 1160, b: 1420, y: 164, w: 74, sp: 40 }],
      checks: [70, 1120, 1960],
      coins: [200, 300, 420, 560, 800, 950, 1280, 1660, 1800, 2060].map((x, i) => ({ x, y: [GROUND, GROUND, GROUND, GROUND, 158, 112, 164, 156, 112, GROUND][i] })),
      hearts: [{ x: 1240, y: GROUND }, { x: 2040, y: GROUND }],
      enemies: [{ k: 'slime', x: 280 }, { k: 'ghost', x: 820, y: 118 }, { k: 'flying-skull', x: 990, y: 96 }, { k: 'ghost', x: 1700, y: 108 }, { k: 'flying-skull', x: 1840, y: 88 }, { k: 'slime', x: 2080 }],
      weapons: [{ id: 'spear', x: 480 }, { id: 'gun', x: 1320 }],
      shrine: { x: 2140 },
      clouds: [{ x: 260, y: 120 }, { x: 880, y: 102 }, { x: 1500, y: 112 }, { x: 2060, y: 100 }],
    },
    {
      name: '极光雪原', theme: 'snow', seed: 11, len: 2460, goal: 2320, arena: 1760,
      gaps: [],
      plats: [{ x: 420, y: 158, w: 84 }, { x: 680, y: 114, w: 72 }, { x: 1100, y: 154, w: 92 }, { x: 1420, y: 110, w: 72 }],
      checks: [70, 980, 1620],
      coins: [200, 320, 460, 720, 900, 1140, 1320, 1460, 1680, 2100].map((x, i) => ({ x, y: [GROUND, GROUND, 158, 114, GROUND, 154, GROUND, 110, GROUND, GROUND][i] })),
      hearts: [{ x: 860, y: GROUND }, { x: 1500, y: GROUND }, { x: 1700, y: GROUND }],
      enemies: [{ k: 'slime', x: 300 }, { k: 'bat', x: 540, y: 96 }, { k: 'ghost', x: 780, y: 116 }, { k: 'slime', x: 1040 }, { k: 'flying-skull', x: 1300, y: 92 }, { k: 'bat', x: 1540, y: 86 }],
      weapons: [{ id: 'gun', x: 400 }],
      shrine: { x: 620 },
    },
  ];

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function build(def) {
    const R = mulberry(def.seed);
    const dec = [];
    const kinds = def.theme === 'sun' ? ['bush', 'flower', 'tallgrass', 'rock', 'reed'] : def.theme === 'storm' ? ['rock', 'bush', 'lamp', 'tallgrass'] : ['snowbush', 'crystal', 'rock'];
    for (let x = 90; x < def.len; x += 24) {
      if ((def.gaps || []).some(([a, c]) => x > a - 10 && x < c + 10)) continue;
      if (R() > 0.5) continue;
      dec.push({ x, y: GROUND, k: kinds[(R() * kinds.length) | 0] });
    }
    const plats = (def.plats || []).map((p) => ({ ...p, oneWay: true, dx: 0 }));
    const movers = (def.movers || []).map((m) => ({ ...m, x: m.a, dx: 0, ping: 0, oneWay: true }));
    return { ...def, dec, plats, movers, gaps: def.gaps || [], groves: def.groves || [], clouds: def.clouds || [] };
  }
  const RUNTIME = LEVELS.map(build);

  let state = 'loading', clock = 0, G = null, camX = 1200, camY = GROUND - 158;
  let shake = 0, flashW = 0, loadN = 0, loadD = 1;
  const pointers = new Map();
  const clicks = [];
  const keyHeld = {};
  let held = {}, prevHeld = {}, pressed = {};
  function detectTouch() {
    return Q.has('touch') || matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }
  let touchMode = detectTouch();
  let fsAsked = false;
  let fpsAcc = 0, fpsN = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, innerWidth * dpr);
    cv.height = Math.max(1, innerHeight * dpr);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  }
  addEventListener('resize', resize); resize();
  function toBuf(e) {
    const r = cv.getBoundingClientRect();
    const s = Math.min(r.width / VW, r.height / VH);
    const ox = (r.width - VW * s) / 2, oy = (r.height - VH * s) / 2;
    return [(e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s];
  }
  function requestFS() {
    if (fsAsked || !touchMode) return;
    fsAsked = true;
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn) return;
    try {
      const p = fn.call(el);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignore */ }
  }
  cv.addEventListener('pointerdown', (e) => {
    touchMode = true;
    requestFS();
    cv.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, toBuf(e));
  });
  addEventListener('touchstart', () => { touchMode = true; }, { passive: true });
  addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  addEventListener('gesturestart', (e) => e.preventDefault());
  addEventListener('dblclick', (e) => e.preventDefault());
  addEventListener('pointermove', (e) => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, toBuf(e)); });
  addEventListener('pointerup', (e) => {
    const p = pointers.get(e.pointerId) || toBuf(e);
    clicks.push(p);
    pointers.delete(e.pointerId);
  });
  addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keyHeld[k] = 1;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'm') { SFX.toggle(); SFX.ui(); }
    if (k === 'escape' && state === 'play') state = 'pause';
    else if (k === 'escape' && state === 'pause') state = 'play';
    if (k === 'enter' && state === 'title') newGame(0);
  });
  addEventListener('keyup', (e) => { keyHeld[e.key.toLowerCase()] = 0; });

  function hit(x, y, r) { return r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h; }
  function safePad() {
    const cs = getComputedStyle(document.documentElement);
    const px = (name) => parseFloat(cs.getPropertyValue(name)) || 0;
    const r = cv.getBoundingClientRect();
    const s = Math.min(r.width / VW, r.height / VH) || 1;
    return {
      l: Math.round(px('--sal') / s),
      r: Math.round(px('--sar') / s),
      t: Math.round(px('--sat') / s),
      b: Math.round(px('--sab') / s),
    };
  }
  function controls() {
    const p = safePad();
    const L = 10 + p.l, R = VW - 10 - p.r, B = VH - 8 - p.b;
    return {
      left: { x: L, y: B - 96, w: 58, h: 46 }, right: { x: L + 62, y: B - 96, w: 58, h: 46 },
      up: { x: L + 30, y: B - 142, w: 56, h: 42 }, down: { x: L + 30, y: B - 46, w: 56, h: 40 },
      atk: { x: R - 126, y: B - 100, w: 62, h: 48 }, jump: { x: R - 60, y: B - 106, w: 60, h: 54 },
      dash: { x: R - 126, y: B - 48, w: 62, h: 44 }, skill: { x: R - 60, y: B - 48, w: 60, h: 44 },
      swap: { x: R - 186, y: B - 48, w: 56, h: 44 },
    };
  }
  function poll() {
    const now = {};
    const c = controls();
    if (touchMode && state === 'play') {
      for (const p of pointers.values()) for (const k of Object.keys(c)) if (hit(p[0], p[1], c[k])) now[k] = 1;
    }
    if (keyHeld.a || keyHeld.arrowleft) now.left = 1;
    if (keyHeld.d || keyHeld.arrowright) now.right = 1;
    if (keyHeld.w || keyHeld.arrowup || keyHeld.k || keyHeld[' ']) now.jump = 1;
    if (keyHeld.s || keyHeld.arrowdown) now.down = 1;
    if (keyHeld.j || keyHeld.z) now.atk = 1;
    if (keyHeld.l || keyHeld.shift) now.dash = 1;
    if (keyHeld.u || keyHeld.x) now.skill = 1;
    if (keyHeld.q || keyHeld.e) now.swap = 1;
    pressed = {};
    for (const k of Object.keys(now)) if (!prevHeld[k]) pressed[k] = 1;
    prevHeld = now;
    held = now;
    if (keyHeld['1']) switchTo(0);
    if (keyHeld['2']) switchTo(1);
    if (keyHeld['3']) switchTo(2);
    if (keyHeld['4']) switchTo(3);
  }
  function switchTo(i) {
    if (!G) return;
    const id = ORDER[i];
    if (id && G.owned[id] && G.weapon !== id) { G.weapon = id; SFX.ui(); }
  }
  function cycleWeapon() {
    const owned = ORDER.filter((id) => G.owned[id]);
    const i = owned.indexOf(G.weapon);
    G.weapon = owned[(i + 1) % owned.length];
    SFX.ui();
  }

  function srcOf(name) {
    return (window.FXSHEETS && FXSHEETS[name]) ? ('assets/' + name + '.png') : ('../assets/' + name + '.png');
  }
  function loadImages() {
    const names = [...new Set([...Object.keys(window.FXSHEETS || {}), 'slime', 'bat', 'ghost', 'flying-skull', 'eyeball', 'hit-spark', 'poof', 'coin-collect', 'heart-pickup', 'level-up', 'crit-number', 'small-explosion'])];
    loadD = names.length; loadN = 0;
    return Promise.all(names.map((name) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { IMG[name] = im; loadN++; res(); };
      im.onerror = () => { PX.errors.push('img ' + name); loadN++; res(); };
      im.src = srcOf(name);
    })));
  }

  function loadUnlocks() {
    try { return JSON.parse(localStorage.getItem('pf_unlock') || '{}'); } catch (e) { return {}; }
  }
  function saveUnlocks() {
    try { localStorage.setItem('pf_unlock', JSON.stringify({ hammer: G.owned.hammer ? 1 : 0, spear: G.owned.spear ? 1 : 0, gun: G.owned.gun ? 1 : 0 })); } catch (e) { /* ignore */ }
  }
  function loadBank() { try { return +localStorage.getItem('pf_coins') || 0; } catch (e) { return 0; } }
  function saveBank() { try { localStorage.setItem('pf_coins', String(G.bank | 0)); } catch (e) { /* ignore */ } }

  function newGame(i) {
    const L = RUNTIME[i];
    const u = loadUnlocks();
    if (Q.has('allweapons') || Q.has('gallery')) { u.hammer = u.spear = u.gun = 1; }
    const owned = { sword: true, hammer: !!u.hammer, spear: !!u.spear, gun: !!u.gun };
    const ask = Q.get('weapon');
    if (ask && ask !== 'rocket' && WEAPONS[ask]) owned[ask] = true;
    const weapon = (ask && owned[ask]) ? ask : 'sword';
    const enemies = L.enemies.map((e) => ({
      k: e.k, x: e.x, y: e.y || GROUND, baseY: e.y || (EDEF[e.k].fly ? 108 : GROUND),
      hp: EDEF[e.k].hp, dir: 1, vy: 0, vx: 0, active: false, spawnT: 0, phase: Math.random() * 5,
      fly: EDEF[e.k].fly, kbx: 0, kbt: 0, flash: 0, dead: false,
    }));
    G = {
      li: i, t: 0, bank: loadBank(), levelCoins: 0, kills: 0, owned, weapon,
      tripled: false, revived: false, rocketUsed: false,
      placed: L.coins.length, placedGot: 0,
      p: {
        x: Q.has('x') ? +Q.get('x') : 56, y: GROUND, vx: 0, vy: 0, face: 1, hp: 120, maxhp: 120,
        on: true, coy: 0, jbuf: 0, inv: 0.8, hurtT: 0, atk: 0, atkT: 0, atkDur: 0, atkChain: 0,
        atkSpec: null, atkDone: false, bufAtk: false, dashT: 0, dashCd: 0, skillT: 0, skillDur: 0,
        skillCd: 0, skillSpec: null, skillDone: false, drop: 0, cp: 56, plat: null, animT: 0,
      },
      enemies, loot: L.coins.map((c) => ({ x: c.x, y: c.y, got: false, placed: true, vy: 0 })),
      hearts: L.hearts.map((h) => ({ ...h, got: false, vy: 0 })),
      pedestals: L.weapons.map((w) => ({ ...w, got: !!owned[w.id] })),
      fx: [], nums: [], dust: [], shots: [], queue: [], warns: [], ghosts: [], toasts: [],
      boss: null, wall: !!L.arena, goalOpen: !L.arena, boltT: 1.6, nearShrine: false,
      gallery: Q.has('gallery'), jumpWas: false, botA: 0, galT: 0, splashT: 0,
    };
    if (G.gallery) {
      G.p.x = 170;
      G.enemies = [{ k: 'slime', x: 248, y: GROUND, baseY: GROUND, hp: 999, dir: -1, vy: 0, active: true, spawnT: 1, phase: 0, fly: 0, kbx: 0, kbt: 0, flash: 0, dead: false }];
    }
    if (Q.has('boss') && L.arena) { G.p.x = L.arena + 50; G.p.cp = G.p.x; spawnBoss(); }
    state = 'play';
    SFX.unlock();
    SFX.setBgm(L.theme);
    camX = Math.max(0, G.p.x - 160);
    camY = GROUND - 158;
  }

  function cur() { return G ? RUNTIME[G.li] : RUNTIME[state === 'credits' ? 2 : 0]; }
  function floorAt(x) {
    const L = cur();
    if (x < 0 || x > L.len) return false;
    return !L.gaps.some(([a, c]) => x > a && x < c);
  }
  function toast(s) { if (G) G.toasts.push({ s, t: 1.8 }); }
  function addFx(n, x, y, o) {
    if (!G) return;
    if (G.fx.length > 64) G.fx.shift();
    G.fx.push(Object.assign({ n, x, y, t: 0, flip: G.p ? G.p.face < 0 : false }, o || {}));
  }
  function spawnList(list) {
    const p = G.p;
    for (const s of list || []) addFx(s.n, p.x + (s.ox || 0) * p.face, p.y + (s.oy || 0), s);
  }

  function pBox() { const p = G.p; return { x: p.x - 6, y: p.y - 26, w: 12, h: 26 }; }
  function eBox(e) {
    const d = EDEF[e.k] || EDEF.slime;
    return { x: e.x - d.hw, y: e.y - d.lift - d.hh, w: d.hw * 2, h: d.hh * 2 };
  }
  function bossBox() { const B = G.boss; return { x: B.x - 18, y: B.y - 36, w: 36, h: 34 }; }
  function overlap(a, c) { return a.x < c.x + c.w && a.x + a.w > c.x && a.y < c.y + c.h && a.y + a.h > c.y; }
  function atkBox(spec) {
    const p = G.p, y = p.y - (spec.y || 20), h = spec.h || 18, w = spec.reach || 32;
    return p.face > 0 ? { x: p.x + 4, y, w, h } : { x: p.x - 4 - w, y, w, h };
  }

  function damageEnemy(e, dmg, kb, srcx, onceId) {
    if (!e || e.dead || e.hp <= 0) return;
    if (e.spawnT != null && e.spawnT < 0.28) return;
    if (onceId && e.once === onceId) return;
    if (onceId) e.once = onceId;
    const crit = Math.random() < 0.12;
    const d = Math.round(dmg * (crit ? 1.8 : 1));
    e.hp -= d;
    e.flash = 0.1;
    const dir = Math.sign(e.x - srcx) || G.p.face;
    e.kbx = dir * kb;
    e.kbt = 0.18;
    if (!e.fly) e.vy = Math.min(e.vy || 0, -40 - kb * 0.05);
    shake = Math.max(shake, kb > 220 ? 6 : 2.4);
    G.hitStop = Math.max(G.hitStop, kb > 260 ? 0.09 : 0.04);
    addFx('hit-spark', e.x, (e.y || GROUND) - 12, { sc: 0.42, glow: 1, life: 0.35 });
    if (crit) addFx('crit-number', e.x, e.y - 22, { sc: 0.36, life: 0.9 });
    G.nums.push({ x: e.x, y: e.y - 18, v: d, t: 0, crit });
    SFX.hit(kb > 220);
    if (e.hp <= 0) killEnemy(e);
  }
  function resolveHit(spec) {
    const p = G.p;
    G.hitStop = Math.max(G.hitStop, spec.stop || 0);
    shake = Math.max(shake, spec.shake || 0);
    const box = spec.reach ? atkBox(spec) : null;
    for (const e of G.enemies) {
      if (e.dead || !e.active) continue;
      const near = spec.aoe && Math.hypot(e.x - (p.x + p.face * 16), e.y - 10 - (p.y - 12)) < spec.aoe;
      if ((box && overlap(box, eBox(e))) || near) damageEnemy(e, spec.dmg, spec.kb, p.x, G.hitId);
    }
    if (G.boss && G.boss.hp > 0) {
      const B = G.boss;
      const near = spec.aoe && Math.hypot(B.x - (p.x + p.face * 18), B.y - p.y) < spec.aoe + 10;
      if ((box && overlap(box, bossBox())) || near) damageEnemy(B, spec.dmg, spec.kb * 0.35, p.x, G.hitId);
    }
  }
  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    if (e === G.boss) { onBossDead(); return; }
    G.kills++;
    addFx('poof', e.x, e.y, { sc: 0.42 });
    addFx(e.k === 'ghost' ? 'soul-rise' : 'soul-rise', e.x, e.y - 4, { sc: e.k === 'ghost' ? 0.42 : 0.32 });
    if (Math.random() < 0.6) {
      G.loot.push({ x: e.x, y: e.y - 8, vy: -90, placed: false, got: false });
      addFx('coin-drop', e.x, e.y, { sc: 0.42, life: 1.1 });
    }
    if (Math.random() < 0.14) G.hearts.push({ x: e.x + 8, y: e.y - 6, vy: -50, got: false });
  }
  function hurt(dmg, src) {
    const p = G.p;
    if (p.inv > 0 || state !== 'play') return;
    p.hp -= dmg;
    p.inv = 1.12;
    p.hurtT = 0.34;
    p.vy = -150;
    p.vx = Math.sign(p.x - src) * 160 || -p.face * 140;
    p.atk = 0;
    shake = Math.max(shake, 4);
    SFX.hurt();
    if (p.hp <= 0) { p.hp = 0; state = 'dead'; }
  }
  function fireGun(kind) {
    const p = G.p, y = p.y - 16, x = p.x + p.face * 18;
    if (kind === 'pistol') {
      addFx('muzzle-pistol', x, y + 8, { sc: 0.95, flip: p.face < 0, glow: 1, life: 0.7 });
      G.shots.push({ x, y, vx: p.face * 360, vy: 0, dmg: 15, life: 0.55 });
    } else if (kind === 'smg') {
      addFx('muzzle-smg', x, y + 8, { sc: 0.9, flip: p.face < 0, glow: 1, life: 0.55 });
      for (let i = 0; i < 4; i++) G.queue.push({ t: i * 0.06, x, y, vx: p.face * 370, vy: (Math.random() - 0.5) * 30, dmg: 7, life: 0.36 });
    } else {
      addFx('muzzle-shotgun', x, y + 10, { sc: 0.85, flip: p.face < 0, glow: 1, life: 0.8 });
      for (let i = 0; i < 5; i++) G.shots.push({ x, y, vx: p.face * (280 + Math.random() * 50), vy: (i - 2) * 46, dmg: 8, life: 0.26 });
      p.vx -= p.face * 90;
      shake = Math.max(shake, 3.2);
    }
    SFX.swing('gun');
  }
  function fireRocket(big) {
    const p = G.p;
    addFx('rocket-launcher', p.x, p.y, { sc: 0.66, flip: p.face < 0, t0: 0.9, t1: 3.4, glow: 1, life: 2.6 });
    G.queue.push({ t: 0.82, rocket: 1, x: p.x + p.face * 168, y: GROUND, dmg: big ? 58 : 46, r: big ? 74 : 56, big });
    p.vx -= p.face * 70;
    SFX.swing('rocket');
  }
  function boom(q) {
    addFx('small-explosion', q.x, q.y - 10, { sc: 0.48, glow: 1 });
    addFx('ground-slam', q.x, q.y, { sc: 0.62, glow: 1 });
    if (q.big) addFx('impact-frame', 0, 0, { screen: 1, life: 0.26 });
    shake = Math.max(shake, 10);
    flashW = Math.max(flashW, 0.28);
    SFX.boom();
    for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - q.x, e.y - q.y) < q.r) damageEnemy(e, q.dmg, 360, q.x, null);
    if (G.boss && G.boss.hp > 0 && Math.hypot(G.boss.x - q.x, G.boss.y - q.y) < q.r + 8) damageEnemy(G.boss, q.dmg, 80, q.x, null);
  }

  function startAttack(n) {
    const W = WEAPONS[G.weapon], spec = W.combo[n - 1];
    if (!spec) return;
    const p = G.p;
    p.atk = n; p.atkT = 0; p.atkDur = spec.dur; p.atkChain = spec.chain; p.atkSpec = spec; p.atkDone = false; p.bufAtk = false;
    G.hitId++;
    if (W.snd !== 'gun' && W.snd !== 'rocket') SFX.swing(W.snd);
    spawnList(spec.fx);
    if (spec.shot) fireGun(spec.shot);
    if (spec.rocket) fireRocket(false);
  }
  function startSkill() {
    const W = WEAPONS[G.weapon], sk = W.skill, p = G.p;
    if (p.skillCd > 0) return;
    p.skillT = 0.001; p.skillDur = sk.dur; p.skillCd = sk.cd; p.skillSpec = sk; p.skillDone = false;
    p.atk = 0;
    G.hitId++;
    if (W.snd !== 'gun' && W.snd !== 'rocket') SFX.swing(W.snd);
    spawnList(sk.fx);
    if (sk.shot) fireGun(sk.shot);
    if (sk.rocket) fireRocket(true);
  }

  function land(y, plat) {
    const p = G.p;
    const hard = p.vy > 260;
    p.y = y; p.vy = 0; p.on = true; p.plat = plat || null;
    if (hard) { addFx('heavy-landing', p.x, y, { sc: 0.72, glow: 1 }); SFX.land(); shake = Math.max(shake, 2); }
  }
  function updatePlayer(dt) {
    const p = G.p, L = cur(), W = WEAPONS[G.weapon];
    const ax = (held.left ? -1 : 0) + (held.right ? 1 : 0);
    if (ax && !p.atk) p.face = ax > 0 ? 1 : -1;
    if (pressed.jump || pressed.up) p.jbuf = 0.12;
    p.jbuf -= dt; p.drop -= dt; p.inv -= dt; p.hurtT -= dt; p.dashCd -= dt; p.skillCd -= dt;
    if (pressed.dash && p.dashCd <= 0 && p.dashT <= 0) {
      p.dashT = 0.16; p.dashCd = 0.62; p.inv = Math.max(p.inv, 0.16); p.atk = 0;
      addFx('dash-strike', p.x, p.y, { sc: 0.78, flip: p.face < 0, glow: 1, life: 0.7 });
      SFX.dash();
    }
    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.face * 380; p.vy = 0;
      G.ghosts.push({ x: p.x, y: p.y, face: p.face, a: 0.4, weapon: G.weapon });
    } else {
      let sp = W.speed;
      if (G.weapon === 'hammer' && p.atk) sp *= 0.5;
      const target = ax * sp;
      const acc = (p.on ? 1500 : 860) * dt;
      if (Math.abs(target - p.vx) <= acc) p.vx = target;
      else p.vx += Math.sign(target - p.vx) * acc;
      p.vy += 940 * dt;
      if (p.vy > 420) p.vy = 420;
    }
    const jumpHeld = !!(held.jump || held.up);
    if (G.jumpWas && !jumpHeld && p.vy < -70) p.vy *= 0.5;
    G.jumpWas = jumpHeld;
    if (p.jbuf > 0 && (p.on || p.coy > 0) && p.dashT <= 0) {
      p.vy = -318; p.jbuf = 0; p.coy = 0; p.on = false; p.plat = null; SFX.jump();
    }
    if (held.down && p.on && p.plat && p.plat.oneWay) { p.drop = 0.16; p.on = false; p.y += 3; p.plat = null; }

    if (G.nearShrine && pressed.atk && !Ads.busy && !G.owned.rocket) { askRocket(); pressed.atk = 0; }
    if (pressed.skill) startSkill();
    if (pressed.atk && p.dashT <= 0 && p.skillT <= 0) {
      if (!p.atk) startAttack(1);
      else p.bufAtk = true;
    }
    if (p.atk) {
      p.atkT += dt;
      if (!p.atkDone && p.atkSpec && p.atkT >= p.atkSpec.hit && p.atkSpec.hit < 5) {
        p.atkDone = true;
        if (p.atkSpec.dmg) resolveHit(p.atkSpec);
      }
      if (p.bufAtk && p.atkT >= p.atkChain && p.atk < W.combo.length) startAttack(p.atk + 1);
      if (p.atkT >= p.atkDur) { p.atk = 0; p.bufAtk = false; }
    }
    if (p.skillT > 0) {
      p.skillT += dt;
      const sk = p.skillSpec;
      if (sk && !p.skillDone && p.skillT >= sk.hit && sk.hit < 5 && sk.dmg) { p.skillDone = true; resolveHit(sk); }
      if (p.skillT >= p.skillDur) p.skillT = 0;
    }

    const prevX = p.x, prevY = p.y;
    p.x += p.vx * dt;
    if (p.x < 14) p.x = 14;
    if (p.x > L.len - 14) p.x = L.len - 14;
    if (G.wall && L.arena && prevX >= L.arena && p.x < L.arena) { p.x = L.arena; p.vx = 0; }
    p.y += p.vy * dt;
    p.on = false;
    const plats = L.plats.concat(L.movers);
    if (p.vy >= 0 && p.drop <= 0) {
      if (floorAt(p.x) && prevY <= GROUND + 0.1 && p.y >= GROUND) land(GROUND, null);
      for (const plat of plats) {
        if (p.x > plat.x - 4 && p.x < plat.x + plat.w + 4 && prevY <= plat.y + 0.5 && p.y >= plat.y) {
          land(plat.y, plat);
          if (plat.dx) p.x += plat.dx;
        }
      }
    }
    p.coy = p.on ? 0.12 : p.coy - dt;
    if (!floorAt(p.x) && p.y > GROUND + 12) {
      if (p.hp <= 8) { p.hp = 0; state = 'dead'; }
      else {
        p.hp -= 8; p.x = p.cp; p.y = GROUND; p.vx = 0; p.vy = 0; p.inv = 1.2;
        addFx('respawn-beam', p.x, GROUND, { sc: 0.55, glow: 1 });
        addFx('rain-splash', p.cp, GROUND, { sc: 0.55, life: 0.7 });
        SFX.hurt();
      }
    }
    if (p.on && Math.abs(p.vx) > 50 && Math.random() < 0.5) G.dust.push({ x: p.x - p.face * 4, y: p.y, vx: -p.face * 12, t: 0 });
    for (const c of L.checks) if (p.x >= c && p.cp < c) {
      p.cp = c; p.hp = Math.min(p.maxhp, p.hp + 16);
      addFx('respawn-beam', c, GROUND, { sc: 0.5, glow: 1 });
      toast('到达检查点'); SFX.heal();
    }
    if (p.dashT > 0) { /* trail already pushed */ }
  }

  function updateEnemies(dt) {
    const p = G.p;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (!e.active) {
        if (Math.abs(e.x - p.x) < 420) { e.active = true; e.spawnT = 0; addFx('spawn-portal', e.x, e.y, { sc: 0.42, life: 1.05 }); }
        continue;
      }
      e.spawnT += dt; e.flash -= dt;
      if (e.kbt > 0) { e.kbt -= dt; e.x += (e.kbx || 0) * dt; e.kbx *= 0.86; }
      const def = EDEF[e.k];
      if (e.fly) {
        e.phase += dt * (e.k === 'bat' ? 3 : 1.6);
        if (e.k === 'flying-skull') {
          e.dart = (e.dart == null ? 1.8 : e.dart) - dt;
          if ((e.durt || 0) > 0) { e.durt -= dt; e.x += e.vx * dt; }
          else {
            if (Math.abs(e.x - p.x) < 220) e.dir = Math.sign(p.x - e.x) || e.dir;
            e.x += e.dir * def.sp * 0.45 * dt;
            if (e.dart <= 0) { e.dart = 2.3; e.durt = 0.28; e.vx = (Math.sign(p.x - e.x) || 1) * 150; }
          }
        } else if (e.k === 'ghost') {
          const want = Math.sign(p.x - e.x) || e.dir;
          if (Math.abs(e.x - p.x) < 240) e.dir = want;
          e.x += e.dir * def.sp * dt;
        } else {
          if (Math.abs(e.x - p.x) < 200) e.dir = Math.sign(p.x - e.x) || e.dir;
          e.x += e.dir * def.sp * dt;
        }
        e.y = e.baseY + Math.sin(e.phase) * 12;
      } else {
        if (e.kbt <= 0) {
          if (!floorAt(e.x + e.dir * 12)) e.dir *= -1;
          e.vx = e.dir * def.sp;
        }
        e.vy = (e.vy || 0) + 940 * dt;
        e.x += (e.kbt > 0 ? 0 : e.vx) * dt;
        e.y += e.vy * dt;
        if (floorAt(e.x) && e.y >= GROUND) { e.y = GROUND; e.vy = 0; if (e.hop == null || e.hop < 0) { e.hop = 1.1 + Math.random(); } }
        e.hop = (e.hop || 1) - dt;
        if (e.hop <= 0 && e.y >= GROUND - 1 && floorAt(e.x)) { e.vy = -110; e.hop = 1.3 + Math.random() * 0.6; }
        if (e.y > 380) killEnemy(e);
      }
      if (e.spawnT > 0.4 && p.inv <= 0 && overlap(pBox(), eBox(e))) hurt(def.dmg, e.x);
    }
    G.enemies = G.enemies.filter((e) => !e.dead);
  }
  function spawnBoss() {
    const L = cur();
    G.boss = { k: 'eyeball', x: L.arena + 200, y: 156, baseY: 156, hp: EDEF.eyeball.hp, max: EDEF.eyeball.hp, fly: 1, flash: 0, dead: false, spawnT: 0, t: 0, cd: 1.2, n: 0, dash: 0, phase: 0 };
    G.wall = true; G.bossOn = true;
    addFx('spawn-portal', G.boss.x, GROUND, { sc: 0.62, glow: 1 });
    toast('霜瞳苏醒了');
  }
  function updateBoss(dt) {
    const B = G.boss, p = G.p;
    if (!B || B.dead) return;
    B.spawnT += dt; B.t += dt; B.flash -= dt; B.phase += dt;
    B.y = 150 + Math.sin(B.t * 1.3) * 14;
    if (B.kbt > 0) { B.kbt -= dt; B.x += (B.kbx || 0) * dt * 0.25; }
    if (B.dash > 0) { B.dash -= dt; B.x += (B.dashDir || 1) * 170 * dt; }
    else B.x += Math.sign(p.x - B.x) * (B.hp < B.max * 0.5 ? 36 : 22) * dt;
    B.cd -= dt;
    if (B.cd <= 0 && B.spawnT > 0.6) {
      B.cd = B.hp < B.max * 0.5 ? 2.1 : 2.9;
      const roll = B.n++ % 3;
      if (roll === 0) G.warns.push({ x: p.x, t: 0, dur: 0.55, r: 34, kind: 'spike' });
      else if (roll === 1) { B.dash = 0.32; B.dashDir = Math.sign(p.x - B.x) || 1; B.flash = 0.2; }
      else if (G.enemies.length < 3) {
        G.enemies.push({ k: 'slime', x: B.x - 20, y: GROUND, baseY: GROUND, hp: 22, dir: Math.sign(p.x - B.x) || -1, vy: 0, active: true, spawnT: 0, phase: 0, fly: 0, kbx: 0, kbt: 0, flash: 0, dead: false });
        addFx('spawn-portal', B.x - 20, GROUND, { sc: 0.4 });
      }
    }
    if (B.spawnT > 0.45 && p.inv <= 0 && overlap(pBox(), bossBox())) hurt(10, B.x);
  }
  function onBossDead() {
    const B = G.boss;
    G.wall = false; G.goalOpen = true; G.kills++;
    addFx('soul-rise', B.x, B.y, { sc: 0.7 });
    addFx('small-explosion', B.x, B.y, { sc: 0.55, glow: 1 });
    addFx('impact-frame', 0, 0, { screen: 1, life: 0.3 });
    addFx('poof', B.x, GROUND, { sc: 0.7 });
    shake = 9; flashW = 0.4; SFX.boom();
    for (let i = 0; i < 8; i++) G.loot.push({ x: B.x + (i - 3.5) * 12, y: GROUND - 8, vy: -110, placed: false, got: false });
    toast('霜瞳散去了');
  }
  function updateWarns(dt) {
    const p = G.p;
    for (const w of G.warns) {
      w.t += dt;
      if (!w.fired && w.t >= w.dur) {
        w.fired = true;
        if (w.kind === 'bolt') {
          addFx('lightning-strike', w.x, GROUND, { sc: 0.64, glow: 1 });
          flashW = 0.4; shake = Math.max(shake, 6); SFX.boom();
          if (Math.abs(p.x - w.x) < w.r + 6) hurt(10, w.x);
        } else {
          addFx('earth-spike', w.x, GROUND, { sc: 0.55, glow: 1 });
          shake = Math.max(shake, 5); SFX.hit(true);
          if (Math.abs(p.x - w.x) < w.r) hurt(12, w.x);
        }
      }
    }
    G.warns = G.warns.filter((w) => w.t < w.dur + 0.35);
  }
  function updateShots(dt) {
    for (const s of G.shots) {
      s.life -= dt;
      for (let k = 0; k < 2; k++) {
        s.x += s.vx * dt * 0.5; s.y += s.vy * dt * 0.5;
        let hitE = null;
        for (const e of G.enemies) if (!e.dead && e.active && Math.abs(e.x - s.x) < 14 && Math.abs((e.y - 10) - s.y) < 16) { hitE = e; break; }
        if (!hitE && G.boss && G.boss.hp > 0 && Math.abs(G.boss.x - s.x) < 20 && Math.abs(G.boss.y - s.y) < 22) hitE = G.boss;
        if (hitE) {
          damageEnemy(hitE, s.dmg, 70, s.x - Math.sign(s.vx), null);
          addFx('bullet-impact', s.x, s.y + 8, { sc: 0.55, flip: s.vx < 0, glow: 1, life: 0.45 });
          s.life = 0; break;
        }
      }
    }
    G.shots = G.shots.filter((s) => s.life > 0);
    for (const q of G.queue) q.t -= dt;
    const due = G.queue.filter((q) => q.t <= 0);
    G.queue = G.queue.filter((q) => q.t > 0);
    for (const q of due) {
      if (q.rocket) boom(q);
      else G.shots.push({ x: q.x, y: q.y, vx: q.vx, vy: q.vy, dmg: q.dmg, life: q.life });
    }
  }
  function updatePickups(dt) {
    const p = G.p;
    for (const c of G.loot) {
      if (c.got) continue;
      if (c.vy) { c.vy += 900 * dt; c.y += c.vy * dt; if (floorAt(c.x) && c.y > GROUND) { c.y = GROUND; c.vy = 0; } }
      const dx = p.x - c.x, dy = (p.y - 14) - c.y;
      if (dx * dx + dy * dy < 42 * 42) { c.x += dx * 6 * dt; c.y += dy * 6 * dt; }
      if (dx * dx + dy * dy < 16 * 16) {
        c.got = true; G.levelCoins++; G.bank++; if (c.placed) G.placedGot++;
        addFx('coin-collect', c.x, c.y, { sc: 0.3, life: 0.8 });
        SFX.coin(); saveBank();
      }
    }
    for (const h of G.hearts) {
      if (h.got) continue;
      if (h.vy) { h.vy += 800 * dt; h.y += h.vy * dt; if (floorAt(h.x) && h.y > GROUND) { h.y = GROUND; h.vy = 0; } }
      if (Math.hypot(p.x - h.x, (p.y - 12) - h.y) < 18) {
        h.got = true; p.hp = Math.min(p.maxhp, p.hp + 40);
        addFx('healing-bloom', h.x, h.y, { sc: 0.55, glow: 1 });
        addFx('heart-pickup', h.x, h.y - 6, { sc: 0.7, life: 0.5 });
        SFX.heal(); toast('回复生命');
      }
    }
    for (const ped of G.pedestals) {
      if (ped.got) continue;
      if (Math.abs(p.x - ped.x) < 20 && Math.abs(p.y - GROUND) < 18) {
        ped.got = true; G.owned[ped.id] = true; G.weapon = ped.id; saveUnlocks();
        addFx('level-up', ped.x, GROUND, { sc: 0.45 });
        toast('获得「' + WEAPONS[ped.id].name + '」'); SFX.heal();
      }
    }
    const L = cur();
    G.nearShrine = !!(L.shrine && !G.owned.rocket && Math.abs(p.x - L.shrine.x) < 34);
  }
  function updateFx(dt) {
    const p = G.p;
    for (const f of G.fx) {
      f.t += dt;
      if (f.follow) { f.x = p.x; f.y = p.y + (f.oy || 0); f.flip = p.face < 0; }
    }
    G.fx = G.fx.filter((f) => {
      const m = SHEETS[f.n];
      if (!m) return false;
      const tt = (f.t0 || 0) + f.t;
      if (f.t1 != null && tt >= f.t1) return false;
      if (f.life != null && f.t >= f.life) return false;
      if (!m.loop && f.t1 == null && f.life == null && tt >= m.n * m.dur / 1000) return false;
      return true;
    });
    for (const n of G.nums) n.t += dt;
    G.nums = G.nums.filter((n) => n.t < 0.7);
    for (const d of G.dust) { d.t += dt; d.x += d.vx * dt; }
    G.dust = G.dust.filter((d) => d.t < 0.35);
    for (const g of G.ghosts) g.a -= dt * 2.2;
    G.ghosts = G.ghosts.filter((g) => g.a > 0);
    for (const t of G.toasts) t.t -= dt;
    G.toasts = G.toasts.filter((t) => t.t > 0);
  }

  function sim(dt) {
    const L = cur(), p = G.p;
    G.t += dt;
    for (const m of L.movers) {
      m.ping += dt * m.sp;
      const span = m.b - m.a, phase = m.ping % (span * 2);
      const nx = phase < span ? m.a + phase : m.b - (phase - span);
      m.dx = nx - m.x; m.x = nx;
    }
    updatePlayer(dt);
    updateEnemies(dt);
    if (L.arena && !G.boss && p.x > L.arena - 8) spawnBoss();
    updateBoss(dt);
    if (L.lightning) {
      G.boltT -= dt;
      if (G.boltT <= 0) {
        G.boltT = 2.5 + Math.random();
        const x = p.x + (Math.random() * 200 - 100);
        if (floorAt(x)) G.warns.push({ x, t: 0, dur: 0.78, r: 28, kind: 'bolt' });
      }
    }
    if (L.theme === 'storm') {
      G.splashT -= dt;
      if (G.splashT <= 0) {
        G.splashT = 0.75;
        const x = camX + 40 + Math.random() * 400;
        if (x > 0 && x < L.len) addFx('rain-splash', x, GROUND, { sc: 0.45, life: 0.8 });
      }
    }
    updateWarns(dt);
    updateShots(dt);
    updatePickups(dt);
    updateFx(dt);
    if (G.goalOpen && Math.abs(p.x - L.goal) < 18 && p.on) finishLevel();
    // camera
    const look = p.x + p.face * 28 - 170;
    const maxC = Math.max(0, L.len - VW);
    const dest = Math.max(0, Math.min(maxC, look));
    camX += (dest - camX) * Math.min(1, dt * 4);
    let wantY = GROUND - 118;
    if (p.y < GROUND - 36) wantY = Math.min(wantY, p.y - 86);
    wantY = Math.max(GROUND - 148, Math.min(GROUND - 108, wantY));
    camY += (wantY - camY) * Math.min(1, dt * 3);
    camX = Math.round(camX);
    camY = Math.round(camY);
  }
  function finishLevel() {
    const hpOk = G.p.hp >= G.p.maxhp * 0.45;
    const coinOk = G.placed > 0 && G.placedGot / G.placed >= 0.7;
    G.stars = 1 + (hpOk ? 1 : 0) + (coinOk ? 1 : 0);
    state = 'summary';
    Ads.showInterstitial('level_end');
    addFx('level-up', G.p.x, G.p.y - 10, { sc: 0.55, glow: 1 });
    SFX.heal(); saveBank();
  }
  function bot() {
    const p = G.p, L = cur();
    held.right = 1; prevHeld.right = 1;
    if (p.on && L.gaps.some(([a]) => p.x > a - 40 && p.x < a + 6)) pressed.jump = 1;
    if (p.on && Math.sin(G.t * 6.5) > 0.9) pressed.jump = 1;
    const near = G.enemies.some((e) => e.active && Math.abs(e.x - p.x) < 64) || (G.boss && Math.abs(G.boss.x - p.x) < 90);
    if (near) { G.botA -= 0.016; if (G.botA <= 0) { G.botA = 0.26; pressed.atk = 1; } }
    if (Math.sin(G.t * 1.3) > 0.98) pressed.dash = 1;
  }
  function gallery() {
    G.galT += 0.016;
    if (G.galT > 0.42) { G.galT = 0; pressed.atk = 1; }
    G.p.face = 1;
  }

  function askRocket() {
    if (!G || G.rocketUsed || Ads.busy) return;
    Ads.showRewarded('legendary_weapon', (ok) => {
      if (!ok || !G) return;
      G.rocketUsed = true; G.owned.rocket = true; G.weapon = 'rocket';
      toast('试用火箭筒（仅本关）'); SFX.ui();
    });
  }
  function askRevive() {
    if (!G || G.revived || Ads.busy) return;
    Ads.showRewarded('revive', (ok) => {
      if (!ok || !G) return;
      G.revived = true; G.p.hp = 90; G.p.inv = 1.6; G.p.vx = 0; G.p.vy = 0;
      G.p.x = G.p.cp; G.p.y = GROUND; state = 'play';
      addFx('respawn-beam', G.p.x, GROUND, { sc: 0.6, glow: 1 });
      addFx('healing-bloom', G.p.x, GROUND, { sc: 0.6, glow: 1 });
    });
  }
  function askTriple() {
    if (!G || G.tripled || Ads.busy) return;
    Ads.showRewarded('triple_coins', (ok) => {
      if (!ok || !G) return;
      G.bank += G.levelCoins * 2; G.levelCoins *= 3; G.tripled = true; saveBank(); SFX.coin();
    });
  }

  function buttons() {
    const list = [];
    if (state === 'title') {
      list.push({ id: 'start', x: 286, y: 78, w: 176, h: 28, label: '开始冒险' });
      list.push({ id: 'help', x: 286, y: 112, w: 176, h: 24, label: '操作说明' });
      list.push({ id: 'credits', x: 286, y: 142, w: 176, h: 24, label: '制作名单' });
    } else if (state === 'help' || state === 'credits') {
      list.push({ id: 'back', x: 190, y: 236, w: 100, h: 24, label: '返回' });
    } else if (state === 'pause') {
      list.push({ id: 'resume', x: 150, y: 108, w: 180, h: 28, label: '继续冒险' });
      list.push({ id: 'retry', x: 150, y: 144, w: 180, h: 26, label: '重开本关' });
      list.push({ id: 'title', x: 150, y: 178, w: 180, h: 26, label: '返回标题' });
    } else if (state === 'dead') {
      if (G && !G.revived) list.push({ id: 'revive', x: 120, y: 132, w: 240, h: 28, label: '看广告复活（模拟）' });
      list.push({ id: 'retry', x: 120, y: 168, w: 240, h: 26, label: '重试关卡' });
      list.push({ id: 'title', x: 120, y: 202, w: 240, h: 24, label: '返回标题' });
    } else if (state === 'summary' && G) {
      list.push({ id: 'triple', x: 110, y: 168, w: 260, h: 26, label: G.tripled ? '已领取三倍金币' : '三倍金币（模拟广告）' });
      list.push({ id: 'next', x: 110, y: 202, w: 260, h: 28, label: G.li < 2 ? '下一关' : '返回标题' });
    } else if (state === 'play' && G) {
      const pad = safePad();
      list.push({ id: 'pause', x: 404 - pad.r, y: 6 + pad.t, w: 34, h: 16, label: '停' });
      list.push({ id: 'mute', x: 442 - pad.r, y: 6 + pad.t, w: 32, h: 16, label: SFX.muted ? '静' : '音' });
      if (G.nearShrine) list.push({ id: 'shrine', x: 150, y: 78, w: 180, h: 22, label: '试用火箭筒' });
    }
    return list;
  }
  function activate(id) {
    if (Ads.busy) return;
    SFX.unlock();
    if (id === 'start') { SFX.ui(); newGame(0); return; }
    if (id === 'help') { state = 'help'; SFX.ui(); return; }
    if (id === 'credits') { state = 'credits'; SFX.ui(); return; }
    if (id === 'back') { state = 'title'; SFX.ui(); return; }
    if (id === 'resume') { state = 'play'; return; }
    if (id === 'pause') { state = 'pause'; return; }
    if (id === 'mute') { SFX.toggle(); return; }
    if (id === 'retry' && G) { newGame(G.li); return; }
    if (id === 'title') { state = 'title'; G = null; return; }
    if (id === 'revive') { askRevive(); return; }
    if (id === 'triple') { askTriple(); return; }
    if (id === 'next' && G) { if (G.li < 2) newGame(G.li + 1); else { state = 'title'; G = null; } return; }
    if (id === 'shrine') { askRocket(); return; }
    if (id && id.indexOf('w:') === 0 && G) {
      const w = id.slice(2);
      if (G.owned[w]) { G.weapon = w; SFX.ui(); }
    }
  }
  function uiClicks() {
    if (pressed.swap && G && state === 'play') cycleWeapon();
    for (const c of clicks) for (const btn of buttons()) if (hit(c[0], c[1], btn)) activate(btn.id);
    clicks.length = 0;
  }

  function drawSheet(name, t, x, y, opt) {
    const m = SHEETS[name], im = IMG[name];
    if (!m || !im || !m.xy) return;
    opt = opt || {};
    let i = Math.floor(Math.max(0, t) * 1000 / m.dur);
    i = m.loop ? ((i % m.n) + m.n) % m.n : Math.max(0, Math.min(m.n - 1, i));
    const fr = m.xy[i]; if (!fr) return;
    const sc = opt.sc || 1;
    b.save();
    b.translate(Math.round(x), Math.round(y));
    b.scale((opt.flip ? -1 : 1) * sc, sc);
    const paint = (flash) => {
      if (!flash) b.drawImage(im, fr[0], fr[1], m.fw, m.fh, -m.o[0], -m.o[1], m.fw, m.fh);
      else {
        flashG.clearRect(0, 0, m.fw, m.fh);
        flashG.drawImage(im, fr[0], fr[1], m.fw, m.fh, 0, 0, m.fw, m.fh);
        flashG.globalCompositeOperation = 'source-in';
        flashG.fillStyle = '#fff';
        flashG.fillRect(0, 0, m.fw, m.fh);
        flashG.globalCompositeOperation = 'source-over';
        b.drawImage(flashC, 0, 0, m.fw, m.fh, -m.o[0], -m.o[1], m.fw, m.fh);
      }
    };
    if (opt.glow && !opt.flash) {
      b.globalCompositeOperation = 'lighter';
      b.globalAlpha = (opt.a == null ? 1 : opt.a) * 0.7;
      paint(false);
      b.globalCompositeOperation = 'source-over';
    }
    b.globalAlpha = opt.a == null ? 1 : opt.a;
    paint(!!opt.flash);
    b.restore();
  }
  function drawScreen(name, t, alpha) {
    const m = SHEETS[name], im = IMG[name];
    if (!m || !im) return;
    let i = Math.floor(Math.max(0, t) * 1000 / m.dur);
    i = m.loop ? ((i % m.n) + m.n) % m.n : Math.max(0, Math.min(m.n - 1, i));
    const fr = m.xy[i]; if (!fr) return;
    b.save(); b.globalAlpha = alpha;
    b.drawImage(im, fr[0], fr[1], m.fw, m.fh, 0, 0, VW, VH);
    b.restore();
  }
  function text(s, x, y, size, col, align) {
    b.font = size + 'px ' + FONT;
    b.textAlign = align || 'left';
    b.textBaseline = 'middle';
    b.fillStyle = 'rgba(0,0,0,0.6)';
    b.fillText(s, x + 1, y + 1);
    b.fillStyle = col;
    b.fillText(s, x, y);
  }
  function panel(x, y, w, h) {
    b.fillStyle = 'rgba(8,10,18,0.78)';
    b.fillRect(x, y, w, h);
    b.strokeStyle = '#f0d48a';
    b.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  function btn(r, on) {
    b.fillStyle = on ? '#ffd056' : 'rgba(16,20,34,0.82)';
    b.fillRect(r.x, r.y, r.w, r.h);
    b.strokeStyle = '#f0d48a';
    b.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    text(r.label, r.x + r.w / 2, r.y + r.h / 2 + 1, r.h > 26 ? 13 : 11, on ? '#24180c' : '#fff6d4', 'center');
  }
  function icon(id, x, y) {
    b.save(); b.translate(x | 0, y | 0);
    if (id === 'sword') {
      b.fillStyle = '#f4f8ff';
      [[2, -7], [1, -5], [0, -3], [-1, -1], [-2, 1]].forEach(([px, py]) => b.fillRect(px, py, 2, 2));
      b.fillStyle = '#ffd056'; b.fillRect(-4, 2, 7, 2);
      b.fillStyle = '#6e4218'; b.fillRect(-1, 4, 2, 3);
    } else if (id === 'hammer') {
      b.fillStyle = '#e4ebf6'; b.fillRect(-5, -7, 10, 5);
      b.fillStyle = '#ffd056'; b.fillRect(-1, -6, 2, 2);
      b.fillStyle = '#c4843c'; b.fillRect(-1, -2, 2, 9);
    } else if (id === 'spear') {
      b.fillStyle = '#f4f8ff'; b.fillRect(-1, -8, 3, 3);
      b.fillStyle = '#c4843c'; b.fillRect(0, -5, 1, 13);
    } else if (id === 'gun') {
      b.fillStyle = '#e4ebf6'; b.fillRect(-6, -2, 11, 3);
      b.fillStyle = '#ffb45a'; b.fillRect(4, -3, 3, 2);
      b.fillStyle = '#8a5a28'; b.fillRect(-4, 1, 3, 4);
    } else {
      b.fillStyle = '#9aa6b8'; b.fillRect(-7, -3, 11, 5);
      b.fillStyle = '#ff5a3c'; b.fillRect(3, -2, 4, 3);
      b.fillStyle = '#ffd056'; b.fillRect(6, -1, 2, 1);
    }
    b.restore();
  }
  function hearts(hp, max) {
    const n = 5, per = max / n;
    for (let i = 0; i < n; i++) {
      const f = Math.max(0, Math.min(1, (hp - i * per) / per));
      const x = 8 + i * 13, y = 5;
      b.fillStyle = f > 0.08 ? '#ff4d6a' : '#4a3044';
      b.fillRect(x, y + 2, 3, 3); b.fillRect(x + 4, y + 2, 3, 3);
      b.fillRect(x, y + 4, 7, 3); b.fillRect(x + 1, y + 7, 5, 1);
      b.fillRect(x + 2, y + 8, 3, 1); b.fillRect(x + 3, y + 9, 1, 1);
      if (f > 0.08) { b.fillStyle = '#ffd0dc'; b.fillRect(x + 1, y + 3, 1, 1); b.fillRect(x + 5, y + 3, 1, 1); }
    }
  }
  function shadow(x, y) {
    b.fillStyle = 'rgba(0,0,0,0.4)';
    b.fillRect(Math.round(x) - 5, Math.round(y) - 1, 10, 2);
  }
  function pixGlow(x, y, col, r) {
    b.save(); b.globalCompositeOperation = 'lighter';
    b.fillStyle = col; b.globalAlpha = 0.16; b.fillRect(x - r, y - r, r * 2, r * 2);
    b.globalAlpha = 0.28; b.fillRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9);
    b.restore();
  }

  function animInfo(p) {
    if (p.hurtT > 0) return ['hurt', p.hurtT];
    if (p.skillT > 0) return ['skill', p.skillT];
    if (p.dashT > 0) return ['dash', clock];
    if (p.atk > 0) return ['atk' + Math.min(3, p.atk), p.atkT];
    if (!p.on) return [p.vy < 0 ? 'jump' : 'fall', clock];
    if (Math.abs(p.vx) > 18) return ['run', p.animT];
    return ['idle', p.animT];
  }
  function drawHeroAt(p, weapon, alpha) {
    const [anim, t] = animInfo(p);
    b.save(); b.globalAlpha = alpha == null ? 1 : alpha;
    Hero.draw(b, p.x - camX, p.y - camY, p.face, anim, t, weapon, p.hurtT > 0 && ((clock * 18) | 0) % 2 === 0);
    b.restore();
  }
  function drawEnemy(e) {
    const def = EDEF[e.k] || EDEF.slime;
    const x = e.x - camX, y = e.y - camY;
    shadow(x, e.fly ? (GROUND - camY) : y);
    const a = e.spawnT < 0.35 ? e.spawnT / 0.35 : 1;
    drawSheet(e.k, clock + (e.phase || 0), x, y, { sc: def.sc, flash: e.flash > 0, a });
  }
  function drawWorld() {
    const L = cur();
    const theme = L.theme;
    const groundS = GROUND - camY;
    b.imageSmoothingEnabled = false;
    Scenery.drawBackdrop(b, camX, clock, theme, () => {
      if (theme === 'snow') {
        drawScreen('aurora', clock, 0.42);
        drawScreen('shooting-stars', clock * 0.8, 0.32);
      }
    });
    Scenery.drawTreesAt(b, camX, groundS, clock, theme);
    b.save();
    b.beginPath();
    b.rect(0, 0, VW, Math.max(0, Math.round(groundS)));
    b.clip();
    if (theme === 'sun') drawScreen('falling-leaves', clock, 0.28);
    if (theme === 'storm') { drawScreen('rain', clock, 0.32); drawScreen('storm', clock, 0.16); }
    if (theme === 'snow') { drawScreen('snow', clock, 0.3); drawScreen('fog', clock, 0.2); }
    b.restore();
    for (const [a, c] of L.gaps) {
      Scenery.drawWater(b, buf, a - camX - 8, groundS, (c - a) + 16, clock, theme);
    }
    // ground segments
    let x0 = 0;
    const gaps = L.gaps.slice().sort((p, q) => p[0] - q[0]);
    const segs = [];
    for (const [a, c] of gaps) { if (a > x0) segs.push([x0, a]); x0 = c; }
    if (x0 < L.len) segs.push([x0, L.len]);
    for (const [a, c] of segs) Scenery.drawGround(b, a - camX, groundS, c - a, theme, clock);
    for (const plat of L.plats) Scenery.drawPlatform(b, plat.x - camX, plat.y - camY, plat.w, theme, clock);
    for (const m of L.movers) Scenery.drawPlatform(b, m.x - camX, m.y - camY, m.w, theme, clock);
    for (const c of L.checks) Scenery.flag(b, c - camX, groundS, G && G.p && G.p.cp >= c, clock);
    if (L.arena && G && G.wall) {
      b.fillStyle = '#2a3148';
      b.fillRect(L.arena - camX, groundS - 46, 6, 46);
      b.fillStyle = '#8aa0c8';
      b.fillRect(L.arena - camX, groundS - 46, 6, 3);
    }
    Scenery.gate(b, L.goal - camX, groundS, !G || G.goalOpen, clock);
    if (L.clouds && L.clouds[0]) drawSheet('storm-cloud', clock, L.clouds[0].x - camX, L.clouds[0].y - camY, { sc: 0.42, a: 0.4 });
    if (G) {
      for (const ped of G.pedestals) if (!ped.got) {
        const bob = Math.sin(clock * 3 + ped.x) * 3;
        Scenery.pedestal(b, ped.x - camX, GROUND - camY, clock, false);
        icon(ped.id, ped.x - camX, GROUND - camY - 18 + bob);
      }
      if (L.shrine) {
        Scenery.pedestal(b, L.shrine.x - camX, GROUND - camY, clock, true);
        icon('rocket', L.shrine.x - camX, GROUND - camY - 18 + Math.sin(clock * 3) * 3);
      }
      for (const c of G.loot) if (!c.got) drawSheet('coin-spin', clock + c.x, c.x - camX, c.y - camY + Math.sin(clock * 4 + c.x) * 1.5, { sc: 0.72 });
      for (const h of G.hearts) if (!h.got) drawSheet('heart-pickup', clock, h.x - camX, h.y - camY + Math.sin(clock * 3) * 1.2, { sc: 0.62 });
      for (const d of G.dust) {
        b.globalAlpha = 1 - d.t / 0.35; b.fillStyle = theme === 'snow' ? '#e7f2ff' : '#e2c29a';
        b.fillRect(d.x - camX, d.y - camY - d.t * 10, 2, 2); b.globalAlpha = 1;
      }
      for (const g of G.ghosts) {
        b.save(); b.globalAlpha = g.a;
        Hero.draw(b, g.x - camX, g.y - camY, g.face, 'dash', clock, g.weapon, false);
        b.restore();
      }
      for (const e of G.enemies) if (e.active) drawEnemy(e);
      if (G.boss && !G.boss.dead) drawEnemy(G.boss);
      for (const s of G.shots) {
        drawSheet('bullet-tracer', s.life, s.x - camX, s.y - camY, { sc: 0.42, flip: s.vx < 0, glow: 1 });
      }
      // actor
      if (state !== 'title') {
        shadow(G.p.x - camX, groundS);
        drawHeroAt(G.p, G.weapon, G.p.inv > 0 && Math.sin(clock * 28) > 0.2 && G.p.hurtT <= 0 ? 0.75 : 1);
      }
      // reflections of hero & enemies over lakes
      for (const [a, c] of L.gaps) {
        const surf = groundS, x = a - camX, w = c - a;
        b.save(); b.beginPath(); b.rect(x, surf, w, VH - surf); b.clip();
        b.translate(0, surf); b.scale(1, -1); b.translate(Math.sin(clock * 2.5) * 1.2, -surf);
        b.globalAlpha = 0.28;
        if (G.p.x > a - 30 && G.p.x < c + 30) drawHeroAt(G.p, G.weapon, 1);
        for (const e of G.enemies) if (e.active && e.x > a - 20 && e.x < c + 20) drawEnemy(e);
        b.restore();
      }
      for (const w of G.warns) if (!w.fired) {
        const k = 0.5 + Math.sin(clock * 20) * 0.5;
        b.strokeStyle = w.kind === 'bolt' ? '#ffe38a' : '#ffb080';
        b.globalAlpha = 0.35 + k * 0.5;
        b.beginPath(); b.arc(w.x - camX, groundS, 8 + k * 10, 0, 7); b.stroke();
        b.globalAlpha = 1;
      }
      for (const f of G.fx) {
        if ((SHEETS[f.n] && SHEETS[f.n].screen) || f.screen) continue;
        const tt = (f.t0 || 0) + f.t;
        drawSheet(f.n, tt, f.x - camX, f.y - camY, f);
      }
      for (const n of G.nums) {
        b.globalAlpha = 1 - n.t / 0.7;
        text(String(n.v), n.x - camX, n.y - camY - n.t * 18, n.crit ? 12 : 10, n.crit ? '#ffd056' : '#fff', 'center');
        b.globalAlpha = 1;
      }
    } else if (state === 'title' || state === 'help') {
      const hero = { x: 1310, y: 164, face: 1, vx: 0, vy: 0, on: true, hurtT: 0, skillT: 0, dashT: 0, atk: 0, animT: clock, inv: 0 };
      shadow(hero.x - camX, 164 - camY);
      Hero.draw(b, hero.x - camX, hero.y - camY, 1, 'idle', clock, 'sword', false);
    }
    if (G) for (const f of G.fx) if ((SHEETS[f.n] && SHEETS[f.n].screen) || f.screen) drawScreen(f.n, (f.t0 || 0) + f.t, 1);
    Scenery.grade(b, theme, flashW);
  }

  function drawHUD() {
    const p = G.p, L = cur(), pad = safePad();
    hearts(p.hp, p.maxhp);
    text(String(G.levelCoins), 78, 12, 11, '#e8c060');
    text(L.name, VW / 2, 12 + pad.t, 11, '#e8e4d4', 'center');
    const bx = 8 + pad.l, by = 22 + pad.t;
    b.fillStyle = 'rgba(8,10,18,0.72)';
    b.fillRect(bx, by, 18, 16);
    b.strokeStyle = '#e8c060';
    b.strokeRect(bx + 0.5, by + 0.5, 17, 15);
    icon(G.weapon, bx + 9, by + 9);
    text(WEAPONS[G.weapon].name, bx + 22, by + 8, 11, '#f4f0e4');
    if (G.boss && G.boss.hp > 0) {
      const bw = 180, bx = (VW - bw) / 2, by = 24;
      b.fillStyle = '#1a1018'; b.fillRect(bx, by, bw, 8);
      b.fillStyle = '#ff4d6a'; b.fillRect(bx, by, bw * Math.max(0, G.boss.hp / G.boss.max), 8);
      text('霜瞳', VW / 2, by - 8, 10, '#ffd0d8', 'center');
    }
    for (const t of G.toasts) {
      b.globalAlpha = Math.min(1, t.t * 2);
      b.font = '12px ' + FONT;
      const tw = Math.max(72, t.s.length * 12);
      b.fillStyle = 'rgba(8,10,18,0.78)';
      b.fillRect(VW / 2 - tw / 2 - 8, 70, tw + 16, 16);
      text(t.s, VW / 2, 78, 12, '#fff6d4', 'center');
      b.globalAlpha = 1;
    }
    if (G.nearShrine) text('试用传说武器 · 模拟广告', VW / 2, 96, 11, '#ffd056', 'center');
    if (touchMode) {
      const c = controls();
      const labels = { atk: '攻击', jump: '跳', dash: '冲', skill: '技', swap: '换' };
      for (const k of Object.keys(c)) {
        const r = c[k];
        b.fillStyle = held[k] ? 'rgba(232,192,96,0.72)' : 'rgba(8,10,16,0.38)';
        b.fillRect(r.x, r.y, r.w, r.h);
        b.strokeStyle = 'rgba(232,196,120,0.7)';
        b.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        if (k === 'left' || k === 'right' || k === 'up' || k === 'down') {
          b.fillStyle = held[k] ? '#24180c' : '#fff6d4';
          b.beginPath();
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          if (k === 'left') { b.moveTo(cx + 6, cy - 6); b.lineTo(cx - 6, cy); b.lineTo(cx + 6, cy + 6); }
          if (k === 'right') { b.moveTo(cx - 6, cy - 6); b.lineTo(cx + 6, cy); b.lineTo(cx - 6, cy + 6); }
          if (k === 'up') { b.moveTo(cx - 6, cy + 4); b.lineTo(cx, cy - 6); b.lineTo(cx + 6, cy + 4); }
          if (k === 'down') { b.moveTo(cx - 5, cy - 3); b.lineTo(cx, cy + 4); b.lineTo(cx + 5, cy - 3); }
          b.fill();
        } else text(labels[k], r.x + r.w / 2, r.y + r.h / 2 + 1, 12, held[k] ? '#24180c' : '#fff6d4', 'center');
      }
      const sk = WEAPONS[G.weapon].skill;
      if (p.skillCd > 0) {
        const r = c.skill, h = r.h * Math.min(1, p.skillCd / sk.cd);
        b.fillStyle = 'rgba(0,0,0,0.45)'; b.fillRect(r.x, r.y + r.h - h, r.w, h);
        text(p.skillCd.toFixed(1), r.x + r.w / 2, r.y + r.h / 2, 10, '#fff', 'center');
      }
    }
    for (const bt of buttons()) if (bt.id === 'pause' || bt.id === 'mute') btn(bt, false);
    if (Q.has('fps')) text(PX.fps.toFixed(0) + ' fps', 8, VH - 8, 10, '#9f9', 'left');
  }
  function drawCards() {
    if (state === 'title') {
      text('像素湖影', 300, 36, 26, '#fff6d4', 'left');
      text('横版动作 · 三关试炼', 300, 58, 11, '#ffd056', 'left');
      for (const bt of buttons()) btn(bt, false);
      if (touchMode) text('触屏：左侧移动，右侧攻击 / 跳 / 冲 / 技', 300, 176, 10, '#e8e4d4', 'left');
    } else if (state === 'help') {
      panel(28, 18, 424, 210);
      const lines = ['操作', '键盘：A D 移动，K / 空格跳跃', 'J 攻击连段，L 冲刺，U 技能，Q 换武器', '触屏：左侧方向键，右侧 攻击 / 跳 / 冲 / 技 / 换', '向下可穿过薄平台。石座拾取武器。', '神龛可看模拟广告，试用火箭筒仅本关。'];
      lines.forEach((ln, i) => text(ln, 44, 36 + i * 20, i === 0 ? 16 : 12, i === 0 ? '#ffd056' : '#fff6d4'));
      for (const bt of buttons()) btn(bt, false);
    } else if (state === 'credits') {
      panel(16, 8, 448, 224);
      const lines = [
        '制作名单',
        '像素湖影：程序、关卡、主角与场景为原创。',
        '敌人与特效精灵 pixelfx · Patch & Hugo Duprez',
        'MIT License · github.com/patch-gg/pixelfx',
        'Copyright (c) 2026 Patch',
        'Copyright (c) 2026 Hugo Duprez',
        'Permission is hereby granted, free of charge, to any person',
        'obtaining a copy of this software and associated files,',
        'to deal in the Software without restriction, including',
        'without limitation the rights to use, copy, modify, merge,',
        'publish, distribute, sublicense, and/or sell copies,',
        'and to permit persons to whom the Software is furnished',
        'to do so, subject to the following conditions:',
        'The above copyright notice and this permission notice',
        'shall be included in all copies or substantial portions.',
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY',
        'KIND. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS',
        'BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.',
      ];
      lines.forEach((ln, i) => text(ln, 28, 20 + i * 11, i === 0 ? 13 : 9, i === 0 ? '#ffd056' : '#fff6d4'));
      for (const bt of buttons()) btn(bt, false);
    } else if (state === 'pause') {
      panel(130, 70, 220, 150);
      text('暂停', 240, 88, 16, '#ffd056', 'center');
      for (const bt of buttons()) btn(bt, false);
    } else if (state === 'dead' && !Ads.busy) {
      panel(90, 70, 300, 170);
      text('你倒下了', 240, 96, 18, '#ffd0d8', 'center');
      text('模拟广告不会播放真实内容', 240, 118, 10, '#c8c0b0', 'center');
      for (const bt of buttons()) btn(bt, false);
    } else if (state === 'summary' && G) {
      panel(80, 36, 320, 206);
      const L = LEVELS[G.li];
      text('关卡完成', 240, 54, 16, '#ffd056', 'center');
      text(L.name, 240, 74, 13, '#fff6d4', 'center');
      const sec = G.t | 0;
      text('用时  ' + String((sec / 60) | 0).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'), 120, 98, 12, '#fff');
      text('金币  ' + G.levelCoins + (G.tripled ? '  ×3' : ''), 120, 116, 12, '#ffd056');
      text('击破  ' + G.kills, 120, 134, 12, '#fff');
      let stars = '';
      for (let i = 0; i < 3; i++) stars += i < G.stars ? '★' : '☆';
      text(stars, 240, 152, 16, '#ffd056', 'center');
      for (const bt of buttons()) btn(bt, false);
    }
    if (Ads.busy) {
      panel(70, 78, 340, 110);
      text('模拟广告', 240, 100, 18, '#ffd056', 'center');
      text('不会播放任何真实广告', 240, 122, 12, '#fff6d4', 'center');
      const place = { revive: '奖励：原地复活', triple_coins: '奖励：本关金币×3', legendary_weapon: '奖励：试用火箭筒（本关）' }[Ads.placement] || '奖励待发放';
      text(place, 240, 142, 12, '#fff', 'center');
      text(Ads.remain.toFixed(1) + ' 秒', 240, 164, 14, '#ffd056', 'center');
    }
  }
  function drawLoad() {
    b.fillStyle = '#1a2438'; b.fillRect(0, 0, VW, VH);
    try { Scenery.drawBackdrop(b, 200, clock, 'sun'); } catch (e) { /* scenery may still be fine */ }
    panel(120, 110, 240, 48);
    text('正在揭开画卷', 240, 124, 14, '#fff6d4', 'center');
    b.fillStyle = '#3a3020'; b.fillRect(140, 138, 200, 6);
    b.fillStyle = '#ffd056'; b.fillRect(140, 138, 200 * (loadN / loadD), 6);
  }

  function frame(now) {
    try { frameBody(now); } catch (err) { PX.errors.push(String(err && err.stack || err)); }
    requestAnimationFrame(frame);
  }
  function frameBody(now) {
    if (!frame.last) frame.last = now;
    const real = Math.min(0.05, (now - frame.last) / 1000 || 0);
    frame.last = now;
    clock += real;
    fpsAcc += real; fpsN++;
    if (fpsN >= 20) { PX.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    PX.frames++; PX.state = state; PX.fx = G ? G.fx.length : 0; PX.level = G ? G.li : -1; PX.weapon = G ? G.weapon : ''; PX.hp = G ? G.p.hp : 0;
    if (state !== 'loading') {
      poll();
      if (state === 'play' && Q.has('bot') && !G.gallery && !Ads.busy) bot();
      if (state === 'play' && G && G.gallery && !Ads.busy) gallery();
      uiClicks();
      Ads.update(real);
      if (state === 'play' && G && !Ads.busy) {
        if (G.hitStop > 0) G.hitStop -= real;
        else sim(Math.min(0.033, real));
        const run = G.p.on && Math.abs(G.p.vx) > 18 && !G.p.atk;
        if (run || G.p.animT != null) G.p.animT += Math.min(0.033, real);
      }
      SFX.update(real);
      shake *= (G && G.hitStop > 0) ? 1 : Math.max(0, 1 - real * 6);
      if (shake < 0.2) shake = 0;
      flashW = Math.max(0, flashW - real * 1.6);
    }
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, VW, VH);
    if (state === 'loading') drawLoad();
    else {
      if (state === 'title' || state === 'help') { camX = Math.round(1180 + Math.sin(clock * 0.25) * 12); camY = GROUND - 118; }
      if (state === 'credits') { camX = Math.round(420 + Math.sin(clock * 0.2) * 12); camY = GROUND - 118; }
      camX = Math.round(camX); camY = Math.round(camY);
      b.save();
      b.imageSmoothingEnabled = false;
      if (shake > 0) b.translate(Math.round((Math.random() - 0.5) * shake * 2), Math.round((Math.random() - 0.5) * shake * 2));
      drawWorld();
      b.restore();
      if (state === 'play' || state === 'pause' || state === 'dead' || state === 'summary') if (G) drawHUD();
      drawCards();
    }
    const dprW = cv.width, dprH = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 0, dprW, dprH);
    const s = Math.min(dprW / VW, dprH / VH);
    ctx.drawImage(buf, (dprW - VW * s) / 2, (dprH - VH * s) / 2, VW * s, VH * s);
    if (innerHeight > innerWidth * 1.05) {
      const dpr = dprW / Math.max(1, innerWidth);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(6,8,14,0.92)';
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = '#f4f0e4';
      ctx.font = '20px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请把手机转成横向', innerWidth / 2, innerHeight / 2 - 12);
      ctx.font = '13px ' + FONT;
      ctx.fillStyle = '#e8c060';
      ctx.fillText('横屏游玩', innerWidth / 2, innerHeight / 2 + 16);
    }
  }

  function boot() {
    SFX.init();
    if (Q.has('mute')) SFX.muted = true;
    const fontP = (document.fonts && document.fonts.load) ? document.fonts.load('16px "WenQuanYi Micro Hei"') : Promise.resolve();
    Promise.all([loadImages(), fontP]).then(() => {
      if (Q.has('credits')) state = 'credits';
      else if (Q.has('summary')) { newGame(+(Q.get('level') || 0)); state = 'summary'; G.stars = 3; G.levelCoins = 12; G.kills = 6; G.t = 42; }
      else if (Q.has('death')) { newGame(+(Q.get('level') || 0)); state = 'dead'; G.p.hp = 0; if (Q.has('ad')) askRevive(); }
      else if (Q.has('autostart') || Q.has('bot') || Q.has('gallery')) newGame(+(Q.get('level') || 0));
      else state = 'title';
      PX.ready = true;
    }).catch((err) => { PX.errors.push(String(err)); state = 'title'; PX.ready = true; });
    requestAnimationFrame(frame);
  }
  boot();
})();
