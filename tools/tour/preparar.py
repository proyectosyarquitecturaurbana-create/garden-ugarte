#!/usr/bin/env python3
"""Prepara una panorámica 360° (equirectangular 2:1) para el tour del showroom.

Uso:
  python3 tools/tour/preparar.py <panoramica.jpg> <id-escena> [--tour <id-tour>] [--cara 2048]

Genera en assets/tours/<id-tour>/<id-escena>/:
  f.jpg r.jpg b.jpg l.jpg u.jpg d.jpg  -> las 6 caras del cubo (frente, derecha, atrás, izquierda, arriba, abajo)
  mini.jpg                             -> miniatura para la tira de escenas (400x225)
y en tools/tour/_grillas/<id-tour>-<id-escena>.jpg una copia con grilla de yaw/pitch
para ubicar los puntos (yaw: -180 a 180, izquierda a derecha; pitch: 90 arriba, -90 abajo).

Por qué cubo: los celulares no cargan texturas de más de 4096 px de ancho; con 6 caras de
2048 px se ve con el doble de definición y cada archivo pesa menos de 1 MB (límite de InfinityFree: 10 MB).
"""
import sys, os, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def muestrear(src, x, y):
    """Bilineal con vuelta horizontal. src: HxWx3 float32; x,y en píxeles."""
    H, W, _ = src.shape
    x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    x0m = x0 % W; x1m = (x0 + 1) % W
    y0c = np.clip(y0, 0, H - 1); y1c = np.clip(y0 + 1, 0, H - 1)
    a = src[y0c, x0m]; b = src[y0c, x1m]; c = src[y1c, x0m]; d = src[y1c, x1m]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

# Direcciones por cara. Ejes: x = derecha, y = arriba, z = frente (yaw 0).
# u crece a la derecha de la imagen, v crece hacia abajo.
CARAS = {
    'f': lambda u, v: (u, -v, np.ones_like(u)),
    'r': lambda u, v: (np.ones_like(u), -v, -u),
    'b': lambda u, v: (-u, -v, -np.ones_like(u)),
    'l': lambda u, v: (-np.ones_like(u), -v, u),
    'u': lambda u, v: (u, np.ones_like(u), v),
    'd': lambda u, v: (u, -np.ones_like(u), -v),
}

def cara(src, nombre, n):
    t = (np.arange(n) + 0.5) / n * 2 - 1
    u, v = np.meshgrid(t, t)
    x, y, z = CARAS[nombre](u, v)
    yaw = np.arctan2(x, z)
    pitch = np.arctan2(y, np.hypot(x, z))
    H, W, _ = src.shape
    px = (yaw / (2 * np.pi) + 0.5) * W - 0.5
    py = (0.5 - pitch / np.pi) * H - 0.5
    return muestrear(src, px, py)

def grilla(img, destino):
    W = 2400; H = 1200
    g = img.resize((W, H), Image.LANCZOS).convert('RGB')
    d = ImageDraw.Draw(g, 'RGBA')
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except Exception: f = ImageFont.load_default()
    for yaw in range(-180, 181, 15):
        x = (yaw / 360 + 0.5) * W
        fuerte = yaw % 45 == 0
        d.line([(x, 0), (x, H)], fill=(255, 40, 40, 200 if fuerte else 90), width=2 if fuerte else 1)
        if fuerte:
            for yy in (8, H // 2 + 8, H - 32):
                d.rectangle([x + 3, yy, x + 70, yy + 24], fill=(0, 0, 0, 150)); d.text((x + 6, yy + 1), f'{yaw}°', fill='white', font=f)
    for p in range(-75, 76, 15):
        y = (0.5 - p / 180) * H
        d.line([(0, y), (W, y)], fill=(40, 160, 255, 200 if p % 45 == 0 else 90), width=2 if p == 0 else 1)
        d.rectangle([4, y + 2, 84, y + 26], fill=(0, 0, 0, 150)); d.text((8, y + 3), f'p {p}', fill=(150, 210, 255), font=f)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    g.save(destino, quality=85)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pano'); ap.add_argument('escena')
    ap.add_argument('--tour', default='ejemplo'); ap.add_argument('--cara', type=int, default=2048)
    ap.add_argument('--calidad', type=int, default=82)
    a = ap.parse_args()
    img = Image.open(a.pano).convert('RGB')
    W, H = img.size
    if abs(W / H - 2) > 0.02:
        sys.exit(f'La panorámica debe ser 2:1 (equirectangular). Esta mide {W}x{H}.')
    # trabajar a la resolución útil para no gastar memoria (4 px de fuente por px de cara alcanza)
    ancho = min(W, a.cara * 4)
    if ancho < W: img = img.resize((ancho, ancho // 2), Image.LANCZOS)
    src = np.asarray(img, dtype=np.float32)
    out = os.path.join(RAIZ, 'assets', 'tours', a.tour, a.escena)
    os.makedirs(out, exist_ok=True)
    pesos = []
    for n in CARAS:
        c = np.clip(cara(src, n, a.cara), 0, 255).astype(np.uint8)
        p = os.path.join(out, n + '.jpg')
        Image.fromarray(c).save(p, quality=a.calidad, optimize=True, progressive=True)
        pesos.append(os.path.getsize(p))
    # miniatura: centro de la panorámica (yaw 0), 16:9
    mw = img.width // 4; mh = int(mw * 9 / 16)
    cx, cy = img.width // 2, img.height // 2
    img.crop((cx - mw // 2, cy - mh // 2, cx + mw // 2, cy + mh // 2)).resize((400, 225), Image.LANCZOS).save(os.path.join(out, 'mini.jpg'), quality=80)
    gpath = os.path.join(RAIZ, 'tools', 'tour', '_grillas', f'{a.tour}-{a.escena}.jpg')
    grilla(img, gpath)
    print(f'ok {out}  caras {a.cara}px  máx {max(pesos)/1e6:.2f} MB  total {sum(pesos)/1e6:.2f} MB')
    print(f'grilla para ubicar puntos: {gpath}')

if __name__ == '__main__':
    main()
