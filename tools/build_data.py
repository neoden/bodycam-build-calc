"""Build web/data.js from extracted Bodycam assets. Usage: build_data.py EXTRACTED_DIR OUT_JS"""
import sys, os, re, json, struct, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
from uasset import Asset, fstr
from items import parse_items
from geparse import parse as parse_ge
from shop import parse_shop

ROOT = sys.argv[1]; OUT = sys.argv[2]
C = os.path.join(ROOT, 'Bodycam/Content')
AF = os.path.join(ROOT, 'Bodycam/Plugins/BodycamAnimationFramework/Content')

def game_path(p):          # '/Game/X/Y.Y' or '/BodycamAnimationFramework/X/Y.Y' -> file base path
    p = p.split('.')[0]
    if p.startswith('/Game/'): return os.path.join(C, p[6:])
    if p.startswith('/BodycamAnimationFramework/'): return os.path.join(AF, p[27:])
    return None

MISSING = set()          # pak paths of assets we still need (see update.sh)

# ---------- UI stat definitions
def ui_stats():
    p = os.path.join(C, 'BodycamCore/AbilitySystem/DT_UIStatModifiersDefinition')
    a = Asset(p + '.uasset'); b = open(p + '.uexp', 'rb').read()
    n, = struct.unpack_from('<i', b, 10); o = 14; out = {}
    def ftext(o):
        o += 4; h = struct.unpack_from('<b', b, o)[0]; o += 1
        if h == -1:
            has, = struct.unpack_from('<i', b, o); o += 4
            if has: return fstr(b, o)
            return '', o
        _, o = fstr(b, o); _, o = fstr(b, o); return fstr(b, o)
    for _ in range(n):
        key = a.name(*struct.unpack_from('<ii', b, o)); o += 8
        frag, = struct.unpack_from('<H', b, o); o += 2; mask = 0
        if frag & 0x80: mask = b[o]; o += 1
        o += 2; _, o = fstr(b, o); c, = struct.unpack_from('<i', b, o); o += 4 + 8*c + 8
        name, o = ftext(o) if not mask & 2 else ('', o)
        cat, o = ftext(o) if not mask & 4 else ('', o)
        bl = []
        for i in range(3, 7):
            if mask & (1 << i): bl.append(0)
            else: bl.append(b[o]); o += 1
        out[key] = dict(name=name or key, cat=cat, lowerBetter=bool(bl[0]), flags=bl)
    return out

# ---------- skins
def skins():
    p = os.path.join(C, 'BodycamCore/ItemsDefinition/Skins/DT_WeaponSkins')
    a = Asset(p + '.uasset'); b = open(p + '.uexp', 'rb').read(); N = a.names
    out = []; start = 14
    for m in re.finditer(rb'\x00\x05\xfe\xff\xff\xff(.{4})(.{4})', b, re.S):
        i, num = struct.unpack('<ii', m.group(1) + m.group(2))
        if not (0 <= i < len(N)) or num > 500: continue
        row = b[start:m.end()]
        ki, kn = struct.unpack_from('<ii', row, 0)
        key = a.name(ki, kn) if 0 <= ki < len(N) else '?'
        t = re.search(rb'\x21\x00\x00\x00[0-9A-F]{32}\x00(.{4})', row, re.S)
        name = ''
        if t:
            name, _ = fstr(row, t.start(1))
        refs = []; p = 8
        while p + 16 <= len(row):
            i1, n1, i2, n2 = struct.unpack_from('<iiii', row, p)
            # FNames keep a trailing _N as a separate number: ".../M4_Handguard_9" is stored as (".../M4_Handguard", 10)
            if 0 <= n1 < 1000 and n1 == n2 and 0 <= i1 < len(N) and 0 <= i2 < len(N) and N[i1].startswith('/Game/') and N[i2] == N[i1].rsplit('/', 1)[1]:
                refs.append(N[i1] + (f'_{n1-1}' if n1 else '')); p += 16
            else: p += 1
        out.append(dict(key=key, name=name.strip(), item=a.name(i, num), refs=refs))
        start = m.end()
    return out

