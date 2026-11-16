"""Minimal cooked UE5 .uasset header reader: name map + imports + exports."""
import struct

def fstr(b, o):
    n, = struct.unpack_from('<i', b, o); o += 4
    if n >= 0:
        s = b[o:o+n-1].decode('utf-8', 'replace') if n else ''; o += n
    else:
        s = b[o:o-2*n-2].decode('utf-16-le'); o += -2*n
    return s, o

class Asset:
    def __init__(self, path):
        b = self.b = open(path, 'rb').read()
        assert struct.unpack_from('<I', b, 0)[0] == 0x9E2A83C1
        o = 4
        legacy, = struct.unpack_from('<i', b, o); o += 4
        o += 4 * 4                                   # ue3, ue4, ue5, licensee
        ncv, = struct.unpack_from('<i', b, o); o += 4 + 20 * ncv
        self.header_size, = struct.unpack_from('<i', b, o); o += 4
        _, o = fstr(b, o)
        self.flags, = struct.unpack_from('<I', b, o); o += 4
        nc, no = struct.unpack_from('<ii', b, o); o += 8
        o += 8                                       # soft object paths count/offset
        o += 8                                       # gatherable text
        self.export_count, self.export_off, self.import_count, self.import_off = struct.unpack_from('<iiii', b, o)
        self.names = []
        p = no
        for _ in range(nc):
            s, p = fstr(b, p); p += 4
            self.names.append(s)
        self.imports = []
        isz = (self.export_off - self.import_off) // max(self.import_count, 1) if self.import_count else 0
        self.import_size = isz
        for i in range(self.import_count):
            q = self.import_off + i * isz
            cp, cpn, cn, cnn, outer, on, onn = struct.unpack_from('<iiiiiii', b, q)
            self.imports.append(dict(cls=self.names[cn], outer=outer, name=self.names[on] + (f'_{onn-1}' if onn else '')))

    def name(self, idx, num=0):
        return self.names[idx] + (f'_{num-1}' if num else '')

    def imp(self, i):
        """Resolve package index (negative = import) to full path."""
        if i >= 0: return None if i == 0 else f'export:{i}'
        e = self.imports[-i-1]; parts = [e['name']]
        while e['outer'] < 0:
            e = self.imports[-e['outer']-1]; parts.append(e['name'])
        return '.'.join(reversed(parts))

if __name__ == '__main__':
    import sys
    a = Asset(sys.argv[1])
    print('names', len(a.names), 'imports', a.import_count, 'isz', a.import_size, 'exports', a.export_count)
    if '-n' in sys.argv:
        for i, n in enumerate(a.names): print(i, n)
    if '-i' in sys.argv:
        for i in range(a.import_count): print(-i-1, a.imports[i]['cls'], a.imp(-i-1))
