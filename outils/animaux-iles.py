# -*- coding: utf-8 -*-
"""Les onze animaux de la carte des 3-5 ans, depuis les dessins du client.

Ils sont arrives dans un ZIP des telechargements, « 1.png » a « 11.png ». Le
client ayant depuis retelecharge un autre lot sous les MEMES NOMS, la source
est prise dans le zip et non dans le dossier : `--source` accepte l'un ou
l'autre.

Le detourage est celui de `detourage.py` — par la silhouette. La premiere
version passait par `detoure.py`, qui part du bord et n'avance que dans le
clair : le FRONT BLANC DU PANDA, du meme blanc que le fond, s'est fait manger
entre les deux oreilles. Le client l'a vu sur l'ile djim-ha-kha.

Usage :
    python outils/animaux-iles.py
    python outils/animaux-iles.py --source "~/Downloads/mon-lot.zip"
    python outils/animaux-iles.py --source ~/Downloads
"""
import argparse
import os
import shutil
import sys
import tempfile
import zipfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detourage import cadre, detoure, enregistre       # noqa: E402

CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

# Le grand cote des vignettes est de 152 px a l'ecran, la recompense monte a
# 240 : 440 couvre le double, donc les ecrans fins, sans peser.
HAUTEUR = 440
CADRE_L = 470      # de quoi loger le poisson, le plus large a cette hauteur

ZIP_PAR_DEFAUT = os.path.join(os.path.expanduser('~'), 'Downloads',
                              'Illustration d’éléphant enfant.zip')

PAIRES = [
    (4,  'lion'),       (1,  'elephant'), (2,  'girafe'),
    (6,  'panda'),      (7,  'renard'),   (8,  'grenouille'),
    (9,  'hibou'),      (10, 'poisson'),  (11, 'abeille'),
    (5,  'pingouin'),   (3,  'tortue'),
]


def dossier_source(chemin):
    """Rend un dossier contenant les « N.png », et s'il a fallu le creer."""
    chemin = os.path.expanduser(chemin)
    if os.path.isdir(chemin):
        return chemin, False
    if zipfile.is_zipfile(chemin):
        d = tempfile.mkdtemp(prefix='animaux-iles-')
        zipfile.ZipFile(chemin).extractall(d)
        return d, True
    print('Source introuvable :', chemin)
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default=ZIP_PAR_DEFAUT)
    args = ap.parse_args()

    src, jetable = dossier_source(args.source)
    try:
        total = 0
        for num, nom in PAIRES:
            f = os.path.join(src, '%d.png' % num)
            if not os.path.exists(f):
                print('INTROUVABLE :', f)
                sys.exit(1)
            im = cadre(detoure(Image.open(f)), HAUTEUR, CADRE_L)
            out = os.path.join(CIBLE, 'animal-' + nom + '.png')
            enregistre(im, out)
            total += os.path.getsize(out)
            print('%2d.png -> %-24s %3d Ko'
                  % (num, 'animal-' + nom + '.png', os.path.getsize(out) // 1024))
        print('total : %d Ko' % (total // 1024))
    finally:
        if jetable:
            shutil.rmtree(src, ignore_errors=True)


if __name__ == '__main__':
    main()
