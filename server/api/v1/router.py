from fastapi import APIRouter

from server.api.v1.scene import router as scene_router
from server.api.v1.objects import router as objects_router
from server.api.v1.effect import router as effect_router
from server.api.v1.motion import router as motion_router

router = APIRouter()
router.include_router(scene_router, tags=["scene"])
router.include_router(objects_router, tags=["objects"])
router.include_router(effect_router, tags=["effect"])
router.include_router(motion_router, tags=["motion"])
