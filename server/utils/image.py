import base64
import io
import logging

from PIL import Image

logger = logging.getLogger(__name__)


def decode_base64_image(data: str) -> Image.Image:
    if "," in data:
        data = data.split(",", 1)[1]
    img_bytes = base64.b64decode(data)
    buf = io.BytesIO(img_bytes)
    try:
        img = Image.open(buf)
        img.load()
        return img
    except Exception as e:
        buf.close()
        raise ValueError(f"Invalid image data: {e}") from e


def encode_image_base64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    try:
        img.save(buf, format=fmt)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    finally:
        buf.close()


def preprocess_image(data: str, max_dim: int = 2048) -> tuple[str, int, int]:
    img = decode_base64_image(data)

    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        new_w, new_h = int(w * ratio), int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        w, h = new_w, new_h

    return encode_image_base64(img, fmt="JPEG"), w, h
