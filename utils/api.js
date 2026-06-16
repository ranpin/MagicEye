/**
 * MagicEye 云端 AI 服务客户端
 *
 * 支持两种模式：
 * - Mock 模式：BASE_URL 为空时使用内置模拟数据
 * - 真实模式：BASE_URL 指向 FastAPI 后端
 *
 * BASE_URL 可通过设置页配置，存储在 wx.Storage('apiBaseUrl')
 */

const DEFAULT_BASE_URL = 'http://localhost:8000'

class MagicEyeAPI {
  get baseUrl() {
    return wx.getStorageSync('apiBaseUrl') || ''
  }

  get isMockMode() {
    return !this.baseUrl
  }

  /**
   * 场景理解 - 分析画面内容
   * @param {string} imageBase64 - 画面帧的 base64 编码
   * @returns {Promise<Object>} 场景分析结果
   */
  analyzeScene(imageBase64) {
    return this._request('/api/v1/scene/analyze', {
      image: imageBase64
    })
  }

  /**
   * 物体检测 - 识别画面中的物体
   * @param {string} imageBase64 - 画面帧的 base64 编码
   * @returns {Promise<Object>} 检测结果，含物体列表和边界框
   */
  detectObjects(imageBase64) {
    return this._request('/api/v1/objects/detect', {
      image: imageBase64
    })
  }

  /**
   * 生成魔法效果 - 对指定物体施加变换
   * @param {Object} options
   * @param {string} options.imageBase64 - 原始画面帧
   * @param {Object} options.bbox - 物体边界框 {x, y, w, h}
   * @param {string} options.effect - 效果类型 (gold/crystal/fire/bloom/sparkle)
   * @returns {Promise<Object>} 生成结果
   */
  generateEffect(options) {
    return this._request('/api/v1/effect/generate', options)
  }

  /**
   * 运动估计 - 分析画面中的运动
   * @param {string[]} frameBase64List - 连续多帧的 base64 编码
   * @returns {Promise<Object>} 运动分析结果
   */
  estimateMotion(frameBase64List) {
    return this._request('/api/v1/motion/estimate', {
      frames: frameBase64List
    })
  }

  _request(path, data) {
    if (this.isMockMode) {
      return this._mock(path, data)
    }

    const isSlowEndpoint = path.includes('/effect/') || path.includes('/scene/') || path.includes('/objects/')
    const timeout = isSlowEndpoint ? 30000 : 10000

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.baseUrl + path,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: data,
        timeout: timeout,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(`API error: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }

  _mock(path, _data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (path) {
          case '/api/v1/scene/analyze':
            resolve({
              scene: 'outdoor_urban',
              weather: 'rainy',
              lighting: 'overcast',
              dynamicElements: [
                { type: 'rain', direction: 'down', speed: 'medium' },
                { type: 'vehicle', direction: 'right', speed: 'fast' }
              ]
            })
            break

          case '/api/v1/objects/detect':
            resolve({
              objects: [
                {
                  id: 1,
                  label: '汽车',
                  confidence: 0.95,
                  bbox: { x: 50, y: 300, w: 150, h: 100 }
                },
                {
                  id: 2,
                  label: '树木',
                  confidence: 0.88,
                  bbox: { x: 250, y: 150, w: 80, h: 200 }
                },
                {
                  id: 3,
                  label: '行人',
                  confidence: 0.92,
                  bbox: { x: 160, y: 280, w: 50, h: 120 }
                }
              ],
              imageWidth: 375,
              imageHeight: 667
            })
            break

          case '/api/v1/effect/generate':
            resolve({
              effectImage: '',
              mask: '',
              status: 'success',
              cropX: 0,
              cropY: 0,
              cropW: 375,
              cropH: 667
            })
            break

          case '/api/v1/motion/estimate':
            resolve({
              motions: [
                { type: 'rain', direction: [0, 1], speed: 2.5 },
                { type: 'car', direction: [1, 0], speed: 5.0 }
              ],
              dominantMotion: { type: 'rain', direction: [0, 1], speed: 2.5 }
            })
            break

          default:
            resolve({ status: 'ok' })
        }
      }, 500) // 模拟网络延迟
    })
  }
}

module.exports = new MagicEyeAPI()
module.exports.DEFAULT_BASE_URL = DEFAULT_BASE_URL
