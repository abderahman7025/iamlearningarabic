# -*- coding: utf-8 -*-
"""Detoure les dessins du client et les met aux noms attendus par la page.

Les fichiers arrivent en JPG sur fond blanc. Poses tels quels sur le degrade
pastel, on verrait un rectangle blanc. On enleve donc le fond — mais PAS tout
ce qui est blanc : le corps de la licorne l'est aussi. Le fond se reconnait a
ceci qu'il TOUCHE LE BORD : on part des quatre cotes et on n'avance que dans
le blanc. Ce qui est enferme dans le dessin reste opaque.

Les bords sont adoucis : la ou le pixel n'est pas tout a fait blanc, il garde
une transparence partielle, sinon le contour ressort en escalier.

Usage :  python3 outils/detoure.py
"""
import io
import os
import sys
from collections import deque

from PIL import Image

SOURCE = os.path.join(os.path.expanduser('~'), 'Downloads')
CIBLE = os.path.join(os.path.dirname(__file__), '..', 'public', 'images')

# fichier du client -> nom attendu par la page
PAIRES = [
    ('licorne avec fille voilée et couronne gauche à droite.jpg', 'licorne-couronne-gd.png'),
    ('licorne avec fille voilée et couronne droite à gauche.jpg', 'licorne-couronne-dg.png'),
    ('licorne avec fille voilée gauche à droite.jpg',             'licorne-fille.png'),
    ('licorne avec fille voilée droite à gauche.jpg',             'licorne-fille-dg.png'),
    ('licorne seule gauche à droite.jpg',                         'licorne-seule-gd.png'),
    ('licorne seule droite à gauche.jpg',                         'licorne-seule-dg.png'),
    ('fille voilée seule couronne gauche à droite.jpg',           'fille-couronne.png'),
    ('fille voilée seule couronne droite à gauche.jpg',           'fille-couronne-dg.png'),
    ('fille voilée seule gauche à droite.jpg',                    'fille-seule.png'),
    ('fille voilée seule droite à gauche.jpg',                    'fille-seule-dg.png'),
]

SEUIL_FOND = 238      # au-dessus, le pixel peut appartenir au fond
SEUIL_PLEIN = 205     # en dessous, le pixel est franchement de la couleur


def detoure(chemin):
    im = Image.open(chemin).convert('RGB')
    w, h = im.size
    px = im.load()

    def clair(x, y):
        r, g, b = px[x, y]
        return r >= SEUIL_FOND and g >= SEUIL_FOND and b >= SEUIL_FOND

    # ── le fond : ce qui touche le bord et reste clair ──
    fond = bytearray(w * h)
    file = deque()
    for x in range(w):
        for y in (0, h - 1):
            if clair(x, y) and not fond[y * w + x]:
                fond[y * w + x] = 1
                file.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if clair(x, y) and not fond[y * w + x]:
                fond[y * w + x] = 1
                file.append((x, y))
    while file:
        x, y = file.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not fond[ny * w + nx] and clair(nx, ny):
                fond[ny * w + nx] = 1
                file.append((nx, ny))

    # ── l'alpha : 0 sur le fond, adouci sur son pourtour ──
    sortie = Image.new('RGBA', (w, h))
    sp = sortie.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if fond[y * w + x]:
                sp[x, y] = (r, g, b, 0)
                continue
            # un pixel du dessin qui touche le fond et qui tire vers le blanc
            # n'est pas franc : c'est le lissage du bord, on le rend d'autant
            clarte = min(r, g, b)
            a = 255
            if clarte > SEUIL_PLEIN:
                bord = any(
                    0 <= x + dx < w and 0 <= y + dy < h and fond[(y + dy) * w + (x + dx)]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                                   (1, 1), (1, -1), (-1, 1), (-1, -1))
                )
                if bord:
                    a = int(255 * (SEUIL_FOND - clarte) / float(SEUIL_FOND - SEUIL_PLEIN))
                    a = max(0, min(255, a))
            sp[x, y] = (r, g, b, a)

    # ── on recadre sur le dessin ──
    boite = sortie.getbbox()
    if boite:
        sortie = sortie.crop(boite)
    return sortie


def main():
    faits, manquants = [], []
    for src, dst in PAIRES:
        chemin = os.path.join(SOURCE, src)
        if not os.path.exists(chemin):
            manquants.append(src)
            continue
        im = detoure(chemin)
        sortie = os.path.join(CIBLE, dst)
        im.save(sortie, 'PNG', optimize=True)
        faits.append('%-26s %4dx%-4d %6d Ko' % (dst, im.size[0], im.size[1],
                                                os.path.getsize(sortie) // 1024))
    for l in faits:
        print(l)
    if manquants:
        print('INTROUVABLES :')
        for m in manquants:
            print('  ' + m)
        sys.exit(1)
    print('%d images detourees' % len(faits))


main()
