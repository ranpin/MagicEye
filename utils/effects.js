/**
 * MagicEye 魔法特效渲染引擎
 *
 * 提供粒子系统、冻结冰晶、时间倒流、魔法光环等视觉特效。
 * 基于 Canvas 2D API 实现。
 */

class Particle {
  constructor(x, y, options = {}) {
    this.x = x
    this.y = y
    this.vx = options.vx || (Math.random() - 0.5) * 3
    this.vy = options.vy || (Math.random() - 0.5) * 3
    this.size = options.size || Math.random() * 3 + 1
    this.color = options.color || '#00F5FF'
    this.alpha = options.alpha || Math.random() * 0.6 + 0.3
    this.life = options.life || Math.random() * 100 + 50
    this.maxLife = this.life
    this.decay = options.decay || 1
    this.rotation = options.rotation || Math.random() * Math.PI * 2
    this.rotationSpeed = options.rotationSpeed || (Math.random() - 0.5) * 0.02
    this.shape = options.shape || 'circle' // circle, crystal, star
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.rotation += this.rotationSpeed
    this.life -= this.decay
    this.alpha = Math.max(0, (this.life / this.maxLife) * 0.8)
    return this.life > 0
  }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    if (this.shape === 'crystal') {
      this._drawCrystal(ctx)
    } else if (this.shape === 'star') {
      this._drawStar(ctx)
    } else {
      this._drawCircle(ctx)
    }

    ctx.restore()
  }

  _drawCircle(ctx) {
    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = this.size * 3
    ctx.beginPath()
    ctx.arc(0, 0, this.size, 0, Math.PI * 2)
    ctx.fill()
  }

  _drawCrystal(ctx) {
    const s = this.size
    ctx.strokeStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = s * 2
    ctx.lineWidth = 1

    // 六边形冰晶
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const x = Math.cos(angle) * s
      const y = Math.sin(angle) * s
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()

    // 内部线条
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI / 3) * i
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * s, Math.sin(angle) * s)
      ctx.lineTo(Math.cos(angle + Math.PI) * s, Math.sin(angle + Math.PI) * s)
      ctx.stroke()
    }
  }

  _drawStar(ctx) {
    const s = this.size
    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = s * 4

    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i
      const r = i % 2 === 0 ? s : s * 0.4
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
}

