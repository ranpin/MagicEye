App({
  onLaunch() {
    this.checkFirstLaunch()
  },

  checkFirstLaunch() {
    const hasVisited = wx.getStorageSync('hasVisited')
    if (!hasVisited) {
      wx.setStorageSync('hasVisited', true)
    }
  },

  globalData: {
    isFirstLaunch: true,
    systemInfo: null
  }
})
