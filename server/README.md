# MagicEye AI Server

基于 FastAPI 的 MagicEye 后端 AI 服务，提供场景理解、物体检测和魔法效果生成能力。

## 快速开始

### 1. 安装依赖

```bash
cd server
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 Anthropic API Key
```

### 3. 启动服务

```bash
python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 验证

```bash
# 健康检查
curl http://localhost:8000/health

# 物体检测（替换为你的 base64 图片）
curl -X POST http://localhost:8000/api/v1/objects/detect \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64-encoded-image>"}'
```

## API 端点

| 端点 | 说明 | 请求体 | 响应 |
|------|------|--------|------|
| `POST /api/v1/scene/analyze` | 场景分析 | `{image: base64}` | `{scene, weather, lighting, dynamicElements}` |
| `POST /api/v1/objects/detect` | 物体检测 | `{image: base64}` | `{objects: [{id, label, confidence, bbox}]}` |
| `POST /api/v1/effect/generate` | 效果生成 | `{imageBase64, bbox, effect}` | `{effectImage: base64PNG, status}` |
| `POST /api/v1/motion/estimate` | 运动估计 | `{frames: [base64]}` | `{motions, dominantMotion}` |

## 效果类型

- `gold` — 点石成金（金色叠加 + 闪光粒子）
- `crystal` — 水晶化（蓝青色调 + 棱线）
- `fire` — 火焰附体（橙红发光）
- `bloom` — 花开（粉色花瓣粒子）
- `sparkle` — 星光（白色星形高光）

## 小程序连接

1. 在微信开发者工具中：设置 → 勾选「不校验合法域名」
2. 打开小程序设置页，填入 AI 服务地址（如 `http://192.168.1.x:8000`）
3. 点击「测试连接」验证
