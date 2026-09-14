# -*- coding: utf-8 -*-
"""Met les onze dessins du client aux noms des onze etapes des 3-5 ans.

Ils arrivent dans les telechargements sous les noms « 1.png » a « 11.png »,
sur fond blanc et en 1264 x 1264 — pres de deux megaoctets piece. Posee
telle quelle, la carte en chargerait dix-huit : on les detoure, on les
reduit, on les optimise.

Le detourage est celui de `detoure.py`, repris tel quel : le fond se
reconnait a ce qu'il TOUCHE LE BORD, et on n'avance que dans le clair. Ce
qui est enferme dans le dessin reste opaque — sans quoi le ventre du
pingouin et le corps du panda deviendraient transparents.

Usage :  python outils/animaux-images.py
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detoure import detoure          # noqa: E402

SOURCE = os.path.join(os.path.expanduser('~'), 'Downloads')
CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

# Le plus grand cote du fichier rendu. Les vignettes les montrent a 200 px au
# plus, l'ecran de recompense a 240 : 440 couvre le double, donc les ecrans
# fins, sans peser.
COTE = 440

# fichier du client -> nom de l'animal dans l'habillage
PAIRES = [
    ('4.png',  'lion'),
    ('1.png',  'elephant'),
    ('2.png',  'girafe'),
    ('6.png',  'panda'),
    ('7.png',  'renard'),
    ('8.png',  'grenouille'),
    ('9.png',  'hibou'),
    ('10.png', 'poisson'),
    ('11.png', 'abeille'),
    ('5.png',  'pingouin'),
    ('3.png',  'tortue'),
]


def main():
    faits, manquants = [], []
    for src, nom in PAIRES:
        chemin = os.path.join(SOURCE, src)
        if not os.path.exists(chemin):
            manquants.append(src)
            continue
        im = detoure(chemin)
        # on reduit en gardant les proportions
        l, h = im.size
        k = float(COTE) / max(l, h)
        if k < 1:
            im = im.resize((max(1, int(l * k)), max(1, int(h * k))), Image.LANCZOS)
        # Ces dessins sont plats : deux cent cinquante-cinq teintes suffisent, et
        # la palette divise le poids par cinq (1,7 Mo -> 360 Ko pour les onze).
        # FASTOCTREE garde le canal alpha, donc le detourage survit.
        if im.mode != 'RGBA':
            im = im.convert('RGBA')
        im = im.quantize(colors=255, method=Image.FASTOCTREE)
        sortie = os.path.join(CIBLE, 'animal-' + nom + '.png')
        im.save(sortie, 'PNG', optimize=True)
        faits.append('%-22s %4dx%-4d %5d Ko   (depuis %s)'
                     % ('animal-' + nom + '.png', im.size[0], im.size[1],
                        os.path.getsize(sortie) // 1024, src))
    for l in faits:
        print(l)
    if manquants:
        print('INTROUVABLES :')
        for m in manquants:
            print('   ', m)


if __name__ == '__main__':
    main()
