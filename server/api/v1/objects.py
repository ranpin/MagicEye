import logging

from fastapi import APIRouter

from server.models.schemas import ImageRequest, DetectResponse
from server.services import claude_vision
from server.utils.image import preprocess_image

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/objects/detect", response_model=DetectResponse)
async def detect_objects(request: ImageRequest):
    processed_b64, w, h = preprocess_image(request.image)
    logger.info("Detecting objects in image %dx%d", w, h)
    result = claude_vision.detect_objects(processed_b64, image_width=w, image_height=h)
    return result
