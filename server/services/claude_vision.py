import asyncio
import base64
import json
import logging
import random
import re

from server.config import settings

logger = logging.getLogger(__name__)

SCENE_SYSTEM_PROMPT = """你是一个场景分析 AI。分析用户提供的图片，返回 JSON 格式的场景描述。

返回格式（严格 JSON，不要包含其他文字）：
{
  "scene": "场景类型，如 outdoor_urban, outdoor_nature, indoor_office, indoor_home, street, park 等",
  "weather": "天气状况，如 sunny, cloudy, rainy, snowy, clear 等",
  "lighting": "光照条件，如 bright, dim, overcast, night, golden_hour 等",
  "dynamicElements": [
    {
      "type": "动态元素类型，如 rain, snow, vehicle, person, animal, leaves 等",
      "direction": "运动方向：up, down, left, right, diagonal 等",
      "speed": "运动速度：slow, medium, fast"
    }
  ]
}

只返回 JSON，不要其他文字。如果没有明显的动态元素，dynamicElements 返回空数组。"""

OBJECT_DETECTION_PROMPT = """你是一个物体检测 AI。分析用户提供的图片，识别所有可见的主要物体。

返回格式（严格 JSON，不要包含其他文字）：
{
  "objects": [
    {
      "label": "物体名称（中文），如 汽车, 树木, 行人, 杯子, 书本, 猫, 椅子 等",
      "confidence": 0.0到1.0的置信度,
      "bbox": {
        "x": 归一化x坐标(0.0-1.0，左上角),
        "y": 归一化y坐标(0.0-1.0，左上角),
        "w": 归一化宽度(0.0-1.0),
        "h": 归一化高度(0.0-1.0)
      }
    }
  ]
}

要求：
- 识别画面中所有清晰可辨的主要物体（至少3个，最多10个）
- bbox 使用归一化坐标（0.0到1.0），x和y是物体边界框左上角的位置
- 只返回 JSON，不要其他文字"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


class AnthropicProvider:
    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic()

    def _call(self, system_prompt: str, image_base64: str) -> str:
        msg = self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_base64}},
                    {"type": "text", "text": "请分析这张图片。"},
                ],
            }],
        )
        return msg.content[0].text

    def analyze_scene(self, image_base64: str) -> str:
        return self._call(SCENE_SYSTEM_PROMPT, image_base64)

    def detect_objects(self, image_base64: str) -> str:
        return self._call(OBJECT_DETECTION_PROMPT, image_base64)


class GeminiProvider:
    def __init__(self):
        from google import genai
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def _call(self, system_prompt: str, image_base64: str) -> str:
        from google.genai import types
        import base64 as b64

        image_bytes = b64.b64decode(image_base64)
        response = self.client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt
            )
        )
        return response.text

    def analyze_scene(self, image_base64: str) -> str:
        return self._call(SCENE_SYSTEM_PROMPT, image_base64)

    def detect_objects(self, image_base64: str) -> str:
        return self._call(OBJECT_DETECTION_PROMPT, image_base64)


class QwenProvider:
    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(
            api_key=settings.QWEN_API_KEY,
            base_url=settings.QWEN_BASE_URL,
        )

    def _call(self, system_prompt: str, image_base64: str) -> str:
        response = self.client.chat.completions.create(
            model=settings.QWEN_MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                            },
                        },
                        {"type": "text", "text": "请分析这张图片。"},
                    ],
                },
            ],
        )
        return response.choices[0].message.content

    def analyze_scene(self, image_base64: str) -> str:
        return self._call(SCENE_SYSTEM_PROMPT, image_base64)

    def detect_objects(self, image_base64: str) -> str:
        return self._call(OBJECT_DETECTION_PROMPT, image_base64)


class MockProvider:
    SCENES = [
        {"scene": "outdoor_urban", "weather": "sunny", "lighting": "bright"},
        {"scene": "outdoor_nature", "weather": "clear", "lighting": "golden_hour"},
        {"scene": "indoor_office", "weather": "clear", "lighting": "bright"},
        {"scene": "street", "weather": "cloudy", "lighting": "overcast"},
        {"scene": "park", "weather": "sunny", "lighting": "bright"},
    ]

    OBJECTS_POOL = [
        {"label": "建筑", "cx": 0.15, "cy": 0.3, "w": 0.25, "h": 0.5},
        {"label": "树木", "cx": 0.7, "cy": 0.35, "w": 0.15, "h": 0.45},
        {"label": "汽车", "cx": 0.5, "cy": 0.7, "w": 0.2, "h": 0.12},
        {"label": "行人", "cx": 0.35, "cy": 0.55, "w": 0.08, "h": 0.25},
        {"label": "路灯", "cx": 0.85, "cy": 0.25, "w": 0.04, "h": 0.4},
        {"label": "天空", "cx": 0.5, "cy": 0.1, "w": 0.8, "h": 0.18},
        {"label": "地面", "cx": 0.5, "cy": 0.9, "w": 0.9, "h": 0.15},
        {"label": "窗户", "cx": 0.2, "cy": 0.4, "w": 0.06, "h": 0.08},
        {"label": "招牌", "cx": 0.6, "cy": 0.45, "w": 0.12, "h": 0.06},
        {"label": "自行车", "cx": 0.8, "cy": 0.72, "w": 0.1, "h": 0.1},
    ]

    def analyze_scene(self, _image_base64: str) -> str:
        scene = random.choice(self.SCENES)
        result = {**scene, "dynamicElements": []}
        if random.random() > 0.5:
            result["dynamicElements"].append(
                {"type": "person", "direction": random.choice(["left", "right"]), "speed": "slow"}
            )
        return json.dumps(result)

    def detect_objects(self, _image_base64: str) -> str:
        count = random.randint(3, 6)
        chosen = random.sample(self.OBJECTS_POOL, min(count, len(self.OBJECTS_POOL)))
        objects = []
        for obj in chosen:
            objects.append({
                "label": obj["label"],
                "confidence": round(random.uniform(0.7, 0.98), 2),
                "bbox": {
                    "x": round(max(0, obj["cx"] - obj["w"] / 2), 3),
                    "y": round(max(0, obj["cy"] - obj["h"] / 2), 3),
                    "w": round(obj["w"], 3),
                    "h": round(obj["h"], 3),
                },
            })
        return json.dumps({"objects": objects})


def _create_provider():
    provider_name = settings.AI_PROVIDER.lower()
    if provider_name == "anthropic" and settings.ANTHROPIC_API_KEY:
        logger.info("Using Anthropic provider")
        return AnthropicProvider()
    elif provider_name == "gemini" and settings.GEMINI_API_KEY:
        logger.info("Using Gemini provider")
        return GeminiProvider()
    elif provider_name == "qwen" and settings.QWEN_API_KEY:
        logger.info("Using Qwen provider")
        return QwenProvider()
    else:
        if provider_name != "mock":
            logger.warning("Provider '%s' not available, falling back to mock", provider_name)
        logger.info("Using Mock provider")
        return MockProvider()


_provider = _create_provider()


async def analyze_scene(image_base64: str) -> dict:
    try:
        raw = await asyncio.to_thread(_provider.analyze_scene, image_base64)
        result = _extract_json(raw)
        return {
            "scene": result.get("scene", "unknown"),
            "weather": result.get("weather", "unknown"),
            "lighting": result.get("lighting", "unknown"),
            "dynamicElements": result.get("dynamicElements", []),
        }
    except Exception as e:
        logger.error("Scene analysis failed: %s", e)
        return {"scene": "unknown", "weather": "unknown", "lighting": "unknown", "dynamicElements": []}


async def detect_objects(image_base64: str, image_width: int, image_height: int) -> dict:
    try:
        raw = await asyncio.to_thread(_provider.detect_objects, image_base64)
        result = _extract_json(raw)
        raw_objects = result.get("objects", [])

        objects = []
        for i, obj in enumerate(raw_objects):
            bbox = obj.get("bbox", {})
            nx = float(bbox.get("x", 0))
            ny = float(bbox.get("y", 0))
            nw = float(bbox.get("w", 0.1))
            nh = float(bbox.get("h", 0.1))
            objects.append({
                "id": i + 1,
                "label": obj.get("label", "unknown"),
                "confidence": float(obj.get("confidence", 0.5)),
                "bbox": {
                    "x": round(nx * image_width, 1),
                    "y": round(ny * image_height, 1),
                    "w": round(nw * image_width, 1),
                    "h": round(nh * image_height, 1),
                },
            })
        return {"objects": objects, "imageWidth": image_width, "imageHeight": image_height}
    except Exception as e:
        logger.error("Object detection failed: %s", e)
        return {"objects": [], "imageWidth": image_width, "imageHeight": image_height}
