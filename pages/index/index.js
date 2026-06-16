Page({
  data: {},

  onLoad() {
    const systemInfo = wx.getSystemInfoSync()
    this.setData({ systemInfo })
  },

  onReady() {
    this._animateCards()
  },

  _animateCards() {
    // 简单的卡片入场动画（通过 CSS animation 实现，此处仅触发）
  },

  onStart() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        const tutorialDone = wx.getStorageSync('tutorialDone')
        if (!tutorialDone) {
          wx.redirectTo({ url: '/pages/tutorial/tutorial' })
        } else {
          wx.redirectTo({ url: '/pages/magic/magic' })
        }
      },
      fail: () => {
        wx.showModal({
          title: '需要摄像头权限',
          content: '魔眼需要摄像头权限才能施展魔法，请在设置中允许使用摄像头',
          confirmText: '去设置',
          success(res) {
            if (res.confirm) {
              wx.openSetting({
                success(settingRes) {
                  if (settingRes.authSetting['scope.camera']) {
                    wx.redirectTo({ url: '/pages/magic/magic' })
                  }
                }
              })
            }
          }
        })
      }
    })
  }
})
