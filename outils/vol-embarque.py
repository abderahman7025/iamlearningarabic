# -*- coding: utf-8 -*-
"""Les images du vol embarque (v3.7.1), generees sur le Canva du client.

  sources-vol/licorne-dos.png -> public/images/vol-licorne-dos.webp
  sources-vol/aile.png        -> public/images/vol-aile.webp
  sources-vol/hublot.png      -> public/images/vol-hublot.webp

Le fond blanc est retire par `detourage.detoure` (methode par silhouette :
la licorne est blanche, comme le fond). Le hublot a en plus sa VITRE a
vider : le blanc relie au centre devient transparent — c'est par la qu'on
voit l'espace.

  python outils/vol-embarque.py
"""
import os
import sys
import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import detourage as D  # noqa: E402

SRC = os.path.join(ICI, 'sources-vol')
DST = os.path.join(ICI, '..', 'public', 'images')


def rogne(im):
    b = im.getchannel('A').getbbox()
    return im.crop(b) if b else im


def vide_la_vitre(im):
    a = np.asarray(im).copy()
    rgb = a[:, :, :3].astype(np.int16)
    h, w = rgb.shape[:2]
    clair = (rgb.min(axis=2) > 205) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 30)
    r = D.REDUC
    hq, wq = h // r, w // r
    petit = clair[:hq * r, :wq * r].reshape(hq, r, wq, r).all(axis=(1, 3))
    coeur = np.zeros_like(petit)
    coeur[hq // 2 - 3:hq // 2 + 3, wq // 2 - 3:wq // 2 + 3] = True
    vitre = D._propage(coeur, petit)
    vitre = D._dilate(vitre, 1)
    grand = np.kron(vitre, np.ones((r, r), dtype=bool))
    g = np.zeros((h, w), dtype=bool)
    g[:grand.shape[0], :grand.shape[1]] = grand
    a[:, :, 3] = np.where(g, 0, a[:, :, 3])
    return Image.fromarray(a, 'RGBA')


def sauve(im, nom, largeur):
    if im.size[0] > largeur:
        im = im.resize((largeur, int(round(im.size[1] * largeur / im.size[0]))), Image.LANCZOS)
    chemin = os.path.join(DST, nom)
    im.save(chemin, 'WEBP', quality=88, method=6)
    print(nom, im.size, os.path.getsize(chemin) // 1024, 'Ko')


def main():
    tete = rogne(D.detoure(Image.open(os.path.join(SRC, 'licorne-dos.png'))))
    sauve(tete, 'vol-licorne-dos.webp', 900)
    # L'aile est presque aussi blanche que le fond (253-255) : seuil serre,
    # sinon le bord de ses plumes part avec le fond.
    D.CLAIR, D.OPAQUE = 251, 242
    aile = rogne(D.detoure(Image.open(os.path.join(SRC, 'aile.png'))))
    D.CLAIR, D.OPAQUE = 244, 234
    sauve(aile, 'vol-aile.webp', 900)
    # L'aile droite : la meme, retournee (un `scale:-1` CSS deplacerait le
    # pivot du battement).
    sauve(aile.transpose(Image.FLIP_LEFT_RIGHT), 'vol-aile-d.webp', 900)
    hub = D.detoure(Image.open(os.path.join(SRC, 'hublot.png')))
    hub = rogne(vide_la_vitre(hub))
    sauve(hub, 'vol-hublot.webp', 1000)


if __name__ == '__main__':
    main()
