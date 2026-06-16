App({
  onLaunch() {
    this.checkFirstLaunch()
  },

  checkFirstLaunch() {
    const hasVisited = wx.getStorageSync('hasVisited')
    if (!hasVisited) {
      wx.setStorageSync('hasVisited', true)
      this.globalData.isFirstLaunch = true
    } else {
      this.globalData.isFirstLaunch = false
    }
  },

  globalData: {
    isFirstLaunch: false,
    systemInfo: null
  }
})
