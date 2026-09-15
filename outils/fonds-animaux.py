# -*- coding: utf-8 -*-
"""Un decor par animal, pour le fond des manches des 3-5 ans.

Le client : « pour le fond des cases, regarde plutot l'animal du cours, et
fais que le fond corresponde a cet animal. » Le sous-marin unique devient donc
onze decors — un par etape de la carte.

DEUX REGLES, et elles priment sur le joli :

  1. TOUT RESTE PALE. Ce qui compte a l'ecran, ce sont les ballons vifs et la
     lettre qu'ils portent. Un decor qui se fait remarquer leur dispute le
     regard, et l'enfant cherche la lettre au lieu de la lire.
  2. LE HAUT EST VIDE. Les ballons montent depuis le bas : le decor se joue
     au sol et sur les cotes, jamais au milieu.

Le cadre est toujours 900 x 560, pose en `cover` : les bords peuvent etre
rognes, rien d'important ne s'y trouve.

Usage :  python outils/fonds-animaux.py
"""
import os

CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

ENTETE = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" '
          'width="900" height="560" preserveAspectRatio="xMidYMid slice">\n')


def ciel(haut, bas, nom='ciel'):
    return ('  <linearGradient id="%s" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0%%" stop-color="%s"/>'
            '<stop offset="100%%" stop-color="%s"/></linearGradient>\n' % (nom, haut, bas))


def sol(c1, c2, y=470):
    """Deux dunes molles, l'une devant l'autre."""
    return ('  <path d="M0 %d Q 150 %d 300 %d T 610 %d T 900 %d L900 560 L0 560 Z" fill="%s"/>\n'
            '  <path d="M0 %d Q 220 %d 460 %d T 900 %d L900 560 L0 560 Z" fill="%s" opacity=".85"/>\n'
            % (y, y - 40, y - 10, y - 18, y + 8, c1,
               y + 38, y + 8, y + 32, y + 42, c2))


def soleil(x=780, y=90, r=58, c='#ffe9a8'):
    return ('  <circle cx="%d" cy="%d" r="%d" fill="%s" opacity=".85"/>\n'
            '  <circle cx="%d" cy="%d" r="%d" fill="%s" opacity=".35"/>\n'
            % (x, y, r, c, x, y, r + 26, c))


def herbes(points, c='#8fc98a'):
    out = ''
    for (x, y, h, sens) in points:
        out += ('  <path d="M%d %d C %d %d %d %d %d %d" stroke="%s" stroke-width="9" '
                'fill="none" stroke-linecap="round"/>\n'
                % (x, y, x + sens * 14, y - h * 0.45, x - sens * 8, y - h * 0.7,
                   x + sens * 18, y - h, c))
    return out


def sapin(x, y, h, c1, c2):
    l = h * 0.46
    return ('  <g><rect x="%d" y="%d" width="%d" height="%d" fill="%s" rx="4"/>'
            '<polygon points="%d,%d %d,%d %d,%d" fill="%s"/>'
            '<polygon points="%d,%d %d,%d %d,%d" fill="%s" opacity=".9"/></g>\n'
            % (int(x - h * 0.05), int(y - h * 0.18), max(6, int(h * 0.1)), int(h * 0.2), c2,
               int(x), int(y - h), int(x - l / 2), int(y - h * 0.16), int(x + l / 2), int(y - h * 0.16), c1,
               int(x), int(y - h * 1.02), int(x - l * 0.36), int(y - h * 0.55), int(x + l * 0.36), int(y - h * 0.55), c1))


def bambou(x, y, h, c):
    tiges = ''
    n = int(h / 46)
    for k in range(n):
        yy = y - (k + 1) * (h / n)
        tiges += ('  <rect x="%d" y="%d" width="15" height="%d" rx="6" fill="%s"/>\n'
                  % (x, int(yy), int(h / n) - 7, c))
    feuilles = ('  <path d="M%d %d q 34 -18 58 -6 q -30 20 -58 6 Z" fill="%s" opacity=".9"/>\n'
                '  <path d="M%d %d q -34 -20 -58 -8 q 30 22 58 8 Z" fill="%s" opacity=".9"/>\n'
                % (x + 14, int(y - h * 0.82), c, x, int(y - h * 0.62), c))
    return tiges + feuilles


