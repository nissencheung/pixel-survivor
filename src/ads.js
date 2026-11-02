// ===== 广告占位（MOCK）=====
// 移植到微信小游戏时，把这里替换为 wx.createRewardedVideoAd / wx.createInterstitialAd。
// 当前只是模拟：显示 2 秒倒计时后直接回调成功，不会拉取任何真实广告。
window.Ads = {
  _active: null,
  showRewarded(placement, cb) {           // cb(true=看完发奖励)
    console.log('[MOCK AD] rewarded:', placement);
    this._active = { t: 2.0, placement, cb, kind: 'rewarded' };
  },
  showInterstitial(placement) {
    console.log('[MOCK AD] interstitial:', placement);
  },
  update(dt) {
    const a = this._active; if (!a) return;
    a.t -= dt; if (a.t <= 0) { this._active = null; a.cb && a.cb(true); }
  },
  get busy() { return !!this._active; },
};
