# -*- coding: utf-8 -*-
"""Met les onze animaux des 3-5 ans A LA MEME HAUTEUR, dans un cadre commun.

Le client : « les 11 images doivent avoir la meme hauteur ; actuellement
l'elephant est plus petit, le poisson aussi. »

Ce n'etait pas qu'une affaire de fichier. La vignette est dimensionnee par sa
LARGEUR (`.tuile-img{width:84%}`) : a largeur egale, un animal etroit comme le
renard s'affichait beaucoup plus HAUT qu'un animal large comme l'elephant.
Mettre tous les fichiers a 440 px de haut n'aurait rien change.

La regle est donc : TOUS LES FICHIERS ONT LE MEME CADRE, et dans ce cadre
l'encre fait toujours la meme hauteur, centree. Le navigateur peut alors les
poser a la largeur qu'il veut : ils auront tous la meme hauteur a l'ecran, et
chacun gardera sa largeur naturelle.

Usage :  python outils/animaux-cadre.py
"""
import glob
import os

from PIL import Image

CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

# La hauteur de l'encre, et la largeur du cadre. 470 est ce qu'il faut pour
# que le poisson — le plus large une fois mis a cette hauteur — tienne sans
# etre rogne. Le vide autour ne pese rien : le PNG le compresse a neant.
HAUTEUR = 440
CADRE = 470


def cadre(im):
    """Encre a `HAUTEUR`, centree dans un cadre `CADRE` x `HAUTEUR`."""
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    b = im.getchannel('A').getbbox()
    if b:
        im = im.crop(b)
    l, h = im.size
    k = float(HAUTEUR) / h
    im = im.resize((max(1, int(round(l * k))), HAUTEUR), Image.LANCZOS)
    fond = Image.new('RGBA', (CADRE, HAUTEUR), (0, 0, 0, 0))
    fond.paste(im, ((CADRE - im.size[0]) // 2, 0), im)
    return fond


def main():
    for f in sorted(glob.glob(os.path.join(CIBLE, 'animal-*.png'))):
        im = cadre(Image.open(f))
        # Ces dessins sont plats : 255 teintes suffisent, et la palette divise
        # le poids par cinq. FASTOCTREE garde le canal alpha.
        im.quantize(colors=255, method=Image.FASTOCTREE).save(f, 'PNG', optimize=True)
        print('%-26s %3dx%-3d %4d Ko'
              % (os.path.basename(f), CADRE, HAUTEUR, os.path.getsize(f) // 1024))


if __name__ == '__main__':
    main()
