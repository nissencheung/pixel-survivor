// 主角像素：头盔骑士，武器会换手持物。帧画在离屏画布上，带一圈描边。
window.Hero = (() => {
  const K = {
    helm: '#3c63e8', helmD: '#243a96', helmH: '#d5e6ff',
    gold: '#ffd056', goldD: '#d4922a',
    cape: '#e4374e', capeD: '#8e1c32', capeH: '#ffb0ba',
    cloth: '#3d4d7c', boot: '#241c18', bootH: '#6a5244',
    blade: '#f7fbff', bladeD: '#93a6c6',
    wood: '#c4843c', woodD: '#6e4218',
    iron: '#3c4452', ironH: '#c5cedc', brass: '#f0c14a',
  };
  const cache = new Map();
  const flashC = document.createElement('canvas');
  flashC.width = 72; flashC.height = 64;
  const flashG = flashC.getContext('2d');

  function putRect(list, x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) list.push([x + i, y + j, c]);
  }
  function putLine(list, x0, y0, x1, y1, c) {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      list.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), c]);
    }
  }
  function weaponPixels(list, hx, hy, aim, weapon) {
    const dx = Math.cos(aim), dy = Math.sin(aim);
    const P = (i, ox, oy, c) => list.push([Math.round(hx + dx * i + ox), Math.round(hy + dy * i + oy), c]);
    if (weapon === 'hammer') {
      for (let i = 0; i < 9; i++) P(i, 0, 0, i < 2 ? K.goldD : K.wood);
      for (let k = -4; k <= 4; k++) {
        list.push([Math.round(hx + dx * 10 - dy * k), Math.round(hy + dy * 10 + dx * k), K.iron]);
        list.push([Math.round(hx + dx * 11 - dy * k), Math.round(hy + dy * 11 + dx * k), k === 0 ? K.brass : K.ironH]);
      }
    } else if (weapon === 'spear') {
      for (let i = 0; i < 20; i++) P(i, 0, 0, i > 16 ? K.blade : (i % 4 === 0 ? K.woodD : K.wood));
      P(20, 0, 0, K.blade);
      list.push([Math.round(hx + dx * 16 - dy * 2), Math.round(hy + dy * 16 + dx * 2), K.bladeD]);
      list.push([Math.round(hx + dx * 16 + dy * 2), Math.round(hy + dy * 16 - dx * 2), K.bladeD]);
    } else if (weapon === 'gun') {
      for (let i = 0; i < 11; i++) {
        P(i, 0, 0, K.iron);
        P(i, -dy, dx, K.ironH);
      }
      P(11, 0, 0, '#ffd8a0');
      list.push([hx, hy + 1, K.wood]);
      list.push([hx, hy + 2, K.woodD]);
      list.push([hx - 1, hy + 2, K.woodD]);
    } else if (weapon === 'rocket') {
      for (let i = 0; i < 13; i++) {
        P(i, 0, 0, K.iron);
        P(i, -dy, dx, K.ironH);
        P(i, dy, -dx, K.iron);
      }
      P(13, 0, 0, K.cape);
      P(14, 0, 0, K.gold);
      P(2, dy * 3, -dx * 3, K.woodD);
    } else {
      for (let i = 0; i < 13; i++) P(i, 0, 0, i < 2 ? K.goldD : (i > 10 ? '#fff' : (i % 3 ? K.blade : K.bladeD)));
      list.push([Math.round(hx + dx * 2 - dy * 3), Math.round(hy + dy * 2 + dx * 3), K.gold]);
      list.push([Math.round(hx + dx * 2 + dy * 3), Math.round(hy + dy * 2 - dx * 3), K.gold]);
    }
  }
  function build(pose, weapon) {
    const list = [];
    const lean = pose.lean || 0;
    const bob = pose.bob || 0;
    const put = (x, y, c) => list.push([x, y + bob, c]);
    const R = (x, y, w, h, c) => putRect(list, x, y + bob, w, h, c);
    const cape = pose.cape || 0;
    R(-9 + cape, -23, 6, 16, K.capeD);
    R(-8 + cape, -23, 4, 12, K.cape);
    R(-8 + cape, -23, 2, 5, K.capeH);
    put(-9 + cape, -7, K.capeD);
    put(-6 + cape, -6, K.cape);
    put(-4 + cape, -8, K.capeH);
    const lb = pose.legB || 0, lf = pose.legF || 0, lift = pose.legLift || 0;
    R(-6 + lb, -12 - lift, 4, 8, K.cloth);
    R(-7 + lb, -5 - lift, 5, 4, K.boot);
    put(-7 + lb, -5 - lift, K.bootH);
    R(1 + lf, -12 - lift, 4, 8, '#4a5c92');
    R(1 + lf, -5 - lift, 5, 4, K.boot);
    put(2 + lf, -5 - lift, K.bootH);
    R(-6 + lean, -23, 12, 12, K.helmD);
    R(-5 + lean, -22, 10, 9, K.helm);
    R(-5 + lean, -22, 10, 2, K.helmH);
    R(-5 + lean, -14, 10, 2, K.gold);
    put(-1 + lean, -19, K.gold);
    put(0 + lean, -19, K.goldD);
    R(-6 + lean, -33, 12, 11, K.helmD);
    R(-5 + lean, -32, 10, 9, K.helm);
    R(-4 + lean, -32, 5, 2, K.helmH);
    R(-4 + lean, -28, 8, 3, K.gold);
    R(-3 + lean, -27, 6, 1, pose.blink ? K.goldD : '#120e14');
    const pl = pose.plume || 0;
    R(-2 + lean, -38 - pl, 3, 6, K.cape);
    R(-1 + lean, -40 - pl, 3, 4, K.capeH);
    put(2 + lean, -37 - pl, K.capeD);
    const hand = pose.hand || { x: 8, y: -22 };
    putLine(list, 5 + lean, -19 + bob, hand.x, hand.y + bob, K.helm);
    putRect(list, 3 + lean, -21 + bob, 4, 4, K.helmH);
    weaponPixels(list, hand.x, hand.y + bob, pose.aim == null ? -0.9 : pose.aim, weapon);
    return list;
  }
  function render(pose, weapon) {
    const pix = build(pose, weapon);
    const c = document.createElement('canvas');
    c.width = 72; c.height = 64;
    const g = c.getContext('2d');
    const ox = 30, oy = 52;
    g.fillStyle = '#140e18';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const [x, y] of pix) {
        const X = x + ox + dx, Y = y + oy + dy;
        if (X >= 0 && Y >= 0 && X < 72 && Y < 64) g.fillRect(X, Y, 1, 1);
      }
    }
    for (const [x, y, col] of pix) {
      const X = x + ox, Y = y + oy;
      if (X >= 0 && Y >= 0 && X < 72 && Y < 64) {
        g.fillStyle = col;
        g.fillRect(X, Y, 1, 1);
      }
    }
    return c;
  }
  function restHand(weapon) {
    if (weapon === 'hammer') return { hand: { x: 8, y: -23 }, aim: -1.15 };
    if (weapon === 'spear') return { hand: { x: 9, y: -18 }, aim: -0.12 };
    if (weapon === 'gun') return { hand: { x: 10, y: -17 }, aim: 0.02 };
    if (weapon === 'rocket') return { hand: { x: 8, y: -18 }, aim: -0.25 };
    return { hand: { x: 7, y: -24 }, aim: -1.0 };
  }
  function attackPose(anim, i, weapon) {
    const H = (x, y, aim, lean, bob) => ({ lean, cape: lean > 0 ? -1 : 1, legF: lean > 0 ? 1 : 0, legB: 0, bob: bob || 0, plume: 0, hand: { x, y }, aim });
    if (weapon === 'hammer') {
      if (anim === 'atk1') return [H(4, -30, -1.7, -1), H(3, -34, -1.85, -2), H(10, -8, 1.15, 2, 2), H(8, -16, 0.4, 1)][i];
      if (anim === 'atk2') return [H(2, -28, -1.3, -1), H(12, -16, 0.2, 2), H(14, -10, 0.9, 2), H(8, -18, -0.4, 0)][i];
      return [H(4, -32, -1.6, -1), H(6, -34, -1.7, -1), H(8, -6, 1.35, 1, 2), H(8, -14, 0.6, 0)][i];
    }
    if (weapon === 'spear') {
      if (anim === 'atk1') return [H(8, -18, -0.2, 0), H(16, -16, 0.02, 3), H(18, -16, 0.02, 3), H(10, -18, -0.1, 1)][i];
      if (anim === 'atk2') return [H(6, -22, -0.5, 0), H(12, -12, 0.55, 1), H(14, -8, 1.0, 1), H(8, -16, 0.2, 0)][i];
      return [H(6, -20, -0.8, -1), H(14, -14, 0.15, 2), H(18, -12, 0.25, 2), H(10, -16, -0.1, 0)][i];
    }
    if (weapon === 'gun' || weapon === 'rocket') {
      const recoil = anim === 'atk3' || anim === 'skill' ? -3 : -1;
      return [H(10, -17, 0.02, 1), H(8, -17, -0.05, recoil), H(11, -16, 0.08, recoil), H(10, -17, 0, 0)][i];
    }
    if (anim === 'atk2') return [H(4, -26, -1.2, -1), H(12, -14, 0.7, 2), H(6, -28, -2.4, 0), H(8, -20, -0.6, 0)][i];
    if (anim === 'atk3' || anim === 'skill') return [H(6, -20, -0.4, 0), H(8, -30, -1.45, -1), H(8, -34, -1.7, -2), H(7, -24, -1.0, 0)][i];
    return [H(3, -28, -1.65, -1), H(13, -17, 0.08, 2), H(15, -15, 0.35, 2), H(8, -21, -0.35, 0)][i];
  }
  function poseAt(anim, i, weapon) {
    const r = restHand(weapon);
    const b = { lean: 0, cape: 0, legF: 0, legB: 0, bob: 0, plume: 0, blink: 0, legLift: 0, hand: r.hand, aim: r.aim };
    if (anim === 'idle') {
      b.bob = (i === 1 || i === 2) ? -1 : 0;
      b.cape = (i === 1 || i === 2) ? 1 : -1;
      b.plume = (i === 1 || i === 2) ? 1 : 0;
      b.blink = i === 2;
    } else if (anim === 'run') {
      const sw = [0, 1, 2, 1, 0, -1, -2, -1][i];
      b.legF = sw; b.legB = -sw;
      b.bob = (i % 4 === 1 || i % 4 === 2) ? -1 : 0;
      b.cape = -Math.sign(sw || 1);
      b.plume = i % 3 === 0 ? 1 : 0;
      b.lean = 1;
      b.hand = { x: r.hand.x + Math.round(sw * 0.6), y: r.hand.y };
    } else if (anim === 'jump') {
      Object.assign(b, { legF: -1, legB: 1, legLift: 3, bob: -1, cape: 2, plume: 1, hand: { x: 6, y: -26 }, aim: Math.min(r.aim, -0.8) });
    } else if (anim === 'fall') {
      Object.assign(b, { legF: 2, legB: -2, cape: -2, plume: 0, hand: { x: 9, y: -16 }, aim: r.aim * 0.4 });
    } else if (anim === 'dash') {
      Object.assign(b, { lean: 3, legF: 3, legB: -2, cape: -3, plume: 1, hand: { x: 14, y: -16 }, aim: 0.15 });
    } else if (anim === 'hurt') {
      Object.assign(b, { lean: -2, cape: 2, bob: 1, hand: { x: 2, y: -16 }, aim: 0.9 });
    } else {
      const p = attackPose(anim, i, weapon) || b;
      p.plume = i === 1 ? 1 : 0;
      return p;
    }
    return b;
  }
  function meta(anim, weapon) {
    if (anim === 'run') return { n: 8, fps: 12, loop: true };
    if (anim === 'idle') return { n: 4, fps: 5, loop: true };
    if (anim === 'dash') return { n: 2, fps: 12, loop: true };
    if (anim === 'hurt') return { n: 2, fps: 8, loop: true };
    if (anim === 'jump' || anim === 'fall') return { n: 1, fps: 1, loop: true };
    const slow = weapon === 'hammer' || weapon === 'rocket';
    return { n: 4, fps: slow ? 8 : 14, loop: false };
  }
  function frameOf(anim, t, weapon) {
    const m = meta(anim, weapon);
    let i = Math.floor(Math.max(0, t) * m.fps);
    i = m.loop ? ((i % m.n) + m.n) % m.n : Math.min(m.n - 1, i);
    const key = weapon + '|' + anim + '|' + i;
    if (!cache.has(key)) cache.set(key, render(poseAt(anim, i, weapon), weapon));
    return cache.get(key);
  }
  return {
    draw(ctx, x, y, face, anim, t, weapon, flash) {
      const c = frameOf(anim || 'idle', t || 0, weapon || 'sword');
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(face < 0 ? -1 : 1, 1);
      if (flash) {
        flashG.clearRect(0, 0, 72, 64);
        flashG.drawImage(c, 0, 0);
        flashG.globalCompositeOperation = 'source-in';
        flashG.fillStyle = '#fff';
        flashG.fillRect(0, 0, 72, 64);
        flashG.globalCompositeOperation = 'source-over';
        ctx.drawImage(flashC, -30, -52);
      } else ctx.drawImage(c, -30, -52);
      ctx.restore();
    },
  };
})();
