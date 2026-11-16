"""Parse DT_WeaponItems rows (GameplayItemDef) heuristically -> list of dicts."""
import struct, re, sys, json
from uasset import Asset

ROWRX = re.compile(rb'[\x00\x80][\x0f\x0d\x0b\x09\x07].?\x00\x03', re.S)

def parse_items(uasset, uexp):
    a = Asset(uasset); N = a.names; b = open(uexp, 'rb').read()
    nrows, = struct.unpack_from('<i', b, 10)
    def fname(o):
        i, n = struct.unpack_from('<ii', b, o)
        if not (0 <= i < len(N)) or n < 0 or n > 1000: raise ValueError(o)
        return N[i] + (f'_{n-1}' if n else '')
    rows = []; o = 14
    starts = []
    # locate row starts: key fname then header then tag struct
    for m in re.finditer(rb'(?=(.{4}.\x00\x00\x00)(\x80\x0f.|\x00\x0f)(\x00\x03.{4}\x00\x00\x00\x00|\x80\x03\x01))', b, re.S):
        starts.append(m.start())
    starts = [s for s in starts if s >= 14]
    for si, s in enumerate(starts):
        end = starts[si+1] if si+1 < len(starts) else len(b)
        try:
            key = fname(s)
        except ValueError:
            continue
        o = s + 8
        hdr = b[o:o+2]; o += 2
        mask = None
        if hdr[0] & 0x80: mask = b[o]; o += 1
        if b[o:o+3] == b'\x80\x03\x01':
            tag = 'None'; o += 3
        else:
            assert b[o:o+2] == b'\x00\x03', (key, b[o:o+2]); o += 2
            tag = fname(o); o += 8
        n, = struct.unpack_from('<i', b, o); o += 4
        compat = [fname(o + 8*i) for i in range(n)]; o += 8*n
        n, = struct.unpack_from('<i', b, o); o += 4
        defaults = []
        for _ in range(n):
            assert b[o:o+2] == b'\x00\x05', (key, b[o:o+6].hex())
            defaults.append(fname(o + 6)); o += 14
        refs = []; p = o
        while p + 16 <= end:
            i1, n1, i2, n2 = struct.unpack_from('<iiii', b, p)
            if n1 == 0 and n2 == 0 and 0 <= i1 < len(N) and 0 <= i2 < len(N) and N[i1].startswith('/') and N[i2] in (N[i1].rsplit('/', 1)[1], N[i1].rsplit('/', 1)[1] + '_C'):
                refs.append(N[i1] + '.' + N[i2]); p += 16
            else: p += 1
        rows.append(dict(key=key, mask=mask, hdr=hdr.hex(), tag=tag, compat=compat, defaults=defaults, refs=refs, len=end - s))
    return nrows, rows

if __name__ == '__main__':
    nrows, rows = parse_items(sys.argv[1], sys.argv[2])
    print(nrows, len(rows), file=sys.stderr)
    json.dump(rows, sys.stdout, indent=1)
