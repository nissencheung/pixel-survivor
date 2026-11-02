// 多层视差、水面倒影、随风摆动的草和树。按关卡主题烘焙远景。
window.Scenery = (() => {
  const W = 480, H = 270;
  let built = '';
  let sky, farMt, nearMt, clouds, vig;
  let pines = [], rounds = [];
  const refl = document.createElement('canvas');
  refl.width = W; refl.height = 120;
  const rctx = refl.getContext('2d');

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function themeOf(id) {
    if (id === 'storm') {
      return {
        sky: ['#1a2030', '#3a465c', '#6a7388'], sun: null, moon: '#d5dbe8',
        far: '#8b97ab', near: '#4d596c', ridge: '#c5d0e0', snow: false,
        leaf: '#1e3a34', leafHi: '#3e6a58', trunk: '#2a241c',
        grass: '#3d6a52', grassHi: '#7dba8a', dirt: '#4a4038', dirtDark: '#2e2824', pebble: '#6a6258',
        waterTop: '#35586e', waterDeep: '#101820', glint: 'rgba(210,230,240,0.45)',
        grade: 'rgba(70, 90, 120, 0.16)', vig: 0.85, shaft: false,
      };
    }
    if (id === 'snow') {
      return {
        sky: ['#070a16', '#141a36', '#24325e'], sun: null, moon: '#f6f1d4',
        far: '#9aabcc', near: '#3d4d78', ridge: '#eef3ff', snow: true,
        leaf: '#243044', leafHi: '#d5e2f4', trunk: '#2a241e',
        grass: '#e7f2ff', grassHi: '#ffffff', dirt: '#6d7c96', dirtDark: '#3e4a62', pebble: '#d5e0ee',
        waterTop: '#8eb6d4', waterDeep: '#1a3054', glint: 'rgba(255,255,255,0.7)',
        grade: 'rgba(40, 60, 130, 0.10)', vig: 0.72, shaft: false,
      };
    }
    return {
      sky: ['#67bfff', '#b7e6ff', '#ffe6b4'], sun: '#ffe38a', moon: null,
      far: '#c5d7ee', near: '#6e90b8', ridge: '#f3f7ff', snow: false,
      leaf: '#1f7a3a', leafHi: '#b6ee6a', trunk: '#5a3a22',
      grass: '#3eae48', grassHi: '#d8ff9a', dirt: '#c47a3c', dirtDark: '#7a4a28', pebble: '#e2c29a',
      waterTop: '#3ec6ea', waterDeep: '#0b5f86', glint: 'rgba(240,255,255,0.8)',
      grade: 'rgba(255, 196, 120, 0.08)', vig: 0.55, shaft: true,
    };
  }
function T(id) {
    const t = themeOf(id);
    if (id !== 'storm' && id !== 'snow') t.dirt = '#c47a3c';
    return t;
  }

  function makeSky(th, seed) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, th.sky[0]);
    grd.addColorStop(0.55, th.sky[1]);
    grd.addColorStop(1, th.sky[2]);
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    const rand = rng(seed);
    if (!th.sun) {
      for (let i = 0; i < 70; i++) {
        const x = (rand() * W) | 0, y = (rand() * 120) | 0;
        g.fillStyle = rand() > 0.8 ? '#fff' : 'rgba(255,255,255,0.7)';
        g.fillRect(x, y, rand() > 0.85 ? 2 : 1, 1);
      }
    }
    if (th.sun) {
      g.fillStyle = '#fff4c4';
      g.beginPath(); g.arc(390, 48, 16, 0, 7); g.fill();
      g.fillStyle = th.sun;
      g.beginPath(); g.arc(390, 48, 11, 0, 7); g.fill();
    }
    if (th.moon) {
      g.fillStyle = th.moon;
      g.beginPath(); g.arc(400, 42, 12, 0, 7); g.fill();
      g.fillStyle = th.sky[0];
      g.beginPath(); g.arc(405, 40, 9, 0, 7); g.fill();
    }
    return c;
  }
  function makeClouds(th, seed) {
    const c = document.createElement('canvas');
    c.width = 700; c.height = 90;
    const g = c.getContext('2d');
    const rand = rng(seed + 3);
    const col = th.sun ? 'rgba(255,255,255,0.85)' : 'rgba(210,216,230,0.35)';
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 100 + (rand() * 30) | 0;
      const y = 16 + (rand() * 30) | 0;
      g.fillStyle = col;
      g.fillRect(x, y, 36, 10);
      g.fillRect(x + 6, y - 6, 22, 8);
      g.fillRect(x + 14, y + 6, 18, 6);
    }
    return c;
  }
  function ridge(w, base, amp, f1, f2) {
    const ys = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const y = base
        - amp * Math.abs(Math.sin(x * f1)) ** 1.25
        - amp * 0.45 * Math.abs(Math.sin(x * f2 + 1.3)) ** 1.4
        - amp * 0.12 * Math.sin(x * 0.05);
      ys[x] = y;
    }
    return ys;
  }
  function makeMt(th, far) {
    const w = 960, h = far ? 120 : 150;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const ys = ridge(w, far ? 78 : 96, far ? 34 : 48, far ? 0.007 : 0.011, far ? 0.017 : 0.023);
    const col = far ? th.far : th.near;
    g.fillStyle = col;
    for (let x = 0; x < w; x++) {
      const y = ys[x] | 0;
      g.fillRect(x, y, 1, h - y);
    }
    g.fillStyle = th.ridge;
    for (let x = 0; x < w; x++) g.fillRect(x, ys[x] | 0, 1, far ? 1 : 2);
    if (th.snow) {
      g.fillStyle = '#f4f8ff';
      for (let x = 0; x < w; x += 2) {
        const y = ys[x] | 0;
        g.fillRect(x, y, 2, 4 + ((x / 2) % 3));
      }
    }
    // crevices
    g.fillStyle = 'rgba(0,0,0,0.13)';
    for (let x = 8; x < w; x += 36) {
      const y = (ys[x] | 0) + 10;
      g.fillRect(x, y, 2, 18 + (x % 11));
    }
    return c;
  }
  function makePine(th, h, snow) {
    const c = document.createElement('canvas');
    c.width = 46; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = th.trunk;
    g.fillRect(21, h - 14, 5, 14);
    g.fillStyle = '#3a2a1c';
    g.fillRect(21, h - 14, 2, 14);
    const layers = 3;
    for (let L = 0; L < layers; L++) {
      const top = 2 + L * Math.floor((h - 16) / layers);
      const thk = Math.floor((h - 12) / layers) + 4;
      const maxW = 10 + L * 8;
      for (let y = 0; y < thk; y++) {
        const ww = Math.max(2, Math.floor(maxW * ((y + 1) / thk)));
        g.fillStyle = y < 2 ? th.leafHi : (y % 5 === 0 ? '#16321e' : th.leaf);
        if (snow && y < 3) g.fillStyle = '#f4f8ff';
        g.fillRect(23 - (ww >> 1), top + y, ww, 1);
      }
    }
    return c;
  }
  function makeRound(th, snow) {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 46;
    const g = c.getContext('2d');
    g.fillStyle = th.trunk;
    g.fillRect(18, 28, 5, 18);
    g.fillStyle = th.leaf;
    g.fillRect(8, 16, 24, 16);
    g.fillRect(12, 10, 16, 10);
    g.fillRect(16, 6, 8, 6);
    g.fillStyle = th.leafHi;
    g.fillRect(14, 12, 6, 3);
    g.fillRect(12, 18, 4, 2);
    if (snow) { g.fillStyle = '#f7fbff'; g.fillRect(12, 8, 14, 3); g.fillRect(10, 14, 8, 2); }
    return c;
  }
  function makeVig() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(240, 130, 70, 240, 140, 300);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(0.7, 'rgba(0,0,0,0.18)');
    rad.addColorStop(1, 'rgba(0,0,0,0.62)');
    g.fillStyle = rad;
    g.fillRect(0, 0, W, H);
    return c;
  }
  function prepare(id) {
    if (built === id && sky) return;
    built = id;
    const th = T(id);
    sky = makeSky(th, id === 'snow' ? 9 : 2);
    clouds = makeClouds(th, 5);
    farMt = makeMt(th, true);
    nearMt = makeMt(th, false);
    vig = makeVig();
    pines = [makePine(th, 78, th.snow), makePine(th, 96, th.snow), makePine(th, 64, th.snow)];
    rounds = [makeRound(th, th.snow)];
  }
  function blit(ctx, img, cam, factor, y) {
    const w = img.width;
    let x = -Math.floor(cam * factor) % w;
    if (x > 0) x -= w;
    ctx.drawImage(img, x, y);
    ctx.drawImage(img, x + w, y);
    if (x + w * 2 < W) ctx.drawImage(img, x + w * 2, y);
  }
  function swayTree(ctx, img, x, y, t, i, sc) {
    const s = Math.sin(t * 1.3 + i) * 2.2;
    const w = img.width * sc, h = img.height * sc;
    const cut = (h * 0.42) | 0;
    ctx.drawImage(img, 0, 0, img.width, img.height * 0.42, x + s, y, w, cut);
    ctx.drawImage(img, 0, img.height * 0.42, img.width, img.height * 0.58, x + s * 0.35, y + cut, w, h - cut);
  }
  function drawTrees(ctx, cam, ground, t, th, far) {
    const factor = far ? 0.28 : 0.52;
    const sc = far ? 0.72 : 1;
    const n = far ? 10 : 8;
    const span = 1400;
    for (let i = 0; i < n; i++) {
      const world = i * (span / n) + (far ? 40 : 90);
      const x = world - cam * factor;
      const img = far ? pines[i % pines.length] : (i % 3 === 0 ? rounds[0] : pines[(i + 1) % pines.length]);
      const y = ground - img.height * sc + (far ? 6 : 0);
      if (x > -80 && x < W + 20) swayTree(ctx, img, x, y, t, i + (far ? 0 : 4), sc);
    }
  }
  function hash(x) {
    x = (x | 0) * 374761393;
    x = (x ^ (x >>> 13)) >>> 0;
    return (x % 1000) / 1000;
  }
  function topBand(ctx, x, y, w, th, t, floating) {
    ctx.fillStyle = th.dirtDark;
    ctx.fillRect(x, y + (floating ? 9 : 16), w, floating ? 3 : 8);
    ctx.fillStyle = th.dirt;
    ctx.fillRect(x, y + 4, w, floating ? 7 : 14);
    if (!floating) {
      for (let i = x + 3; i < x + w; i += 9) {
        if (hash(i) > 0.62) {
          ctx.fillStyle = th.pebble;
          ctx.fillRect(i, y + 8 + ((hash(i * 3) * 5) | 0), 2, 2);
        }
      }
    }
    ctx.fillStyle = '#1a120e';
    ctx.fillRect(x, y + 4, w, 1);
    ctx.fillStyle = th.grass;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = th.grassHi;
    ctx.fillRect(x, y, w, 1);
    for (let i = x; i < x + w; i += 3) {
      const h = 2 + ((hash(i) * 2) | 0) + ((Math.sin(t * 2.4 + i * 0.35) * 0.5 + 0.5) * 2 | 0);
      ctx.fillStyle = hash(i + 2) > 0.5 ? th.grassHi : th.grass;
      ctx.fillRect(i, y - h, 1, h);
      if (!floating && hash(i + 11) > 0.86) {
        ctx.fillStyle = hash(i) > 0.5 ? '#ffd056' : '#ff6d86';
        ctx.fillRect(i, y - h - 1, 2, 2);
      }
    }
  }

  return {
    prepare(id) { prepare(id || 'sun'); },
    theme(id) { return T(id || 'sun'); },
    drawBackdrop(ctx, cam, t, themeId, mid) {
      prepare(themeId);
      const th = T(themeId);
      ctx.drawImage(sky, 0, 0);
      if (th.shaft) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.10 + Math.sin(t * 0.6) * 0.02;
        ctx.fillStyle = '#fff1c8';
        ctx.beginPath();
        ctx.moveTo(360, 0); ctx.lineTo(410, 0); ctx.lineTo(300, 168); ctx.lineTo(210, 168);
        ctx.fill();
        ctx.globalAlpha = 0.06;
        ctx.beginPath();
        ctx.moveTo(300, 0); ctx.lineTo(330, 0); ctx.lineTo(180, 168); ctx.lineTo(120, 168);
        ctx.fill();
        ctx.restore();
      }
      if (!th.sun) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,244,210,0.18)';
        ctx.beginPath(); ctx.arc(400, 42, 36, 0, 7); ctx.fill();
        ctx.restore();
      }
      blit(ctx, clouds, cam, 0.08, 18 + Math.sin(t * 0.4) * 2);
      // birds on sunny days
      if (th.sun) {
        ctx.fillStyle = '#2c241c';
        for (let i = 0; i < 3; i++) {
          const x = ((i * 180 + t * 14) % (W + 40)) - 20;
          const y = 36 + i * 10;
          const flap = ((t * 6 + i) | 0) % 2;
          ctx.fillRect(x, y, 2, 1);
          ctx.fillRect(x - 2, y - flap, 2, 1);
          ctx.fillRect(x + 2, y - flap, 2, 1);
        }
      }
      if (mid) mid();
      blit(ctx, farMt, cam, 0.16, 58);
      blit(ctx, nearMt, cam, 0.30, 72);
      return th;
    },
    drawTreesAt(ctx, camX, groundScreen, t, themeId) {
      prepare(themeId);
      const th = T(themeId);
      drawTrees(ctx, camX, groundScreen - 18, t, th, true);
      drawTrees(ctx, camX, groundScreen, t, th, false);
    },
    drawGround(ctx, x, y, w, themeId, t) {
      const th = T(themeId);
      ctx.fillStyle = th.dirtDark;
      ctx.fillRect(x, y + 18, w, 220);
      topBand(ctx, x, y, w, th, t, false);
      // bank edge shading
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + 5, 2, 28);
      ctx.fillRect(x + w - 2, y + 5, 2, 28);
    },
    drawPlatform(ctx, x, y, w, themeId, t) {
      const th = T(themeId);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + 3, y + 12, w, 3);
      topBand(ctx, x, y, w, th, t, true);
    },
    drawWater(ctx, buf, x, surf, w, t, themeId) {
      if (w <= 2 || surf >= H) return;
      const th = T(themeId);
      const deep = Math.min(H, surf + 130) - surf;
      const grd = ctx.createLinearGradient(0, surf, 0, surf + deep);
      grd.addColorStop(0, th.waterTop);
      grd.addColorStop(1, th.waterDeep);
      ctx.fillStyle = grd;
      ctx.fillRect(x, surf, w, deep);
      const srcH = Math.max(8, Math.min(100, surf));
      const srcY = surf - srcH;
      rctx.clearRect(0, 0, W, 120);
      rctx.save();
      rctx.translate(0, srcH);
      rctx.scale(1, -1);
      rctx.drawImage(buf, 0, srcY, W, srcH, 0, 0, W, srcH);
      rctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, surf, w, deep);
      ctx.clip();
      ctx.globalAlpha = 0.5;
      const cols = Math.ceil(w / 3);
      for (let i = 0; i < cols; i++) {
        const sx = x + i * 3;
        const oy = Math.sin(sx * 0.12 + t * 2.4) * 2.2;
        ctx.drawImage(refl, sx, 0, 3, srcH, sx, surf + oy, 3, Math.min(srcH, deep));
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = themeId === 'sun' ? 'rgba(8,70,110,0.22)' : 'rgba(6,16,28,0.28)';
      ctx.fillRect(x, surf, w, deep);
      // caustics
      ctx.fillStyle = th.glint;
      for (let i = 0; i < 16; i++) {
        const px = x + ((i * 53 + t * 28) % w);
        const py = surf + 8 + ((i * 17) % Math.max(10, deep * 0.45)) + Math.sin(t * 2 + i) * 1.5;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(px | 0, py | 0, 3, 1);
      }
      ctx.globalAlpha = 1;
      for (let i = x; i < x + w; i += 2) {
        const oy = Math.sin(i * 0.18 + t * 3.2) * 1.4;
        ctx.fillStyle = th.glint;
        ctx.fillRect(i, surf + oy, 2, 1);
        if (((i / 2) | 0) % 5 === 0) ctx.fillRect(i, surf + 2 + oy, 1, 1);
      }
      ctx.restore();
    },
    frontGrass(ctx, camX, ground, t, themeId) {
      const th = T(themeId);
      ctx.fillStyle = th.grassHi;
      for (let i = -20; i < W + 20; i += 4) {
        const wx = i + camX * 1.15;
        const h = 5 + ((hash(wx | 0) * 4) | 0) + ((Math.sin(t * 3 + wx * 0.2) + 1) | 0);
        const x = i - ((camX * 1.15) % 4);
        ctx.fillStyle = hash(wx) > 0.5 ? th.grassHi : th.grass;
        ctx.fillRect(x, ground - h + 2, 1, h);
      }
    },
    decor(ctx, kind, x, y, t) {
      if (kind === 'bush') {
        ctx.fillStyle = '#1d6b32';
        ctx.fillRect(x - 8, y - 10, 16, 8);
        ctx.fillStyle = '#8fe06a';
        ctx.fillRect(x - 5, y - 12, 6, 3);
        ctx.fillStyle = '#3a2a1c';
        ctx.fillRect(x - 1, y - 4, 2, 4);
      } else if (kind === 'flower') {
        ctx.fillStyle = '#2f8a3a';
        ctx.fillRect(x, y - 6, 1, 6);
        ctx.fillStyle = (hash(x) > 0.5) ? '#ffd056' : '#ff6d86';
        ctx.fillRect(x - 1, y - 8, 3, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y - 7, 1, 1);
      } else if (kind === 'tallgrass') {
        ctx.fillStyle = '#8fe06a';
        const s = Math.sin(t * 2.5 + x) * 1;
        ctx.fillRect(x + s, y - 8, 1, 8);
        ctx.fillRect(x + 2, y - 6, 1, 6);
        ctx.fillRect(x - 2 + s, y - 5, 1, 5);
      } else if (kind === 'rock') {
        ctx.fillStyle = '#5c564e';
        ctx.fillRect(x - 5, y - 5, 10, 5);
        ctx.fillStyle = '#8d877c';
        ctx.fillRect(x - 3, y - 6, 5, 2);
      } else if (kind === 'lamp') {
        ctx.fillStyle = '#3a3430';
        ctx.fillRect(x, y - 16, 2, 16);
        ctx.fillStyle = '#2a2420';
        ctx.fillRect(x - 3, y - 18, 8, 3);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,196,110,0.45)';
        ctx.fillRect(x - 6, y - 24, 14, 10);
        ctx.fillStyle = 'rgba(255,230,170,0.8)';
        ctx.fillRect(x - 1, y - 20, 4, 3);
        ctx.restore();
      } else if (kind === 'snowbush') {
        ctx.fillStyle = '#31445e';
        ctx.fillRect(x - 7, y - 8, 14, 7);
        ctx.fillStyle = '#f4f8ff';
        ctx.fillRect(x - 6, y - 10, 12, 3);
      } else if (kind === 'crystal') {
        ctx.fillStyle = '#7ae0ff';
        ctx.fillRect(x, y - 10, 2, 10);
        ctx.fillRect(x - 2, y - 6, 6, 2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(140,230,255,0.45)';
        ctx.fillRect(x - 4, y - 12, 10, 10);
        ctx.restore();
      } else if (kind === 'reed') {
        const s = Math.sin(t * 2 + x) * 1.4;
        ctx.fillStyle = '#1d6a48';
        ctx.fillRect(x + s, y - 12, 1, 12);
        ctx.fillRect(x + 3, y - 9, 1, 9);
        ctx.fillStyle = '#8fd0a0';
        ctx.fillRect(x + s, y - 13, 2, 2);
      }
    },
    grade(ctx, themeId, flash) {
      prepare(themeId);
      const th = T(themeId);
      ctx.save();
      ctx.fillStyle = th.grade;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = th.vig;
      ctx.drawImage(vig, 0, 0);
      if (flash > 0) {
        ctx.globalAlpha = Math.min(0.55, flash);
        ctx.fillStyle = '#f4f7ff';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    },
    flag(ctx, x, y, on, t) {
      ctx.fillStyle = '#3a3430';
      ctx.fillRect(x, y - 22, 2, 22);
      ctx.fillStyle = on ? '#ffd056' : '#7eb0e8';
      const fw = 8 + Math.sin(t * 4) ;
      ctx.fillRect(x + 2, y - 20, fw, 5);
      ctx.fillStyle = on ? '#fff4c8' : '#d5e8ff';
      ctx.fillRect(x + 2, y - 20, fw, 1);
    },
    gate(ctx, x, y, open, t) {
      ctx.fillStyle = open ? '#6a5434' : '#3a3a44';
      ctx.fillRect(x - 10, y - 32, 4, 32);
      ctx.fillRect(x + 10, y - 32, 4, 32);
      ctx.fillRect(x - 12, y - 34, 28, 4);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = open ? 'rgba(255,220,120,0.85)' : 'rgba(120,140,180,0.4)';
      const p = 0.5 + Math.sin(t * 3) * 0.5;
      ctx.globalAlpha = 0.35 + p * 0.4;
      ctx.fillRect(x - 2, y - 28, 6, 20);
      ctx.restore();
    },
    pedestal(ctx, x, y, t, rare) {
      ctx.fillStyle = '#4a4038';
      ctx.fillRect(x - 8, y - 6, 16, 6);
      ctx.fillStyle = '#8d7b68';
      ctx.fillRect(x - 6, y - 8, 12, 3);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rare ? 'rgba(255,140,60,0.55)' : 'rgba(255,220,140,0.4)';
      ctx.globalAlpha = 0.45 + Math.sin(t * 3) * 0.2;
      ctx.fillRect(x - 8, y - 22, 16, 14);
      ctx.restore();
    },
  };
})();
