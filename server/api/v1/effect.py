import logging

from fastapi import APIRouter

from server.models.schemas import EffectRequest, EffectResponse
from server.services.effect_renderer import render_effect

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/effect/generate", response_model=EffectResponse)
async def generate_effect(request: EffectRequest):
    logger.info(
        "Generating %s effect for bbox (%.1f, %.1f, %.1f, %.1f)",
        request.effect, request.bbox.x, request.bbox.y, request.bbox.w, request.bbox.h,
    )
    try:
        result = render_effect(
            request.imageBase64,
            request.bbox.model_dump(),
            request.effect,
        )
        return EffectResponse(
            effectImage=result["effectImage"],
            mask="",
            status="fast",
            cropX=result["cropX"],
            cropY=result["cropY"],
            cropW=result["cropW"],
            cropH=result["cropH"],
        )
    except Exception as e:
        logger.error("Effect generation failed: %s", e)
        return EffectResponse(effectImage="", mask="", status="error")