def fleur(x, y, c, coeur='#ffd76a'):
    p = ''
    for k in range(5):
        import math
        a = k * 2 * math.pi / 5
        p += '<ellipse cx="%.1f" cy="%.1f" rx="11" ry="16" fill="%s" transform="rotate(%.1f %.1f %.1f)"/>' % (
            x + math.cos(a) * 12, y + math.sin(a) * 12, c, k * 72, x + math.cos(a) * 12, y + math.sin(a) * 12)
    return ('  <g opacity=".92"><path d="M%d %d L%d %d" stroke="#8fc98a" stroke-width="6" '
            'stroke-linecap="round"/>%s<circle cx="%d" cy="%d" r="9" fill="%s"/></g>\n'
            % (x, y, x, y + 58, p, x, y, coeur))


def nuage(x, y, e=1.0, c='#ffffff', o='.7'):
    return ('  <g opacity="%s" fill="%s"><ellipse cx="%d" cy="%d" rx="%d" ry="%d"/>'
            '<ellipse cx="%d" cy="%d" rx="%d" ry="%d"/>'
            '<ellipse cx="%d" cy="%d" rx="%d" ry="%d"/></g>\n'
            % (o, c, x, y, int(46 * e), int(26 * e),
               int(x + 40 * e), int(y + 8 * e), int(34 * e), int(20 * e),
               int(x - 38 * e), int(y + 10 * e), int(30 * e), int(18 * e)))


def commentaire(nom, texte):
    return '  <!-- %s. %s -->\n' % (nom, texte)


# ══════════════════════════════════════════════════════════════════════
#  LES ONZE DECORS
# ══════════════════════════════════════════════════════════════════════

def savane(chaud=True):
    """Le lion, la girafe, l'elephant : herbe seche, acacias, grand soleil."""
    s = '  <defs>\n' + ciel('#fdf3d8', '#f6e3ad') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += soleil(770, 96, 62)
    s += nuage(180, 96, 0.9, '#ffffff', '.55')
    s += sol('#e9d08b', '#dcbf74')
    # deux acacias : un tronc, un parasol
    for (x, h) in ((120, 150), (760, 120)):
        s += ('  <rect x="%d" y="%d" width="14" height="%d" fill="#b98a55" rx="5"/>\n'
              '  <ellipse cx="%d" cy="%d" rx="%d" ry="26" fill="#a8c98a" opacity=".92"/>\n'
              '  <ellipse cx="%d" cy="%d" rx="%d" ry="18" fill="#bcd79d" opacity=".9"/>\n'
              % (x, 470 - h, h, x + 7, 470 - h, int(h * 0.62), x + 7, 470 - h - 18, int(h * 0.42)))
    s += herbes([(250, 486, 58, 1), (300, 492, 44, -1), (560, 488, 52, 1),
                 (620, 494, 40, -1), (430, 500, 34, 1)], '#cbbd7e')
    return s


def bambouseraie():
    """Le panda."""
    s = '  <defs>\n' + ciel('#eef8ea', '#cfe9c8') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += nuage(700, 84, 0.8, '#ffffff', '.5')
    s += sol('#bfdcb0', '#a9cf9c')
    for (x, h, c) in ((70, 300, '#8cc27f'), (130, 240, '#a3d296'),
                      (780, 320, '#8cc27f'), (840, 250, '#a3d296'),
                      (420, 180, '#b5dcaa')):
        s += bambou(x, 480, h, c)
    s += herbes([(260, 492, 44, 1), (600, 496, 38, -1)], '#93c98a')
    return s


def foret():
    """Le renard."""
    s = '  <defs>\n' + ciel('#eaf4ff', '#d7ead6') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += soleil(760, 88, 48, '#fff0bd')
    s += nuage(200, 92, 0.85, '#ffffff', '.55')
    s += sol('#bcd9a8', '#a8cb93')
    for (x, h) in ((90, 240), (180, 180), (790, 250), (700, 170), (400, 130)):
        s += sapin(x, 482, h, '#93c58c', '#a97f56')
    s += herbes([(300, 494, 44, 1), (560, 498, 36, -1)], '#8fc98a')
    return s


def nuit():
    """Le hibou : la seule scene sombre, mais sombre PALE — les ballons
       doivent encore se detacher."""
    s = '  <defs>\n' + ciel('#dfe4f7', '#c3cbe9') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += ('  <circle cx="770" cy="92" r="46" fill="#fdf6d8" opacity=".9"/>\n'
          '  <circle cx="750" cy="82" r="40" fill="#dfe4f7"/>\n')
    for (x, y, r) in ((120, 80, 3), (210, 130, 2), (330, 70, 3), (470, 120, 2),
                      (590, 64, 3), (660, 150, 2), (860, 170, 3), (60, 190, 2)):
        s += '  <circle cx="%d" cy="%d" r="%d" fill="#ffffff" opacity=".8"/>\n' % (x, y, r)
    s += sol('#9fa9cd', '#8d97bd')
    for (x, h) in ((90, 250), (175, 190), (800, 260), (715, 180)):
        s += sapin(x, 482, h, '#8b95bd', '#6f77a0')
    return s


