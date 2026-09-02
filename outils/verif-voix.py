# -*- coding: utf-8 -*-
"""Les phrases que le cours fait dire ont-elles toutes une case au studio ?"""
import io, re, sys
sys.stdout.reconfigure(encoding='utf-8')

s = io.open('app/app.html', encoding='utf-8').read()
d = s.index('function _boyVowelCourse')
f = s.index('\n}\n', d)
bloc = s[d:f]

CHAINE = r"'((?:[^'\\]|\\.)*)'"
dits = [x.replace("\\'", "'") for x in re.findall(r"te\(" + CHAINE + r"\)", bloc)]
phr = [x for x in dits if ' ' in x and x != x.upper()]

d2 = s.index('var ADMIN_SOUNDS')
f2 = s.index('\n];', d2)
cles = set(x.replace("\\'", "'")
           for x in re.findall(r"\{ar:" + CHAINE, s[d2:f2]))

manque = [p for p in dict.fromkeys(phr) if p not in cles]
print(len(phr), 'phrases parlees /', len(cles), 'cles au studio')
print(len(manque), 'phrases sans case au studio :')
for m in manque:
    print('  -', m)
