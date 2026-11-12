"""Draw the PWA icons into public/."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).resolve().parent.parent / 'public'
BG, FG = (234, 88, 12), (255, 255, 255)


def draw(size, pad):
    im = Image.new('RGB', (size, size), BG)
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', int(size * (0.42 - pad)))
    d.text((size / 2, size / 2), 'NL', fill=FG, font=font, anchor='mm')
    return im


for name, size, pad in (('pwa-192x192.png', 192, 0), ('pwa-512x512.png', 512, 0),
                        ('maskable-icon-512x512.png', 512, 0.1), ('apple-touch-icon-180x180.png', 180, 0)):
    draw(size, pad).save(out / name)
draw(32, 0).save(out / 'favicon.png')