# ---------- animations
SEG = re.compile(rb'\x80\x0d\x06(.{4})(.{4})(.{4})', re.S)
def montage_len(base):
    try: b = open(base + '.uexp', 'rb').read()
    except OSError: return None
    tot = 0
    for m in SEG.finditer(b):
        ref, = struct.unpack('<i', m.group(1)); end, rate = struct.unpack('<ff', m.group(2) + m.group(3))
        if ref < 0 and 0 < end < 60 and 0.05 < rate < 10: tot += end / rate
    return round(tot, 3) or None

# ---------- ADS: the aim-in "additive motion" (DA_BodycamAdditiveMotion) plays a position curve that moves the weapon
# from the hip pose to the sights. Its class lists properties in this order (index 0 is the native base class slot):
# 1 RotationCurve, 2 PositionCurve, 3-6 scale vectors, 7 Playback (rate, default 1.0), 8 BlendTime, 9 Animation.
def plugin_pak_path(ref):
    return '../../../Bodycam/Plugins/BodycamAnimationFramework/Content/' + ref[27:] + '.uasset'

def rich_curves(b):
    out = []; i = 0
    while i < len(b) - 8 and len(out) < 3:
        n, = struct.unpack_from('<i', b, i)
        if 2 <= n <= 2000 and i + 4 + 27*n <= len(b):
            ks = []; pt = -1
            for k in range(n):
                q = i + 4 + 27*k; t, v = struct.unpack_from('<ff', b, q + 3)
                if b[q] > 3 or b[q+1] > 5 or b[q+2] > 3 or not (-1e-6 <= t < 100) or t <= pt or abs(v) > 1e5: ks = None; break
                pt = t; ks.append((t, v))
            if ks: out.append(ks); i += 4 + 27*n; continue
        i += 1
    return out

def ads_info(motion_ref, missing):
    base = game_path(motion_ref)
    if not os.path.exists(base + '.uexp'):
        missing.update({plugin_pak_path(motion_ref), plugin_pak_path(motion_ref)[:-6] + 'uexp'}); return None
    a = Asset(base + '.uasset'); b = open(base + '.uexp', 'rb').read()
    idx = []; o = 0; pos = 0
    while True:                                   # unversioned header: which property indices are serialized
        f, = struct.unpack_from('<H', b, o); o += 2
        pos += f & 0x7f
        if f & 0x80: return None                  # zero-masked values: layout not handled
        idx += range(pos, pos + (f >> 9)); pos += f >> 9
        if f & 0x100: break
    playback = 1.0; curve = None
    for i in idx:
        if i in (1, 2, 9):
            v, = struct.unpack_from('<i', b, o); o += 4
            if i == 2 and v < 0: curve = a.imp(v).split('.')[0]
        elif 3 <= i <= 6: o += 24
        elif i in (7, 8):
            v, = struct.unpack_from('<d', b, o); o += 8
            if i == 7: playback = v
        else: return None
    if not curve or not playback: return None
    cp = game_path(curve) + '.uexp'
    if not os.path.exists(cp):
        missing.update({plugin_pak_path(curve), plugin_pak_path(curve)[:-6] + 'uexp'}); return None
    cs = rich_curves(open(cp, 'rb').read())
    if len(cs) != 3: return None
    ts = [t for t, _ in cs[0]]
    def at(ks, t):
        for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
            if t0 <= t <= t1: return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
        return ks[-1][1]
    fin = [k[-1][1] for k in cs]; dist0 = sum(f*f for f in fin) ** .5
    def reach(frac):                              # first moment the weapon is within `frac` of its final aimed position
        steps = int(ts[-1] * 1000)
        for s in range(steps + 1):
            t = s / 1000
            if sum((at(k, t) - f) ** 2 for k, f in zip(cs, fin)) ** .5 <= frac * dist0: return t
        return ts[-1]
    return dict(t90=round(reach(.10) / playback, 3), t95=round(reach(.05) / playback, 3), len=round(ts[-1] / playback, 3),
                playback=playback, curve=curve.rsplit('/', 1)[1])

