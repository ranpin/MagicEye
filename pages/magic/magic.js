const effects = require('../../utils/effects')
const api = require('../../utils/api')

const RING_ITEMS = [
  { label: '点石成金', emoji: '🪙', effect: 'gold' },
  { label: '水晶化', emoji: '💎', effect: 'crystal' },
  { label: '火焰附体', emoji: '🔥', effect: 'fire' },
  { label: '花开', emoji: '🌸', effect: 'bloom' },
  { label: '星光', emoji: '✨', effect: 'sparkle' }
]

Page({
  data: {
    screenWidth: 375,
    screenHeight: 667,
    statusBarHeight: 44,
    energyPercent: 100,
    currentMode: '',
    modeText: '',
    freezeActive: false,
    reverseActive: false,
    showToast: false,
    toastText: '',
    showRing: false,
    ringX: 0,
    ringY: 0,
    ringItems: [],
    hintText: '选择下方的魔法，开始施法'
  },

  // ---- 内部状态 ----
  _cameraCtx: null,
  _canvas: null,
  _canvasCtx: null,
  _particleSystem: null,
  _freezeFrame: null,
  _frameBuffer: [],
  _reverseTimer: null,
  _reverseIndex: 0,
  _isRecording: false,
  _recordTimer: null,
  _energyTimer: null,
  _animTimer: null,

  onLoad() {
    const sys = wx.getSystemInfoSync()
    this.setData({
      screenWidth: sys.windowWidth,
      screenHeight: sys.windowHeight,
      statusBarHeight: sys.statusBarHeight || 44
    })
  },

  onReady() {
    this._initCamera()
    this._initCanvas()
    this._initRingItems()
    this._startEnergyRegen()
  },

  onUnload() {
    this._cleanup()
  },

  // ===== 初始化 =====

  _initCamera() {
    this._cameraCtx = wx.createCameraContext()
  },

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#magicCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio

        canvas.width = this.data.screenWidth * dpr
        canvas.height = this.data.screenHeight * dpr
        ctx.scale(dpr, dpr)

        this._canvas = canvas
        this._canvasCtx = ctx

        this._particleSystem = new effects.ParticleSystem(
          ctx,
          this.data.screenWidth,
          this.data.screenHeight
        )
      })
  },

  _initRingItems() {
    const radius = 75
    const count = RING_ITEMS.length
    const items = RING_ITEMS.map((item, i) => {
      const angle = (2 * Math.PI * i / count) - Math.PI / 2
      return {
        ...item,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius
      }
    })
    this.setData({ ringItems: items })
  },

  _startEnergyRegen() {
    this._energyTimer = setInterval(() => {
      if (this.data.energyPercent < 100 && this.data.currentMode === '') {
        this.setData({
          energyPercent: Math.min(100, this.data.energyPercent + 2)
        })
      }
    }, 1000)
  },

  // ===== 冻结模式 =====

  onFreezeTap() {
    if (this.data.currentMode === 'freeze') {
      this._exitFreeze()
      return
    }

    if (this.data.energyPercent < 20) {
      this._showToast('魔力不足！')
      return
    }

    this._exitAllModes()
    this._captureFrame(() => {
      this.setData({
        currentMode: 'freeze',
        modeText: '⏸ 时间冻结',
        freezeActive: true,
        hintText: '再次点击解除冻结'
      })

      this._consumeEnergy(20)
      this._vibrate('heavy')
      this._showToast('时间已冻结！')

      // 冻结粒子效果
      this._particleSystem.setMode('freeze')
      this._startAnimation()
    })
  },

  _exitFreeze() {
    this._stopAnimation()
    this._particleSystem.setMode('idle')

    this.setData({
      currentMode: '',
      modeText: '',
      freezeActive: false,
      hintText: '选择下方的魔法，开始施法'
    })

    // 清除画布
    if (this._canvasCtx) {
      this._canvasCtx.clearRect(
        0, 0,
        this.data.screenWidth,
        this.data.screenHeight
      )
    }

    this._vibrate('light')
    this._showToast('时间恢复流动')
  },

  // ===== 倒流模式 =====

  onReverseStart() {
    if (this.data.energyPercent < 15) {
      this._showToast('魔力不足！')
      return
    }

    this._exitAllModes()
    this.setData({
      currentMode: 'reverse',
      modeText: '⏪ 录制倒流',
      hintText: '按住录制，松手倒流',
      reverseActive: true
    })

    this._startRecording()
    this._vibrate('medium')
  },

  onReverseEnd() {
    if (this.data.currentMode !== 'reverse') return

    this._stopRecording()
    this._playReverse()
  },

  _startRecording() {
    this._isRecording = true
    this._frameBuffer = []
    let count = 0

    const capture = () => {
      if (!this._isRecording || count >= 60) {
        if (count >= 60) {
          this._stopRecording()
          this._playReverse()
        }
        return
      }

      this._cameraCtx.takePhoto({
        quality: 'low',
        success: (res) => {
          if (!this._isRecording) return
          this._frameBuffer.push(res.tempImagePath)
          count++
          this._consumeEnergy(1)
          // 每 100ms 取一帧 (~10fps)
          this._recordTimer = setTimeout(capture, 100)
        },
        fail: () => {
          this._recordTimer = setTimeout(capture, 100)
        }
      })
    }

    capture()
  },

  _stopRecording() {
    this._isRecording = false
    if (this._recordTimer) {
      clearTimeout(this._recordTimer)
      this._recordTimer = null
    }
  },

  _playReverse() {
    const frames = this._frameBuffer.slice().reverse()
    if (frames.length === 0) {
      this._exitReverse()
      return
    }

    this._showToast('时间倒流！')
    this._vibrate('heavy')

    this._reverseIndex = 0
    this._particleSystem.setMode('reverse')
    this._startAnimation()

    // 预加载下一帧以减少闪烁
    const preloadImage = (src) => {
      return new Promise((resolve) => {
        const img = this._canvas.createImage()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
      })
    }

    const playNext = async () => {
      if (this._reverseIndex >= frames.length) {
        this._exitReverse()
        return
      }

      const currentImg = await preloadImage(frames[this._reverseIndex])
      if (!currentImg) {
        this._reverseIndex++
        this._reverseTimer = setTimeout(playNext, 100)
        return
      }

      // 同时预加载下一帧
      const nextPromise = this._reverseIndex + 1 < frames.length
        ? preloadImage(frames[this._reverseIndex + 1])
        : Promise.resolve(null)

      if (this._canvasCtx) {
        this._canvasCtx.clearRect(0, 0, this.data.screenWidth, this.data.screenHeight)
        this._canvasCtx.drawImage(
          currentImg, 0, 0,
          this.data.screenWidth, this.data.screenHeight
        )
      }

      this._reverseIndex++
      await nextPromise // 等待预加载完成再切帧
      this._reverseTimer = setTimeout(playNext, 80)
    }

    playNext()
  },

  _exitReverse() {
    this._stopAnimation()
    if (this._reverseTimer) {
      clearTimeout(this._reverseTimer)
      this._reverseTimer = null
    }

    this._particleSystem.setMode('idle')
    this._frameBuffer = []

    if (this._canvasCtx) {
      this._canvasCtx.clearRect(
        0, 0,
        this.data.screenWidth,
        this.data.screenHeight
      )
    }

    this.setData({
      currentMode: '',
      modeText: '',
      reverseActive: false,
      hintText: '选择下方的魔法，开始施法'
    })
  },

  // ===== 触碰模式 =====

  onTouchModeTap() {
    if (this.data.currentMode === 'touch') {
      this._exitTouch()
      return
    }

    this._exitAllModes()
    this.setData({
      currentMode: 'touch',
      modeText: '✋ 点石成金',
      hintText: '轻触画面中的物体，施加魔法'
    })

    this._vibrate('light')
    this._showToast('触碰模式已开启，轻点画面')
  },

  _exitTouch() {
    this.setData({
      currentMode: '',
      modeText: '',
      showRing: false,
      hintText: '选择下方的魔法，开始施法'
    })
  },

  onCanvasTouchStart(e) {
    const touch = e.touches[0]
    this._touchStartPos = { x: touch.clientX, y: touch.clientY }
    this._touchStartTime = Date.now()
    this._touchMoved = false
  },

  onCanvasTouchMove(e) {
    if (!this._touchStartPos) return
    const touch = e.touches[0]
    const dx = touch.clientX - this._touchStartPos.x
    const dy = touch.clientY - this._touchStartPos.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      this._touchMoved = true
    }
  },

  onCanvasTouchEnd(e) {
    if (!this._touchStartPos) return

    const elapsed = Date.now() - this._touchStartTime
    const touch = e.changedTouches[0]
    const dx = touch.clientX - this._touchStartPos.x
    const dy = touch.clientY - this._touchStartPos.y

    // 滑动手势检测（距离 > 60px，时间 < 500ms）
    if (elapsed < 500) {
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx > 60 && absDx > absDy * 1.5) {
        // 水平滑动
        if (dx > 0) {
          this._onSwipeRight()
        } else {
          this._onSwipeLeft()
        }
        this._touchStartPos = null
        return
      }

      if (absDy > 60 && absDy > absDx * 1.5 && dy < 0) {
        // 上滑 - 快速冻结
        this._onSwipeUp()
        this._touchStartPos = null
        return
      }
    }

    // 非滑动 → 触碰模式的点击
    if (this.data.currentMode === 'touch' && !this._touchMoved && elapsed < 300) {
      this._showMagicRing(this._touchStartPos.x, this._touchStartPos.y)
    }

    this._touchStartPos = null
  },

  _onSwipeRight() {
    // 右滑：循环切换魔法模式 (none → freeze → reverse → touch → none)
    const modes = ['', 'freeze', 'reverse', 'touch']
    const modeActions = {
      '': () => this._exitAllModes(),
      'freeze': () => this.onFreezeTap(),
      'reverse': () => this._showToast('长按 ⏪ 按钮使用倒流'),
      'touch': () => this.onTouchModeTap()
    }

    const currentIdx = modes.indexOf(this.data.currentMode)
    const nextIdx = (currentIdx + 1) % modes.length
    const nextMode = modes[nextIdx]

    if (nextMode === '') {
      this._exitAllModes()
      this.setData({ hintText: '选择下方的魔法，开始施法' })
    } else if (nextMode === 'reverse') {
      // 倒流需要长按，提示用户
      this._showToast('↗ 右滑切换 | 倒流需长按')
    } else {
      this._exitAllModes()
      if (nextMode === 'freeze') this.onFreezeTap()
      if (nextMode === 'touch') this.onTouchModeTap()
    }

    this._vibrate('light')
  },

  _onSwipeLeft() {
    // 左滑：取消当前模式
    if (this.data.currentMode) {
      this._exitAllModes()
      this.setData({ hintText: '选择下方的魔法，开始施法' })
      this._vibrate('light')
      this._showToast('已取消魔法')
    }
  },

  _onSwipeUp() {
    // 上滑：快速冻结
    if (this.data.currentMode !== 'freeze') {
      this._exitAllModes()
      this.onFreezeTap()
      this._showToast('⬆ 上滑快速冻结')
    }
  },

  _showMagicRing(x, y) {
    // 确保环不超出屏幕
    const padding = 100
    const clampedX = Math.max(padding, Math.min(this.data.screenWidth - padding, x))
    const clampedY = Math.max(padding, Math.min(this.data.screenHeight - padding, y))

    if (this.data.energyPercent < 10) {
      this._showToast('魔力不足！')
      return
    }

    this.setData({
      showRing: true,
      ringX: clampedX,
      ringY: clampedY
    })

    this._vibrate('medium')

    // 在选中位置画发光标记
    if (this._canvasCtx) {
      this._particleSystem.emitBurst(clampedX, clampedY, 20, '#FFD700')
      this._startAnimation()
    }
  },

  onSelectEffect(e) {
    const effect = e.currentTarget.dataset.effect
    const effectNames = {
      gold: '点石成金',
      crystal: '水晶化',
      fire: '火焰附体',
      bloom: '花开',
      sparkle: '星光闪耀'
    }

    this.setData({ showRing: false })
    this._consumeEnergy(15)
    this._vibrate('heavy')
    this._showToast(effectNames[effect] || '魔法释放！')

    // 触发选中效果的粒子
    const effectColors = {
      gold: '#FFD700',
      crystal: '#00F5FF',
      fire: '#FF4500',
      bloom: '#FF69B4',
      sparkle: '#FFFFFF'
    }

    this._particleSystem.setMode('effect')
    this._particleSystem.emitBurst(
      this.data.ringX,
      this.data.ringY,
      40,
      effectColors[effect] || '#FFD700'
    )
    this._startAnimation()

    // 5 秒后自动清除效果
    setTimeout(() => {
      this._particleSystem.setMode('idle')
      if (this._canvasCtx) {
        this._canvasCtx.clearRect(
          0, 0,
          this.data.screenWidth,
          this.data.screenHeight
        )
      }
      this._stopAnimation()
    }, 5000)

    // TODO: Phase 2 - 发送帧到云端进行真实 AI 生成
    // api.analyzeScene(frameData).then(...)
  },

  // ===== 拍摄 =====

  onShootTap() {
    wx.showActionSheet({
      itemList: ['拍照', '录制视频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this._takePhoto()
        } else if (res.tapIndex === 1) {
          this._toggleRecording()
        }
      }
    })
  },

  _takePhoto() {
    this._cameraCtx.takePhoto({
      quality: 'high',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempImagePath,
          success: () => {
            this._showToast('照片已保存')
            this._vibrate('light')
          },
          fail: () => {
            this._showToast('保存失败，请授权相册')
          }
        })
      },
      fail: () => {
        this._showToast('拍照失败')
      }
    })
  },

  _toggleRecording() {
    if (this._isVideoRecording) {
      this._cameraCtx.stopRecord({
        success: (res) => {
          this._isVideoRecording = false
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempVideoPath,
            success: () => {
              this._showToast('视频已保存')
            },
            fail: () => {
              this._showToast('保存失败')
            }
          })
        }
      })
    } else {
      this._cameraCtx.startRecord({
        timeoutCallback: (res) => {
          this._isVideoRecording = false
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempVideoPath,
            success: () => {
              this._showToast('视频已保存')
            }
          })
        },
        success: () => {
          this._isVideoRecording = true
          this._showToast('录制中...')
        },
        fail: () => {
          this._showToast('录制失败')
        }
      })
    }
  },

  // ===== 辅助方法 =====

  _captureFrame(callback) {
    this._cameraCtx.takePhoto({
      quality: 'normal',
      success: (res) => {
        this._freezeFrame = res.tempImagePath
        // 将冻结帧绘制到 canvas
        if (this._canvas && this._canvasCtx) {
          const img = this._canvas.createImage()
          img.onload = () => {
            this._canvasCtx.drawImage(
              img, 0, 0,
              this.data.screenWidth,
              this.data.screenHeight
            )
            if (callback) callback()
          }
          img.src = res.tempImagePath
        } else {
          if (callback) callback()
        }
      },
      fail: () => {
        if (callback) callback()
      }
    })
  },

  _startAnimation() {
    if (this._animTimer) return

    const animate = () => {
      if (!this._canvasCtx || !this._canvas) return

      this._canvasCtx.clearRect(
        0, 0,
        this.data.screenWidth,
        this.data.screenHeight
      )

      // 如果是冻结模式，先绘制冻结帧
      if (this.data.freezeActive && this._freezeFrame) {
        const img = this._canvas.createImage()
        img.onload = () => {
          this._canvasCtx.globalAlpha = 0.85
          this._canvasCtx.drawImage(
            img, 0, 0,
            this.data.screenWidth,
            this.data.screenHeight
          )
          this._canvasCtx.globalAlpha = 1.0
          this._particleSystem.update()
          this._particleSystem.draw()
        }
        img.src = this._freezeFrame
      } else {
        this._particleSystem.update()
        this._particleSystem.draw()
      }

      this._animTimer = this._canvas.requestAnimationFrame(animate)
    }

    this._animTimer = this._canvas.requestAnimationFrame(animate)
  },

  _stopAnimation() {
    if (this._animTimer && this._canvas) {
      this._canvas.cancelAnimationFrame(this._animTimer)
      this._animTimer = null
    }
  },

  _consumeEnergy(amount) {
    this.setData({
      energyPercent: Math.max(0, this.data.energyPercent - amount)
    })
  },

  _vibrate(type) {
    const settings = wx.getStorageSync('settings') || {}
    if (settings.vibrationEnabled !== false) {
      wx.vibrateShort({ type: type || 'medium' })
    }
  },

  _showToast(text) {
    this.setData({ showToast: true, toastText: text })
    setTimeout(() => {
      this.setData({ showToast: false })
    }, 1500)
  },

  _exitAllModes() {
    this._stopAnimation()
    if (this._isRecording) this._stopRecording()
    if (this._reverseTimer) {
      clearTimeout(this._reverseTimer)
      this._reverseTimer = null
    }
    this._particleSystem && this._particleSystem.setMode('idle')

    if (this._canvasCtx) {
      this._canvasCtx.clearRect(
        0, 0,
        this.data.screenWidth,
        this.data.screenHeight
      )
    }

    this.setData({
      currentMode: '',
      modeText: '',
      freezeActive: false,
      reverseActive: false,
      showRing: false
    })
  },

  _cleanup() {
    this._exitAllModes()
    if (this._energyTimer) {
      clearInterval(this._energyTimer)
      this._energyTimer = null
    }
  },

  onOpenSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onCameraError(e) {
    console.error('Camera error:', e.detail)
    wx.showModal({
      title: '摄像头错误',
      content: '无法启动摄像头，请检查权限设置',
      showCancel: false
    })
  }
})
