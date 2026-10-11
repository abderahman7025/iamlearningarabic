"""Prépare le lot 6-11 ans d'une langue à partir des relevés — À NE PAS DÉPLOYER.

    python outils/lot-enfant.py zh        → outils/captures/lot-enfant-zh.json

Réunit les relevés garçon et fille (inv4-enfant-<langue>-boy/girl.json, faits
par outils/inventaire-voix.js), retire « plusse » (le signe +, non traduit) et
ce qui est déjà en ligne, et écrit la liste au format de voix-adulte.js :
    node outils/voix-adulte.js outils/captures/lot-enfant-zh.json zh eleven_v4
"""
import io, json, os, re, sys, urllib.request

l = sys.argv[1]
C = os.path.join(os.path.dirname(__file__), 'captures')
dits = []
for p in ('boy', 'girl'):
    f = os.path.join(C, 'inv4-enfant-%s-%s.json' % (l, p))
    if os.path.exists(f):
        d = json.load(io.open(f, encoding='utf-8'))
        dits += d.get('dits', [])
        print(p, len(d.get('dits', [])), 'phrases,', d.get('pages'), 'pages, erreurs', d.get('erreurs'))
    else:
        print(p, 'ABSENT')
dits = list(dict.fromkeys(dits))
u = json.load(urllib.request.urlopen(urllib.request.Request(
    'https://iamlearningarabic.com/api/audio', headers={'User-Agent': 'Mozilla/5.0'}), timeout=60))['urls']
esp = lambda x: re.sub(r'([^\s])([!?;:…])', r'\1 \2', x)
lot = [x for x in dits if x != 'plusse' and x not in u and esp(x) not in u]
io.open(os.path.join(C, 'lot-enfant-%s.json' % l), 'w', encoding='utf-8').write(
    json.dumps({'fr': [{'t': x} for x in lot]}, ensure_ascii=False))
print(l, 'dits', len(dits), 'a generer', len(lot), 'caracteres', sum(map(len, lot)))