def anim_info(bas_path):
    base = game_path(bas_path)
    try: a = Asset(base + '.uasset')
    except OSError: return {}
    paths = [n for n in a.names if n.startswith('/') and n.endswith('_Montage')]
    aim = next((n for n in a.names if n.startswith('/') and re.search(r'Additive_[^/]*Aim_In$', n)), None)
    groups = collections.defaultdict(list)
    for p in paths:
        nm = p.rsplit('/', 1)[1]
        if not nm.startswith('A_FP'): continue        # first-person character montages drive timing
        L = montage_len(game_path(p))
        if not L: continue
        low = nm.lower()
        kind = None
        if 'reload' in low:
            if 'loop' in low or 'insert' in low: kind = 'reloadLoop'
            elif 'start' in low: kind = 'reloadStart'
            elif 'end' in low: kind = 'reloadEnd'
            elif 'empty' in low: kind = 'reloadEmpty'
            elif 'partial' in low or 'tactical' in low: kind = 'reloadPartial'
            else: kind = 'reload'
        elif 'draw' in low: kind = 'draw'
        elif 'equip' in low: kind = 'equip'
        elif 'holster' in low: kind = 'holster'
        if kind: groups[kind].append((nm, L))
    out = {}
    for k, v in groups.items():
        ls = [x[1] for x in v]
        out[k] = dict(avg=round(sum(ls)/len(ls), 3), min=min(ls), max=max(ls), n=len(ls),
                      calm=avg([l for n, l in v if 'calm' in n.lower()]), stressed=avg([l for n, l in v if 'stress' in n.lower()]))
    if aim:
        ai = ads_info(aim, MISSING)
        if ai: out['ads'] = ai
    return out

def avg(l): return round(sum(l)/len(l), 3) if l else None

# ---------- sockets: attachment points a part's mesh (or its skeleton) offers to other parts.
# Socket names equal slot names ("Underbarrel", "Optic_Mount", ...). Meshes not extracted yet are listed in MISSING.
_mesh_cache = {}
def asset_names(ref):
    if ref not in _mesh_cache:
        gp = game_path(ref); p = (gp or '') + '.uasset'; names = set()
        if not gp: pass
        elif not os.path.exists(p):
            if '/Icon' not in ref and '/UI/' not in ref: MISSING.add('../../../Bodycam/Content/' + ref[6:] + '.uasset')
        else:
            a = Asset(p)
            if 'StaticMesh' in a.names or 'SkeletalMesh' in a.names or 'Skeleton' in a.names:
                names = {n.lower() for n in a.names if not n.startswith('/')}
                for k in range(a.import_count):
                    if a.imports[k]['cls'] == 'Skeleton': names |= asset_names(a.imp(-k-1).split('.')[0])
        _mesh_cache[ref] = names
    return _mesh_cache[ref]

# ---------- main
nrows, rows = parse_items(os.path.join(C, 'BodycamCore/ItemsDefinition/Gameplay/DT_WeaponItems.uasset'),
                          os.path.join(C, 'BodycamCore/ItemsDefinition/Gameplay/DT_WeaponItems.uexp'))
print('items', nrows, len(rows), file=sys.stderr)
sk = skins(); print('skins', len(sk), file=sys.stderr)
# FNames are case-insensitive in the engine: match row names ignoring case
canon = {r['key'].lower(): r['key'] for r in rows}
for s in sk: s['item'] = canon.get(s['item'].lower(), s['item'])
skin_by_key = {s['key'].lower(): s for s in sk}
# a skin is obtainable in game only if the shop table lists it and its 'disabled' flag (field 4) is not set
shop = parse_shop(os.path.join(C, 'BodycamCore/ItemsDefinition/DT_NewShopItem.uasset'), os.path.join(C, 'BodycamCore/ItemsDefinition/DT_NewShopItem.uexp'))
shop_ok = {r['ref'].lower() for r in shop if r['table'] == 'DT_WeaponSkins' and not r.get('4')}
for s in sk: s['avail'] = s['key'].lower() in shop_ok
print('skins available', sum(s['avail'] for s in sk), 'of', len(sk), file=sys.stderr)
all_names_by_item = collections.defaultdict(list)
for s in sk:
    if s['name'] and s['name'] not in all_names_by_item[s['item']]: all_names_by_item[s['item']].append(s['name'])
sk_all = sk; sk = [s for s in sk if s['avail']]
names_by_item = collections.defaultdict(list)
for s in sk:
    if s['name'] and s['name'] not in names_by_item[s['item']]: names_by_item[s['item']].append(s['name'])