def mare():
    """La grenouille : nenuphars et roseaux."""
    s = '  <defs>\n' + ciel('#eaf7fb', '#cfeaf0') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += nuage(160, 88, 0.85, '#ffffff', '.55')
    s += ('  <path d="M0 452 Q 220 428 450 448 T 900 442 L900 560 L0 560 Z" fill="#a8dbe6"/>\n'
          '  <path d="M0 500 Q 240 484 520 500 T 900 496 L900 560 L0 560 Z" fill="#8fcfdd" opacity=".8"/>\n')
    # Les nenuphars : un vert franc, sinon ils se confondaient avec l'eau.
    for (x, y, r) in ((190, 490, 58), (610, 478, 50), (790, 514, 42)):
        s += ('  <ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#6fb96c"/>\n'
              '  <path d="M%d %d L%d %d" stroke="#d9f0e2" stroke-width="6"/>\n'
              % (x, y, r, int(r * 0.38), x, y, x + r, y - int(r * 0.22)))
    s += fleur(232, 450, '#f7a8c4')
    for (x, h) in ((80, 150), (128, 120), (845, 140)):
        s += ('  <path d="M%d 470 L%d %d" stroke="#8dc98a" stroke-width="8" stroke-linecap="round"/>\n'
              '  <ellipse cx="%d" cy="%d" rx="9" ry="24" fill="#b08a5e"/>\n'
              % (x, x + 6, 470 - h, x + 6, 470 - h - 10))
    return s


def prairie():
    """L'abeille : des fleurs, beaucoup."""
    s = '  <defs>\n' + ciel('#f2fbf0', '#d9f0d2') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += soleil(790, 84, 50)
    s += nuage(170, 88, 0.85, '#ffffff', '.55')
    s += sol('#bfe3ac', '#a9d596')
    for (x, y, c) in ((90, 456, '#f7a8c4'), (215, 486, '#ffd08a'),
                      (610, 470, '#c3a8f0'), (735, 492, '#f7a8c4'),
                      (845, 462, '#ffd08a'), (410, 500, '#c3a8f0')):
        s += fleur(x, y, c)
    s += herbes([(320, 500, 42, 1), (520, 504, 36, -1)], '#93c98a')
    return s


def banquise():
    """Le pingouin."""
    s = '  <defs>\n' + ciel('#eef7ff', '#cfe6f6') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += nuage(680, 86, 0.9, '#ffffff', '.6')
    # Les glaces sont a peine plus foncees que le ciel : sans cela on ne
    # voyait qu'un rectangle bleu clair, et la banquise ne se lisait pas.
    s += ('  <polygon points="60,470 170,300 280,470" fill="#bcd9ee"/>\n'
          '  <polygon points="118,470 170,300 200,470" fill="#9cc4e2"/>\n'
          '  <polygon points="700,470 800,338 900,470" fill="#bcd9ee"/>\n'
          '  <polygon points="754,470 800,338 828,470" fill="#9cc4e2"/>\n'
          '  <polygon points="360,470 430,392 500,470" fill="#cbe2f2"/>\n')
    s += sol('#e2eefa', '#c9dff1')
    s += ('  <ellipse cx="420" cy="508" rx="120" ry="20" fill="#aecfea" opacity=".6"/>\n'
          '  <ellipse cx="640" cy="534" rx="90" ry="16" fill="#aecfea" opacity=".5"/>\n')
    return s


