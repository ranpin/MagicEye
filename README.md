# MagicEye (魔眼)

> 世界是你的魔法游乐场。

MagicEye 是一款基于微信小程序的增强现实魔法交互工具。通过手机摄像头观察现实世界，借助手势和 AI 实现对画面的"魔法操控"——冻结时间、逆转因果、点石成金。

## 核心功能

- **⏸ 时间冻结 (Chronos Freeze)** — 冻结画面中的一切运动，雨滴悬停、飞鸟静止
- **⏪ 时间倒流 (Time Reverse)** — 按住录制，松手后画面反向播放
- **✋ 点石成金 (Midas Touch)** — 触碰画面中的物体，弹出魔法选项环，施加变换效果
- **📸 魔法拍摄** — 拍照或录制视频，保存你的魔法瞬间

## 技术架构

```
小程序前端                    云端 AI 服务 (Phase 2)
┌─────────────┐              ┌──────────────┐
│ Camera 采集  │ ──WebSocket──▶│ 场景理解      │
│ 手势/触控    │              │ 物体检测      │
│ Canvas 渲染  │◀──────────────│ 运动估计      │
│ 粒子特效     │              │ 图像生成      │
└─────────────┘              └──────────────┘
```

- **端侧**: 微信小程序 Camera API + Canvas 2D 实时渲染
- **云端**: 多模态大模型场景理解 + 扩散模型图像生成 (Phase 2)

## 开发

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信小程序基础库 >= 3.0

### 快速开始

1. 打开微信开发者工具
2. 导入项目，选择 `MagicEye` 目录
3. AppID 可留空（使用测试号）或填入你的小程序 AppID
4. 编译运行

### 项目结构

```
MagicEye/
├── app.js                    # 应用入口
├── app.json                  # 全局配置
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置
├── pages/
│   ├── index/                # 欢迎页
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   └── magic/                # 核心魔法体验页
│       ├── magic.js
│       ├── magic.json
│       ├── magic.wxml
│       └── magic.wxss
├── utils/
│   ├── effects.js            # 粒子系统和魔法特效渲染
│   └── api.js                # 云端 AI 服务客户端
└── PRD.md                    # 产品需求文档
```

## 开发路线

- [x] **Phase 1**: 基础框架 + 冻结/倒流/触碰核心交互
- [ ] **Phase 2**: 云端 AI 接入（场景理解、物体检测、运动估计）
- [ ] **Phase 3**: 完整魔法效果（AI 图像生成、材质变换）
- [ ] **Phase 4**: 体验打磨（手势识别、音效、引导优化）

## 许可

Private - All rights reserved.
