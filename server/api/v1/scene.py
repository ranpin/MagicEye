import logging

from fastapi import APIRouter

from server.models.schemas import ImageRequest, SceneResponse
from server.services import claude_vision
from server.utils.image import preprocess_image

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/scene/analyze", response_model=SceneResponse)
async def analyze_scene(request: ImageRequest):
    try:
        processed_b64, w, h = preprocess_image(request.image)
    except Exception as e:
        logger.error("Image preprocessing failed: %s", e)
        return SceneResponse(scene="unknown", weather="unknown", lighting="unknown")

    logger.info("Analyzing scene for image %dx%d", w, h)
    result = await claude_vision.analyze_scene(processed_b64)
    return result
