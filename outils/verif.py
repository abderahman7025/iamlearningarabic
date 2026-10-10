# -*- coding: utf-8 -*-
"""Extrait chaque <script> de app.html et le fait verifier par node --check.
   Une retouche peut casser un bloc entier sans que la page affiche la moindre
   erreur : on verifie TOUJOURS avant de pousser, et on COMPTE les blocs OK
   (9 attendus) — jamais `| tail -1`, qui ne montre que le dernier.
   Le JSON-LD du referencement n'est pas du JavaScript : on le saute.

       python outils/verif.py | grep -c " OK"      → 9
"""
import io, os, re, subprocess, sys, tempfile

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix='verif-app-')
s = io.open(os.path.join(R, 'app', 'app.html'), encoding='utf-8').read()

MOTIF = re.compile(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', re.S)
blocs = [b for a, b in MOTIF.findall(s) if 'json' not in a.lower()]
print("%d bloc(s) JavaScript" % len(blocs))
mauvais = 0
for i, b in enumerate(blocs):
    f = os.path.join(TMP, 'bloc%02d.js' % i)
    io.open(f, 'w', encoding='utf-8', newline='').write(b)
    r = subprocess.run(['node', '--check', f], capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    if r.returncode:
        mauvais += 1
        print("--- BLOC %d (%d octets) ---" % (i, len(b)))
        print((r.stderr or r.stdout)[:2500])
    else:
        os.remove(f)
        print("   bloc %-2d  %8d octets  OK" % (i, len(b)))
sys.exit(1 if mauvais else 0)
