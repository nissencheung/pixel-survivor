// 主角：与 pixelfx 同一套像素密度。纯色块、1px 外轮廓、有限色板，整数坐标。
window.Hero = (() => {
  const PAL = {
    k: '#17121f', s: '#f3c49d', S: '#c98b6c', h: '#7a4128', e: '#17121f',
    t: '#5f6f94', T: '#46536f', c: '#c23b4a', C: '#7a2434',
    p: '#38334a', b: '#6a4030', w: '#e8eef6', d: '#8ea0b8',
    g: '#e8c060', n: '#3c4452', m: '#c5cedc', r: '#d07040',
  };
  const W = 40, H = 36;
  const cache = new Map();
  const flashC = document.createElement('canvas');
  flashC.width = W; flashC.height = H;
  const flashG = flashC.getContext('2d');
  flashG.imageSmoothingEnabled = false;

  const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
  function paste(g, rows, x, y) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const X = x + i, Y = y + j;
        if (Y >= 0 && X >= 0 && Y < H && X < W) g[Y][X] = ch;
      }
    }
  }
  function outline(g) {
    const o = g.map((row) => row.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x] !== '.') continue;
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && Y >= 0 && X < W && Y < H && g[Y][X] !== '.') edge = true;
      }
      if (edge) o[y][x] = 'k';
    }
    return o;
  }
  function paint(g) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      const ch = g[y][i];
      if (ch === '.') continue;
      x.fillStyle = PAL[ch] || '#fff';
      x.fillRect(i, y, 1, 1);
    }
    return c;
  }

  const HEAD = ['hhhhh', 'hssss', 'heses', 'hsssS', 'hhhhh'];
  const BODY = ['ccttttt', 'c.tTttT', 'c.ttttt', 'c.ttttt', '.tttttt', '.ggggg.'];
  const LEG = {
    idle: ['pp.pp', 'pp.pp', 'pp.pp', 'bb.bb'],
    a: ['pp..p', 'pp..p', 'pp..p', 'bb..b'],
    b: ['.ppp.', '.ppp.', '.ppp.', '.bbb.'],
    c: ['p..pp', 'p..pp', 'p..pp', 'b..bb'],
    tuck: ['.ppp.', 'pp.pp', 'bbbbb'],
    drop: ['p...p', 'p...p', 'p...p', 'b...b'],
  };
  const WEAP = {
    sword: { idle: ['..w', '.w.', 'w..', 'g..'], atk1: ['wwwwww', '.g....'], atk2: ['.w', 'ww', 'w.', 'g.'], atk3: ['w.', 'w.', 'w.', 'gg'] },
    hammer: { idle: ['mmmm', '.nn.', '.nn.', '.bb.'], atk1: ['mmmm', '.nn.', '.bb.'], atk2: ['mmmm', 'nn..', 'bb..'], atk3: ['.mmmm.', '..nn..', '..bb..'] },
    spear: { idle: ['w.nnnnnn'], atk1: ['wnnnnnnnnn'], atk2: ['..n', '.n.', 'wn.', 'n..'], atk3: ['w', 'n', 'n', 'n', 'n'] },
    gun: { idle: ['mmmmr', '.bb..'], atk1: ['mmmmmrr', '.bb....'], atk2: ['mmmmr', '.bb..'], atk3: ['mmmmrr', '.bb...'] },
    rocket: { idle: ['nnnnnr', 'nnnnn.'], atk1: ['nnnnnnr', 'nnnnnn.'], atk2: ['nnnnnr', 'nnnnn.'], atk3: ['nnnnnr', 'nnnnn.'] },
  };

  function build(anim, frame, weapon) {
    const g = blank();
    const bob = anim === 'idle' ? (frame === 1 || frame === 2 ? -1 : 0)
      : anim === 'run' ? (frame % 2 ? -1 : 0)
      : anim === 'jump' ? -2 : 0;
    const y0 = 6 + bob;
    paste(g, HEAD, 10, y0);
    paste(g, BODY, 8, y0 + 5);
    const leg = anim === 'run' ? ['a', 'b', 'c', 'b'][frame % 4]
      : anim === 'jump' ? 'tuck'
      : anim === 'fall' ? 'drop'
      : anim === 'dash' ? 'a'
      : 'idle';
    paste(g, LEG[leg], 11, y0 + 11);
    const wkey = WEAP[weapon] ? weapon : 'sword';
    const pose = (anim === 'atk1' || anim === 'atk2' || anim === 'atk3' || anim === 'skill')
      ? (anim === 'skill' ? 'atk3' : anim) : 'idle';
    const spr = WEAP[wkey][pose] || WEAP[wkey].idle;
    const hand = pose === 'atk1' ? [16, y0 + 6] : pose === 'atk2' ? [15, y0 + 8] : pose === 'atk3' ? [14, y0 + 1] : [15, y0 + 5];
    paste(g, spr, hand[0], hand[1]);
    if (anim === 'hurt') paste(g, ['ee'], 12, y0 + 2);
    return paint(outline(g));
  }

  function meta(anim) {
    if (anim === 'run' || anim === 'dash') return { n: 4, fps: 10, loop: true };
    if (anim === 'idle') return { n: 4, fps: 5, loop: true };
    if (anim === 'hurt') return { n: 2, fps: 8, loop: true };
    if (anim === 'jump' || anim === 'fall') return { n: 1, fps: 1, loop: true };
    return { n: 3, fps: 12, loop: false };
  }
  function frameOf(anim, t, weapon) {
    const m = meta(anim);
    let i = Math.floor(Math.max(0, t) * m.fps);
    i = m.loop ? ((i % m.n) + m.n) % m.n : Math.min(m.n - 1, i);
    const key = (weapon || 'sword') + '|' + anim + '|' + i;
    if (!cache.has(key)) cache.set(key, build(anim, i, weapon || 'sword'));
    return cache.get(key);
  }
  return {
    draw(ctx, x, y, face, anim, t, weapon, flash) {
      ctx.imageSmoothingEnabled = false;
      const c = frameOf(anim || 'idle', t || 0, weapon || 'sword');
      const px = Math.round(x), py = Math.round(y);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(face < 0 ? -1 : 1, 1);
      if (flash) {
        flashG.clearRect(0, 0, W, H);
        flashG.drawImage(c, 0, 0);
        flashG.globalCompositeOperation = 'source-in';
        flashG.fillStyle = '#fff';
        flashG.fillRect(0, 0, W, H);
        flashG.globalCompositeOperation = 'source-over';
        ctx.drawImage(flashC, -14, -22);
      } else ctx.drawImage(c, -14, -22);
      ctx.restore();
    },
  };
})();
