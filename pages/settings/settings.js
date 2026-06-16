Page({
  data: {
    qualityOptions: ['低（更流畅）', '中（平衡）', '高（更绚丽）'],
    qualityIndex: 1,
    photoQualityOptions: ['标准', '高清'],
    photoQualityIndex: 1,
    vibrationEnabled: true,
    apiBaseUrl: ''
  },

  onLoad() {
    const settings = wx.getStorageSync('settings') || {}
    this.setData({
      qualityIndex: settings.qualityIndex ?? 1,
      photoQualityIndex: settings.photoQualityIndex ?? 1,
      vibrationEnabled: settings.vibrationEnabled !== false,
      apiBaseUrl: wx.getStorageSync('apiBaseUrl') || ''
    })
  },

  onQualityChange(e) {
    this.setData({ qualityIndex: parseInt(e.detail.value) })
    this._saveSettings()
  },

  onPhotoQualityChange(e) {
    this.setData({ photoQualityIndex: parseInt(e.detail.value) })
    this._saveSettings()
  },

  onVibrationChange(e) {
    this.setData({ vibrationEnabled: e.detail.value })
    this._saveSettings()
  },

  onReplayTutorial() {
    wx.removeStorageSync('tutorialDone')
    wx.navigateTo({ url: '/pages/tutorial/tutorial' })
  },

  onPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '魔眼仅在使用期间访问您的摄像头，拍摄和处理的画面不会上传至任何服务器（除非您主动保存）。所有魔法效果均在本地实时渲染。',
      showCancel: false
    })
  },

  onFeedback() {
    wx.showModal({
      title: '反馈与建议',
      content: '如有问题或建议，请在 GitHub 仓库 Issues 中提交：\n\nhttps://github.com/ranpin/MagicEye',
      showCancel: false
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于魔眼',
      content: 'MagicEye (魔眼) v0.1.0\n\n一款增强现实魔法交互工具。\n通过手机摄像头观察世界，用魔法改变一切。\n\n© 2026 MagicEye',
      showCancel: false
    })
  },

  onApiUrlInput(e) {
    const url = e.detail.value.trim()
    this.setData({ apiBaseUrl: e.detail.value })
    if (url) {
      wx.setStorageSync('apiBaseUrl', url)
    } else {
      wx.removeStorageSync('apiBaseUrl')
    }
  },

  onApiUrlBlur() {
    const url = this.data.apiBaseUrl.trim()
    if (url) {
      wx.setStorageSync('apiBaseUrl', url)
    } else {
      wx.removeStorageSync('apiBaseUrl')
    }
  },

  onTestConnection() {
    const url = (this.data.apiBaseUrl || '').trim()
    if (!url) {
      wx.showToast({ title: '请先填写服务地址', icon: 'none' })
      return
    }

    wx.showLoading({ title: '测试中...' })
    wx.request({
      url: url + '/health',
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode === 200 && res.data && res.data.status === 'ok') {
          wx.showToast({ title: '连接成功', icon: 'success' })
        } else {
          wx.showToast({ title: '服务异常', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '连接失败', icon: 'none' })
      }
    })
  },

  _saveSettings() {
    wx.setStorageSync('settings', {
      qualityIndex: this.data.qualityIndex,
      photoQualityIndex: this.data.photoQualityIndex,
      vibrationEnabled: this.data.vibrationEnabled
    })
  }
})
