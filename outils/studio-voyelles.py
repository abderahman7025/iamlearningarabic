# -*- coding: utf-8 -*-
"""Le studio doit proposer les phrases QUE LE COURS DIT, au caractere pres.

Les cases du studio avaient ete ecrites a la main, sans accents : « Repete
apres moi : bou. » quand le cours dit « Répète après moi : bou. ». La
recherche d'un enregistrement se fait sur la phrase exacte — dix-huit des
trente-cinq phrases n'auraient donc jamais joue, meme enregistrees.

On les regenere donc a partir du cours lui-meme.
"""
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8')

p = 'app/app.html'
s = io.open(p, encoding='utf-8').read()

# ── les phrases que le cours fait dire, dans l'ordre ────────────────
d = s.index('function _boyVowelCourse')
f = s.index('\n}\n', d)
bloc = s[d:f]
CHAINE = r"'((?:[^'\\]|\\.)*)'"
dits = [x.replace("\\'", "'") for x in re.findall(r"te\(" + CHAINE + r"\)", bloc)]
# les titres d'etape sont en capitales : ce ne sont pas des phrases dites
phrases = [x for x in dits if x != x.upper()]
# Deux phrases s'accordent au profil : elles sont construites par morceaux et
# n'apparaissent donc pas comme un seul `te('…')`. Leurs quatre formes.
phrases += [
    'Maintenant, on va les écrire ! Tu es prêt ?',
    'Maintenant, on va les écrire ! Tu es prête ?',
    'Tu es un champion !',
    'Tu es une championne !',
]
phrases.append('Bravo !')
phrases = list(dict.fromkeys(phrases))

def js(t):
    return t.replace('\\', '\\\\').replace("'", "\\'")

lignes = ["  /* ── LES PHRASES DU COURS DES VOYELLES ──",
          "     Le client les dit de sa voix : la synthese du navigateur prononce mal",
          "     le francais, et ne sait pas dire un son isole comme « b ».",
          "     LA CLE EST LA PHRASE EXACTE, accents compris : c'est sur elle que",
          "     l'enregistrement est retrouve. Cette liste se regenere depuis le cours",
          "     (scratchpad/studio_voyelles.py) — ne pas la retaper a la main. */"]
for t in phrases:
    lab = t if len(t) <= 44 else t[:43] + '…'
    lignes.append("  {ar:'%s',label:'%s'}," % (js(t), js(lab)))

# ── on remplace le bloc francais, du commentaire a « Bravo ! » ──────
deb = s.index('var ADMIN_SOUNDS = [\n') + len('var ADMIN_SOUNDS = [\n')
fin = s.index("{ar:'Bravo !',label:'Bravo !'},\n", deb) + len("{ar:'Bravo !',label:'Bravo !'},\n")
s = s[:deb] + '\n'.join(lignes) + '\n' + s[fin:]

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print(len(phrases), 'phrases proposees au studio, telles que le cours les dit')
for t in phrases:
    print('  -', t)
