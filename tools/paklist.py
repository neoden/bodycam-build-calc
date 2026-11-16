"""List files in UE pak v11 archives (unencrypted index). Usage: paklist.py PAKDIR > index.tsv"""
import struct, sys, glob, os

def fstr(b, o):
    n, = struct.unpack_from('<i', b, o); o += 4
    if n >= 0:
        s = b[o:o+n].split(b'\0')[0].decode('utf-8', 'replace'); o += n
    else:
        s = b[o:o-2*n].decode('utf-16-le').rstrip('\0'); o += -2*n
    return s, o

def decode_entry(enc, o):
    flags, = struct.unpack_from('<I', enc, o); o += 4
    bs = flags & 0x3f; nblocks = (flags >> 6) & 0xffff
    encrypted = (flags >> 22) & 1; method = (flags >> 23) & 0x3f
    if bs == 0x3f:
        bs, = struct.unpack_from('<I', enc, o); o += 4
    else:
        bs <<= 11
    def rd(bit):
        nonlocal o
        if flags & (1 << bit):
            v, = struct.unpack_from('<I', enc, o); o += 4
        else:
            v, = struct.unpack_from('<Q', enc, o); o += 8
        return v
    offset = rd(31); usize = rd(30)
    csize = rd(29) if method else usize
    blocks = []
    if method:
        if nblocks == 1 and not encrypted:
            blocks = [csize]
        else:
            blocks = list(struct.unpack_from('<%dI' % nblocks, enc, o))
    return dict(offset=offset, usize=usize, csize=csize, method=method,
                encrypted=encrypted, bs=bs, blocks=blocks)

def read_index(path):
    with open(path, 'rb') as fh:
        fh.seek(-221, 2); ft = fh.read()
        magic, ver, off, size = struct.unpack('<IIQQ', ft[17:41])
        assert magic == 0x5A6F12E1 and ver == 11 and ft[16] == 0, path
        fh.seek(off); b = fh.read(size)
        mount, o = fstr(b, 0)
        count, seed = struct.unpack_from('<IQ', b, o); o += 12
        has_phi, = struct.unpack_from('<I', b, o); o += 4
        if has_phi: o += 36
        has_fdi, = struct.unpack_from('<I', b, o); o += 4
        fdi_off, fdi_size = struct.unpack_from('<QQ', b, o); o += 36
        esize, = struct.unpack_from('<I', b, o); o += 4
        enc = b[o:o+esize]
        fh.seek(fdi_off); d = fh.read(fdi_size)
    out = {}
    n, = struct.unpack_from('<I', d, 0); o = 4
    for _ in range(n):
        dn, o = fstr(d, o)
        fc, = struct.unpack_from('<I', d, o); o += 4
        for _ in range(fc):
            fn, o = fstr(d, o)
            eo, = struct.unpack_from('<i', d, o); o += 4
            if eo >= 0:
                out[mount + dn.lstrip('/') + fn if dn != '/' else mount + fn] = decode_entry(enc, eo)
    return out

if __name__ == '__main__':
    for p in sorted(glob.glob(os.path.join(sys.argv[1], '*.pak'))):
        try:
            for k, e in read_index(p).items():
                print(os.path.basename(p), k, e['usize'], e['method'], e['encrypted'], sep='\t')
        except Exception as ex:
            print('ERR', p, repr(ex), file=sys.stderr)
