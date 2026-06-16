const effects = require('../../utils/effects')
const api = require('../../utils/api')
const imageUtil = require('../../utils/imageUtil')

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
    hintText: '选择下方的魔法，开始施法',
    isRecording: false,
    recordFrameCount: 0,
    showGestureHint: false
  },

  // ---- 内部状态 ----
  _cameraCtx: null,
  _canvas: null,
  _canvasCtx: null,
  _particleSystem: null,
  _freezeFrameBase64: null,
  _freezeImage: null,
  _frameBuffer: [],
  _reverseTimer: null,
  _reverseIndex: 0,
  _reversePlaying: false,
  _isRecording: false,
  _isVideoRecording: false,
  _recordTimer: null,
  _energyTimer: null,
  _animTimer: null,

  // ---- 摄像头帧渲染 ----
  _cameraReady: false,
  _frameListener: null,
  _cameraFrameBuffer: null,
  _cameraOffscreen: null,
  _cameraImageData: null,
  _lastFrameTime: 0,
  _destroyed: false,

  // ---- API 集成状态 ----
  _detectedObjects: [],
  _currentFrameBase64: null,
  _currentImageWidth: 0,
  _currentImageHeight: 0,
  _selectedObject: null,
  _effectImage: null,
  _effectCrop: null,
  _effectStartTime: 0,
  _effectDuration: 5000,
  _effectClearTimer: null,

  onLoad() {
    const sys = wx.getSystemInfoSync()
    const showGestureHint = !wx.getStorageSync('gestureHintDismissed')
    this.setData({
      screenWidth: sys.windowWidth,
      screenHeight: sys.windowHeight,
      statusBarHeight: sys.statusBarHeight || 44,
      showGestureHint
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

  onCameraReady() {
    this._cameraReady = true
  },

  _startCameraFrame() {
    if (!this._cameraCtx || this._frameListener) return
    try {
      this._frameListener = this._cameraCtx.onCameraFrame((frame) => {
        if (this._cameraReady) {
          this._cameraFrameBuffer = frame
        }
      })
    } catch (e) {
      console.warn('onCameraFrame not supported:', e.message)
    }
  },

  _stopCameraFrame() {
    if (this._frameListener) {
      try {
        this._frameListener.stop()
      } catch (e) {}
      this._frameListener = null
    }
    this._cameraFrameBuffer = null
    this._cameraReady = false
  },

  _initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#magicCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')

        canvas.width = this.data.screenWidth
        canvas.height = this.data.screenHeight

        this._canvas = canvas
        this._canvasCtx = ctx

        this._particleSystem = new effects.ParticleSystem(
          ctx,
          this.data.screenWidth,
          this.data.screenHeight
        )

        this._startCameraFrame()
        this._startAnimation()
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
    this._captureFrame((img) => {
      if (img) {
        this._freezeImage = img
      }
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
      if (this._particleSystem) {
        this._particleSystem.setMode('freeze')
      }
      this._startAnimation()

      // 异步分析场景（非阻塞）
      if (this._freezeFrameBase64) {
        api.analyzeScene(this._freezeFrameBase64).then(result => {
          if (result && result.scene && this.data.currentMode === 'freeze') {
            const sceneLabel = result.scene.replace(/_/g, ' ')
            const weatherLabel = result.weather !== 'unknown' ? ` · ${result.weather}` : ''
            this.setData({ hintText: `${sceneLabel}${weatherLabel} | 点击解除` })
          }
        }).catch(() => {})
      }
    })
  },

  _exitFreeze() {
    this._particleSystem && this._particleSystem.setMode('idle')

    this.setData({
      currentMode: '',
      modeText: '',
      freezeActive: false,
      hintText: '选择下方的魔法，开始施法'
    })

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
    if (!this._reversePlaying) {
      this._reversePlaying = true
      this._playReverse()
    }
  },

  _startRecording() {
    this._isRecording = true
    this._reversePlaying = false
    this._frameBuffer = []
    let count = 0
    this.setData({ isRecording: true, recordFrameCount: 0 })

    const capture = () => {
      if (!this._isRecording || count >= 60) {
        if (count >= 60 && !this._reversePlaying) {
          this._reversePlaying = true
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
          this.setData({ recordFrameCount: count })
          this._consumeEnergy(1)

          // Stop recording if energy is depleted
          if (this.data.energyPercent <= 0) {
            this._showToast('魔力耗尽！')
            if (!this._reversePlaying) {
              this._reversePlaying = true
              this._stopRecording()
              this._playReverse()
            }
            return
          }

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
    this.setData({ isRecording: false, recordFrameCount: 0 })
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
    this._particleSystem && this._particleSystem.setMode('reverse')
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

      if (this._canvasCtx) {
        this._canvasCtx.clearRect(0, 0, this.data.screenWidth, this.data.screenHeight)
        this._canvasCtx.drawImage(
          currentImg, 0, 0,
          this.data.screenWidth, this.data.screenHeight
        )
      }

      this._reverseIndex++
      this._reverseTimer = setTimeout(playNext, 80)
    }

    playNext()
  },

  _exitReverse() {
    this._reversePlaying = false
    if (this._reverseTimer) {
      clearTimeout(this._reverseTimer)
      this._reverseTimer = null
    }

    this._particleSystem && this._particleSystem.setMode('idle')
    this._frameBuffer = []

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
      hintText: '正在识别物体...'
    })

    this._vibrate('light')
    this._showToast('触碰模式，识别中...')
    this._detectObjectsForTouch()
  },

  _detectObjectsForTouch() {
    this._cameraCtx.takePhoto({
      quality: 'low',
      success: async (res) => {
        try {
          const base64 = await imageUtil.filePathToBase64(res.tempImagePath)
          this._currentFrameBase64 = base64

          const result = await api.detectObjects(base64)
          this._detectedObjects = result.objects || []
          this._currentImageWidth = result.imageWidth || 0
          this._currentImageHeight = result.imageHeight || 0

          const count = this._detectedObjects.length
          if (count > 0) {
            this.setData({ hintText: `识别到 ${count} 个物体，轻触画面施法` })
            this._drawDetectionHighlights()
          } else {
            this.setData({ hintText: '未识别到物体，轻触画面使用粒子效果' })
          }
        } catch (err) {
          console.error('Detection failed:', err)
          this.setData({ hintText: '识别失败，使用粒子模式' })
          this._detectedObjects = []
        }
      },
      fail: () => {
        this.setData({ hintText: '拍照失败，轻触画面使用粒子效果' })
      }
    })
  },

  _drawDetectionHighlights() {
    if (!this._canvasCtx || !this._canvas) return

    const ctx = this._canvasCtx
    const scaleX = this.data.screenWidth / (this._currentImageWidth || this.data.screenWidth)
    const scaleY = this.data.screenHeight / (this._currentImageHeight || this.data.screenHeight)

    this._detectedObjects.forEach(obj => {
      const { x, y, w, h } = obj.bbox
      ctx.save()
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY)

      ctx.fillStyle = 'rgba(0, 245, 255, 0.15)'
      ctx.fillRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY)

      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(0, 245, 255, 0.9)'
      ctx.font = '12px sans-serif'
      ctx.fillText(obj.label, x * scaleX + 4, y * scaleY + 16)
      ctx.restore()
    })
  },

  _exitTouch() {
    this._detectedObjects = []
    this._currentFrameBase64 = null
    this._currentImageWidth = 0
    this._currentImageHeight = 0
    this._selectedObject = null
    this._effectImage = null
    this._effectCrop = null

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
    const padding = 100
    const clampedX = Math.max(padding, Math.min(this.data.screenWidth - padding, x))
    const clampedY = Math.max(padding, Math.min(this.data.screenHeight - padding, y))

    if (this.data.energyPercent < 10) {
      this._showToast('魔力不足！')
      return
    }

    this._selectedObject = this._findObjectAtPosition(clampedX, clampedY)

    this.setData({
      showRing: true,
      ringX: clampedX,
      ringY: clampedY
    })

    this._vibrate('medium')

    if (this._canvasCtx && this._particleSystem) {
      this._particleSystem.emitBurst(clampedX, clampedY, 20, '#FFD700')
      this._startAnimation()
    }

    if (this._selectedObject) {
      this._showToast(`选中: ${this._selectedObject.label}`)
    }
  },

  _findObjectAtPosition(x, y) {
    const scaleX = this.data.screenWidth / (this._currentImageWidth || this.data.screenWidth)
    const scaleY = this.data.screenHeight / (this._currentImageHeight || this.data.screenHeight)

    for (const obj of this._detectedObjects) {
      const bx = obj.bbox.x * scaleX
      const by = obj.bbox.y * scaleY
      const bw = obj.bbox.w * scaleX
      const bh = obj.bbox.h * scaleY
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        return obj
      }
    }

    if (this._detectedObjects.length > 0) {
      let closest = null
      let minDist = Infinity
      for (const obj of this._detectedObjects) {
        const cx = (obj.bbox.x + obj.bbox.w / 2) * scaleX
        const cy = (obj.bbox.y + obj.bbox.h / 2) * scaleY
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (dist < minDist) {
          minDist = dist
          closest = obj
        }
      }
      if (minDist < 100) return closest
    }

    return null
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

    if (this._particleSystem) {
      this._particleSystem.setMode('effect')
      this._particleSystem.emitBurst(
        this.data.ringX,
        this.data.ringY,
        40,
        effectColors[effect] || '#FFD700'
      )
    }
    this._startAnimation()

    // 5 秒后自动清除效果
    if (this._effectClearTimer) {
      clearTimeout(this._effectClearTimer)
    }
    this._effectStartTime = Date.now()
    this._effectDuration = 5000
    this._effectClearTimer = setTimeout(() => {
      this._particleSystem && this._particleSystem.setMode('idle')
      this._effectImage = null
      this._effectCrop = null
      this._effectClearTimer = null
    }, this._effectDuration)

    this._generateAIEffect(effect)
  },

  _generateAIEffect(effect) {
    if (!this._currentFrameBase64) return

    let imageBbox
    const iw = this._currentImageWidth || this.data.screenWidth
    const ih = this._currentImageHeight || this.data.screenHeight
    const sx = iw / this.data.screenWidth
    const sy = ih / this.data.screenHeight

    if (this._selectedObject) {
      imageBbox = this._selectedObject.bbox
    } else {
      const size = 120
      imageBbox = {
        x: Math.max(0, (this.data.ringX - size / 2) * sx),
        y: Math.max(0, (this.data.ringY - size / 2) * sy),
        w: size * sx,
        h: size * sy
      }
    }

    api.generateEffect({
      imageBase64: this._currentFrameBase64,
      bbox: imageBbox,
      effect: effect
    }).then(async (result) => {
      if (result && result.effectImage && result.status !== 'error') {
        try {
          const filePath = await imageUtil.base64ToFilePath(result.effectImage)
          if (!this._canvas) return

          const img = this._canvas.createImage()
          await new Promise((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('Failed to load effect image'))
            img.src = filePath
          })

          this._effectImage = img
          this._effectCrop = {
            cropX: result.cropX || 0,
            cropY: result.cropY || 0,
            cropW: result.cropW || imageBbox.w,
            cropH: result.cropH || imageBbox.h
          }
        } catch (err) {
          console.error('Failed to render effect image:', err)
        }
      }
    }).catch((err) => {
      console.error('AI effect generation failed:', err)
    })
  },

  _renderEffectOnCanvas() {
    if (!this._effectImage || !this._effectCrop || !this._canvasCtx) return

    const elapsed = Date.now() - this._effectStartTime
    if (elapsed > this._effectDuration) {
      this._effectImage = null
      this._effectCrop = null
      return
    }

    const fadeIn = Math.min(1, elapsed / 500)
    const fadeStart = this._effectDuration - 1000
    const fadeOut = elapsed > fadeStart
      ? (this._effectDuration - elapsed) / 1000
      : 1
    const alpha = fadeIn * fadeOut * 0.85

    const iw = this._currentImageWidth || this.data.screenWidth
    const ih = this._currentImageHeight || this.data.screenHeight
    const sx = this.data.screenWidth / iw
    const sy = this.data.screenHeight / ih

    const { cropX, cropY, cropW, cropH } = this._effectCrop

    this._canvasCtx.save()
    this._canvasCtx.globalAlpha = alpha
    // effectImage is already cropped server-side to bbox+padding region,
    // so draw the entire image (source: 0,0,imgW,imgH) at the crop position mapped to screen space
    const imgW = this._effectImage.width
    const imgH = this._effectImage.height
    this._canvasCtx.drawImage(
      this._effectImage,
      0, 0, imgW, imgH,
      cropX * sx, cropY * sy, cropW * sx, cropH * sy
    )
    this._canvasCtx.restore()
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
      success: async (res) => {
        try {
          this._freezeFrameBase64 = await imageUtil.filePathToBase64(res.tempImagePath)
        } catch (e) {
          this._freezeFrameBase64 = null
        }

        if (this._canvas && this._canvasCtx) {
          const img = this._canvas.createImage()
          img.onload = () => {
            if (callback) callback(img)
          }
          img.onerror = () => {
            if (callback) callback(null)
          }
          img.src = res.tempImagePath
        } else {
          if (callback) callback(null)
        }
      },
      fail: () => {
        if (callback) callback(null)
      }
    })
  },

  _startAnimation() {
    if (this._animTimer) return

    const animate = () => {
      if (this._destroyed || !this._canvasCtx || !this._canvas) return

      this._canvasCtx.clearRect(
        0, 0,
        this.data.screenWidth,
        this.data.screenHeight
      )

      if (this.data.freezeActive && this._freezeImage) {
        this._canvasCtx.globalAlpha = 0.85
        this._canvasCtx.drawImage(
          this._freezeImage, 0, 0,
          this.data.screenWidth,
          this.data.screenHeight
        )
        this._canvasCtx.globalAlpha = 1.0
      } else {
        this._renderCameraFrame()
      }

      if (this.data.currentMode === 'touch' && this._detectedObjects.length > 0) {
        this._drawDetectionHighlights()
      }

      this._particleSystem && this._particleSystem.update()
      this._particleSystem && this._particleSystem.draw()
      this._renderEffectOnCanvas()

      if (!this._destroyed) {
        this._animTimer = this._canvas.requestAnimationFrame(animate)
      }
    }

    this._animTimer = this._canvas.requestAnimationFrame(animate)
  },

  _renderCameraFrame() {
    if (!this._cameraFrameBuffer || !this._canvas) return

    const now = Date.now()
    if (now - this._lastFrameTime < 33) return
    this._lastFrameTime = now

    const frame = this._cameraFrameBuffer
    const ctx = this._canvasCtx

    try {
      if (!this._cameraOffscreen ||
          this._cameraOffscreen.width !== frame.width ||
          this._cameraOffscreen.height !== frame.height) {
        this._cameraOffscreen = this._canvas.createOffscreenCanvas({
          width: frame.width,
          height: frame.height
        })
        this._cameraImageData = null
      }

      const offCtx = this._cameraOffscreen.getContext('2d')
      if (!this._cameraImageData) {
        this._cameraImageData = offCtx.createImageData(frame.width, frame.height)
      }
      this._cameraImageData.data.set(new Uint8ClampedArray(frame.data))
      offCtx.putImageData(this._cameraImageData, 0, 0)

      // Calculate cover scaling to maintain aspect ratio
      const fw = frame.width
      const fh = frame.height
      const sw = this.data.screenWidth
      const sh = this.data.screenHeight
      const scale = Math.max(sw / fw, sh / fh)
      const dw = fw * scale
      const dh = fh * scale
      const dx = (sw - dw) / 2
      const dy = (sh - dh) / 2

      ctx.drawImage(
        this._cameraOffscreen,
        0, 0, fw, fh,
        dx, dy, dw, dh
      )
    } catch (e) {
      // createOffscreenCanvas or putImageData not supported — camera preview unavailable
    }
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
    if (this._isRecording) this._stopRecording()
    if (this._reverseTimer) {
      clearTimeout(this._reverseTimer)
      this._reverseTimer = null
    }
    if (this._effectClearTimer) {
      clearTimeout(this._effectClearTimer)
      this._effectClearTimer = null
    }
    this._particleSystem && this._particleSystem.setMode('idle')

    this._detectedObjects = []
    this._currentFrameBase64 = null
    this._currentImageWidth = 0
    this._currentImageHeight = 0
    this._selectedObject = null
    this._effectImage = null
    this._effectCrop = null
    this._freezeFrameBase64 = null
    this._freezeImage = null

    this.setData({
      currentMode: '',
      modeText: '',
      freezeActive: false,
      reverseActive: false,
      showRing: false
    })
  },

  _cleanup() {
    this._destroyed = true
    this._exitAllModes()
    this._stopAnimation()
    this._stopCameraFrame()
    this._canvas = null
    this._canvasCtx = null
    if (this._energyTimer) {
      clearInterval(this._energyTimer)
      this._energyTimer = null
    }
  },

  onOpenSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onDismissGestureHint() {
    this.setData({ showGestureHint: false })
    wx.setStorageSync('gestureHintDismissed', true)
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
