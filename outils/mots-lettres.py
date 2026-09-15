# -*- coding: utf-8 -*-
"""Les dessins des MOTS des trente lettres, pour les cours des 3-5 ans.

Ils arrivent dans les telechargements sous « 1.png » a « 35.png », a pres de
deux megaoctets piece, sur fond blanc. Le detourage et le cadre commun sont
ceux de `detourage.py` — lire son en-tete, la methode y est expliquee.

Ils servent a DEUX endroits dans l'application : la vignette du choix de la
lettre, et surtout le TRACE, ou le dessin se pose la ou commence le geste,
suit le doigt, et saute au depart du morceau suivant des qu'il faut lever la
main.

Usage :  python outils/mots-lettres.py
         python outils/mots-lettres.py --source ~/Downloads
"""
import argparse
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detourage import cadre, detoure, enregistre       # noqa: E402

CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

# Le dessin mene le doigt a environ 70 px sur le trace, et tient dans une
# vignette de 104 px : 300 couvre largement les ecrans fins.
HAUTEUR = 300
CADRE_L = 330      # de quoi loger le plus large a cette hauteur

# numero du telechargement -> nom de la bete.  Le nom, pas la lettre : c'est
# la table `MOT_IMAGE` de `app.html` qui dit quelle lettre prend quel dessin,
# et deux lettres peuvent partager le meme — les deux chattes, ou la rose, qui
# sert a wāw (warda) comme a rā (rawḍa).
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default=os.path.join(os.path.expanduser('~'), 'Downloads'))
    args = ap.parse_args()
    src = os.path.expanduser(args.source)

    manquants, total = [], 0
    for num, nom in PAIRES:
        f = os.path.join(src, '%d.png' % num)
        if not os.path.exists(f):
            manquants.append(f)
            continue
        im = cadre(detoure(Image.open(f)), HAUTEUR, CADRE_L)
        out = os.path.join(CIBLE, 'mot-' + nom + '.png')
        enregistre(im, out)
        total += os.path.getsize(out)
        print('%2d.png -> %-22s %3d Ko'
              % (num, 'mot-' + nom + '.png', os.path.getsize(out) // 1024))
    print('total : %d Ko' % (total // 1024))
    if manquants:
        print('INTROUVABLES :')
        for m in manquants:
            print('   ', m)
        sys.exit(1)


if __name__ == '__main__':
    main()
