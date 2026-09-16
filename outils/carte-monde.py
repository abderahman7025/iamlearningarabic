# -*- coding: utf-8 -*-
"""Le paysage de la carte du monde des animaux (3-5 ans).

Le client, deux fois : « teste une carte des animaux au lieu de juste des
vignettes posees l'une apres l'autre », puis « je ne vois AUCUNE carte ». Un
serpentin de vignettes avec un pointille entre elles, ce n'est pas une carte —
c'est une grille a laquelle on a ajoute des pointilles.

Une carte, c'est un PAYSAGE. Celui-ci en est un : des collines, une riviere,
des bosquets, des buissons, des fleurs. Le SENTIER n'est pas ici : il est
trace par `app.html`, qui connait la position des etapes et ne peut donc pas
se contenter d'un dessin fige.

DEUX REGLES :
  1. TOUT RESTE PALE. Les etapes sont des medaillons vifs poses dessus ; le
     paysage est ce sur quoi on marche, pas ce qu'on regarde.
  2. LE REPERE EST 100 x 140, le meme que celui des etapes dans `app.html`.
     Les deux doivent bouger ensemble.

Usage :  python outils/carte-monde.py
"""
import math
import os

CIBLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

L, H = 100.0, 140.0


def colline(cx, cy, rx, ry, c, o='1'):
    return ('  <ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" opacity="%s"/>\n'
            % (cx, cy, rx, ry, c, o))


def bosquet(x, y, e, c1, c2):
    """Un petit arbre rond : un tronc, deux boules."""
    return ('  <g><rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" fill="%s"/>'
            '<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s"/>'
            '<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s" opacity=".85"/></g>\n'
            % (x - 0.5 * e, y - 2.4 * e, 1.0 * e, 2.6 * e, 0.5 * e, c2,
               x, y - 3.4 * e, 2.4 * e, c1,
               x + 1.5 * e, y - 2.6 * e, 1.7 * e, c1))


def buisson(x, y, e, c):
    return ('  <g fill="%s" opacity=".9"><circle cx="%.2f" cy="%.2f" r="%.2f"/>'
            '<circle cx="%.2f" cy="%.2f" r="%.2f"/>'
            '<circle cx="%.2f" cy="%.2f" r="%.2f"/></g>\n'
            % (c, x, y, 1.5 * e, x - 1.4 * e, y + 0.5 * e, 1.1 * e,
               x + 1.4 * e, y + 0.5 * e, 1.2 * e))


def fleurette(x, y, c):
    p = ''
    for k in range(5):
        a = k * 2 * math.pi / 5
        p += '<circle cx="%.2f" cy="%.2f" r=".55" fill="%s"/>' % (
            x + math.cos(a) * .8, y + math.sin(a) * .8, c)
    return '  <g opacity=".85">%s<circle cx="%.2f" cy="%.2f" r=".45" fill="#ffd76a"/></g>\n' % (p, x, y)


def main():
    s = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %g %g" '
         'width="%g" height="%g" preserveAspectRatio="none">\n' % (L, H, L, H))
    s += ('  <!-- Le paysage de la carte des animaux. Le SENTIER est trace par\n'
          '       app.html, qui seul connait la position des etapes. Repere\n'
          '       commun : 100 x 140. Genere par outils/carte-monde.py. -->\n')
    s += ('  <defs><linearGradient id="pr" x1="0" y1="0" x2="0" y2="1">'
          '<stop offset="0%" stop-color="#eaf8e2"/>'
          '<stop offset="55%" stop-color="#d8f0cb"/>'
          '<stop offset="100%" stop-color="#c8e8bb"/></linearGradient>'
          '<linearGradient id="riv" x1="0" y1="0" x2="1" y2="0">'
          '<stop offset="0%" stop-color="#bfe6f2"/>'
          '<stop offset="100%" stop-color="#a5d9ec"/></linearGradient></defs>\n')
    s += '  <rect width="%g" height="%g" fill="url(#pr)"/>\n' % (L, H)

    # ── les collines du fond, en trois plans ──
    s += colline(14, 12, 26, 9, '#cfeac0', '.75')
    s += colline(58, 8, 30, 8, '#cfeac0', '.6')
    s += colline(92, 16, 24, 8, '#cfeac0', '.7')
    s += colline(30, 70, 34, 11, '#c3e5b4', '.55')
    s += colline(84, 100, 28, 10, '#c3e5b4', '.5')
    s += colline(20, 128, 30, 10, '#c3e5b4', '.55')

    # ── la riviere, qui traverse en biais ──
    s += ('  <path d="M-6 62 C 18 58 26 72 46 70 C 68 68 76 82 106 78 '
          'L106 84 C 76 88 68 74 46 76 C 26 78 18 64 -6 68 Z" '
          'fill="url(#riv)" opacity=".85"/>\n')
    # un petit pont de rondins
    s += ('  <g fill="#c8a877" opacity=".9">'
          '<rect x="60.5" y="66" width="9" height="1.5" rx=".7"/>'
          '<rect x="60.5" y="69.5" width="9" height="1.5" rx=".7"/>'
          '<rect x="60.5" y="73" width="9" height="1.5" rx=".7"/>'
          '<rect x="60" y="65" width="1.4" height="10" rx=".7"/>'
          '<rect x="68.6" y="65" width="1.4" height="10" rx=".7"/></g>\n')

    # ── les bosquets, ecartes des etapes (voir CARTE_ETAPES dans app.html) ──
    for (x, y, e) in ((7, 32, 1.0), (94, 38, 0.9), (8, 62, 0.85),
                      (95, 74, 1.0), (10, 104, 0.95), (93, 112, 0.9),
                      (50, 116, 0.8), (33, 8, 0.75)):
        s += bosquet(x, y, e, '#9ed08c', '#b08a5e')
    for (x, y, e) in ((30, 34, 1.0), (68, 30, .9), (14, 80, 1.0),
                      (86, 58, .95), (36, 104, .9), (64, 128, 1.0),
                      (88, 132, .85), (6, 20, .8)):
        s += buisson(x, y, e, '#addb9b')

    # ── les fleurs, par petits groupes ──
    for (x, y) in ((22, 26), (25, 29), (74, 44), (77, 41), (12, 94),
                   (15, 97), (58, 92), (61, 95), (40, 130), (43, 133),
                   (90, 90), (87, 93)):
        s += fleurette(x, y, '#f7a8c4' if (x + y) % 2 else '#ffd08a')

    s += '</svg>\n'
    chemin = os.path.join(CIBLE, 'carte-animaux.svg')
    with open(chemin, 'w', encoding='utf-8', newline='') as f:
        f.write(s)
    print('carte-animaux.svg  %d o' % len(s.encode('utf-8')))


if __name__ == '__main__':
    main()
