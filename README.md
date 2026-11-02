# 像素幸存者 Pixel Survivor（网页试玩 Demo）
竖屏 9:16 像素割草肉鸽。纯 HTML5 Canvas2D + 原生 JS，无依赖，面向手机 60fps。
- 运行：任意静态服务器打开 index.html（`python3 -m http.server`）。线上：<https://nissencheung.github.io/pixel-survivor/>
- 操作：拖拽虚拟摇杆，或 WASD / 方向键。`M` 或右上角按钮开关音效。
- `src/game.js` 游戏逻辑（程序化森林湖畔地图、英雄、手感、合成音效、局外强化）；`src/ads.js` 广告占位（Mock，移植时替换为 wx 广告 API）；`assets/*.png` + `manifest.js` 为 pixelfx 导出的精灵图集。
- 调试参数：`?debug` 显示帧率；`?autostart&t=280` 直接开局并跳到 4:40。
- 局外金币可在标题的「永久强化」里购买生命、伤害、拾取、冷却等永久加成（存在 localStorage）。
- 素材：怪物与技能特效为 pixelfx by Patch & Hugo Duprez，MIT（见 LICENSE-pixelfx.txt / NOTICE-pixelfx.md）。地图、英雄、界面像素与 WebAudio 音效为本 Demo 原创。
