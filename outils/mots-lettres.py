# -*- coding: utf-8 -*-
"""Prepare les dessins du client pour les cours de lettres des 3-5 ans.

Ils arrivent dans les telechargements sous « 1.png » a « 35.png », a pres de
deux megaoctets piece, sur fond blanc.

POURQUOI ON NE DETOURE PAS COMME `detoure.py`. Sa methode — partir du bord et
n'avancer que dans le clair — suppose que le sujet est plus fonce que le fond.
Ici c'est faux : l'aigle, la colombe, le mouton et le cheval sont BLANCS, du
meme blanc que le fond, a 255 pres. Le remplissage passait par la moindre
brisure du contour et leur mangeait la tete.

On prend donc le probleme par la SILHOUETTE :

  1. le sujet, c'est tout ce qui n'est PAS clair — les contours et les
     couleurs ;
  2. on FERME cette forme (dilatation puis erosion) : les petites brisures du
     contour se recollent ;
  3. on BOUCHE SES TROUS — un trou, c'est une region qui ne rejoint pas le
     bord, donc l'interieur du dessin, blanc compris. Un creux ouvert sur
     l'exterieur (entre deux oreilles) rejoint le bord : il reste
     transparent, et c'est ce qu'on veut ;
  4. le bord garde une transparence progressive, sinon il ressort en
     escalier.

Le travail lourd se fait au QUART de la taille : a 1264 px, le remplissage
prendrait des minutes en Python, et les trous a boucher sont larges.

DEUX AUTRES REGLES, et elles comptent :

  - TOUS LES FICHIERS ONT LE MEME CADRE, et dans ce cadre l'encre fait
    toujours la meme hauteur, centree. C'est la lecon des onze animaux des
    iles : une vignette est dimensionnee par sa LARGEUR, donc a largeur egale
    un dessin etroit s'affiche beaucoup plus haut qu'un dessin large. Mettre
    les fichiers a la meme hauteur ne suffit pas : c'est le CADRE qui doit
    etre le meme.
  - 255 teintes suffisent a ces dessins plats, et la palette divise le poids
    par cinq. FASTOCTREE garde le canal alpha.

Usage :  python outils/mots-lettres.py
"""
import os
import sys

import numpy as np
from PIL import Image

SOURCE = os.path.join(os.path.expanduser('~'), 'Downloads')
CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

HAUTEUR = 300      # l'encre, dans chaque fichier
CADRE_H = 300
CADRE_L = 330      # de quoi loger le plus large a cette hauteur

CLAIR = 244        # au-dessus, le pixel peut appartenir au fond
OPAQUE = 234       # en dessous, le pixel est franchement du dessin
REDUC = 4          # le remplissage se fait au quart
FERME = 2          # rayon de fermeture, au quart (soit 8 px en vraie taille)

# numero du telechargement -> nom de la bete.  Le nom, pas la lettre : c'est
# la table de `app.html` qui dit quelle lettre prend quel dessin, et deux
# lettres peuvent partager le meme (les deux chattes, par exemple).
PAIRES = [
    (1,  'ours'),        (2,  'loup'),       (3,  'arbre'),
    (4,  'aigle'),       (5,  'grenouille'), (6,  'paon'),
    (7,  'cigogne'),     (8,  'banane'),     (9,  'tigre'),
    (10, 'chatte'),      (11, 'pomme'),      (12, 'gazelle'),
    (13, 'oiseau'),      (14, 'gorille'),    (15, 'papillon'),
    (16, 'chat'),        (17, 'chien'),      (18, 'panda'),
    (19, 'renard'),      (20, 'grenouille2'),(21, 'hibou'),
    (22, 'elephant'),    (23, 'girafe'),     (24, 'tortue'),
    (25, 'lion'),        (26, 'rose'),       (27, 'colombe'),
    (28, 'vache'),       (29, 'vipere'),     (30, 'serpent'),
    (31, 'chameau'),     (32, 'cheval'),     (33, 'mouton'),
    (34, 'poisson'),     (35, 'crocodile'),
]


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
    """Le masque plein du dessin, fond retire, au quart de la taille."""
    h, w = a.shape[:2]
    mn = a.min(axis=2)
    sujet = mn < CLAIR
    # au quart, en gardant le sujet : un contour fin doit survivre
    hq, wq = h // REDUC, w // REDUC
    petit = sujet[:hq * REDUC, :wq * REDUC].reshape(hq, REDUC, wq, REDUC).any(axis=(1, 3))
    # on recolle les brisures du contour, puis on bouche les trous
    ferme = _erode(_dilate(petit, FERME), FERME)
    dehors = _depuis_le_bord(~ferme)
    plein = ~dehors
    # Le dessin est UNE tache, et elle passe par le centre. Ce qui flotte
    # ailleurs est une poussiere du fond — le seuil laisse passer quelques
    # pixels un peu sombres — et n'a rien a faire dans le decoupage.
    hq2, wq2 = plein.shape
    coeur = np.zeros_like(plein)
    coeur[hq2 // 2 - hq2 // 8: hq2 // 2 + hq2 // 8,
          wq2 // 2 - wq2 // 8: wq2 // 2 + wq2 // 8] = True
    principal = _propage(coeur, plein)
    if principal.any():
        plein = principal
    # retour a la vraie taille
    grand = np.kron(plein, np.ones((REDUC, REDUC), dtype=bool))
    if grand.shape != (h, w):
        g = np.zeros((h, w), dtype=bool)
        g[:grand.shape[0], :grand.shape[1]] = grand
        grand = g
    return grand


def detoure(im):
    """Rend l'image avec un canal alpha. Deja transparente : on n'y touche pas."""
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
    out = np.dstack([a.astype(np.uint8), alpha])
    return Image.fromarray(out, 'RGBA')


def cadre(im):
    """Encre a `HAUTEUR`, centree dans un cadre commun."""
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    b = im.getchannel('A').getbbox()
    if b:
        im = im.crop(b)
    l, h = im.size
    k = float(HAUTEUR) / h
    l2 = max(1, int(round(l * k)))
    im = im.resize((l2, HAUTEUR), Image.LANCZOS)
    if l2 > CADRE_L:                       # jamais vu, mais on ne rogne pas
        k2 = float(CADRE_L) / l2
        im = im.resize((CADRE_L, max(1, int(round(HAUTEUR * k2)))), Image.LANCZOS)
    fond = Image.new('RGBA', (CADRE_L, CADRE_H), (0, 0, 0, 0))
    fond.paste(im, ((CADRE_L - im.size[0]) // 2, (CADRE_H - im.size[1]) // 2), im)
    return fond


def main():
    manquants, total = [], 0
    for num, nom in PAIRES:
        src = os.path.join(SOURCE, '%d.png' % num)
        if not os.path.exists(src):
            manquants.append(src)
            continue
        im = cadre(detoure(Image.open(src)))
        out = os.path.join(CIBLE, 'mot-' + nom + '.png')
        im.quantize(colors=255, method=Image.FASTOCTREE).save(out, 'PNG', optimize=True)
        p = os.path.getsize(out)
        total += p
        print('%2d.png -> %-22s %3d Ko' % (num, 'mot-' + nom + '.png', p // 1024))
    print('total : %d Ko' % (total // 1024))
    if manquants:
        print('INTROUVABLES :')
        for m in manquants:
            print('   ', m)
        sys.exit(1)


if __name__ == '__main__':
    main()
