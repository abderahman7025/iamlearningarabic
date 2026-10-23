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


if __name__ == '__main__' and len(sys.argv) == 1:
    main()


# ── v3.7.8 — animaux 3D des mondes et cockpit de la fusee ─────────────────
SRC2 = os.path.join(ICI, 'sources-canva')


def animaux():
    for src, nom, larg in [('ours-grand', 'bete3d-ours.webp', 640),
                           ('ourson', 'bete3d-ourson.webp', 480),
                           ('chienchat-a', 'bete3d-chienchat-a.webp', 700),
                           ('chienchat-b', 'bete3d-chienchat-b.webp', 700)]:
        im = rogne(D.detoure(Image.open(os.path.join(SRC2, src + '.png'))))
        sauve(im, nom, larg)


def cockpit():
    """La vitre verte devient transparente ; on mesure le cercle (centre et
    rayon, en fraction de l'image) pour y caler l'espace."""
    for src, nom in [('cockpit-portrait', 'vol-cockpit-portrait.webp'),
                     ('cockpit-paysage', 'vol-cockpit-paysage.webp')]:
        a = np.asarray(Image.open(os.path.join(SRC2, src + '.png')).convert('RGB')).astype(np.int16)
        r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
        vert = (g - np.maximum(r, b))
        h, w = vert.shape
        # Le hublot seulement : le radar et des boutons sont verts aussi. On
        # mesure le rond dans le haut de l'image (le hublot est en haut, le
        # tableau de bord en bas), puis on ne vide que ce disque.
        m = vert > 80
        m[int(h * 0.62):, :] = False
        ys, xs = np.nonzero(m)
        cx, cy = xs.mean() / w, ys.mean() / h
        rr = np.sqrt(m.sum() / np.pi)
        yy, xx = np.mgrid[0:h, 0:w]
        disque = (xx - cx * w) ** 2 + (yy - cy * h) ** 2 <= (rr * 1.06) ** 2
        alpha = np.where(disque, np.clip(255 - (vert - 40) * 4, 0, 255), 255).astype(np.uint8)
        rgb = a.copy()
        rgb[:, :, 1] = np.where(disque & (vert > 20), np.maximum(r, b), g)
        im = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), 'RGBA')
        print(nom, 'centre', round(cx, 4), round(cy, 4), 'rayon/largeur', round(rr / w, 4), 'rayon/hauteur', round(rr / h, 4))
        im.save(os.path.join(DST, nom), 'WEBP', quality=86, method=6)
        print(nom, im.size, os.path.getsize(os.path.join(DST, nom)) // 1024, 'Ko')


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'v378':
    animaux()
    cockpit()


# ── v3.7.9 — planètes 3D (carte du garçon) et décors des planètes ─────────
PLANETES = ['soleil', 'mercure', 'venus', 'terre', 'lune', 'mars', 'jupiter',
            'saturne', 'uranus', 'neptune', 'pluton', 'comete']


def planetes():
    """Détoure chaque astre, le pose dans un carré de 600 px (diamètre 62 %
    du carré, 92 % de large pour les astres à anneaux ou à queue) et
    mesure son sommet (première ligne d'encre dense) pour `_HAB.sommets`."""
    S = 600
    som = {}
    for n in PLANETES:
        im = D.detoure(Image.open(os.path.join(SRC2, 'planetes', n + '.png')))
        if n in ('saturne', 'uranus'):
            # le blanc enfermé entre l'anneau et la planète est du FOND
            t = np.asarray(im).copy()
            blanc = t[:, :, :3].min(axis=2) >= 244
            t[:, :, 3] = np.where(blanc, 0, t[:, :, 3])
            im = Image.fromarray(t, 'RGBA')
        im = rogne(im)
        if n == 'comete':
            comete(im, S, som)
            continue
        w, h = im.size
        large = n in ('saturne', 'uranus', 'comete') or w > h * 1.15
        k = (S * 0.92 / w) if large else (S * 0.62 / max(w, h))
        if h * k > S * 0.92:
            k = S * 0.92 / h
        im = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
        fond = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        fond.paste(im, ((S - im.size[0]) // 2, (S - im.size[1]) // 2), im)
        a = np.asarray(fond.getchannel('A')) >= 150
        larg = a.sum(axis=1)
        seuil = 0.22 * larg.max()
        top = int(np.argmax(larg >= seuil))
        som[n] = round(top / S, 3)
        fond.save(os.path.join(DST, 'astre-' + n + '.webp'), 'WEBP', quality=88, method=6)
    print('sommets', som)


def comete(im, S, som):
    """La fusée se pose au CENTRE de l'image : on y met le NOYAU, et la queue
    part vers le haut à droite en s'effaçant au bord du carré."""
    t = np.asarray(im).astype(np.float32)
    al = t[:, :, 3] >= 150
    ys, xs = np.nonzero(al)
    h, w = al.shape
    # le noyau : le coin bas-gauche de l'encre
    i = np.argmax(ys - xs)
    r = 0.06 * np.hypot(w, h)
    cx, cy = xs[i] + r * 0.75, ys[i] - r * 0.75
    k = (S * 0.30) / (2 * r)          # noyau = 30 % du carré
    im2 = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
    fond = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ox, oy = int(S / 2 - cx * k), int(S * 0.56 - cy * k)
    fond.paste(im2, (ox, oy), im2)
    a = np.asarray(fond).copy().astype(np.float32)
    yy, xx = np.mgrid[0:S, 0:S]
    d = np.hypot(xx - S / 2, yy - S * 0.56)
    fondu = np.clip((S * 0.48 - d) / (S * 0.16), 0, 1)
    a[:, :, 3] *= np.maximum(fondu, (d < S * 0.2))
    fond = Image.fromarray(a.astype(np.uint8), 'RGBA')
    som['comete'] = round((S * 0.56 - r * k) / S, 3)
    fond.save(os.path.join(DST, 'astre-comete.webp'), 'WEBP', quality=88, method=6)


def decors():
    for n in PLANETES:
        for f in ('large', 'haut'):
            im = Image.open(os.path.join(SRC2, 'decors', n + '-' + f + '.png')).convert('RGB')
            lim = 1920
            if max(im.size) > lim:
                k = lim / max(im.size)
                im = im.resize((int(im.size[0] * k), int(im.size[1] * k)), Image.LANCZOS)
            p = os.path.join(DST, 'monde3d-' + n + '-' + f + '.webp')
            im.save(p, 'WEBP', quality=80, method=6)
    print('decors ok')


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'v379':
    planetes()
    if len(sys.argv) < 3:
        decors()
