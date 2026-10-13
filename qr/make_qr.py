#!/usr/bin/env python3
"""
CRYA CREW — генератор QR-карточек для Stories (1080x1920).

Использование:
    python3 make_qr.py --name "Демид" --url "https://t.me/username_demid" --out card-demid.png
    python3 make_qr.py --all          # обе карточки с никами по умолчанию

Зависимости:  pip install qrcode pillow
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import qrcode

# ---------- Настройки карточки ----------
W, H = 1080, 1920
BG = (11, 11, 12)
FG = (242, 240, 238)
MUTED = (156, 152, 143)
ACCENT = (255, 61, 46)
WHITE = (255, 255, 255)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
FONT_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"
FONT_REG = FONT_DIR / "DejaVuSans.ttf"

TITLE = "ЧТОБЫ НАПИСАТЬ В ТЕЛЕГРАМ,"
SUBTITLE = "ОТСКАНИРУЙТЕ QR-КОД"
BOTTOM_NOTE = "Видеопродакшен полного цикла"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Загружает TTF с поддержкой кириллицы (DejaVu)."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, f) -> tuple:
    box = draw.textbbox((0, 0), text, font=f)
    return box[2] - box[0], box[3] - box[1]


def draw_centered(draw, text, y, f, fill, width=W):
    w, _ = text_size(draw, text, f)
    draw.text(((width - w) / 2, y), text, font=f, fill=fill)


def wrap(draw, text, f, max_width):
    """Разбивает текст на строки по ширине."""
    words, lines, line = text.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if text_size(draw, candidate, f)[0] <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def make_qr_image(url: str, size: int) -> Image.Image:
    """Чёрно-белый QR без лишних полей, увеличенный до size."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    return img.resize((size, size), Image.NEAREST)


def build_card(name: str, url: str, out: Path) -> Path:
    """Собирает одну вертикальную карточку с QR и подписями."""
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    f_logo = font(FONT_BOLD, 46)
    f_crew = font(FONT_REG, 34)
    f_title = font(FONT_BOLD, 62)
    f_sub = font(FONT_REG, 38)
    f_name = font(FONT_BOLD, 78)
    f_link = font(FONT_REG, 34)
    f_note = font(FONT_REG, 28)

    # логотип
    draw.text((90, 92), "CRYA", font=f_logo, fill=FG)
    draw.text((228, 108), "CREW", font=f_crew, fill=ACCENT)

    # акцентная линия
    draw.rectangle([90, 190, 210, 195], fill=ACCENT)

    # заголовок и подзаголовок
    y = 300
    for line in wrap(draw, TITLE, f_title, W - 180):
        draw.text((90, y), line, font=f_title, fill=FG)
        y += 78
    for line in wrap(draw, SUBTITLE, f_sub, W - 180):
        draw.text((90, y), line, font=f_sub, fill=MUTED)
        y += 52

    # белая подложка + QR
    box, bx, by = 780, (W - 780) // 2, 680
    draw.rounded_rectangle([bx, by, bx + box, by + box], radius=36, fill=WHITE)
    qr = make_qr_image(url, box - 100)
    img.paste(qr, (bx + 50, by + 50))

    # имя, ссылка, подпись
    draw_centered(draw, name.upper(), by + box + 110, f_name, FG)
    draw_centered(draw, url.replace("https://", "").replace("http://", ""), by + box + 210, f_link, ACCENT)
    draw_centered(draw, BOTTOM_NOTE, H - 140, f_note, MUTED)

    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="QR-карточки CRYA CREW 1080x1920")
    parser.add_argument("--name", help="имя на карточке")
    parser.add_argument("--url", help="ссылка Telegram")
    parser.add_argument("--out", help="путь для сохранения PNG")
    parser.add_argument("--all", action="store_true", help="собрать обе карточки по умолчанию")
    args = parser.parse_args()

    if args.all or not args.url:
        default = [
            ("Демид", "https://t.me/username_demid", "assets/img/qr-demid.png"),
            ("Гаянэ", "https://t.me/username_gayane", "assets/img/qr-gayane.png"),
        ]
        for name, url, path in default:
            saved = build_card(name, url, Path(path))
            print(f"готово: {saved} ({name})")
        print("\nВнимание: это ДЕМО-ссылки. Замените ники на реальные и запустите снова.")
        return

    name = args.name or "CRYA CREW"
    out = Path(args.out or "card-qr.png")
    saved = build_card(name, args.url, out)
    print(f"готово: {saved} ({name})")


if __name__ == "__main__":
    main()
