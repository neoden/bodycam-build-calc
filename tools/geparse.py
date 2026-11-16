"""Heuristic parser for GameplayEffect modifiers in unversioned UE5 .uexp files."""
import struct, re, sys, os, glob, json

OPS = {0: 'add', 1: 'mul', 2: 'div', 3: 'override', 4: 'mulcompound', 5: 'addfinal'}
RX = re.compile(rb'([\x00\x80])\x0d(.?)\x00\x07(.)\x00\x00\x00([A-Za-z]{3,40})\x00', re.S)

def parse(b):
    mods = []
    for m in RX.finditer(b):
        haszero, mask, ln, name = m.group(1), m.group(2), m.group(3)[0], m.group(4)
        if ln != len(name) + 1: continue
        if haszero == b'\x00':
            # no mask byte: regex's optional group must be empty
            if mask != b'': 
                continue
            mask = 0
        else:
            if mask == b'': continue
            mask = mask[0]
        o = m.end()
        cnt, = struct.unpack_from('<i', b, o); o += 4 + 8*cnt + 4   # field path names + owner
        o += 4                                                   # AttributeOwner
        op = 0
        if not mask & 2:
            op = b[o]; o += 1
        hdr = b[o:o+3]; o += 3
        d = dict(attr=name.decode(), op=OPS.get(op, op))
        if hdr == b'\x80\x0b\x01':           # magnitude: calc type = ScalableFloat
            h2 = b[o:o+2]; o += 2
            if h2 == b'\x00\x07':
                d['value'], = struct.unpack_from('<f', b, o)
            elif h2 == b'\x80\x07':
                zm = b[o]; o += 1
                d['value'] = 0.0 if zm & 1 else struct.unpack_from('<f', b, o)[0]
                d['zmask'] = zm
            else:
                d['unk'] = b[o-5:o+12].hex()
        else:
            d['unk'] = b[o-3:o+16].hex()
        if 'value' in d: d['value'] = round(d['value'], 6)
        mods.append(d)
    return mods

if __name__ == '__main__':
    for f in sys.argv[1:]:
        print(os.path.basename(f)[:-5])
        for m in parse(open(f, 'rb').read()): print('   ', m)
