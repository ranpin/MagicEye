from pydantic import BaseModel


class BBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class ImageRequest(BaseModel):
    image: str


class EffectRequest(BaseModel):
    imageBase64: str
    bbox: BBox
    effect: str


class MotionRequest(BaseModel):
    frames: list[str]


class DynamicElement(BaseModel):
    type: str
    direction: str
    speed: str


class SceneResponse(BaseModel):
    scene: str
    weather: str
    lighting: str
    dynamicElements: list[DynamicElement] = []


class DetectedObject(BaseModel):
    id: int
    label: str
    confidence: float
    bbox: BBox


class DetectResponse(BaseModel):
    objects: list[DetectedObject] = []
    imageWidth: int = 0
    imageHeight: int = 0


class EffectResponse(BaseModel):
    effectImage: str = ""
    mask: str = ""
    status: str = "success"
    cropX: float = 0
    cropY: float = 0
    cropW: float = 0
    cropH: float = 0


class MotionInfo(BaseModel):
    type: str
    direction: list[float]
    speed: float
    directionLabel: str = ""
    speedLabel: str = ""


class MotionResponse(BaseModel):
    motions: list[MotionInfo] = []
    dominantMotion: MotionInfo | None = None