def plage():
    """La tortue : la mer d'un cote, le sable de l'autre, un palmier."""
    s = '  <defs>\n' + ciel('#eaf6ff', '#cdeaf7') + '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += soleil(770, 86, 52)
    s += ('  <path d="M0 400 L900 400 L900 470 Q 680 492 450 470 T 0 468 Z" fill="#9fd8ea"/>\n'
          '  <path d="M0 430 q 60 -14 120 0 t 120 0 t 120 0" stroke="#ffffff" '
          'stroke-width="5" fill="none" opacity=".6"/>\n')
    s += sol('#f3e0ae', '#e6cd8f', 478)
    # un palmier
    s += ('  <path d="M118 500 q -18 -100 22 -156" stroke="#bf9463" stroke-width="15" '
          'fill="none" stroke-linecap="round"/>\n')
    for dx, dy in ((-86, -22), (-52, -52), (56, -48), (88, -16), (4, -60)):
        s += ('  <path d="M140 344 q %d %d %d %d q %d %d %d %d Z" fill="#8fc98a" opacity=".92"/>\n'
              % (dx // 2, dy, dx, dy + 14, -dx // 3, 16, -dx, -dy - 14))
    s += ('  <ellipse cx="600" cy="520" rx="26" ry="12" fill="#f7cfa8" opacity=".8"/>\n'
          '  <ellipse cx="640" cy="534" rx="18" ry="9" fill="#f7cfa8" opacity=".7"/>\n')
    return s


def sousleau():
    """Le poisson : le decor d'origine, garde tel quel."""
    s = '  <defs>\n'
    s += ciel('#eaf8ff', '#8fd7f2')
    s += ('  <linearGradient id="sable" x1="0" y1="0" x2="0" y2="1">'
          '<stop offset="0%" stop-color="#f6e3b4"/>'
          '<stop offset="100%" stop-color="#e8cf92"/></linearGradient>\n'
          '  <linearGradient id="rai" x1="0" y1="0" x2="0.4" y2="1">'
          '<stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>'
          '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>\n')
    s += '  </defs>\n'
    s += '  <rect width="900" height="560" fill="url(#ciel)"/>\n'
    s += ('  <polygon points="120,0 200,0 90,560 -10,560" fill="url(#rai)"/>\n'
          '  <polygon points="380,0 430,0 330,560 260,560" fill="url(#rai)"/>\n'
          '  <polygon points="690,0 780,0 720,560 610,560" fill="url(#rai)"/>\n')
    s += ('  <path d="M0 470 Q 150 430 300 460 T 610 452 T 900 478 L900 560 L0 560 Z" fill="url(#sable)"/>\n'
          '  <path d="M0 508 Q 220 478 460 502 T 900 512 L900 560 L0 560 Z" fill="#dfc27f" opacity=".8"/>\n')
    s += ('  <g fill="none" stroke-linecap="round">\n'
          '    <path d="M70 470 C 40 410 96 372 62 316"  stroke="#5cb86a" stroke-width="15"/>\n'
          '    <path d="M104 476 C 84 428 124 400 106 356" stroke="#7ccb7f" stroke-width="11"/>\n'
          '    <path d="M792 476 C 826 420 770 386 806 330" stroke="#5cb86a" stroke-width="15"/>\n'
          '    <path d="M760 480 C 782 436 744 410 764 366" stroke="#7ccb7f" stroke-width="11"/>\n'
          '    <path d="M430 486 C 410 450 444 430 428 398" stroke="#6cc275" stroke-width="10"/>\n'
          '  </g>\n')
    s += ('  <g opacity=".9"><circle cx="215" cy="486" r="26" fill="#f7a8c4"/>'
          '<circle cx="243" cy="496" r="18" fill="#fbc0d5"/>'
          '<circle cx="600" cy="492" r="21" fill="#f9b98a"/>'
          '<circle cx="624" cy="500" r="14" fill="#fcd0ab"/></g>\n')
    return s


SCENES = [
    ('lion',       savane,       'la savane : herbe seche, acacias, grand soleil'),
    ('elephant',   savane,       'la savane, comme le lion'),
    ('girafe',     savane,       'la savane, comme le lion'),
    ('panda',      bambouseraie, 'la bambouseraie'),
    ('renard',     foret,        'la foret de jour'),
    ('grenouille', mare,         'la mare : nenuphars et roseaux'),
    ('hibou',      nuit,         'la foret de nuit : lune et etoiles'),
    ('poisson',    sousleau,     'sous l eau : le decor d origine'),
    ('abeille',    prairie,      'la prairie fleurie'),
    ('pingouin',   banquise,     'la banquise'),
    ('tortue',     plage,        'la plage : mer, sable, palmier'),
]


def main():
    for nom, fabrique, quoi in SCENES:
        corps = fabrique()
        svg = (ENTETE
               + commentaire('Le fond du monde de l\'animal « %s »' % nom,
                             'C\'est %s. Tout reste PALE et le haut reste vide : '
                             'les ballons montent par la, et ce sont eux qu\'on '
                             'doit voir. Genere par outils/fonds-animaux.py.' % quoi)
               + corps + '</svg>\n')
        chemin = os.path.join(CIBLE, 'fond-' + nom + '.svg')
        with open(chemin, 'w', encoding='utf-8', newline='') as f:
            f.write(svg)
        print('%-22s %5d o' % ('fond-' + nom + '.svg', len(svg.encode('utf-8'))))


if __name__ == '__main__':
    main()
