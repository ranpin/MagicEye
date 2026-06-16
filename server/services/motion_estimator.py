import logging

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def _pil_to_gray(img: Image.Image) -> np.ndarray:
    arr = np.array(img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)


def estimate_motion(frame_base64_list: list[str]) -> dict:
    from server.utils.image import decode_base64_image

    if len(frame_base64_list) < 2:
        return {"motions": [], "dominantMotion": None}

    try:
        frames = []
        for fb in frame_base64_list[:10]:
            img = decode_base64_image(fb)
            img = img.resize((320, 240))
            frames.append(_pil_to_gray(img))

        all_flows = []
        for i in range(1, len(frames)):
            flow = cv2.calcOpticalFlowFarneback(
                frames[i - 1], frames[i], None,
                0.5, 3, 15, 3, 5, 1.2, 0,
            )
            magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            mean_mag = float(np.mean(magnitude))
            mean_angle = float(np.mean(angle))
            dx = float(np.mean(flow[..., 0]))
            dy = float(np.mean(flow[..., 1]))
            all_flows.append({
                "magnitude": mean_mag,
                "angle": mean_angle,
                "dx": dx,
                "dy": dy,
            })

        if not all_flows:
            return {"motions": [], "dominantMotion": None}

        avg_dx = sum(f["dx"] for f in all_flows) / len(all_flows)
        avg_dy = sum(f["dy"] for f in all_flows) / len(all_flows)
        avg_mag = sum(f["magnitude"] for f in all_flows) / len(all_flows)

        if abs(avg_dx) > abs(avg_dy):
            direction_label = "right" if avg_dx > 0 else "left"
        else:
            direction_label = "down" if avg_dy > 0 else "up"

        if avg_mag < 0.5:
            speed_label = "still"
        elif avg_mag < 2.0:
            speed_label = "slow"
        elif avg_mag < 5.0:
            speed_label = "medium"
        else:
            speed_label = "fast"

        dominant = {
            "type": "general",
            "direction": [round(avg_dx, 3), round(avg_dy, 3)],
            "speed": round(avg_mag, 3),
            "directionLabel": direction_label,
            "speedLabel": speed_label,
        }

        motions = [dominant]
        return {"motions": motions, "dominantMotion": dominant}

    except Exception as e:
        logger.error("Motion estimation failed: %s", e)
        return {"motions": [], "dominantMotion": None}
