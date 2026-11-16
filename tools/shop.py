"""Parse DT_NewShopItem (ShopItemDef rows): which skins are actually offered in game."""
import struct, sys
from uasset import Asset

def parse_shop(uasset, uexp):
    a = Asset(uasset); b = open(uexp, 'rb').read()
    n, = struct.unpack_from('<i', b, 10); o = 14; rows = []
    for _ in range(n):
        s = o
        key = a.name(*struct.unpack_from('<ii', b, o)); o += 8
        frag, = struct.unpack_from('<H', b, o); o += 2
        mask = 0
        if frag & 0x80: mask = b[o]; o += 1
        f = {}
        if not mask & 1: f['id'], = struct.unpack_from('<i', b, o); o += 4
        for i in (1, 2, 3, 4):
            if not mask & (1 << i): f[i] = b[o]; o += 1
        items = []
        if not mask & 32:
            c, = struct.unpack_from('<i', b, o); o += 4
            for _ in range(c):
                if b[o:o+2] == b'\x80\x05':               # partly/fully empty row handle
                    m2 = b[o+2]; o += 3
                    if not m2 & 1: o += 4
                    if not m2 & 2: items.append(a.name(*struct.unpack_from('<ii', b, o))); o += 8
                    continue
                assert b[o:o+2] == b'\x00\x05', (key, b[s:o+8].hex()); items.append(a.name(*struct.unpack_from('<ii', b, o + 6))); o += 14
        assert b[o:o+2] == b'\x00\x05', (key, hex(frag), hex(mask), b[s+8:o+8].hex())
        imp, = struct.unpack_from('<i', b, o + 2); ref = a.name(*struct.unpack_from('<ii', b, o + 6)); o += 14
        rows.append(dict(key=key, frag=frag, mask=mask, table=a.imp(imp).rsplit('.', 1)[-1], ref=ref, items=items, **{str(k): v for k, v in f.items()}))
    return rows

if __name__ == '__main__':
    import json
    json.dump(parse_shop(sys.argv[1], sys.argv[2]), sys.stdout)
