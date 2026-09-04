#!/usr/bin/env python3
"""
Genera la mappa statica del footer (public/media/mappa-centri.{png,webp}).

Perché statica e non Leaflet/Google Maps: il sito è statico per scelta
(ARCHITETTURA.md, «niente maplibre»), e una mappa interattiva nel footer di
ogni pagina pagherebbe JS, tile e consensi su ogni visita. L'immagine si
rigenera SOLO quando cambia un indirizzo o nasce un centro:

    python3 scripts/genera_mappa_centri.py

Le coordinate si leggono dai frontmatter di src/content/centri/*.md (campo
`coordinate`), quindi la fonte resta il CMS. Dipendenze: Pillow. Le tile sono
CARTO dark_all (basate su OSM): l'attribuzione nel footer è obbligatoria, non
toglierla.
"""
import io
import math
import os
import re
import time
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CENTRI_DIR = os.path.join(ROOT, "src/content/centri")
OUT_PNG = os.path.join(ROOT, "public/media/mappa-centri.png")
OUT_WEBP = os.path.join(ROOT, "public/media/mappa-centri.webp")

ZOOM = 14
TILE = 256
W, H = 1700, 1100  # render 2x della dimensione in pagina (~850x550)
PAD_RATIO = 0.30  # margine attorno ai pin, in proporzione all'ampiezza
UA = {"User-Agent": "lume-nuovo-sito map generator (info@lumefitness.it)"}
# Tile standard OSM, scurite in post-produzione: quelle dark di CARTO hanno
# l'attribuzione ripetuta a filigrana su ogni tile, illeggibile in footer.
TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

BRAND = (196, 0, 66)  # #c40042


def leggi_centri():
    centri = []
    for nome_file in sorted(os.listdir(CENTRI_DIR)):
        if not nome_file.endswith(".md"):
            continue
        testo = open(os.path.join(CENTRI_DIR, nome_file), encoding="utf-8").read()
        fm = testo.split("---")[1]

        def campo(chiave):
            m = re.search(rf"^{chiave}:\s*(.+)$", fm, re.M)
            return m.group(1).strip().strip('"') if m else None

        lat = re.search(r"^\s+lat:\s*([-\d.]+)", fm, re.M)
        lng = re.search(r"^\s+lng:\s*([-\d.]+)", fm, re.M)
        if not (lat and lng):
            continue
        centri.append(
            {
                "nome": campo("nome"),
                "stato": campo("stato"),
                "ordine": int(campo("ordine") or 99),
                "lat": float(lat.group(1)),
                "lng": float(lng.group(1)),
            }
        )
    centri.sort(key=lambda c: c["ordine"])
    if len(centri) < 2:
        raise SystemExit("Trovati meno di 2 centri con coordinate: niente da disegnare")
    return centri


def proietta(lat, lng):
    """Mercator in pixel globali allo zoom scelto."""
    n = 2**ZOOM
    x = (lng + 180.0) / 360.0 * n * TILE
    r = math.radians(lat)
    y = (1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0 * n * TILE
    return x, y


def main():
    centri = leggi_centri()
    print("Centri:", ", ".join(f"{i+1}={c['nome']}" for i, c in enumerate(centri)))

    scale = None  # calcolata dopo il crop
    px = [proietta(c["lat"], c["lng"]) for c in centri]
    span_x = max(p[0] for p in px) - min(p[0] for p in px)
    span_y = max(p[1] for p in px) - min(p[1] for p in px)
    pad = PAD_RATIO * max(span_x, span_y)
    min_x = min(p[0] for p in px) - pad
    max_x = max(p[0] for p in px) + pad
    min_y = min(p[1] for p in px) - pad
    max_y = max(p[1] for p in px) + pad

    # Allarga il lato corto fino al rapporto W/H, così il crop non deforma.
    span_x = max_x - min_x
    span_y = max_y - min_y
    if span_x / span_y > W / H:
        extra = (span_x * H / W - span_y) / 2
        min_y -= extra
        max_y += extra
    else:
        extra = (span_y * W / H - span_x) / 2
        min_x -= extra
        max_x += extra

    tx0, tx1 = int(min_x // TILE), int(max_x // TILE)
    ty0, ty1 = int(min_y // TILE), int(max_y // TILE)
    print(f"Tile z{ZOOM}: x {tx0}..{tx1}, y {ty0}..{ty1} ({(tx1-tx0+1)*(ty1-ty0+1)} tile)")

    mosaico = Image.new("RGB", ((tx1 - tx0 + 1) * TILE, (ty1 - ty0 + 1) * TILE))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            req = urllib.request.Request(TILE_URL.format(z=ZOOM, x=tx, y=ty), headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                tile = Image.open(io.BytesIO(r.read())).convert("RGB")
            mosaico.paste(tile, ((tx - tx0) * TILE, (ty - ty0) * TILE))
            time.sleep(0.12)

    crop = (
        int(min_x - tx0 * TILE),
        int(min_y - ty0 * TILE),
        int(max_x - tx0 * TILE),
        int(max_y - ty0 * TILE),
    )
    img = mosaico.crop(crop).resize((W, H), Image.LANCZOS)
    scale = W / (max_x - min_x)

    # Inversione + colorize: da tile chiare OSM a mappa scura coerente col
    # footer, senza filigrane. I toni chiari del colorize sono le strade.
    from PIL import ImageOps

    grigia = ImageOps.invert(img.convert("L"))
    img = ImageOps.colorize(grigia, black=(13, 13, 15), white=(200, 200, 205))
    disegno = ImageDraw.Draw(img)
    font = None
    for candidato in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial Bold.ttf",
    ):
        try:
            font = ImageFont.truetype(candidato, 34)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    for i, c in enumerate(centri):
        gx, gy = proietta(c["lat"], c["lng"])
        x = (gx - min_x) * scale
        y = (gy - min_y) * scale
        r = 26
        aperto = c["stato"] == "aperto"
        if aperto:
            disegno.ellipse([x - r, y - r, x + r, y + r], fill=BRAND, outline=(255, 255, 255), width=5)
        else:
            # prevendita: pin vuoto, stesso numero — la legenda spiega lo stato
            disegno.ellipse([x - r, y - r, x + r, y + r], fill=(16, 16, 16), outline=BRAND, width=6)
        n = str(i + 1)
        bb = disegno.textbbox((0, 0), n, font=font)
        disegno.text(
            (x - (bb[2] - bb[0]) / 2 - bb[0], y - (bb[3] - bb[1]) / 2 - bb[1]),
            n,
            font=font,
            fill=(255, 255, 255),
        )

    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    img.save(OUT_PNG, optimize=True)
    img.save(OUT_WEBP, quality=84, method=6)
    print(f"Scritti {OUT_PNG} e {OUT_WEBP} ({os.path.getsize(OUT_WEBP)//1024} KB webp)")


if __name__ == "__main__":
    main()
