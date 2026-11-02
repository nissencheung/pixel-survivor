# 像素幸存者 Pixel Survivor（网页试玩 Demo）
竖屏 9:16 像素割草肉鸽。纯 HTML5 Canvas2D + 原生 JS，无依赖，面向手机 60fps。
- 运行：任意静态服务器打开 index.html（`python3 -m http.server`）。线上：<https://nissencheung.github.io/pixel-survivor/>
- 操作：拖拽虚拟摇杆，或 WASD / 方向键。`M` 或右上角按钮开关音效。
- 画面先画在 180×390 的原生像素画布上，再按整数倍最近邻放大（手机上是 2 倍），英雄、地砖、文字和 pixelfx 特效共用同一像素大小。风格说明见 `docs/style-guide.md`。
- 湖水能走：深水约 45% 移速并没过脚，浅滩约 75%。敌人在深水约 50%。火球入水熄灭，雷电对湿身敌人伤害 +50%。
- 武器：手枪 / 霰弹 / 冲锋枪、飞刀 / 回旋刀、巨剑 / 环绕剑、火球、雷电，各 1–5 级；武器满级且对应被动达标会进化。`src/ads.js` 为广告占位（复活、双倍奖励、升级换一批）。
- `assets/*.png` + `manifest.js` 为 pixelfx 精灵；`src/weapon-manifest.js` 为同库的枪械与刀剑特效。
- 调试参数：`?debug` 显示帧率；`?autostart&t=280` 直接开局并跳到 4:40。
- 局外金币可在标题的「永久强化」里购买生命、伤害、拾取、冷却等永久加成（存在 localStorage）。
- 素材：怪物与技能特效为 pixelfx by Patch & Hugo Duprez，MIT（见 LICENSE-pixelfx.txt / NOTICE-pixelfx.md）。地图、英雄、界面像素与 WebAudio 音效为本 Demo 原创。