class ParticleSystem {
  constructor(ctx, width, height) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.particles = []
    this.burstParticles = []
    this.mode = 'idle'
    this.frameCount = 0
    this.frostLines = []
    this.frostGenerated = false
  }

  setMode(mode) {
    this.mode = mode
    this.frameCount = 0
    if (mode === 'idle') {
      this.particles = []
      this.burstParticles = []
      this.frostLines = []
      this.frostGenerated = false
    }
    if (mode === 'freeze') {
      this._generateFrostLines()
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
        shape: 'star'
      }))
    }
  }

  update() {
    this.frameCount++

    this.burstParticles = this.burstParticles.filter(p => p.update())

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
    }

    this.particles = this.particles.filter(p => p.update())
    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200)
    }
  }

  draw() {
    this.burstParticles.forEach(p => p.draw(this.ctx))
    this.particles.forEach(p => p.draw(this.ctx))

    switch (this.mode) {
      case 'freeze':
        this._drawFreezeOverlay()
        break
      case 'reverse':
        this._drawReverseOverlay()
        break
    }
  }

  // ===== 冻结模式 =====

  _generateFrostLines() {
    this.frostLines = []
    const cx = this.width / 2
    const cy = this.height / 2
    const maxR = Math.max(this.width, this.height) * 0.45

    // 生成从中心向外辐射的霜纹线
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.2
      const branches = []

      // 主线
      const length = maxR * (0.5 + Math.random() * 0.5)
      const endX = cx + Math.cos(angle) * length
      const endY = cy + Math.sin(angle) * length

      // 分支
      const numBranches = 3 + Math.floor(Math.random() * 3)
      for (let b = 0; b < numBranches; b++) {
        const t = 0.3 + (b / numBranches) * 0.6
        const branchX = cx + (endX - cx) * t
        const branchY = cy + (endY - cy) * t
        const branchAngle = angle + (Math.random() > 0.5 ? 0.5 : -0.5) + (Math.random() - 0.5) * 0.3
        const branchLen = length * 0.3 * (1 - t)
        branches.push({
          startX: branchX,
          startY: branchY,
          endX: branchX + Math.cos(branchAngle) * branchLen,
          endY: branchY + Math.sin(branchAngle) * branchLen
        })
      }

      this.frostLines.push({
        startX: cx,
        startY: cy,
        endX,
        endY,
        branches
      })
    }

    this.frostGenerated = true
  }

  _updateFreeze() {
    if (this.frameCount % 4 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        Math.random() * this.height,
        {
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 5 + 3,
          color: '#00F5FF',
          alpha: Math.random() * 0.3 + 0.1,
          life: 150,
          decay: 1,
          shape: 'crystal',
          rotationSpeed: (Math.random() - 0.5) * 0.005
        }
      ))
    }
  }

  _drawFreezeOverlay() {
    const ctx = this.ctx
    const progress = Math.min(1, this.frameCount / 30)

    // 蓝色薄雾
    ctx.save()
    ctx.globalAlpha = progress * 0.12
    ctx.fillStyle = '#001830'
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.restore()

    // 霜纹 - 从中心逐渐展开
    ctx.save()
    ctx.globalAlpha = progress * 0.25
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.shadowColor = '#00F5FF'
    ctx.shadowBlur = 4

    this.frostLines.forEach(line => {
      const drawLen = progress
      const cx = line.startX + (line.endX - line.startX) * drawLen
      const cy = line.startY + (line.endY - line.startY) * drawLen

      ctx.beginPath()
      ctx.moveTo(line.startX, line.startY)
      ctx.lineTo(cx, cy)
      ctx.stroke()

      // 分支
      if (progress > 0.5) {
        const branchProgress = (progress - 0.5) * 2
        line.branches.forEach(branch => {
          const bx = branch.startX + (branch.endX - branch.startX) * branchProgress
          const by = branch.startY + (branch.endY - branch.startY) * branchProgress
          ctx.beginPath()
          ctx.moveTo(branch.startX, branch.startY)
          ctx.lineTo(bx, by)
          ctx.stroke()
        })
      }
    })
    ctx.restore()

    // 边缘光晕
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.25,
      this.width / 2, this.height / 2, this.width * 0.65
    )
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0)')
    gradient.addColorStop(0.7, 'rgba(0, 245, 255, 0)')
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0.06)')

    ctx.save()
    ctx.globalAlpha = 0.6 + Math.sin(this.frameCount * 0.03) * 0.3
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.restore()

    // 角落冰晶装饰
    this._drawCornerFrost(ctx, 0, 0, 0)
    this._drawCornerFrost(ctx, this.width, 0, Math.PI / 2)
    this._drawCornerFrost(ctx, this.width, this.height, Math.PI)
    this._drawCornerFrost(ctx, 0, this.height, -Math.PI / 2)

    // 中心冻结指示
    ctx.save()
    const pulse = 0.6 + Math.sin(this.frameCount * 0.04) * 0.2
    ctx.globalAlpha = progress * pulse
    ctx.fillStyle = '#00F5FF'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = '#00F5FF'
    ctx.shadowBlur = 12
    ctx.fillText('⏸ 时间已冻结', this.width / 2, 80)
    ctx.restore()
  }

  _drawCornerFrost(ctx, x, y, rotation) {
    const progress = Math.min(1, this.frameCount / 40)
    const size = 80 * progress

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.globalAlpha = progress * 0.2
    ctx.strokeStyle = '#00F5FF'
    ctx.lineWidth = 0.8
    ctx.shadowColor = '#00F5FF'
    ctx.shadowBlur = 3

    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI / 2 / 5) * i + 0.1
      const len = size * (1 - i * 0.15)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
      ctx.stroke()
    }

    ctx.restore()
  }

  // ===== 倒流模式 =====

  _updateReverse() {
    if (this.frameCount % 2 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        this.height + 10,
        {
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(Math.random() * 2.5 + 1),
          size: Math.random() * 3 + 1,
          color: '#9B4DCA',
          alpha: Math.random() * 0.5 + 0.2,
          life: 120,
          decay: 1
        }
      ))
    }

    // 偶尔生成紫色星形粒子
    if (this.frameCount % 15 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        this.height * 0.8 + Math.random() * this.height * 0.2,
        {
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(Math.random() * 3 + 2),
          size: Math.random() * 4 + 3,
          color: '#CC77FF',
          alpha: Math.random() * 0.4 + 0.2,
          life: 80,
          decay: 1,
          shape: 'star',
          rotationSpeed: (Math.random() - 0.5) * 0.05
        }
      ))
    }
  }

  _drawReverseOverlay() {
    const ctx = this.ctx
    const progress = Math.min(1, this.frameCount / 20)

    // 紫色边缘渐变
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.15,
      this.width / 2, this.height / 2, this.width * 0.65
    )
    gradient.addColorStop(0, 'rgba(123, 47, 190, 0)')
    gradient.addColorStop(0.6, 'rgba(123, 47, 190, 0)')
    gradient.addColorStop(1, 'rgba(123, 47, 190, 0.12)')

    ctx.save()
    ctx.globalAlpha = progress * (0.5 + Math.sin(this.frameCount * 0.04) * 0.2)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.restore()

    // 时间倒流扫描线
    const scanY = (this.frameCount * 3) % this.height
    ctx.save()
    ctx.globalAlpha = 0.15
    const scanGradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20)
    scanGradient.addColorStop(0, 'rgba(155, 77, 202, 0)')
    scanGradient.addColorStop(0.5, 'rgba(155, 77, 202, 0.5)')
    scanGradient.addColorStop(1, 'rgba(155, 77, 202, 0)')
    ctx.fillStyle = scanGradient
    ctx.fillRect(0, scanY - 20, this.width, 40)
    ctx.restore()

    // 指示文字
    ctx.save()
    ctx.globalAlpha = progress * (0.7 + Math.sin(this.frameCount * 0.06) * 0.3)
    ctx.fillStyle = '#9B4DCA'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = '#9B4DCA'
    ctx.shadowBlur = 12
    ctx.fillText('⏪ 时间倒流', this.width / 2, 80)
    ctx.restore()
  }

  // ===== 通用效果模式 =====

  _updateEffect() {
    if (this.frameCount % 3 === 0) {
      this.particles.push(new Particle(
        Math.random() * this.width,
        Math.random() * this.height,
        {
          vx: (Math.random() - 0.5) * 2,
          vy: -(Math.random() * 1.5 + 0.5),
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
