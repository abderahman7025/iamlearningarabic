# -*- coding: utf-8 -*-
"""Detourer un dessin du client, et le poser dans un cadre commun.

Deux outils s'en servent : `mots-lettres.py` (les dessins des mots des trente
lettres) et `animaux-iles.py` (les onze animaux de la carte des 3-5 ans).

POURQUOI PAS LA METHODE DE `detoure.py`. Partir du bord et n'avancer que dans
le clair suppose que le sujet est plus fonce que le fond. C'est faux ici :
l'aigle, la colombe, le mouton, le cheval — et le front du panda — sont
BLANCS, du meme blanc que le fond, a quelques niveaux pres. Le remplissage
passait par la moindre brisure du contour et leur mangeait la tete. C'est ce
qui est arrive au panda de l'ile djim-ha-kha, que le client a vu.

ON PREND DONC LE PROBLEME PAR LA SILHOUETTE :

  1. le sujet, c'est tout ce qui n'est PAS clair — les contours, les couleurs,
     l'ombre portee ;
  2. on FERME cette forme (dilatation puis erosion) : les petites brisures du
     contour se recollent ;
  3. on BOUCHE SES TROUS. Un trou, c'est une region qui ne rejoint pas le
     bord : donc l'interieur du dessin, blanc compris. Un creux ouvert sur
     l'exterieur — entre deux oreilles — rejoint le bord, reste transparent,
     et c'est ce qu'on veut ;
  4. on ne garde que LA TACHE QUI PASSE PAR LE CENTRE : le seuil laisse
     passer quelques poussieres du fond, elles n'ont rien a faire la ;
  5. le bord garde une transparence progressive, sinon il ressort en escalier.

Le travail lourd se fait au QUART de la taille : a 1264 px le remplissage
prendrait des minutes en Python, et les trous a boucher sont larges.

LE CADRE EST COMMUN, et c'est essentiel. Une vignette est dimensionnee par sa
LARGEUR : a largeur egale, un dessin etroit s'affiche beaucoup plus haut qu'un
dessin large. Mettre les fichiers a la meme hauteur ne suffit donc pas — c'est
le CADRE qui doit etre le meme, l'encre a hauteur fixe et centree dedans.
"""
import numpy as np
from PIL import Image

CLAIR = 244        # au-dessus, le pixel peut appartenir au fond
OPAQUE = 234       # en dessous, le pixel est franchement du dessin
REDUC = 4          # le remplissage se fait au quart
FERME = 2          # rayon de fermeture, au quart (soit 8 px en vraie taille)


def _dilate(m, n=1):
    """Dilatation binaire en croix, n fois."""
    for _ in range(n):
        d = m.copy()
        d[1:, :] |= m[:-1, :]
        d[:-1, :] |= m[1:, :]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        m = d
    return m


def _erode(m, n=1):
    return ~_dilate(~m, n)


def _propage(depart, passable):
    """Ce qui se rejoint depuis `depart` en restant dans `passable`."""
    vu = depart & passable
    while True:
        neuf = _dilate(vu) & passable
        if neuf.sum() == vu.sum():
            return vu
        vu = neuf


def _depuis_le_bord(passable):
    d = np.zeros_like(passable)
    d[0, :] = d[-1, :] = True
    d[:, 0] = d[:, -1] = True
    return _propage(d, passable)


def silhouette(a):
    """Le masque plein du dessin, fond retire."""
    h, w = a.shape[:2]
    sujet = a.min(axis=2) < CLAIR
    # au quart, en gardant le sujet : un contour fin doit survivre
    hq, wq = h // REDUC, w // REDUC
    petit = sujet[:hq * REDUC, :wq * REDUC].reshape(hq, REDUC, wq, REDUC).any(axis=(1, 3))
    ferme = _erode(_dilate(petit, FERME), FERME)
    plein = ~_depuis_le_bord(~ferme)
    # Le dessin est UNE tache, et elle passe par le centre.
    coeur = np.zeros_like(plein)
    coeur[hq // 2 - hq // 8: hq // 2 + hq // 8,
          wq // 2 - wq // 8: wq // 2 + wq // 8] = True
    principal = _propage(coeur, plein)
    if principal.any():
        plein = principal
    grand = np.kron(plein, np.ones((REDUC, REDUC), dtype=bool))
    if grand.shape != (h, w):
        g = np.zeros((h, w), dtype=bool)
        g[:grand.shape[0], :grand.shape[1]] = grand
        grand = g
    return grand


def detoure(im):
    """Rend l'image avec un canal alpha.

    Une image DEJA transparente n'est pas retouchee : repasser dessus ne
    ferait que grignoter ses contours.
    """
    if im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 250:
        return im
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    plein = silhouette(a)
    mn = a.min(axis=2)
    # A l'interieur, tout est opaque — blanc compris. Sur le bord de la
    # silhouette, la clarte donne une transparence progressive.
    dedans = _erode(plein, 3)
    rampe = np.clip((CLAIR - mn) * (255.0 / (CLAIR - OPAQUE)), 0, 255)
    alpha = np.where(dedans, 255, np.where(plein, rampe, 0)).astype(np.uint8)
    return Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')


def cadre(im, hauteur, cadre_l, cadre_h=None):
    """Encre a `hauteur`, centree dans un cadre `cadre_l` x `cadre_h`."""
    cadre_h = cadre_h or hauteur
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    b = im.getchannel('A').getbbox()
    if b:
        im = im.crop(b)
    l, h = im.size
    k = float(hauteur) / h
    l2 = max(1, int(round(l * k)))
    im = im.resize((l2, hauteur), Image.LANCZOS)
    if l2 > cadre_l:                       # on ne rogne jamais
        k2 = float(cadre_l) / l2
        im = im.resize((cadre_l, max(1, int(round(hauteur * k2)))), Image.LANCZOS)
    fond = Image.new('RGBA', (cadre_l, cadre_h), (0, 0, 0, 0))
    fond.paste(im, ((cadre_l - im.size[0]) // 2, (cadre_h - im.size[1]) // 2), im)
    return fond


def enregistre(im, chemin):
    """Ces dessins sont plats : 255 teintes suffisent, et la palette divise le
       poids par cinq. FASTOCTREE garde le canal alpha."""
    im.quantize(colors=255, method=Image.FASTOCTREE).save(chemin, 'PNG', optimize=True)
