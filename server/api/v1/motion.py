import logging

from fastapi import APIRouter

from server.models.schemas import MotionRequest, MotionResponse
from server.services.motion_estimator import estimate_motion

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/motion/estimate", response_model=MotionResponse)
async def estimate_motion(request: MotionRequest):
    logger.info("Estimating motion from %d frames", len(request.frames))
    result = estimate_motion(request.frames)
    return result
