import json
import logging

import anthropic

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

OBJECT_DETECTION_SYSTEM_PROMPT = """你是一个物体检测 AI。分析用户提供的图片，识别所有可见的主要物体。

返回格式（严格 JSON 数组，不要包含其他文字）：
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


class ClaudeVisionService:
    def __init__(self):
        self.client = anthropic.Anthropic() if settings.ANTHROPIC_API_KEY else None

    def _call_claude(self, system_prompt: str, image_base64: str) -> str:
        if not self.client:
            raise RuntimeError("ANTHROPIC_API_KEY not configured")

        message = self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": "请分析这张图片。"},
                    ],
                }
            ],
        )
        return message.content[0].text

    def _extract_json(self, text: str) -> dict:
        text = text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text)

    def analyze_scene(self, image_base64: str) -> dict:
        try:
            raw = self._call_claude(SCENE_SYSTEM_PROMPT, image_base64)
            result = self._extract_json(raw)
            return {
                "scene": result.get("scene", "unknown"),
                "weather": result.get("weather", "unknown"),
                "lighting": result.get("lighting", "unknown"),
                "dynamicElements": result.get("dynamicElements", []),
            }
        except Exception as e:
            logger.error("Scene analysis failed: %s", e)
            return {
                "scene": "unknown",
                "weather": "unknown",
                "lighting": "unknown",
                "dynamicElements": [],
            }

    def detect_objects(
        self, image_base64: str, image_width: int, image_height: int
    ) -> dict:
        try:
            raw = self._call_claude(OBJECT_DETECTION_SYSTEM_PROMPT, image_base64)
            result = self._extract_json(raw)
            raw_objects = result.get("objects", [])

            objects = []
            for i, obj in enumerate(raw_objects):
                bbox = obj.get("bbox", {})
                objects.append(
                    {
                        "id": i + 1,
                        "label": obj.get("label", "unknown"),
                        "confidence": float(obj.get("confidence", 0.5)),
                        "bbox": {
                            "x": float(bbox.get("x", 0)) * image_width,
                            "y": float(bbox.get("y", 0)) * image_height,
                            "w": float(bbox.get("w", 0.1)) * image_width,
                            "h": float(bbox.get("h", 0.1)) * image_height,
                        },
                    }
                )
            return {"objects": objects}
        except Exception as e:
            logger.error("Object detection failed: %s", e)
            return {"objects": []}


claude_vision = ClaudeVisionService()