def ge_of(row):
    for r in row['refs']:
        if '/GameplayEffects/' in r:
            base = game_path(r)
            if os.path.exists(base + '.uexp'):
                return os.path.basename(base), parse_ge(open(base + '.uexp', 'rb').read())
    return None, []

weapons = []; atts = []; default_name = {}
for r in rows:
    ge, mods = ge_of(r)
    mods = [dict(a=m['attr'], op=m['op'], v=m.get('value')) for m in mods]
    if r['tag'] == 'None':
        k = r['key']
        guess = ('Optic' if 'Optic' in k else 'Stock' if 'Stock' in k else 'Magazine' if 'Magazine' in k else None)
        if not guess: continue                      # untagged (unreleased) weapons etc.
        r['tag'] = 'Item.Attachment.' + guess
    if r['tag'].startswith(('Item.PrimaryWeapon', 'Item.SecondaryWeapon')):
        bas = next((x for x in r['refs'] if '/BAS_' in x), None)
        defaults = []; wname = None
        for d in r['defaults']:
            s = skin_by_key.get(d.lower())
            it = s['item'] if s else d
            if it == r['key']:
                wname = s['name'] if s else None
            else:
                defaults.append(it); default_name[it] = default_name.get(it) or (s['name'] if s else None)
        weapons.append(dict(id=r['key'], name=wname or r['key'], tag=r['tag'], ge=ge, mods=mods, defaults=defaults,
                            names=names_by_item.get(r['key'], []), anim=anim_info(bas) if bas else {}))
    elif r['tag'].startswith('Item.Attachment'):
        parts = r['tag'].split('.')
        atts.append(dict(id=r['key'], slot=parts[2] if len(parts) > 2 else ('Underbarrel' if 'Underbarrel' in r['key'] else 'Misc'), sub=parts[3] if len(parts) > 3 else None,
                         compat=r['compat'], ge=ge, mods=mods, names=names_by_item.get(r['key'], []),
                         skins=sum(1 for s in sk if s['item'] == r['key'])))
slot_by_socket = {a['slot'].lower().replace(' ', '_'): a['slot'] for a in atts}
sock_by_item = collections.defaultdict(set)
for s_ in sk_all:
    for r in s_['refs']: sock_by_item[s_['item']] |= {slot_by_socket[n] for n in asset_names(r) if n in slot_by_socket}
for x in atts: x['sockets'] = sorted(sock_by_item.get(x['id'], set()) - {x['slot']})
for x in weapons: x['sockets'] = sorted(sock_by_item.get(x['id'], ()))
for x in atts:                      # an optic mount whose mesh could not be read still exists to hold an optic
    if x['slot'] == 'Optic Mount' and not x['sockets']: x['sockets'] = ['Optic']; x['socketsGuessed'] = True
if MISSING:
    open(os.path.join(ROOT, 'missing.txt'), 'w').write('\n'.join(sorted(MISSING)))
    print('missing mesh assets:', len(MISSING), '(listed in missing.txt)', file=sys.stderr)
elif os.path.exists(os.path.join(ROOT, 'missing.txt')): os.remove(os.path.join(ROOT, 'missing.txt'))
default_ids = {d for w in weapons for d in w['defaults']}
for a in atts:
    a['avail'] = a['skins'] > 0 or a['id'] in default_ids
    if not a['names']: a['names'] = all_names_by_item.get(a['id'], [])
    nm = default_name.get(a['id'])
    if not nm:
        own = skin_by_key.get(a['id'].lower())
        nm = (own['name'] if own and own['name'] and own['item'] == a['id'] else None) or (a['names'][0] if a['names'] else a['id'])
        a['nameSrc'] = 'own' if own and own['name'] and own['item'] == a['id'] else ('first' if a['names'] else 'id')
    a['name'] = nm
weapons.sort(key=lambda w: (w['tag'].split('.')[1:3], w['name']))
data = dict(build=(sys.argv[3] if len(sys.argv) > 3 else None), stats=ui_stats(), weapons=weapons, attachments=atts)
with open(OUT, 'w') as f:
    f.write('window.BODYCAM_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
json.dump(data, open(os.path.splitext(OUT)[0] + '.json', 'w'), ensure_ascii=False, indent=1)
print('weapons', len(weapons), 'attachments', len(atts), file=sys.stderr)
