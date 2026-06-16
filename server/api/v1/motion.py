import logging

from fastapi import APIRouter

from server.models.schemas import MotionRequest, MotionResponse
from server.services.motion_estimator import estimate_motion as _estimate_motion

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/motion/estimate", response_model=MotionResponse)
async def estimate_motion_endpoint(request: MotionRequest):
    logger.info("Estimating motion from %d frames", len(request.frames))
    try:
        result = _estimate_motion(request.frames)
        return result
    except Exception as e:
        logger.error("Motion estimation failed: %s", e)
        return MotionResponse(motions=[], dominantMotion=None)
