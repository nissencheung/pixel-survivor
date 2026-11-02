// 广告占位（MOCK）。移植到微信小游戏时改为 wx.createRewardedVideoAd。
// 只模拟 2 秒倒计时后回调成功，不请求任何真实广告。
window.Ads = {
  _active: null,
  showRewarded(placement, cb) {
    console.log('[MOCK AD] rewarded:', placement);
    this._active = { t: 2.0, placement, cb, kind: 'rewarded' };
  },
  showInterstitial(placement) {
    console.log('[MOCK AD] interstitial:', placement);
  },
  update(dt) {
    const a = this._active;
    if (!a) return;
    a.t -= dt;
    if (a.t <= 0) {
      this._active = null;
      if (a.cb) a.cb(true);
    }
  },
  get busy() { return !!this._active; },
  get remain() { return this._active ? Math.max(0, this._active.t) : 0; },
  get placement() { return this._active ? this._active.placement : ''; },
};
