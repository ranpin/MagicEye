Page({
  data: {
    currentStep: 0,
    stepAnim: 0,
    steps: [
      { title: '时间冻结', icon: '⏸' },
      { title: '时间倒流', icon: '⏪' },
      { title: '点石成金', icon: '✋' }
    ]
  },

  _animTimer: null,

  onLoad() {
    this._startStepAnimation()
  },

  onUnload() {
    this._stopAnimation()
  },

  onNext() {
    const { currentStep } = this.data

    if (currentStep < 2) {
      this._stopAnimation()
      this.setData({
        currentStep: currentStep + 1,
        stepAnim: 0
      })
      this._startStepAnimation()
      wx.vibrateShort({ type: 'light' })
    } else {
      wx.setStorageSync('tutorialDone', true)
      wx.redirectTo({ url: '/pages/magic/magic' })
    }
  },

  onSkip() {
    wx.setStorageSync('tutorialDone', true)
    wx.redirectTo({ url: '/pages/magic/magic' })
  },

  _startStepAnimation() {
    const step = this.data.currentStep
    let phase = 0

    const runPhase = () => {
      if (step === 0) {
        // 冻结：手掌推出 → 画面冻结
        phase = (phase + 1) % 2
        this.setData({ stepAnim: phase })
      } else if (step === 1) {
        // 倒流：按住录制 → 松手倒流
        phase = (phase + 1) % 2
        this.setData({ stepAnim: phase })
      } else {
        // 触碰：点击 → 选效果 → 施法
        phase = (phase + 1) % 3
        this.setData({ stepAnim: phase })
      }

      this._animTimer = setTimeout(runPhase, step === 2 ? 1200 : 1800)
    }

    this._animTimer = setTimeout(runPhase, 1000)
  },

  _stopAnimation() {
    if (this._animTimer) {
      clearTimeout(this._animTimer)
      this._animTimer = null
    }
  }
})
