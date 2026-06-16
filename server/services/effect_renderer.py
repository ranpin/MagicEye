import random
from PIL import Image, ImageDraw, ImageFilter


def _bbox_rect(bbox: dict) -> tuple[int, int, int, int]:
    x = int(bbox["x"])
    y = int(bbox["y"])
    w = int(bbox["w"])
    h = int(bbox["h"])
    return x, y, x + w, y + h


def render_gold(img: Image.Image, bbox: dict) -> Image.Image:
    x1, y1, x2, y2 = _bbox_rect(bbox)
    gold_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gold_draw = ImageDraw.Draw(gold_layer)
    gold_draw.rectangle([x1, y1, x2, y2], fill=(255, 215, 0, 100))
    gold_draw.rectangle([x1, y1, x2, y2], outline=(255, 200, 0, 180), width=2)

    for _ in range(30):
        sx = random.randint(x1, max(x1 + 1, x2))
        sy = random.randint(y1, max(y1 + 1, y2))
        r = random.randint(2, 5)
        gold_draw.ellipse(
            [sx - r, sy - r, sx + r, sy + r], fill=(255, 255, 200, 200)
        )

    gold_layer = gold_layer.filter(ImageFilter.GaussianBlur(radius=2))
    result = Image.alpha_composite(img.convert("RGBA"), gold_layer)
    return result.convert("RGB")


def render_crystal(img: Image.Image, bbox: dict) -> Image.Image:
    x1, y1, x2, y2 = _bbox_rect(bbox)
    crystal_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    crystal_draw = ImageDraw.Draw(crystal_layer)
    crystal_draw.rectangle([x1, y1, x2, y2], fill=(0, 200, 255, 60))

    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    for i in range(6):
        angle = 3.14159 * 2 * i / 6
        ex = int(cx + (x2 - x1) * 0.4 * __import__("math").cos(angle))
        ey = int(cy + (y2 - y1) * 0.4 * __import__("math").sin(angle))
        crystal_draw.line([cx, cy, ex, ey], fill=(0, 245, 255, 150), width=2)

    crystal_draw.rectangle([x1, y1, x2, y2], outline=(0, 245, 255, 200), width=2)
    crystal_layer = crystal_layer.filter(ImageFilter.GaussianBlur(radius=1))

    result = Image.alpha_composite(img.convert("RGBA"), crystal_layer)
    return result.convert("RGB")


def render_fire(img: Image.Image, bbox: dict) -> Image.Image:
    x1, y1, x2, y2 = _bbox_rect(bbox)
    fire_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fire_draw = ImageDraw.Draw(fire_layer)

    padding = 15
    fire_draw.rectangle(
        [x1 - padding, y1 - padding, x2 + padding, y2 + padding],
        fill=(255, 69, 0, 80),
    )
    fire_draw.rectangle(
        [x1, y1, x2, y2], fill=(255, 100, 0, 100)
    )

    for _ in range(20):
        sx = random.randint(x1, max(x1 + 1, x2))
        sy = random.randint(y1, max(y1 + 1, y2))
        r = random.randint(3, 8)
        color = random.choice([(255, 200, 0, 180), (255, 100, 0, 150), (255, 50, 0, 120)])
        fire_draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=color)

    fire_layer = fire_layer.filter(ImageFilter.GaussianBlur(radius=8))
    result = Image.alpha_composite(img.convert("RGBA"), fire_layer)
    return result.convert("RGB")


def render_bloom(img: Image.Image, bbox: dict) -> Image.Image:
    x1, y1, x2, y2 = _bbox_rect(bbox)
    bloom_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    bloom_draw = ImageDraw.Draw(bloom_layer)

    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    spread_x = (x2 - x1) // 2 + 30
    spread_y = (y2 - y1) // 2 + 30

    for _ in range(25):
        px = random.gauss(cx, spread_x * 0.5)
        py = random.gauss(cy, spread_y * 0.5)
        r = random.randint(3, 10)
        alpha = random.randint(100, 200)
        color = random.choice([
            (255, 105, 180, alpha),
            (255, 182, 193, alpha),
            (255, 228, 225, alpha),
        ])
        bloom_draw.ellipse([px - r, py - r, px + r, py + r], fill=color)

    bloom_layer = bloom_layer.filter(ImageFilter.GaussianBlur(radius=3))
    result = Image.alpha_composite(img.convert("RGBA"), bloom_layer)
    return result.convert("RGB")


def render_sparkle(img: Image.Image, bbox: dict) -> Image.Image:
    x1, y1, x2, y2 = _bbox_rect(bbox)
    sparkle_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sparkle_draw = ImageDraw.Draw(sparkle_layer)

    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    spread_x = (x2 - x1) // 2 + 20
    spread_y = (y2 - y1) // 2 + 20

    for _ in range(20):
        px = random.gauss(cx, spread_x * 0.5)
        py = random.gauss(cy, spread_y * 0.5)
        size = random.randint(4, 12)
        alpha = random.randint(150, 255)
        sparkle_draw.line([px - size, py, px + size, py], fill=(255, 255, 255, alpha), width=2)
        sparkle_draw.line([px, py - size, px, py + size], fill=(255, 255, 255, alpha), width=2)
        sparkle_draw.line(
            [px - size // 2, py - size // 2, px + size // 2, py + size // 2],
            fill=(255, 255, 255, alpha // 2), width=1,
        )
        sparkle_draw.line(
            [px + size // 2, py - size // 2, px - size // 2, py + size // 2],
            fill=(255, 255, 255, alpha // 2), width=1,
        )

    sparkle_layer = sparkle_layer.filter(ImageFilter.GaussianBlur(radius=2))
    result = Image.alpha_composite(img.convert("RGBA"), sparkle_layer)
    return result.convert("RGB")


RENDERERS = {
    "gold": render_gold,
    "crystal": render_crystal,
    "fire": render_fire,
    "bloom": render_bloom,
    "sparkle": render_sparkle,
}


def render_effect(image_base64: str, bbox: dict, effect: str) -> dict:
    from server.utils.image import decode_base64_image, encode_image_base64

    img = decode_base64_image(image_base64)
    iw, ih = img.size

    x, y, w, h = int(bbox["x"]), int(bbox["y"]), int(bbox["w"]), int(bbox["h"])

    pad_x = max(30, int(w * 0.3))
    pad_y = max(30, int(h * 0.3))
    cx1 = max(0, x - pad_x)
    cy1 = max(0, y - pad_y)
    cx2 = min(iw, x + w + pad_x)
    cy2 = min(ih, y + h + pad_y)

    cropped = img.crop((cx1, cy1, cx2, cy2))
    local_bbox = {"x": x - cx1, "y": y - cy1, "w": w, "h": h}

    renderer = RENDERERS.get(effect, render_gold)
    result = renderer(cropped, local_bbox)

    return {
        "effectImage": encode_image_base64(result, fmt="JPEG"),
        "cropX": cx1,
        "cropY": cy1,
        "cropW": cx2 - cx1,
        "cropH": cy2 - cy1,
    }
