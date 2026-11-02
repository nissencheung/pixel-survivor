# 像素幸存者 Pixel Survivor（网页试玩 Demo）
竖屏 9:16 像素割草肉鸽。纯 HTML5 Canvas2D + 原生 JS，无依赖。
- 运行：任意静态服务器打开 index.html（`python3 -m http.server`）。
- `src/game.js` 游戏逻辑；`src/ads.js` 广告占位（Mock，移植时替换为 wx 广告 API）；`assets/*.png` + `manifest.js` 为 pixelfx 导出的精灵图集。
- 调试参数：`?debug` 显示帧率；`?autostart&t=280` 直接开局并跳到 4:40。
- 素材：pixelfx by Patch & Hugo Duprez，MIT（见 LICENSE-pixelfx.txt / NOTICE-pixelfx.md）。
