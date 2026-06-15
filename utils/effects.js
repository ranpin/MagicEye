/**
 * MagicEye 魔法特效渲染引擎
 *
 * 提供粒子系统、冻结效果、魔法光环等视觉特效。
 * 基于 Canvas 2D API 实现。
 */

class Particle {
  constructor(x, y, options = {}) {
    this.x = x
    this.y = y
    this.originX = x
    this.originY = y
    this.vx = options.vx || (Math.random() - 0.5) * 3
    this.vy = options.vy || (Math.random() - 0.5) * 3
    this.size = options.size || Math.random() * 3 + 1
    this.color = options.color || '#00F5FF'
    this.alpha = options.alpha || Math.random() * 0.6 + 0.3
    this.life = options.life || Math.random() * 100 + 50
    this.maxLife = this.life
    this.decay = options.decay || 1
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.life -= this.decay
    this.alpha = Math.max(0, (this.life / this.maxLife) * 0.8)
    return this.life > 0
  }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = this.size * 3
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

class ParticleSystem {
  constructor(ctx, width, height) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.particles = []
    this.mode = 'idle'
    this.frameCount = 0
    this.burstParticles = []
  }

  setMode(mode) {
    this.mode = mode
    this.frameCount = 0
    if (mode === 'idle') {
      this.particles = []
      this.burstParticles = []
    }
  }

  emitBurst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const speed = Math.random() * 4 + 2
      this.burstParticles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        life: Math.random() * 60 + 30,
        decay: 1
      }))
    }
  }

  update() {
    this.frameCount++

    // 更新爆发粒子
    this.burstParticles = this.burstParticles.filter(p => p.update())

    // 根据模式持续生成粒子
    switch (this.mode) {
      case 'freeze':
        this._updateFreeze()
        break
      case 'reverse':
        this._updateReverse()
        break
      case 'effect':
        this._updateEffect()
        break
      default:
        break
    }

    // 更新持续粒子
    this.particles = this.particles.filter(p => p.update())

    // 限制粒子数量
    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200)
    }
  }

  draw() {
    // 绘制爆发粒子
    this.burstParticles.forEach(p => p.draw(this.ctx))

    // 绘制持续粒子
    this.particles.forEach(p => p.draw(this.ctx))

    // 模式专属绘制
    switch (this.mode) {
      case 'freeze':
        this._drawFreezeOverlay()
        break
      case 'reverse':
        this._drawReverseOverlay()
        break
      default:
        break
    }
  }

  _updateFreeze() {
    // 持续生成缓慢飘动的冰晶粒子
    if (this.frameCount % 3 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        Math.random() * this.height,
        {
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          color: '#00F5FF',
          alpha: Math.random() * 0.4 + 0.1,
          life: 120,
          decay: 1
        }
      ))
    }
  }

  _drawFreezeOverlay() {
    // 半透明蓝色叠加层
    const alpha = Math.min(0.15, this.frameCount * 0.005)
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.fillStyle = '#001830'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.restore()

    // 顶部冻结提示
    this.ctx.save()
    this.ctx.globalAlpha = 0.6 + Math.sin(this.frameCount * 0.05) * 0.2
    this.ctx.fillStyle = '#00F5FF'
    this.ctx.font = 'bold 16px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('⏸ 时间已冻结', this.width / 2, 80)
    this.ctx.restore()

    // 边缘光晕
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.3,
      this.width / 2, this.height / 2, this.width * 0.7
    )
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0)')
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0.08)')
    this.ctx.save()
    this.ctx.globalAlpha = 0.5 + Math.sin(this.frameCount * 0.03) * 0.3
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.restore()
  }

  _updateReverse() {
    // 紫色能量粒子向上飘动
    if (this.frameCount % 2 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        this.height + 10,
        {
          vx: (Math.random() - 0.5) * 1,
          vy: -(Math.random() * 3 + 1),
          size: Math.random() * 3 + 1,
          color: '#9B4DCA',
          alpha: Math.random() * 0.5 + 0.2,
          life: 100,
          decay: 1
        }
      ))
    }
  }

  _drawReverseOverlay() {
    // 紫色边缘光晕
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.2,
      this.width / 2, this.height / 2, this.width * 0.7
    )
    gradient.addColorStop(0, 'rgba(123, 47, 190, 0)')
    gradient.addColorStop(1, 'rgba(123, 47, 190, 0.1)')
    this.ctx.save()
    this.ctx.globalAlpha = 0.4 + Math.sin(this.frameCount * 0.04) * 0.2
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.ctx.restore()

    // 倒流指示文字
    this.ctx.save()
    this.ctx.globalAlpha = 0.7 + Math.sin(this.frameCount * 0.08) * 0.3
    this.ctx.fillStyle = '#9B4DCA'
    this.ctx.font = 'bold 16px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('⏪ 时间倒流', this.width / 2, 80)
    this.ctx.restore()
  }

  _updateEffect() {
    // 通用魔法效果粒子
    if (this.frameCount % 4 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        Math.random() * this.height,
        {
          vx: (Math.random() - 0.5) * 2,
          vy: -(Math.random() * 1 + 0.5),
          size: Math.random() * 2 + 0.5,
          color: '#FFD700',
          alpha: Math.random() * 0.3 + 0.1,
          life: 80,
          decay: 1
        }
      ))
    }
  }
}

module.exports = {
  Particle,
  ParticleSystem
}
