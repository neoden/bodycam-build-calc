"""Extract files matching regex from Bodycam paks. Usage: pakextract.py PAKDIR OUTDIR REGEX"""
import struct, sys, glob, os, re
import ooz
from paklist import read_index

def extract(fh, e):
    fh.seek(e['offset'])
    if not e['method']:
        fh.seek(e['offset'] + 53); return fh.read(e['usize'])
    hdr = fh.read(52)
    n, = struct.unpack_from('<I', hdr, 48)
    blocks = struct.unpack('<%dQ' % (2*n), fh.read(16*n))
    bs, = struct.unpack('<xI', fh.read(5))
    out = bytearray(); left = e['usize']
    for i in range(n):
        s, t = blocks[2*i], blocks[2*i+1]
        fh.seek(e['offset'] + s); raw = fh.read(t - s)
        want = min(bs, left)
        out += ooz.decompress(raw, want) if len(raw) != want else raw
        left -= want
    return bytes(out)

if __name__ == '__main__':
    pakdir, outdir = sys.argv[1], sys.argv[2]
    if sys.argv[3].startswith('@'):      # @file: exact pak paths, one per line
        want = set(open(sys.argv[3][1:]).read().split('\n'))
        class rx:
            search = staticmethod(lambda k: k in want)
    else:
        rx = re.compile(sys.argv[3])
    n = 0
    for p in sorted(glob.glob(os.path.join(pakdir, '*.pak'))):
        idx = read_index(p)
        hits = {k: e for k, e in idx.items() if rx.search(k) and not e['encrypted']}
        if not hits: continue
        with open(p, 'rb') as fh:
            for k, e in hits.items():
                dst = os.path.join(outdir, k.replace('../../../', ''))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                try:
                    data = extract(fh, e)
                except Exception as ex:
                    print('FAIL', k, ex, file=sys.stderr); continue
                open(dst, 'wb').write(data); n += 1
    print('extracted', n)
