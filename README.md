# MagicEye (魔眼)

> 世界是你的魔法游乐场。

MagicEye 是一款基于微信小程序的增强现实魔法交互工具。通过手机摄像头观察现实世界，借助手势和 AI 实现对画面的"魔法操控"——冻结时间、逆转因果、点石成金。

## 核心功能

- **⏸ 时间冻结 (Chronos Freeze)** — 冻结画面中的一切运动，冰晶霜纹从中心展开
- **⏪ 时间倒流 (Time Reverse)** — 按住录制，松手后画面逐帧反向播放
- **✋ 点石成金 (Midas Touch)** — 触碰画面中的物体，弹出魔法选项环，施加变换效果
- **📸 魔法拍摄** — 拍照或录制视频，保存你的魔法瞬间

## 交互方式

| 操作 | 效果 |
|------|------|
| 点击 ⏸ 按钮 | 冻结/恢复时间 |
| 长按 ⏪ 按钮 | 录制倒流帧，松手后反向播放 |
| 点击 ✋ 按钮 | 进入触碰模式，点击画面物体弹出魔法环 |
| 右滑画面 | 循环切换魔法模式 |
| 左滑画面 | 取消当前魔法 |
| 上滑画面 | 快速冻结 |

## 技术架构

```
小程序前端                        FastAPI 后端 (localhost:8000)
┌────────────────┐              ┌──────────────────────┐
│ Camera 采集     │              │ /scene/analyze       │
│ 触控/滑动       │──POST JSON──▶│  → Claude Vision     │
│ imageUtil       │              │                      │
│ Canvas 渲染     │              │ /objects/detect       │
│ 粒子特效        │◀──JSON───────│  → Claude Vision     │
│                │              │                      │
│ 效果叠加        │◀──base64 PNG─│ /effect/generate     │
│                │              │  → PIL 程序化渲染      │
└────────────────┘              └──────────────────────┘
```

- **端侧**: 微信小程序 Camera API + Canvas 2D 实时渲染 + 粒子系统
- **云端**: FastAPI + Claude Vision 场景理解 + PIL 效果渲染 + OpenCV 运动估计

## 开发

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信小程序基础库 >= 3.0

### 快速开始

#### 1. 启动后端服务

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env，填入 ANTHROPIC_API_KEY
python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. 启动小程序

1. 打开微信开发者工具
2. 导入项目，选择 `MagicEye` 目录
3. AppID 可留空（使用测试号）或填入你的小程序 AppID
4. 设置 → 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
5. 编译运行
6. 进入小程序 → 设置页 → 填入 AI 服务地址（如 `http://192.168.1.x:8000`）
7. 点击「测试连接」验证

### 项目结构

```
MagicEye/
├── app.js                       # 应用入口
├── app.json                     # 全局配置
├── app.wxss                     # 全局样式（魔法主题色系）
├── project.config.json          # 微信开发者工具项目配置
├── pages/
│   ├── index/                   # 欢迎页（星空粒子动画 + 功能卡片）
│   ├── tutorial/                # 3步交互式新手引导
│   ├── magic/                   # 核心魔法体验页
│   └── settings/                # 设置页（含开发者 API 配置）
├── utils/
│   ├── effects.js               # 粒子系统 + 冻结/倒流/爆发特效渲染
│   ├── api.js                   # 云端 AI 服务客户端（可配置 URL）
│   └── imageUtil.js             # 临时文件 ↔ base64 转换工具
├── server/                      # Python FastAPI 后端
│   ├── main.py                  # FastAPI 入口
│   ├── config.py                # 配置管理
│   ├── api/v1/                  # 4 个 API 端点
│   ├── services/                # Claude Vision + 效果渲染 + 运动估计
│   ├── models/schemas.py        # Pydantic 请求/响应模型
│   └── utils/image.py           # 图片处理工具
├── PRD.md                       # 产品需求文档
└── README.md
```

### 页面流程

```
欢迎页 → 摄像头权限 → 教学引导（首次） → 魔法体验页
                                            ↕
                                         设置页
```

## 开发路线

- [x] **Phase 1**: 基础框架 + 冻结/倒流/触碰核心交互
- [x] **Phase 2**: 云端 AI 接入（Claude Vision 场景理解 + 物体检测）
- [x] **Phase 3**: 完整魔法效果（PIL 效果渲染 + 端到端集成）
- [ ] **Phase 4**: 体验打磨（手势识别、音效）→ [Issues #4](https://github.com/ranpin/MagicEye/issues/4), [#5](https://github.com/ranpin/MagicEye/issues/5)

查看所有 [Issues](https://github.com/ranpin/MagicEye/issues) 了解详细的待办事项。

## 许可

Private - All rights reserved.
