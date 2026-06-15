/**
 * MagicEye 云端 AI 服务客户端
 *
 * MVP 阶段使用 Mock 实现，Phase 2 接入真实云端 AI 服务。
 *
 * 接口规划：
 * - analyzeScene(imageBase64): 场景理解，返回场景描述和动态元素
 * - detectObjects(imageBase64): 物体检测，返回物体列表及边界框
 * - generateEffect(options): 图像生成，返回魔法效果图片
 */

const BASE_URL = '' // TODO: Phase 2 配置云端服务地址

class MagicEyeAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
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
    if (!this.baseUrl) {
      // Mock 模式：返回模拟数据
      return this._mock(path, data)
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.baseUrl + path,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: data,
        timeout: 10000,
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

  _mock(path) {
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
                  bbox: { x: 50, y: 200, w: 150, h: 100 }
                },
                {
                  id: 2,
                  label: '树木',
                  confidence: 0.88,
                  bbox: { x: 250, y: 100, w: 80, h: 200 }
                },
                {
                  id: 3,
                  label: '行人',
                  confidence: 0.92,
                  bbox: { x: 180, y: 180, w: 40, h: 120 }
                }
              ]
            })
            break

          case '/api/v1/effect/generate':
            resolve({
              effectImage: '',
              mask: '',
              status: 'success'
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

module.exports = new MagicEyeAPI(BASE_URL)
